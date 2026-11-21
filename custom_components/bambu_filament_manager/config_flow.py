"""Config and options flow."""
from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import (
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
)
from .printer import discover
from .printer_setup import (
    BAMBU_REPOSITORY_ID,
    REGIONS,
    CloudSession,
    add_lan_printer,
    bambu_installed,
    serial_configured,
)

PRINTER_SCHEMA = {
    vol.Required("host"): selector.TextSelector(),
    vol.Required("serial"): selector.TextSelector(),
    vol.Required("access_code"): selector.TextSelector(
        selector.TextSelectorConfig(type=selector.TextSelectorType.PASSWORD)
    ),
}


async def _printer_step(flow, step_id: str, user_input: dict[str, Any] | None, on_success):
    """Shared form: IP, serial number, access code -> set up in Bambu Lab."""
    errors: dict[str, str] = {}
    if user_input is not None:
        if serial_configured(flow.hass, user_input["serial"]):
            errors["base"] = "printer_already_configured"
        else:
            ok, err = await add_lan_printer(
                flow.hass, user_input["host"], user_input["serial"], user_input["access_code"]
            )
            if ok:
                return await on_success()
            errors["base"] = err or "cannot_connect_local_unknown"
    schema = vol.Schema(PRINTER_SCHEMA)
    if user_input is not None:
        schema = flow.add_suggested_values_to_schema(
            schema, {"host": user_input.get("host"), "serial": user_input.get("serial")}
        )
    return flow.async_show_form(step_id=step_id, data_schema=schema, errors=errors)


class CloudSteps:
    """Bambu Cloud login (email, password, code, printer) – shared by config and options flow."""

    _cloud: CloudSession | None = None
    _cloud_printers: list[tuple[str, str]] = []

    async def _printer_added(self) -> ConfigFlowResult:  # pragma: no cover - overridden
        raise NotImplementedError

    def _cloud_next(self, state: dict[str, Any]):
        kind = state["kind"]
        if kind == "done":
            return self._printer_added()
        if kind == "code":
            return self._show_cloud_code(state.get("error"), state.get("tfa", False))
        if kind == "choose":
            self._cloud_printers = state["printers"]
            return self._show_cloud_printer()
        if kind == "abort":
            return None, state["reason"]
        return None, state.get("error") or "cannot_connect"

    async def async_step_cloud(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            self._cloud = self._cloud or CloudSession(self.hass)
            state = await self._cloud.login(user_input["region"], user_input["email"], user_input["password"])
            nxt = self._cloud_next(state)
            if not isinstance(nxt, tuple):
                return await nxt if hasattr(nxt, "__await__") else nxt
            errors["base"] = nxt[1]
        schema = vol.Schema({
            vol.Required("region", default="Europe"): selector.SelectSelector(
                selector.SelectSelectorConfig(options=REGIONS, translation_key="region",
                                              mode=selector.SelectSelectorMode.DROPDOWN)),
            vol.Required("email"): selector.TextSelector(selector.TextSelectorConfig(type=selector.TextSelectorType.EMAIL)),
            vol.Required("password"): selector.TextSelector(selector.TextSelectorConfig(type=selector.TextSelectorType.PASSWORD)),
        })
        if user_input is not None:
            schema = self.add_suggested_values_to_schema(
                schema, {"region": user_input.get("region"), "email": user_input.get("email")})
        return self.async_show_form(step_id="cloud", data_schema=schema, errors=errors)

    def _show_cloud_code(self, error: str | None, tfa: bool) -> ConfigFlowResult:
        return self.async_show_form(
            step_id="cloud_code",
            data_schema=vol.Schema({
                vol.Optional("code", default=""): selector.TextSelector(),
                vol.Optional("new_code", default=False): selector.BooleanSelector(),
            }),
            errors={"base": error} if error else {},
            description_placeholders={"where": "2FA" if tfa else "E-Mail"},
        )

    async def async_step_cloud_code(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is None or self._cloud is None:
            return self._show_cloud_code(None, False)
        if not user_input.get("new_code") and not str(user_input.get("code", "")).strip():
            return self._show_cloud_code("code_needed", self._cloud.code_key == "tfaCode")
        state = await self._cloud.send_code(str(user_input.get("code", "")), bool(user_input.get("new_code")))
        nxt = self._cloud_next(state)
        if isinstance(nxt, tuple):
            return self._show_cloud_code(nxt[1], self._cloud.code_key == "tfaCode")
        return await nxt if hasattr(nxt, "__await__") else nxt

    def _show_cloud_printer(self, error: str | None = None) -> ConfigFlowResult:
        options = [selector.SelectOptionDict(value=v, label=lbl) for v, lbl in self._cloud_printers]
        return self.async_show_form(
            step_id="cloud_printer",
            data_schema=vol.Schema({vol.Required("serial"): selector.SelectSelector(
                selector.SelectSelectorConfig(options=options, mode=selector.SelectSelectorMode.LIST))}),
            errors={"base": error} if error else {},
        )

    async def async_step_cloud_printer(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is None or self._cloud is None:
            return self._show_cloud_printer()
        if serial_configured(self.hass, user_input["serial"]):
            return self._show_cloud_printer("printer_already_configured")
        state = await self._cloud.choose(user_input["serial"])
        nxt = self._cloud_next(state)
        if isinstance(nxt, tuple):
            return self._show_cloud_printer(nxt[1])
        return await nxt if hasattr(nxt, "__await__") else nxt

    def async_remove(self) -> None:
        if self._cloud is not None:
            self._cloud.abort()


class FilamentManagerConfigFlow(CloudSteps, ConfigFlow, domain=DOMAIN):
    """Single-click setup."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if not await bambu_installed(self.hass):
            return await self.async_step_install_bambu()
        printers = discover(self.hass)
        if not printers:
            return await self.async_step_connect()
        return self.async_show_menu(
            step_id="user",
            menu_options=["finish", "printer", "cloud"],
            description_placeholders={"printers": ", ".join(p.name for p in printers)},
        )

    async def async_step_connect(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """No printer yet: local (LAN) or Bambu Cloud?"""
        return self.async_show_menu(step_id="connect", menu_options=["printer", "cloud"])

    async def async_step_install_bambu(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """ha-bambulab provides the printer connection – it has to be installed first."""
        errors = {}
        if user_input is not None:
            if await bambu_installed(self.hass):
                return await self.async_step_user()
            errors["base"] = "bambu_missing"
        return self.async_show_form(
            step_id="install_bambu",
            data_schema=vol.Schema({}),
            errors=errors,
            description_placeholders={"link": f"/marketplace/repository/{BAMBU_REPOSITORY_ID}"},
        )

    async def async_step_printer(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        return await _printer_step(self, "printer", user_input, self.async_step_finish)

    async def async_step_finish(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        return self.async_create_entry(title="Bambu Filament Manager", data={}, options=dict(DEFAULTS))

    async def _printer_added(self) -> ConfigFlowResult:
        return await self.async_step_finish()

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return FilamentManagerOptionsFlow()


class FilamentManagerOptionsFlow(CloudSteps, OptionsFlow):
    """Notifications, defaults and adding printers."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        return self.async_show_menu(step_id="init", menu_options=["settings", "printer", "cloud"])

    async def _printer_added(self) -> ConfigFlowResult:
        return self.async_create_entry(data=dict(self.config_entry.options))

    async def async_step_printer(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        async def done() -> ConfigFlowResult:
            return self.async_create_entry(data=dict(self.config_entry.options))

        return await _printer_step(self, "printer", user_input, done)

    async def async_step_settings(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(data=user_input)

        opts = {**DEFAULTS, **self.config_entry.options}
        manager = getattr(self.config_entry, "runtime_data", None)
        choices: dict[str, str] = manager.notify_choices() if manager else {}
        # keep targets that are currently unavailable so they are not silently dropped
        for target in opts[CONF_NOTIFY_TARGETS]:
            choices.setdefault(target, target)

        tag_choices: dict[str, str] = {}
        try:
            from homeassistant.components.tag import TAG_DATA  # noqa: PLC0415

            coll = self.hass.data.get(TAG_DATA)
            for tag_id, info in (coll.data.items() if coll else []):
                tag_choices[tag_id] = f"{info.get('name') or tag_id} ({tag_id[:8]}…)"
        except Exception:  # noqa: BLE001
            pass
        for tag_id in opts[CONF_IGNORED_TAGS]:
            tag_choices.setdefault(tag_id, tag_id)

        def multi(options: dict[str, str]) -> selector.SelectSelector:
            return selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=[selector.SelectOptionDict(value=k, label=v) for k, v in options.items()],
                    multiple=True,
                    mode=selector.SelectSelectorMode.DROPDOWN,
                    custom_value=False,
                )
            )

        def grams(maximum: int) -> selector.NumberSelector:
            return selector.NumberSelector(
                selector.NumberSelectorConfig(min=0, max=maximum, step=1, unit_of_measurement="g",
                                              mode=selector.NumberSelectorMode.BOX)
            )

        schema = vol.Schema(
            {
                vol.Optional(CONF_NOTIFY_TARGETS, default=opts[CONF_NOTIFY_TARGETS]): multi(choices),
                vol.Optional(CONF_NOTIFY_SCAN, default=opts[CONF_NOTIFY_SCAN]): bool,
                vol.Optional(CONF_NOTIFY_UNKNOWN_TAG, default=opts[CONF_NOTIFY_UNKNOWN_TAG]): bool,
                vol.Optional(CONF_NOTIFY_INSUFFICIENT, default=opts[CONF_NOTIFY_INSUFFICIENT]): bool,
                vol.Optional(CONF_NOTIFY_SUMMARY, default=opts[CONF_NOTIFY_SUMMARY]): bool,
                vol.Optional(CONF_LOW_THRESHOLD, default=opts[CONF_LOW_THRESHOLD]): grams(1000),
                vol.Optional(CONF_DEFAULT_SPOOL_WEIGHT, default=opts[CONF_DEFAULT_SPOOL_WEIGHT]): grams(1000),
                vol.Optional(CONF_DEFAULT_NET_WEIGHT, default=opts[CONF_DEFAULT_NET_WEIGHT]): grams(5000),
                vol.Optional(CONF_TRACK_BAMBU_SPOOLS, default=opts[CONF_TRACK_BAMBU_SPOOLS]): bool,
                vol.Optional(CONF_IGNORED_TAGS, default=opts[CONF_IGNORED_TAGS]): multi(tag_choices),
            }
        )
        return self.async_show_form(step_id="settings", data_schema=schema)
