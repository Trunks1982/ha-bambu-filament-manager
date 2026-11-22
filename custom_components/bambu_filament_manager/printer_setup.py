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


# --------------------------------------------------------------------------- cloud
CLOUD_ERRORS = {
    "cannot_connect", "code_needed", "code_expired", "code_incorrect", "verifyCode", "tfaCode",
    "tfa_csrf_fallback", "cannot_connect_cloud_timeout", "cannot_connect_cloud_access_denied",
    "cannot_connect_cloud_connection_refused", "cannot_connect_cloud_address_unreachable",
    "cannot_connect_cloud_unknown",
}
# our selector values (lowercase, as HA translation keys require) -> values ha-bambulab expects
REGIONS = {"europe": "Europe", "northamerica": "NorthAmerica", "asiapacific": "AsiaPacific", "china": "China", "other": "Other"}


def _schema_keys(schema: vol.Schema | None) -> list[str]:
    return [str(getattr(k, "schema", k)) for k in (schema.schema if schema is not None else {})]


def _select_options(schema: vol.Schema, field: str) -> list[tuple[str, str]]:
    for key, value in schema.schema.items():
        if str(getattr(key, "schema", key)) != field:
            continue
        options = (getattr(value, "config", None) or {}).get("options", [])
        out = []
        for opt in options:
            if isinstance(opt, dict):
                out.append((str(opt.get("value")), str(opt.get("label") or opt.get("value"))))
            else:
                out.append((str(opt), str(opt)))
        return out
    return []


class CloudSession:
    """Drives the Bambu Cloud branch of ha-bambulab's config flow step by step.

    Each call returns a state dict for our own dialog:
      {"kind": "code", "error": key|None}            – ask for the code from the Bambu email / 2FA app
      {"kind": "choose", "printers": [(serial, label)]}
      {"kind": "done"} | {"kind": "error", "error": key} | {"kind": "abort", "reason": key}
    """

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.flow_id: str | None = None
        self.code_key = "verifyCode"
        self._login: dict[str, Any] = {}

    def abort(self) -> None:
        manager = self.hass.config_entries.flow
        if self.flow_id and self.flow_id in {f["flow_id"] for f in manager.async_progress()}:
            manager.async_abort(self.flow_id)
        self.flow_id = None

    async def login(self, region: str, email: str, password: str) -> dict[str, Any]:
        self.abort()
        manager = self.hass.config_entries.flow
        self._login = {"region": REGIONS.get(region, region), "email": email.strip(), "password": password}
        try:
            result = await manager.async_init(BAMBU_DOMAIN, context={"source": SOURCE_USER})
            self.flow_id = result.get("flow_id")
            if result.get("type") == FlowResultType.FORM and result.get("step_id") == "user":
                result = await manager.async_configure(self.flow_id, {"printer_mode": "bambu"})
            if result.get("type") != FlowResultType.FORM or result.get("step_id") != "Bambu":
                return await self._interpret(result, submitted=False)
            result = await manager.async_configure(self.flow_id, _fill(result["data_schema"], self._login))
            return await self._interpret(result, submitted=True)
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("Bambu Cloud login failed: %r", err, exc_info=True)
            self.abort()
            return {"kind": "error", "error": "bambu_flow_unexpected"}

    async def send_code(self, code: str, new_code: bool = False) -> dict[str, Any]:
        if not self.flow_id:
            return {"kind": "error", "error": "bambu_flow_unexpected"}
        answer: dict[str, Any] = {"newCode": True} if new_code else {self.code_key: code.strip()}
        try:
            result = await self.hass.config_entries.flow.async_configure(self.flow_id, answer)
            return await self._interpret(result, submitted=True)
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("Bambu Cloud code failed: %r", err, exc_info=True)
            return {"kind": "error", "error": "bambu_flow_unexpected"}

    async def choose(self, serial: str) -> dict[str, Any]:
        if not self.flow_id:
            return {"kind": "error", "error": "bambu_flow_unexpected"}
        try:
            result = await self.hass.config_entries.flow.async_configure(self.flow_id, {"serial": serial})
            return await self._interpret(result, submitted=True)
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("Bambu Cloud printer choice failed: %r", err, exc_info=True)
            return {"kind": "error", "error": "bambu_flow_unexpected"}

    async def _interpret(self, result: dict[str, Any], submitted: bool) -> dict[str, Any]:
        rtype = result.get("type")
        if rtype == FlowResultType.CREATE_ENTRY:
            self.flow_id = None
            return {"kind": "done"}
        if rtype == FlowResultType.ABORT:
            self.flow_id = None
            return {"kind": "abort", "reason": "bambu_" + str(result.get("reason") or "aborted")}
        if rtype != FlowResultType.FORM:
            self.abort()
            return {"kind": "error", "error": "bambu_flow_unexpected"}
        step = result.get("step_id")
        schema = result.get("data_schema")
        keys = _schema_keys(schema)
        err = str((result.get("errors") or {}).get("base") or "") or None
        if err is not None and err not in CLOUD_ERRORS and err not in KNOWN_ERRORS:
            err = "cannot_connect"
        if step == "Bambu":
            if "verifyCode" in keys or "tfaCode" in keys:
                self.code_key = "tfaCode" if "tfaCode" in keys else "verifyCode"
                # the "code required" messages are not errors for the user, just the next step
                return {"kind": "code", "error": None if err in ("verifyCode", "tfaCode") else err,
                        "tfa": self.code_key == "tfaCode"}
            return {"kind": "error", "error": err or "cannot_connect"}
        if step == "Bambu_Choose_Device":
            printers = _select_options(schema, "serial")
            if len(printers) == 1:
                return await self.choose(printers[0][0])
            return {"kind": "choose", "printers": printers}
        if step == "Bambu_Lan":
            if err and err.startswith("cannot_connect_cloud"):
                self.abort()
                return {"kind": "error", "error": err}
            # Pure cloud connection: no local MQTT test (works without being in the same network).
            answer = _fill(schema, {"local_mqtt": False, "skip_local_mqtt": True, "host": ""})
            result = await self.hass.config_entries.flow.async_configure(self.flow_id, answer)
            if result.get("type") == FlowResultType.FORM and result.get("step_id") == "Bambu_Lan":
                e = str((result.get("errors") or {}).get("base") or "cannot_connect_cloud_unknown")
                self.abort()
                return {"kind": "error", "error": e if e in CLOUD_ERRORS or e in KNOWN_ERRORS else "cannot_connect_cloud_unknown"}
            return await self._interpret(result, submitted=True)
        self.abort()
        return {"kind": "error", "error": "bambu_flow_unexpected"}
