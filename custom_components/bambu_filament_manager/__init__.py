"""Bambu Filament Manager – spool inventory, NFC and AMS card for ha-bambulab printers."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall, ServiceResponse, SupportsResponse, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.typing import ConfigType

from .const import CARD_FILE, DOMAIN, SIGNAL_UPDATE, URL_BASE, VERSION
from .manager import FilamentManager

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.SENSOR]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

type FMConfigEntry = ConfigEntry[FilamentManager]

SPOOL_SCHEMA = {
    vol.Optional("name"): cv.string,
    vol.Optional("vendor"): cv.string,
    vol.Optional("material"): cv.string,
    vol.Optional("filament_id"): cv.string,
    vol.Optional("color"): cv.string,
    vol.Optional("nozzle_min"): vol.Coerce(int),
    vol.Optional("nozzle_max"): vol.Coerce(int),
    vol.Optional("spool_weight"): vol.Coerce(float),
    vol.Optional("net_weight"): vol.Coerce(float),
    vol.Optional("remaining"): vol.Coerce(float),
    vol.Optional("gross_weight"): vol.Coerce(float),
    vol.Optional("tag"): cv.string,
    vol.Optional("note"): cv.string,
}


def _manager(hass: HomeAssistant) -> FilamentManager:
    entries = hass.config_entries.async_loaded_entries(DOMAIN)
    if not entries:
        raise vol.Invalid("Bambu Filament Manager is not set up")
    return entries[0].runtime_data


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register frontend, services and websocket commands once."""
    await hass.http.async_register_static_paths(
        [StaticPathConfig(URL_BASE, str(Path(__file__).parent / "frontend"), False)]
    )
    card = Path(__file__).parent / "frontend" / CARD_FILE
    mtime = await hass.async_add_executor_job(lambda: int(card.stat().st_mtime))
    add_extra_js_url(hass, f"{URL_BASE}/{CARD_FILE}?v={VERSION}-{mtime}")

    websocket_api.async_register_command(hass, ws_subscribe)
    websocket_api.async_register_command(hass, ws_catalog)
    websocket_api.async_register_command(hass, ws_get)
    _register_services(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: FMConfigEntry) -> bool:
    manager = FilamentManager(hass, entry)
    await manager.async_setup()
    entry.runtime_data = manager
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_options_updated))
    return True


async def _options_updated(hass: HomeAssistant, entry: FMConfigEntry) -> None:
    entry.runtime_data._notify_listeners(spools_changed=True)  # noqa: SLF001


async def async_unload_entry(hass: HomeAssistant, entry: FMConfigEntry) -> bool:
    ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if ok:
        await entry.runtime_data.async_unload()
    return ok


# ---------------------------------------------------------------------- services
def _register_services(hass: HomeAssistant) -> None:
    async def add_spool(call: ServiceCall) -> ServiceResponse:
        data = dict(call.data)
        spool = await _manager(hass).async_add_spool(data)
        return {"spool": spool}

    async def update_spool(call: ServiceCall) -> ServiceResponse:
        data = dict(call.data)
        spool_id = data.pop("spool_id")
        spool = await _manager(hass).async_update_spool(spool_id, data)
        return {"spool": spool}

    async def delete_spool(call: ServiceCall) -> None:
        await _manager(hass).async_delete_spool(call.data["spool_id"], call.data.get("delete_tag", False))

    async def weigh_spool(call: ServiceCall) -> ServiceResponse:
        spool = await _manager(hass).async_weigh(call.data["spool_id"], call.data["gross_weight"])
        return {"spool": spool}

    async def consume(call: ServiceCall) -> ServiceResponse:
        spool = await _manager(hass).async_consume(call.data["spool_id"], call.data["grams"])
        return {"spool": spool}

    async def assign_spool(call: ServiceCall) -> None:
        await _manager(hass).async_assign(call.data["tray"], call.data.get("spool_id"), call.data.get("send", True))

    async def unassign_tray(call: ServiceCall) -> None:
        await _manager(hass).async_unassign(call.data["tray"])

    async def select_spool(call: ServiceCall) -> None:
        await _manager(hass).async_set_pending(call.data.get("spool_id"))

    async def clear_unknown_tag(call: ServiceCall) -> None:
        await _manager(hass).async_clear_unknown_tag()

    async def list_spools(call: ServiceCall) -> ServiceResponse:
        m = _manager(hass)
        spools = []
        for sp in m.spools.values():
            spools.append({**sp, "location": m.spool_location(sp["id"])})
        return {"spools": spools}

    tray = vol.Required("tray")
    spool_id = vol.Required("spool_id")
    hass.services.async_register(DOMAIN, "add_spool", add_spool,
                                 vol.Schema({**SPOOL_SCHEMA, vol.Required("name"): cv.string,
                                             vol.Optional("tray"): cv.entity_id}),
                                 supports_response=SupportsResponse.OPTIONAL)
    hass.services.async_register(DOMAIN, "update_spool", update_spool,
                                 vol.Schema({spool_id: cv.string, **SPOOL_SCHEMA}),
                                 supports_response=SupportsResponse.OPTIONAL)
    hass.services.async_register(DOMAIN, "delete_spool", delete_spool,
                                 vol.Schema({spool_id: cv.string, vol.Optional("delete_tag", default=False): cv.boolean}))
    hass.services.async_register(DOMAIN, "weigh_spool", weigh_spool,
                                 vol.Schema({spool_id: cv.string, vol.Required("gross_weight"): vol.Coerce(float)}),
                                 supports_response=SupportsResponse.OPTIONAL)
    hass.services.async_register(DOMAIN, "consume", consume,
                                 vol.Schema({spool_id: cv.string, vol.Required("grams"): vol.Coerce(float)}),
                                 supports_response=SupportsResponse.OPTIONAL)
    hass.services.async_register(DOMAIN, "assign_spool", assign_spool,
                                 vol.Schema({tray: cv.entity_id, vol.Optional("spool_id"): cv.string,
                                             vol.Optional("send", default=True): cv.boolean}))
    hass.services.async_register(DOMAIN, "unassign_tray", unassign_tray, vol.Schema({tray: cv.entity_id}))
    hass.services.async_register(DOMAIN, "select_spool", select_spool,
                                 vol.Schema({vol.Optional("spool_id"): vol.Any(None, cv.string)}))
    hass.services.async_register(DOMAIN, "clear_unknown_tag", clear_unknown_tag, vol.Schema({}))
    hass.services.async_register(DOMAIN, "list_spools", list_spools, vol.Schema({}),
                                 supports_response=SupportsResponse.ONLY)


# ---------------------------------------------------------------------- websocket
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/subscribe"})
@callback
def ws_subscribe(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Push the manager state to the card whenever it changes."""
    msg_id = msg["id"]

    @callback
    def send() -> None:
        try:
            data = _manager(hass).as_dict()
        except vol.Invalid:
            data = {"printers": [], "spools": [], "not_loaded": True}
        connection.send_message(websocket_api.event_message(msg_id, data))

    connection.subscriptions[msg_id] = async_dispatcher_connect(hass, SIGNAL_UPDATE, send)
    connection.send_result(msg_id)
    send()


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/get"})
@callback
def ws_get(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    connection.send_result(msg["id"], _manager(hass).as_dict())


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/catalog"})
@callback
def ws_catalog(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    connection.send_result(msg["id"], {"filaments": _manager(hass).catalog_list()})
