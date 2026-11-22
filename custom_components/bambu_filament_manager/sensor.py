"""Sensors: one per spool, one per tray, and the scanned spool."""
from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.const import UnitOfMass
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import FMConfigEntry
from .const import DOMAIN, SIGNAL_SPOOLS_CHANGED, SIGNAL_UPDATE
from .manager import FilamentManager


def _device(entry_id: str) -> DeviceInfo:
    return DeviceInfo(
        identifiers={(DOMAIN, entry_id)},
        name="Bambu Filament Manager",
        manufacturer="Community",
        entry_type=DeviceEntryType.SERVICE,
    )


async def async_setup_entry(
    hass: HomeAssistant, entry: FMConfigEntry, async_add_entities: AddConfigEntryEntitiesCallback
) -> None:
    manager = entry.runtime_data
    spool_entities: dict[str, SpoolSensor] = {}
    tray_entities: dict[str, TraySensor] = {}

    async_add_entities([PendingSensor(manager, entry.entry_id)])

    @callback
    def sync() -> None:
        new: list[SensorEntity] = []
        for spool_id in manager.spools:
            if spool_id not in spool_entities:
                ent = SpoolSensor(manager, entry.entry_id, spool_id)
                spool_entities[spool_id] = ent
                new.append(ent)
        ent_reg = er.async_get(hass)
        for spool_id in list(spool_entities):
            if spool_id not in manager.spools:
                ent = spool_entities.pop(spool_id)
                if ent.entity_id and ent_reg.async_get(ent.entity_id):
                    ent_reg.async_remove(ent.entity_id)
                elif ent.hass:
                    hass.async_create_task(ent.async_remove())
        for printer in manager.printers:
            for tray in printer.trays:
                if tray.unique_id not in tray_entities:
                    ent = TraySensor(manager, entry.entry_id, printer.device_id, tray.unique_id)
                    tray_entities[tray.unique_id] = ent
                    new.append(ent)
        if new:
            async_add_entities(new)

    # Remove spool sensors whose spool no longer exists (e.g. deleted while HA was down).
    ent_reg = er.async_get(hass)
    for reg in er.async_entries_for_config_entry(ent_reg, entry.entry_id):
        uid = reg.unique_id or ""
        if uid.startswith("spool_") and uid[6:] not in manager.spools:
            ent_reg.async_remove(reg.entity_id)

    entry.async_on_unload(async_dispatcher_connect(hass, SIGNAL_SPOOLS_CHANGED, sync))
    sync()


class _Base(SensorEntity):
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, manager: FilamentManager, entry_id: str) -> None:
        self.manager = manager
        self._attr_device_info = _device(entry_id)

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(async_dispatcher_connect(self.hass, SIGNAL_UPDATE, self._refresh))

    @callback
    def _refresh(self) -> None:
        self.async_write_ha_state()


class SpoolSensor(_Base):
    """Remaining filament of one spool."""

    _attr_device_class = SensorDeviceClass.WEIGHT
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = UnitOfMass.GRAMS
    _attr_suggested_display_precision = 0
    _attr_icon = "mdi:printer-3d-nozzle"

    def __init__(self, manager: FilamentManager, entry_id: str, spool_id: str) -> None:
        super().__init__(manager, entry_id)
        self.spool_id = spool_id
        self._attr_unique_id = f"spool_{spool_id}"

    @property
    def _spool(self) -> dict[str, Any] | None:
        return self.manager.spools.get(self.spool_id)

    @property
    def available(self) -> bool:
        return self._spool is not None

    @property
    def name(self) -> str:
        sp = self._spool
        return f"Filament {sp['name']}" if sp else "Filament"

    @property
    def native_value(self) -> float | None:
        sp = self._spool
        return sp.get("remaining") if sp else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        sp = self._spool or {}
        loc = self.manager.spool_location(self.spool_id)
        net = sp.get("net_weight") or 0
        return {
            "spool_id": self.spool_id,
            "spool_name": sp.get("name"),
            "vendor": sp.get("vendor"),
            "material": sp.get("material"),
            "filament_id": sp.get("filament_id"),
            "color": "#" + (sp.get("color") or "808080FF"),
            "nozzle_min": sp.get("nozzle_min"),
            "nozzle_max": sp.get("nozzle_max"),
            "bed_temp": sp.get("bed_temp") or None,
            "spool_weight": sp.get("spool_weight"),
            "net_weight": net,
            "percent": round((sp.get("remaining") or 0) / net * 100) if net else None,
            "tag": sp.get("tag"),
            "bambu_spool": bool(sp.get("bambu_uuid")),
            "tray": loc["tray"] if loc else None,
            "tray_entity": loc["entity_id"] if loc else None,
            "last_used": sp.get("last_used"),
        }


class TraySensor(_Base):
    """Which spool sits in an AMS slot."""

    _attr_icon = "mdi:tray"

    def __init__(self, manager: FilamentManager, entry_id: str, printer_id: str, tray_uid: str) -> None:
        super().__init__(manager, entry_id)
        self.printer_id = printer_id
        self.tray_uid = tray_uid
        self._attr_unique_id = f"tray_{tray_uid}"

    def _find(self):
        for p in self.manager.printers:
            for tr in p.trays:
                if tr.unique_id == self.tray_uid:
                    return p, tr
        return None

    @property
    def available(self) -> bool:
        return self._find() is not None

    @property
    def name(self) -> str:
        found = self._find()
        if not found:
            return "Slot"
        p, tr = found
        prefix = f"{p.name} " if len(self.manager.printers) > 1 else ""
        return f"{prefix}Slot {tr.label}"

    @property
    def native_value(self) -> str | None:
        found = self._find()
        if not found:
            return None
        spool, source = self.manager.resolve_tray(found[1])
        if spool:
            return spool["name"]
        name, _rest = self.manager.tray_remaining(found[1])
        return name if source == "bambu" else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        found = self._find()
        if not found:
            return {}
        spool, source = self.manager.resolve_tray(found[1])
        name, rest = self.manager.tray_remaining(found[1])
        return {
            "tray": found[1].label,
            "tray_entity": found[1].entity_id,
            "spool_id": spool["id"] if spool else None,
            "source": source,
            "remaining": round(rest) if rest is not None else None,
        }


class PendingSensor(_Base):
    """The spool scanned last (waiting to be put into a slot)."""

    _attr_icon = "mdi:nfc-variant"
    _attr_translation_key = "pending"

    def __init__(self, manager: FilamentManager, entry_id: str) -> None:
        super().__init__(manager, entry_id)
        self._attr_unique_id = f"{entry_id}_pending"

    @property
    def native_value(self) -> str | None:
        sp = self.manager.spools.get(self.manager.pending or "")
        return sp["name"] if sp else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        sp = self.manager.spools.get(self.manager.pending or "") or {}
        return {"spool_id": sp.get("id"), "remaining": sp.get("remaining"), "unknown_tag": self.manager.unknown_tag}
