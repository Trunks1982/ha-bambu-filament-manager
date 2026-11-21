"""Constants for Bambu Filament Manager."""
from __future__ import annotations

DOMAIN = "bambu_filament_manager"
VERSION = "0.1.0"
BAMBU_DOMAIN = "bambu_lab"

STORAGE_KEY = DOMAIN
STORAGE_VERSION = 1

URL_BASE = "/bambu_filament_manager"
CARD_FILE = "bambu-filament-card.js"

SIGNAL_UPDATE = f"{DOMAIN}_update"
SIGNAL_SPOOLS_CHANGED = f"{DOMAIN}_spools_changed"
EVENT_SCANNED = f"{DOMAIN}_spool_scanned"
EVENT_UNKNOWN_TAG = f"{DOMAIN}_unknown_tag"
EVENT_CONSUMED = f"{DOMAIN}_consumed"

# Options
CONF_NOTIFY_TARGETS = "notify_targets"
CONF_NOTIFY_SCAN = "notify_scan"
CONF_NOTIFY_UNKNOWN_TAG = "notify_unknown_tag"
CONF_NOTIFY_INSUFFICIENT = "notify_insufficient"
CONF_NOTIFY_SUMMARY = "notify_summary"
CONF_LOW_THRESHOLD = "low_threshold"
CONF_DEFAULT_SPOOL_WEIGHT = "default_spool_weight"
CONF_DEFAULT_NET_WEIGHT = "default_net_weight"
CONF_IGNORED_TAGS = "ignored_tags"
CONF_TRACK_BAMBU_SPOOLS = "track_bambu_spools"

DEFAULTS = {
    CONF_NOTIFY_TARGETS: [],
    CONF_NOTIFY_SCAN: True,
    CONF_NOTIFY_UNKNOWN_TAG: True,
    CONF_NOTIFY_INSUFFICIENT: True,
    CONF_NOTIFY_SUMMARY: True,
    CONF_LOW_THRESHOLD: 100,
    CONF_DEFAULT_SPOOL_WEIGHT: 240,
    CONF_DEFAULT_NET_WEIGHT: 1000,
    CONF_IGNORED_TAGS: [],
    CONF_TRACK_BAMBU_SPOOLS: True,
}

# Printer states (sensor with translation_key "print_status")
ACTIVE_STATES = {"prepare", "running", "pause", "slicing", "init"}
END_STATES = {"finish", "failed"}

# Attributes on the print_weight sensor that are not slot weights
NON_SLOT_ATTRS = {
    "state_class", "unit_of_measurement", "device_class", "friendly_name", "icon",
    "attribution", "entity_picture", "assumed_state", "supported_features",
}

EMPTY_UUID = "00000000000000000000000000000000"
