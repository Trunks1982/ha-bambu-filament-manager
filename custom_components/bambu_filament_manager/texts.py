"""Notification and error texts (German and English, English is the fallback)."""
from __future__ import annotations

from typing import Any

TEXTS: dict[str, dict[str, str]] = {
    "en": {
        "persistent": "notification in HA",
        "scan_title": "🎨 {name}",
        "scan_msg": "{material} | 🌡️ {tmin}–{tmax} °C | 🧵 {rest} g\nTap a slot in the AMS card to load it.",
        "scan_loc": "Currently in slot {tray}.",
        "scan_line": "{material} · {tmin}–{tmax} °C · {rest} g left",
        "scan_pick": "Choose a slot ↓",
        "scan_no_slot": "No free slot – choose one in the filament card.",
        "btn_empty": "empty",
        "btn_back": "back",
        "btn_sent": "Profile, color and temperature were sent to the AMS.",
        "btn_linked": "Linked. Set color and profile on the printer (no LAN developer mode).",
        "btn_expired_title": "⏱️ Button expired",
        "btn_expired": "Please scan the spool again.",
        "unknown_title": "🆕 Unknown NFC sticker",
        "unknown_msg": "New spool? Create it in the filament card – the sticker is already filled in.",
        "short_title": "⚠️ Not enough filament!",
        "short_msg": "“{job}”\n{lines}\nSwap the spool in time or stop the print.",
        "short_line": "Slot {tray} {name}: needs {need} g, only {rest} g left",
        "used_title": "🧵 Filament after “{job}”",
        "used_title_low": "⚠️ Filament after “{job}”",
        "used_line": "{tray} {name}: {used} g used, {rest} g left",
        "low_mark": "⚠️ almost empty!",
        "aborted": "(cancelled)",
        "err_name": "Please enter a name.",
        "err_tag_used": "This NFC sticker already belongs to another spool.",
        "err_no_spool": "Spool not found.",
        "err_no_tray": "Slot not found.",
        "err_no_pending": "No spool selected – scan a spool or choose one.",
        "err_tray_active": "This slot is printing right now – please choose another one.",
        "err_bambu_spool": "An original Bambu spool (RFID) is loaded here – the AMS manages it itself.",
        "err_no_profile": "The spool has no filament profile (filament ID).",
    },
    "de": {
        "persistent": "Benachrichtigung in HA",
        "scan_title": "🎨 {name}",
        "scan_msg": "{material} | 🌡️ {tmin}–{tmax} °C | 🧵 {rest} g\nIn der AMS-Karte einen Slot antippen zum Einlegen.",
        "scan_loc": "Steckt gerade in Slot {tray}.",
        "scan_line": "{material} · {tmin}–{tmax} °C · noch {rest} g",
        "scan_pick": "Slot wählen ↓",
        "scan_no_slot": "Kein Slot frei – in der Filament-Karte wählen.",
        "btn_empty": "leer",
        "btn_back": "zurück",
        "btn_sent": "Profil, Farbe und Temperatur wurden ans AMS gesendet.",
        "btn_linked": "Verknüpft. Farbe und Profil am Drucker einstellen (kein LAN-Entwicklermodus).",
        "btn_expired_title": "⏱️ Knopf abgelaufen",
        "btn_expired": "Bitte die Rolle noch einmal scannen.",
        "unknown_title": "🆕 Unbekannter NFC-Aufkleber",
        "unknown_msg": "Neue Rolle? In der Filament-Karte anlegen – der Aufkleber ist schon eingetragen.",
        "short_title": "⚠️ Filament reicht nicht!",
        "short_msg": "„{job}“\n{lines}\nRechtzeitig Rolle tauschen oder Druck stoppen.",
        "short_line": "Slot {tray} {name}: braucht {need} g, hat nur noch {rest} g",
        "used_title": "🧵 Filament nach „{job}“",
        "used_title_low": "⚠️ Filament nach „{job}“",
        "used_line": "{tray} {name}: {used} g verbraucht, noch {rest} g",
        "low_mark": "⚠️ fast leer!",
        "aborted": "(abgebrochen)",
        "err_name": "Bitte einen Namen eintragen.",
        "err_tag_used": "Dieser NFC-Aufkleber gehört schon zu einer anderen Rolle.",
        "err_no_spool": "Rolle nicht gefunden.",
        "err_no_tray": "Slot nicht gefunden.",
        "err_no_pending": "Keine Rolle gewählt – Rolle scannen oder auswählen.",
        "err_tray_active": "Dieser Slot druckt gerade – bitte einen anderen wählen.",
        "err_bambu_spool": "Hier steckt eine Original-Bambu-Rolle (RFID) – die verwaltet das AMS selbst.",
        "err_no_profile": "Die Rolle hat kein Filament-Profil (Filament-ID).",
    },
}


def t(lang: str, key: str, **kwargs: Any) -> str:
    """Translate a key."""
    table = TEXTS.get(lang) or TEXTS["en"]
    text = table.get(key) or TEXTS["en"].get(key, key)
    try:
        return text.format(**kwargs)
    except (KeyError, IndexError, ValueError):
        return text
