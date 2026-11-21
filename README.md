# Bambu Filament Manager

Spool inventory for Bambu Lab printers in Home Assistant – with an AMS card that looks like Bambu Studio, NFC stickers, live usage tracking and notifications.

One setup dialog for printer and filament – the printer connection runs through the [Bambu Lab integration (ha-bambulab)](https://github.com/greghesp/ha-bambulab) in the background. No helpers, scripts or automations needed.

## Features
- **AMS card like the original**: spools in their real colors with the remaining amount, active slot, humidity/temperature, external spool, AMS HT. Printer picture, cover image of the print, progress, layer, remaining time, temperatures, optional camera.
- **Spool inventory**: name, vendor, Bambu filament profile (catalog), color, nozzle temperatures, empty spool weight, remaining grams. Weighing: enter what the scale shows, the empty spool is subtracted.
- **Load into a slot** with one tap – profile, color and temperatures are sent to the AMS.
- **NFC**: scan a sticker with the HA app → the spool is selected, tap a slot to load it. Unknown sticker → the card offers to create a new spool with it.
- **Live usage**: while printing, the grams are subtracted proportionally to the print progress. Cancelled prints only count the printed part. Survives restarts without double counting.
- **Warnings**: “not enough filament for this print” at print start, “almost empty” after the print.
- **Notifications** to any notification service set up in your HA (mobile app, Telegram, WhatsApp integrations, …) – text only, selectable in the options.
- **Original Bambu spools (RFID)** are added automatically; the AMS reports their rest.
- Sensors per spool and per slot, events, and actions (`bambu_filament_manager.add_spool`, `assign_spool`, `weigh_spool`, …) for your own automations.

## Installation
1. Marketplace (or HACS) → ⋮ → Custom repositories → add `Trunks1982/ha-bambu-filament-manager` (type *Integration*) → download → restart Home Assistant.
2. Settings → Devices & services → Add integration → **Bambu Filament Manager**.
3. Enter the printer's **IP address, serial number and access code** (shown on the printer screen). The printer connection itself is set up in the background in the [Bambu Lab integration (ha-bambulab)](https://github.com/greghesp/ha-bambulab), so it keeps getting their updates for new printers and firmware. If ha-bambulab is not installed yet, the dialog links to it.
   Already have a printer in ha-bambulab? Then it is found automatically – nothing to enter.
4. More printers: integration → *Configure* → *Add printer*.

Filament usage per print needs the 3MF to be readable by ha-bambulab (on printers without SD card: USB stick and “store sent files on external storage” in Bambu Studio).

Add the card in the dashboard: “Bambu Filament” (`type: custom:bambu-filament-card`). It is loaded automatically – no resource needed.

```yaml
type: custom:bambu-filament-card
printer: <device id>   # optional, first printer by default
show_camera: false
show_spools: true
```
