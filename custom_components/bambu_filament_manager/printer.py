"""Discovery of Bambu Lab printers, AMS units and trays from the ha-bambulab registry entries.

Nothing here depends on entity ids or the UI language: entities are found by device and
translation_key, which ha-bambulab keeps stable.
"""
from __future__ import annotations

from dataclasses import dataclass, field
import re
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er

from .const import BAMBU_DOMAIN

# Printer-level entities the card / manager are interested in (translation_key -> role)
PRINTER_KEYS = {
    "print_status", "print_progress", "print_weight", "print_length", "subtask_name",
    "active_tray", "stage", "remaining_time", "end_time", "start_time", "current_layer",
    "total_layers", "nozzle_temp", "target_nozzle_temp", "bed_temp", "target_bed_temp",
    "chamber_temp", "cover_image", "pick_image", "camera", "online", "hms_errors",
    "print_error", "door_open", "chamber_light", "pause", "resume", "stop", "speed_profile",
    "printing_speed", "print_bed_type", "nozzle_diameter", "nozzle_type", "total_usage_hours",
    "wifi_signal", "gcode_file", "mqtt_mode", "camera_switch", "developer_lan_mode",
}
UNIT_KEYS = {
    "humidity", "humidity_index", "ams_temp", "drying", "remaining_drying_time",
    "ams_status", "active_ams",
}

_AMS_RE = re.compile(r"_AMS_(\d+|3H)$")
_EXT_RE = re.compile(r"_ExternalSpool(\d*)$")


@dataclass
class Tray:
    """One spool position (AMS slot or external spool holder)."""

    entity_id: str
    unique_id: str
    key: str  # key used by ha-bambulab in print_weight attributes, e.g. "AMS 1 Tray 2"
    label: str  # short label like in Bambu Studio: A1, B3, HT1, Ext
    slot: int
    external: bool = False


@dataclass
class Unit:
    """An AMS unit or an external spool holder."""

    device_id: str
    name: str  # "AMS 1", "AMS HT 1", "Ext" ...
    model: str
    kind: str  # "ams", "ams_ht", "ams_lite", "external"
    entities: dict[str, str] = field(default_factory=dict)
    trays: list[Tray] = field(default_factory=list)


@dataclass
class Printer:
    """A printer with its units."""

    device_id: str
    name: str
    model: str
    serial: str
    entities: dict[str, str] = field(default_factory=dict)
    units: list[Unit] = field(default_factory=list)

    @property
    def trays(self) -> list[Tray]:
        return [t for u in self.units for t in u.trays]

    def tray_by_key(self, key: str) -> Tray | None:
        for tray in self.trays:
            if tray.key == key:
                return tray
        return None

    def as_dict(self) -> dict[str, Any]:
        return {
            "device_id": self.device_id,
            "name": self.name,
            "model": self.model,
            "serial": self.serial,
            "entities": self.entities,
            "units": [
                {
                    "device_id": u.device_id,
                    "name": u.name,
                    "model": u.model,
                    "kind": u.kind,
                    "entities": u.entities,
                    "trays": [
                        {
                            "entity_id": t.entity_id,
                            "key": t.key,
                            "label": t.label,
                            "slot": t.slot,
                            "external": t.external,
                        }
                        for t in u.trays
                    ],
                }
                for u in self.units
            ],
        }


def _letter(n: int) -> str:
    return chr(ord("A") + (n - 1) % 26)


def discover(hass: HomeAssistant) -> list[Printer]:
    """Build the printer list from the device and entity registries."""
    dev_reg = dr.async_get(hass)
    ent_reg = er.async_get(hass)

    by_device: dict[str, list[er.RegistryEntry]] = {}
    for entry in ent_reg.entities.values():
        if entry.platform != BAMBU_DOMAIN or not entry.device_id or entry.disabled_by:
            continue
        by_device.setdefault(entry.device_id, []).append(entry)

    printers: list[Printer] = []
    for device_id, entries in by_device.items():
        keys = {e.translation_key for e in entries}
        if "print_status" not in keys:
            continue
        device = dev_reg.async_get(device_id)
        if device is None:
            continue
        ents: dict[str, str] = {}
        for e in entries:
            if e.translation_key in PRINTER_KEYS:
                k = e.translation_key
                if k == "camera" and e.domain == "switch":
                    k = "camera_switch"
                ents.setdefault(k, e.entity_id)
        serial = ""
        for ident in device.identifiers:
            if ident[0] == BAMBU_DOMAIN:
                serial = str(ident[1])
        printer = Printer(
            device_id=device_id,
            name=device.name_by_user or device.model or device.name or "Bambu Lab",
            model=device.model or "",
            serial=serial,
            entities=ents,
        )

        children = [
            d
            for entry_id in (
                [device.config_entry_id] if getattr(device, "config_entry_id", None) else device.config_entries
            )
            for d in dr.async_entries_for_config_entry(dev_reg, entry_id)
            if d.via_device_id == device_id
        ]
        ams_units: list[tuple[int, Unit]] = []
        ext_units: list[tuple[int, Unit]] = []
        for child in children:
            centries = by_device.get(child.id, [])
            if not centries:
                continue
            raw_name = child.name or ""
            m_ams = _AMS_RE.search(raw_name)
            m_ext = _EXT_RE.search(raw_name)
            if m_ams:
                if m_ams.group(1) == "3H":
                    continue  # unusual unit without a print_weight key mapping
                idx = int(m_ams.group(1))
                is_ht = idx >= 128 or "HT" in (child.model or "")
                if is_ht:
                    ht_no = idx - 127 if idx >= 128 else idx
                    unit = Unit(child.id, f"AMS HT {ht_no}", child.model or "AMS HT", "ams_ht")
                else:
                    kind = "ams_lite" if "lite" in (child.model or "").lower() else "ams"
                    unit = Unit(child.id, f"AMS {idx}", child.model or "AMS", kind)
                for e in centries:
                    if e.translation_key in UNIT_KEYS:
                        unit.entities.setdefault(e.translation_key, e.entity_id)
                trays = []
                for e in centries:
                    if e.translation_key != "tray" or e.domain != "sensor":
                        continue
                    m = re.search(r"_tray_(\d+)$", e.unique_id or "")
                    slot = int(m.group(1)) if m else 1
                    if is_ht:
                        key = f"AMS HT {ht_no}"
                        label = f"HT{ht_no}"
                    else:
                        key = f"AMS {idx} Tray {slot}"
                        label = f"{_letter(idx)}{slot}"
                    trays.append(Tray(e.entity_id, e.unique_id, key, label, slot))
                unit.trays = sorted(trays, key=lambda t: t.slot)
                if unit.trays:
                    ams_units.append((idx if not is_ht else 1000 + idx, unit))
            elif m_ext:
                suffix = m_ext.group(1)
                no = int(suffix) if suffix else 1
                unit = Unit(child.id, "Ext" if no == 1 else f"Ext {no}", "External Spool", "external")
                for e in centries:
                    if e.translation_key in UNIT_KEYS:
                        unit.entities.setdefault(e.translation_key, e.entity_id)
                    if e.domain == "sensor" and (e.translation_key or "").startswith("external_spool"):
                        key = "External Spool" if no == 1 else f"External Spool {no}"
                        unit.trays.append(
                            Tray(e.entity_id, e.unique_id, key, "Ext" if no == 1 else f"Ext{no}", no, True)
                        )
                if unit.trays:
                    ext_units.append((no, unit))
        printer.units = [u for _, u in sorted(ams_units, key=lambda x: x[0])] + [
            u for _, u in sorted(ext_units, key=lambda x: x[0])
        ]
        printers.append(printer)
    printers.sort(key=lambda p: p.name)
    return printers
