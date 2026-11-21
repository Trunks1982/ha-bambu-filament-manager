"""Set up a printer in the Bambu Lab integration (ha-bambulab) from our own dialog.

We drive the LAN branch of ha-bambulab's config flow in the background, so the user only
enters IP address, serial number and access code once. The fields of that flow are read
from its form (not hard coded), so new optional fields keep their defaults.
"""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant.config_entries import SOURCE_USER
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.loader import IntegrationNotFound, async_get_integration

from .const import BAMBU_DOMAIN

_LOGGER = logging.getLogger(__name__)

# Marketplace / HACS id of greghesp/ha-bambulab (shown as a link when it is missing)
BAMBU_REPOSITORY_ID = "588734673"

KNOWN_ERRORS = {
    "cannot_connect_local_timeout",
    "cannot_connect_local_access_denied",
    "cannot_connect_local_incorrect_serial",
    "cannot_connect_local_incorrect_address",
    "cannot_connect_local_address_unreachable",
    "cannot_connect_local_unknown",
}


async def bambu_installed(hass: HomeAssistant) -> bool:
    try:
        await async_get_integration(hass, BAMBU_DOMAIN)
    except IntegrationNotFound:
        return False
    return True


def serial_configured(hass: HomeAssistant, serial: str) -> bool:
    serial = serial.strip().upper()
    for entry in hass.config_entries.async_entries(BAMBU_DOMAIN):
        if str(entry.data.get("serial", "")).upper() == serial:
            return True
    return False


def _fill(schema: vol.Schema, given: dict[str, Any]) -> dict[str, Any]:
    """Answer a form: our values where we have them, defaults everywhere else."""
    out: dict[str, Any] = {}
    for key, value in schema.schema.items():
        name = str(getattr(key, "schema", key))
        inner = getattr(value, "schema", None)  # data_entry_flow.section
        if name in given:
            out[name] = given[name]
        elif isinstance(inner, vol.Schema):
            out[name] = _fill(inner, given)
        elif getattr(key, "default", vol.UNDEFINED) is not vol.UNDEFINED:
            out[name] = key.default()
    return out


async def add_lan_printer(hass: HomeAssistant, host: str, serial: str, access_code: str) -> tuple[bool, str | None]:
    """Run ha-bambulab's LAN setup. Returns (ok, error_key)."""
    manager = hass.config_entries.flow
    given = {"host": host.strip(), "serial": serial.strip().upper(), "access_code": access_code.strip()}
    flow_id = None
    try:
        result = await manager.async_init(BAMBU_DOMAIN, context={"source": SOURCE_USER})
        flow_id = result.get("flow_id")
        for _ in range(4):  # user -> Lan -> entry
            rtype = result.get("type")
            if rtype == FlowResultType.CREATE_ENTRY:
                return True, None
            if rtype == FlowResultType.ABORT:
                return False, "bambu_" + str(result.get("reason") or "aborted")
            if rtype != FlowResultType.FORM:
                return False, "bambu_flow_unexpected"
            step = result.get("step_id")
            errors = result.get("errors") or {}
            if errors and step == "Lan":
                err = str(errors.get("base", "cannot_connect_local_unknown"))
                return False, err if err in KNOWN_ERRORS else "cannot_connect_local_unknown"
            if step == "user":
                result = await manager.async_configure(flow_id, {"printer_mode": "lan"})
            elif step == "Lan":
                answer = _fill(result["data_schema"], given)
                result = await manager.async_configure(flow_id, answer)
            else:
                return False, "bambu_flow_unexpected"
        return False, "bambu_flow_unexpected"
    except Exception as err:  # noqa: BLE001
        _LOGGER.warning("Setting up the printer in Bambu Lab failed: %r", err, exc_info=True)
        return False, "bambu_flow_unexpected"
    finally:
        if flow_id and flow_id in {f["flow_id"] for f in manager.async_progress()}:
            manager.async_abort(flow_id)
