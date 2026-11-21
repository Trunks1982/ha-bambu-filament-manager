"""Core logic: spool inventory, tray assignment, NFC, consumption and notifications."""
from __future__ import annotations

import asyncio
from datetime import datetime
import json
import logging
from pathlib import Path
from typing import Any
import uuid

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import CALLBACK_TYPE, Event, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.debounce import Debouncer
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import (
    ACTIVE_STATES,
    BAMBU_DOMAIN,
    CONF_DEFAULT_NET_WEIGHT,
    CONF_DEFAULT_SPOOL_WEIGHT,
    CONF_IGNORED_TAGS,
    CONF_LOW_THRESHOLD,
    CONF_NOTIFY_INSUFFICIENT,
    CONF_NOTIFY_SCAN,
    CONF_NOTIFY_SUMMARY,
    CONF_NOTIFY_TARGETS,
    CONF_NOTIFY_UNKNOWN_TAG,
    CONF_TRACK_BAMBU_SPOOLS,
    DEFAULTS,
    DOMAIN,
    EMPTY_UUID,
    END_STATES,
    EVENT_CONSUMED,
    EVENT_SCANNED,
    EVENT_UNKNOWN_TAG,
    NON_SLOT_ATTRS,
    SIGNAL_SPOOLS_CHANGED,
    SIGNAL_UPDATE,
    STORAGE_KEY,
    STORAGE_VERSION,
)
from .printer import Printer, Tray, discover
from .texts import t

_LOGGER = logging.getLogger(__name__)

SPOOL_FIELDS = {
    "name": str,
    "vendor": str,
    "material": str,
    "filament_id": str,
    "color": str,
    "nozzle_min": int,
    "nozzle_max": int,
    "spool_weight": float,
    "net_weight": float,
    "remaining": float,
    "tag": str,
    "note": str,
}


def norm_color(value: Any) -> str:
    """Normalize a color to RRGGBBAA upper case without '#'."""
    c = str(value or "").strip().lstrip("#").upper()
    if len(c) == 3:
        c = "".join(ch * 2 for ch in c)
    if len(c) == 6:
        c += "FF"
    if len(c) != 8 or any(ch not in "0123456789ABCDEF" for ch in c):
        return "808080FF"
    return c


def _num(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


class FilamentManager:
    """Holds all state of the integration."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self.spools: dict[str, dict[str, Any]] = {}
        self.assign: dict[str, dict[str, Any]] = {}  # tray unique_id -> {spool, color, filament_id}
        self.jobs: dict[str, dict[str, Any]] = {}  # printer device_id -> job info
        self.pending: str | None = None  # spool id scanned via NFC, waiting for a tray
        self.unknown_tag: str | None = None
        self.printers: list[Printer] = []
        self.catalog: dict[str, Any] = {}
        self.images: dict[str, str] = {}
        self._unsubs: list[CALLBACK_TYPE] = []
        self._state_unsub: CALLBACK_TYPE | None = None
        self._started_unsub: CALLBACK_TYPE | None = None
        self._save_lock = asyncio.Lock()
        self._rediscover = Debouncer(
            hass, _LOGGER, cooldown=2, immediate=False, function=self._async_rediscover
        )

    # ------------------------------------------------------------------ setup
    @property
    def options(self) -> dict[str, Any]:
        return {**DEFAULTS, **self.entry.options}

    @property
    def lang(self) -> str:
        return (self.hass.config.language or "en").split("-")[0]

    async def async_setup(self) -> None:
        data = await self._store.async_load() or {}
        self.spools = data.get("spools", {})
        self.assign = data.get("assign", {})
        self.jobs = data.get("jobs", {})
        self.pending = data.get("pending")
        self.unknown_tag = data.get("unknown_tag")
        self.catalog = await self.hass.async_add_executor_job(self._load_catalog)

        self._unsubs.append(self.hass.bus.async_listen("tag_scanned", self._on_tag_scanned))
        self._unsubs.append(
            self.hass.bus.async_listen(er.EVENT_ENTITY_REGISTRY_UPDATED, self._on_registry_updated)
        )
        if self.hass.is_running:
            await self._async_rediscover()
        else:
            self._started_unsub = self.hass.bus.async_listen_once(
                EVENT_HOMEASSISTANT_STARTED, self._on_started
            )
            await self._async_rediscover()

    async def async_unload(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        if self._started_unsub:
            self._started_unsub()
            self._started_unsub = None
        if self._state_unsub:
            self._state_unsub()
            self._state_unsub = None
        self._rediscover.async_cancel()
        await self._async_save()

    async def _on_started(self, _event: Event) -> None:
        self._started_unsub = None  # a one-time listener removes itself
        await self._async_rediscover()

    @callback
    def _on_registry_updated(self, event: Event) -> None:
        entity_id = event.data.get("entity_id", "")
        entry = er.async_get(self.hass).async_get(entity_id) if entity_id else None
        if entry is None or entry.platform == BAMBU_DOMAIN or event.data.get("action") == "remove":
            self.hass.async_create_task(self._rediscover.async_call())

    def _load_catalog(self) -> dict[str, Any]:
        """Filament catalog: the one shipped with ha-bambulab if present, else our copy."""
        ours = Path(__file__).parent / "catalog.json"
        candidates = [Path(self.hass.config.path("custom_components", BAMBU_DOMAIN, "filaments_detail.json")), ours]
        for path in candidates:
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                if isinstance(data, dict) and data:
                    return data
            except (OSError, ValueError):
                continue
        return {}

    def _find_images(self) -> dict[str, str]:
        """Printer/AMS pictures served by ha-bambulab under /bambu_lab/images (names carry a hash)."""
        folder = Path(self.hass.config.path("custom_components", BAMBU_DOMAIN, "frontend", "images"))
        out: dict[str, str] = {}
        try:
            files = [p.name for p in folder.iterdir() if p.is_file()]
        except OSError:
            return out
        for name in files:
            stem = name.split("-")[0]
            out.setdefault(stem.upper(), f"/bambu_lab/images/{name}")
        return out

    async def _async_rediscover(self) -> None:
        self.printers = discover(self.hass)
        self.images = await self.hass.async_add_executor_job(self._find_images)
        watch: list[str] = []
        for p in self.printers:
            for key in ("print_status", "print_weight", "print_progress"):
                if key in p.entities:
                    watch.append(p.entities[key])
            watch.extend(t.entity_id for t in p.trays)
        if self._state_unsub:
            self._state_unsub()
        self._state_unsub = (
            async_track_state_change_event(self.hass, watch, self._on_state) if watch else None
        )
        # Catch up on jobs that ended while HA was down, and on Bambu spools.
        for p in self.printers:
            self._sync_bambu_spools(p)
            await self._process_printer(p, None)
        self._notify_listeners(spools_changed=True)

    # ------------------------------------------------------------------ helpers
    def printer_image(self, model: str) -> str | None:
        return self.images.get((model or "").upper().replace(" ", ""))

    def _printer_for_entity(self, entity_id: str) -> Printer | None:
        for p in self.printers:
            if entity_id in p.entities.values() or any(t.entity_id == entity_id for t in p.trays):
                return p
        return None

    def find_tray(self, entity_id: str) -> tuple[Printer, Tray] | None:
        for p in self.printers:
            for tr in p.trays:
                if tr.entity_id == entity_id:
                    return p, tr
        return None

    def _tray_attrs(self, tray: Tray) -> dict[str, Any]:
        state = self.hass.states.get(tray.entity_id)
        return dict(state.attributes) if state else {}

    @staticmethod
    def _bambu_uuid(attrs: dict[str, Any]) -> str:
        u = str(attrs.get("tray_uuid") or "")
        return u if u and u.strip("0") and u != EMPTY_UUID else ""

    def resolve_tray(self, tray: Tray) -> tuple[dict[str, Any] | None, str | None]:
        """Return (spool, source) for a tray. source: 'bambu' | 'assigned' | None."""
        attrs = self._tray_attrs(tray)
        if not attrs or attrs.get("empty"):
            return None, None
        buuid = self._bambu_uuid(attrs)
        if buuid:
            for sp in self.spools.values():
                if sp.get("bambu_uuid") == buuid:
                    return sp, "bambu"
            return None, "bambu"
        link = self.assign.get(tray.unique_id)
        if not link:
            return None, None
        spool = self.spools.get(link.get("spool"))
        if spool is None:
            return None, None
        # The link is only valid while the tray still shows what we set (the user may have
        # changed the filament on the printer in the meantime).
        if norm_color(attrs.get("color")) != link.get("color") or (
            str(attrs.get("filament_id") or "") != link.get("filament_id")
        ):
            return None, None
        return spool, "assigned"

    def tray_remaining(self, tray: Tray) -> tuple[str | None, float | None]:
        """Name and remaining grams of what sits in a tray (own spool or Bambu AMS value)."""
        spool, source = self.resolve_tray(tray)
        if spool is not None:
            return spool["name"], _num(spool.get("remaining"))
        if source == "bambu":
            attrs = self._tray_attrs(tray)
            remain = _num(attrs.get("remain"), -1)
            weight = _num(attrs.get("tray_weight"), 0) or 1000
            if remain >= 0:
                return attrs.get("name"), remain / 100 * weight
        return None, None

    def spool_location(self, spool_id: str) -> dict[str, str] | None:
        for p in self.printers:
            for tr in p.trays:
                sp, _src = self.resolve_tray(tr)
                if sp is not None and sp["id"] == spool_id:
                    return {"printer": p.name, "tray": tr.label, "entity_id": tr.entity_id}
        return None

    # ------------------------------------------------------------------ persistence
    async def _async_save(self) -> None:
        async with self._save_lock:
            await self._store.async_save(
                {
                    "spools": self.spools,
                    "assign": self.assign,
                    "jobs": self.jobs,
                    "pending": self.pending,
                    "unknown_tag": self.unknown_tag,
                }
            )

    @callback
    def _notify_listeners(self, spools_changed: bool = False) -> None:
        async_dispatcher_send(self.hass, SIGNAL_UPDATE)
        if spools_changed:
            async_dispatcher_send(self.hass, SIGNAL_SPOOLS_CHANGED)

    async def _changed(self, spools_changed: bool = False) -> None:
        await self._async_save()
        self._notify_listeners(spools_changed)

    # ------------------------------------------------------------------ notifications
    def notify_choices(self) -> dict[str, str]:
        """All notification targets available in this Home Assistant."""
        out: dict[str, str] = {"persistent": "Home Assistant (" + t(self.lang, "persistent") + ")"}
        for state in self.hass.states.async_all("notify"):
            out[f"entity:{state.entity_id}"] = f"{state.name} ({state.entity_id})"
        for svc in sorted(self.hass.services.async_services_for_domain("notify")):
            if svc in ("send_message", "persistent_notification", "notify"):
                continue
            out[f"service:{svc}"] = f"notify.{svc}"
        return out

    async def async_notify(self, title: str, message: str) -> None:
        for target in self.options.get(CONF_NOTIFY_TARGETS, []):
            try:
                if target == "persistent":
                    await self.hass.services.async_call(
                        "persistent_notification", "create",
                        {"title": title, "message": message, "notification_id": f"{DOMAIN}_{uuid.uuid4().hex[:6]}"},
                        blocking=True,
                    )
                elif target.startswith("entity:"):
                    await self.hass.services.async_call(
                        "notify", "send_message",
                        {"entity_id": target[7:], "title": title, "message": message},
                        blocking=True,
                    )
                elif target.startswith("service:"):
                    svc = target[8:]
                    if not self.hass.services.has_service("notify", svc):
                        continue
                    await self.hass.services.async_call(
                        "notify", svc, {"title": title, "message": message}, blocking=True
                    )
            except Exception as err:  # noqa: BLE001 - a broken target must not stop the others
                _LOGGER.warning("Notification via %s failed: %s", target, err)

    # ------------------------------------------------------------------ spools
    def _clean_fields(self, data: dict[str, Any]) -> dict[str, Any]:
        out: dict[str, Any] = {}
        for key, typ in SPOOL_FIELDS.items():
            if key not in data or data[key] is None:
                continue
            val = data[key]
            if typ is str:
                val = str(val).strip()
            elif typ is int:
                val = int(_num(val))
            else:
                val = round(_num(val), 1)
            out[key] = val
        if "color" in out:
            out["color"] = norm_color(out["color"])
        return out

    def _apply_catalog(self, spool: dict[str, Any]) -> None:
        info = self.catalog.get(spool.get("filament_id") or "")
        if not info:
            return
        spool.setdefault("material", info.get("filament_type", ""))
        if not spool.get("material"):
            spool["material"] = info.get("filament_type", "")
        if not spool.get("nozzle_min"):
            spool["nozzle_min"] = int(info.get("nozzle_temperature_range_low") or 190)
        if not spool.get("nozzle_max"):
            spool["nozzle_max"] = int(info.get("nozzle_temperature_range_high") or 230)

    async def async_add_spool(self, data: dict[str, Any]) -> dict[str, Any]:
        fields = self._clean_fields(data)
        if not fields.get("name"):
            raise ServiceValidationError(t(self.lang, "err_name"))
        tag = fields.get("tag", "")
        if tag and any(s.get("tag") == tag for s in self.spools.values()):
            raise ServiceValidationError(t(self.lang, "err_tag_used"))
        opts = self.options
        spool: dict[str, Any] = {
            "id": uuid.uuid4().hex[:12],
            "name": "",
            "vendor": "",
            "material": "",
            "filament_id": "",
            "color": "808080FF",
            "nozzle_min": 0,
            "nozzle_max": 0,
            "spool_weight": float(opts[CONF_DEFAULT_SPOOL_WEIGHT]),
            "net_weight": float(opts[CONF_DEFAULT_NET_WEIGHT]),
            "remaining": None,
            "tag": "",
            "note": "",
            "bambu_uuid": "",
            "created": dt_util.utcnow().isoformat(),
        }
        spool.update(fields)
        self._apply_catalog(spool)
        spool["nozzle_min"] = spool["nozzle_min"] or 190
        spool["nozzle_max"] = spool["nozzle_max"] or 230
        if data.get("gross_weight") not in (None, "", 0):
            spool["remaining"] = max(0.0, round(_num(data["gross_weight"]) - spool["spool_weight"], 1))
        if spool["remaining"] is None:
            spool["remaining"] = spool["net_weight"]
        self.spools[spool["id"]] = spool
        if tag and tag == self.unknown_tag:
            self.unknown_tag = None
            self.pending = spool["id"]
        if data.get("tray"):
            await self._changed(spools_changed=True)
            await self.async_assign(data["tray"], spool["id"])
        else:
            await self._changed(spools_changed=True)
        return spool

    def _get_spool(self, spool_id: str) -> dict[str, Any]:
        spool = self.spools.get(spool_id)
        if spool is None:
            raise ServiceValidationError(t(self.lang, "err_no_spool"))
        return spool

    async def async_update_spool(self, spool_id: str, data: dict[str, Any]) -> dict[str, Any]:
        spool = self._get_spool(spool_id)
        fields = self._clean_fields(data)
        tag = fields.get("tag")
        if tag and any(s.get("tag") == tag and s["id"] != spool_id for s in self.spools.values()):
            raise ServiceValidationError(t(self.lang, "err_tag_used"))
        spool.update(fields)
        if data.get("gross_weight") not in (None, "", 0):
            spool["remaining"] = max(0.0, round(_num(data["gross_weight"]) - _num(spool.get("spool_weight")), 1))
        spool["updated"] = dt_util.utcnow().isoformat()
        if tag and tag == self.unknown_tag:
            self.unknown_tag = None
        # Keep tray links valid when only weight/name changed. If color/profile changed the
        # printer still shows the old values, so the link is dropped (user should re-assign).
        await self._changed(spools_changed=True)
        return spool

    async def async_weigh(self, spool_id: str, gross: float) -> dict[str, Any]:
        spool = self._get_spool(spool_id)
        spool["remaining"] = max(0.0, round(_num(gross) - _num(spool.get("spool_weight")), 1))
        spool["updated"] = dt_util.utcnow().isoformat()
        await self._changed(spools_changed=True)
        return spool

    async def async_consume(self, spool_id: str, grams: float) -> dict[str, Any]:
        spool = self._get_spool(spool_id)
        spool["remaining"] = max(0.0, round(_num(spool.get("remaining")) - _num(grams), 1))
        await self._changed(spools_changed=True)
        return spool

    async def async_delete_spool(self, spool_id: str, delete_tag: bool = False) -> None:
        spool = self._get_spool(spool_id)
        self.spools.pop(spool_id)
        self.assign = {k: v for k, v in self.assign.items() if v.get("spool") != spool_id}
        if self.pending == spool_id:
            self.pending = None
        if delete_tag and spool.get("tag"):
            await self._delete_ha_tag(spool["tag"])
        await self._changed(spools_changed=True)

    async def _delete_ha_tag(self, tag_id: str) -> None:
        try:
            from homeassistant.components.tag import TAG_DATA  # noqa: PLC0415

            coll = self.hass.data.get(TAG_DATA)
            if coll is not None and tag_id in coll.data:
                await coll.async_delete_item(tag_id)
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("Could not delete tag %s: %s", tag_id, err)

    async def async_set_pending(self, spool_id: str | None) -> None:
        if spool_id is not None:
            self._get_spool(spool_id)
        self.pending = spool_id
        await self._changed()

    async def async_clear_unknown_tag(self) -> None:
        self.unknown_tag = None
        await self._changed()

    # ------------------------------------------------------------------ tray assignment
    async def async_assign(self, tray_entity: str, spool_id: str | None = None, send: bool = True) -> None:
        found = self.find_tray(tray_entity)
        if found is None:
            raise ServiceValidationError(t(self.lang, "err_no_tray"))
        printer, tray = found
        spool_id = spool_id or self.pending
        if not spool_id:
            raise ServiceValidationError(t(self.lang, "err_no_pending"))
        spool = self._get_spool(spool_id)
        attrs = self._tray_attrs(tray)
        status = self._state(printer, "print_status")
        if status in ACTIVE_STATES and attrs.get("active"):
            raise ServiceValidationError(t(self.lang, "err_tray_active"))
        if self._bambu_uuid(attrs):
            raise ServiceValidationError(t(self.lang, "err_bambu_spool"))
        if not spool.get("filament_id"):
            raise ServiceValidationError(t(self.lang, "err_no_profile"))
        color = norm_color(spool.get("color"))
        if send:
            try:
                await self.hass.services.async_call(
                    BAMBU_DOMAIN,
                    "set_filament",
                    {
                        "entity_id": tray.entity_id,
                        "tray_info_idx": spool["filament_id"],
                        "tray_type": spool.get("material") or "PLA",
                        "tray_color": color,
                        "nozzle_temp_min": int(spool.get("nozzle_min") or 190),
                        "nozzle_temp_max": int(spool.get("nozzle_max") or 230),
                    },
                    blocking=True,
                )
            except HomeAssistantError:
                raise
            except Exception as err:  # noqa: BLE001
                raise HomeAssistantError(str(err)) from err
        # one spool can only sit in one tray
        self.assign = {k: v for k, v in self.assign.items() if v.get("spool") != spool_id}
        self.assign[tray.unique_id] = {
            "spool": spool_id,
            "color": color,
            "filament_id": spool["filament_id"],
            "since": dt_util.utcnow().isoformat(),
        }
        if self.pending == spool_id:
            self.pending = None
        await self._changed(spools_changed=True)

    async def async_unassign(self, tray_entity: str) -> None:
        found = self.find_tray(tray_entity)
        if found is None:
            raise ServiceValidationError(t(self.lang, "err_no_tray"))
        self.assign.pop(found[1].unique_id, None)
        await self._changed(spools_changed=True)

    # ------------------------------------------------------------------ NFC
    async def _on_tag_scanned(self, event: Event) -> None:
        tag_id = str(event.data.get("tag_id") or "")
        if not tag_id or tag_id in self.options.get(CONF_IGNORED_TAGS, []):
            return
        spool = next((s for s in self.spools.values() if s.get("tag") == tag_id), None)
        if spool is not None:
            self.pending = spool["id"]
            await self._changed()
            self.hass.bus.async_fire(EVENT_SCANNED, {"spool_id": spool["id"], "name": spool["name"], "tag_id": tag_id})
            if self.options[CONF_NOTIFY_SCAN]:
                loc = self.spool_location(spool["id"])
                msg = t(self.lang, "scan_msg", material=spool.get("material", ""),
                        tmin=spool.get("nozzle_min"), tmax=spool.get("nozzle_max"),
                        rest=round(_num(spool.get("remaining"))))
                if loc:
                    msg += "\n" + t(self.lang, "scan_loc", tray=loc["tray"])
                await self.async_notify(t(self.lang, "scan_title", name=spool["name"]), msg)
            return
        # Tags the user gave a real name belong to something else (door, light ...).
        # The companion app names new tags "Tag <id>" by itself – those still count as unknown.
        try:
            from homeassistant.components.tag import TAG_DATA  # noqa: PLC0415

            coll = self.hass.data.get(TAG_DATA)
            info = coll.data.get(tag_id) if coll is not None else None
        except Exception:  # noqa: BLE001
            info = None
        name = str((info or {}).get("name") or "").strip()
        if name and name not in (tag_id, f"Tag {tag_id}"):
            return
        self.unknown_tag = tag_id
        await self._changed()
        self.hass.bus.async_fire(EVENT_UNKNOWN_TAG, {"tag_id": tag_id})
        if self.options[CONF_NOTIFY_UNKNOWN_TAG]:
            await self.async_notify(t(self.lang, "unknown_title"), t(self.lang, "unknown_msg"))

    # ------------------------------------------------------------------ printer tracking
    def _state(self, printer: Printer, key: str) -> str | None:
        eid = printer.entities.get(key)
        st = self.hass.states.get(eid) if eid else None
        return st.state if st else None

    def _weights(self, printer: Printer) -> dict[str, float]:
        eid = printer.entities.get("print_weight")
        st = self.hass.states.get(eid) if eid else None
        if st is None:
            return {}
        out = {}
        for k, v in st.attributes.items():
            if k in NON_SLOT_ATTRS:
                continue
            g = _num(v, 0)
            if g > 0:
                out[k] = g
        return out

    @callback
    def _on_state(self, event: Event) -> None:
        entity_id = event.data["entity_id"]
        printer = self._printer_for_entity(entity_id)
        if printer is None:
            return
        if any(tr.entity_id == entity_id for tr in printer.trays):
            if self._sync_bambu_spools(printer):
                self.hass.async_create_task(self._changed(spools_changed=True))
            else:
                self._notify_listeners()
            return
        self.hass.async_create_task(self._process_printer(printer, event))

    def _sync_bambu_spools(self, printer: Printer) -> bool:
        """Create/update inventory entries for original Bambu spools (RFID) seen in the AMS."""
        if not self.options[CONF_TRACK_BAMBU_SPOOLS]:
            return False
        changed = False
        for tray in printer.trays:
            attrs = self._tray_attrs(tray)
            buuid = self._bambu_uuid(attrs)
            if not buuid or attrs.get("empty"):
                continue
            spool = next((s for s in self.spools.values() if s.get("bambu_uuid") == buuid), None)
            weight = _num(attrs.get("tray_weight"), 0) or 1000
            remain = _num(attrs.get("remain"), -1)
            if spool is None:
                spool = {
                    "id": uuid.uuid4().hex[:12],
                    "name": str(attrs.get("name") or "Bambu"),
                    "vendor": "Bambu Lab",
                    "material": str(attrs.get("type") or ""),
                    "filament_id": str(attrs.get("filament_id") or ""),
                    "color": norm_color(attrs.get("color")),
                    "nozzle_min": int(_num(attrs.get("nozzle_temp_min"), 190)),
                    "nozzle_max": int(_num(attrs.get("nozzle_temp_max"), 230)),
                    "spool_weight": 250.0,
                    "net_weight": weight,
                    "remaining": round(remain / 100 * weight, 1) if remain >= 0 else weight,
                    "tag": "",
                    "note": "",
                    "bambu_uuid": buuid,
                    "created": dt_util.utcnow().isoformat(),
                }
                self.spools[spool["id"]] = spool
                changed = True
            elif remain >= 0:
                new = round(remain / 100 * weight, 1)
                if new != spool.get("remaining"):
                    spool["remaining"] = new
                    changed = True
        return changed

    async def _process_printer(self, printer: Printer, event: Event | None) -> None:
        status = self._state(printer, "print_status")
        if status is None:
            return
        job = self.jobs.get(printer.device_id)
        if status in ACTIVE_STATES:
            name = self._state(printer, "subtask_name") or ""
            if job is None or job.get("name") != name:
                job = {"name": name, "started": dt_util.utcnow().isoformat(), "weights": {}, "checked": False,
                       "p0": _num(self._state(printer, "print_progress"), 0)}
                self.jobs[printer.device_id] = job
            weights = self._weights(printer)
            # Right after a new start the sensor can still show the previous job's figures.
            # Identical figures are only trusted if the sensor was updated after the last job ended.
            last = self.jobs.get(f"last_{printer.device_id}") or {}
            stale = False
            if weights and weights == last.get("weights") and last.get("ended"):
                pw = self.hass.states.get(printer.entities.get("print_weight", ""))
                ended = dt_util.parse_datetime(last["ended"])
                stale = pw is None or ended is None or pw.last_updated <= ended
            if weights and not stale:
                job["weights"] = weights
                # Remember which spool feeds which slot now – at the end of the print (or
                # after a restart) the tray data may not be available yet.
                spools = job.setdefault("spools", {})
                for key in weights:
                    tray = printer.tray_by_key(key)
                    if tray is not None:
                        sp, src = self.resolve_tray(tray)
                        if sp is not None and src == "assigned":
                            spools[key] = sp["id"]
            live = status == "running" and self._live_consume(printer, job)
            # Check again whenever the figures change (they can arrive late or be corrected).
            if job["weights"] and job.get("checked") != job["weights"]:
                job["checked"] = dict(job["weights"])
                await self._async_save()
                await self._check_enough(printer, job)
            else:
                await self._async_save()
            if live:
                self._notify_listeners()
            return
        if status in END_STATES and job is not None:
            weights = job.get("weights") or self._weights(printer)
            factor = 1.0
            if status == "failed":
                factor = max(0.0, min(_num(self._state(printer, "print_progress"), 0), 100)) / 100
            self.jobs.pop(printer.device_id, None)
            self.jobs[f"last_{printer.device_id}"] = {
                "name": job.get("name"), "weights": weights, "ended": dt_util.utcnow().isoformat(),
            }
            await self._consume_job(printer, job.get("name") or "", weights, factor, job.get("spools") or {},
                                    job.get("consumed") or {})
            await self._changed(spools_changed=True)

    def _live_consume(self, printer: Printer, job: dict[str, Any]) -> bool:
        """Subtract filament while printing, proportional to the print progress."""
        progress = max(0.0, min(_num(self._state(printer, "print_progress"), 0), 100))
        # Right after the start the progress can still show the value of the previous print.
        # In that case wait until it has dropped before subtracting anything.
        if not job.get("progress_ok"):
            if _num(job.get("p0"), 0) < 1 or progress < _num(job.get("p0"), 0):
                job["progress_ok"] = True
            else:
                return False
        consumed = job.setdefault("consumed", {})
        changed = False
        for key, need in (job.get("weights") or {}).items():
            spool = self.spools.get((job.get("spools") or {}).get(key, ""))
            if spool is None:
                continue
            target = round(need * progress / 100, 1)
            delta = round(target - _num(consumed.get(key)), 1)
            if delta >= 0.1:
                spool["remaining"] = max(0.0, round(_num(spool.get("remaining")) - delta, 1))
                spool["last_used"] = dt_util.utcnow().isoformat()
                consumed[key] = target
                changed = True
        return changed

    async def _check_enough(self, printer: Printer, job: dict[str, Any]) -> None:
        lines = []
        warned = job.setdefault("warned", [])
        for key, need in job["weights"].items():
            tray = printer.tray_by_key(key)
            if tray is None:
                continue
            name, rest = self.tray_remaining(tray)
            need = need - _num((job.get("consumed") or {}).get(key))  # part already subtracted
            if rest is not None and rest < need and key not in warned:
                warned.append(key)
                lines.append(t(self.lang, "short_line", tray=tray.label, name=name or "?",
                               need=round(need), rest=round(rest)))
        if lines and self.options[CONF_NOTIFY_INSUFFICIENT]:
            await self.async_notify(
                t(self.lang, "short_title"),
                t(self.lang, "short_msg", job=job.get("name") or "", lines="\n".join(lines)),
            )

    async def _consume_job(
        self, printer: Printer, job_name: str, weights: dict[str, float], factor: float,
        job_spools: dict[str, str], consumed: dict[str, float] | None = None,
    ) -> None:
        consumed = consumed or {}
        lines = []
        low = float(self.options[CONF_LOW_THRESHOLD])
        any_low = False
        for key, grams in weights.items():
            tray = printer.tray_by_key(key)
            if tray is None:
                continue
            used = round(grams * factor, 1)
            if used <= 0:
                continue
            spool, source = self.resolve_tray(tray)
            if job_spools.get(key) in self.spools:
                spool, source = self.spools[job_spools[key]], "assigned"
            if source == "assigned" and spool is not None:
                # part of it was already subtracted live during the print
                rest_to_take = max(0.0, round(used - _num(consumed.get(key)), 1))
                spool["remaining"] = max(0.0, round(_num(spool.get("remaining")) - rest_to_take, 1))
                spool["last_used"] = dt_util.utcnow().isoformat()
                rest = spool["remaining"]
                name = spool["name"]
            elif source == "bambu":
                name, rest = self.tray_remaining(tray)
                if spool is not None:
                    spool["last_used"] = dt_util.utcnow().isoformat()
                    rest = (rest or 0) - used  # AMS updates remain% a bit later
                    spool["remaining"] = max(0.0, round(rest, 1))
            else:
                continue
            is_low = rest is not None and rest < low
            any_low = any_low or is_low
            lines.append(t(self.lang, "used_line", tray=tray.label, name=name or "?", used=used,
                           rest=round(rest or 0)) + (" " + t(self.lang, "low_mark") if is_low else ""))
            self.hass.bus.async_fire(EVENT_CONSUMED, {
                "printer": printer.name, "tray": tray.label, "spool_id": spool["id"] if spool else None,
                "name": name, "grams": used, "remaining": rest, "job": job_name,
            })
        if lines and self.options[CONF_NOTIFY_SUMMARY]:
            title = t(self.lang, "used_title_low" if any_low else "used_title", job=job_name)
            if factor < 1:
                title += " " + t(self.lang, "aborted")
            await self.async_notify(title, "\n".join(lines))

    # ------------------------------------------------------------------ export for card
    def as_dict(self) -> dict[str, Any]:
        printers = []
        for p in self.printers:
            d = p.as_dict()
            d["image"] = self.printer_image(p.model)
            d["job"] = self.jobs.get(p.device_id)
            for u in d["units"]:
                for tr in u["trays"]:
                    obj = next(x for x in p.trays if x.entity_id == tr["entity_id"])
                    spool, source = self.resolve_tray(obj)
                    tr["spool_id"] = spool["id"] if spool else None
                    tr["source"] = source
                    link = self.assign.get(obj.unique_id)
                    tr["stale_link"] = bool(link) and source is None
            printers.append(d)
        return {
            "printers": printers,
            "spools": list(self.spools.values()),
            "pending": self.pending,
            "unknown_tag": self.unknown_tag,
            "low_threshold": self.options[CONF_LOW_THRESHOLD],
            "default_spool_weight": self.options[CONF_DEFAULT_SPOOL_WEIGHT],
            "default_net_weight": self.options[CONF_DEFAULT_NET_WEIGHT],
        }

    def catalog_list(self) -> list[dict[str, Any]]:
        out = []
        for fid, info in self.catalog.items():
            out.append({
                "id": fid,
                "name": info.get("name") or fid,
                "vendor": info.get("filament_vendor") or "",
                "type": info.get("filament_type") or "",
                "min": info.get("nozzle_temperature_range_low"),
                "max": info.get("nozzle_temperature_range_high"),
            })
        out.sort(key=lambda x: (x["vendor"] != "Generic", x["vendor"], x["name"]))
        return out
