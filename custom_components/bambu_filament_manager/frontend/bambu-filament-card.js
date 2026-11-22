/* Bambu Filament Card – part of the Bambu Filament Manager integration.
 * Shows printer status and the AMS like in Bambu Studio / Handy, and manages spools.
 * No build step, no external dependencies. */
const DOMAIN = "bambu_filament_manager";
const CARD_VERSION = "0.7.0";

const I18N = {
  en: {
    status: { running: "Printing", pause: "Paused", finish: "Finished", failed: "Failed", idle: "Idle", prepare: "Preparing", slicing: "Slicing", init: "Starting", offline: "Offline", unknown: "Unknown" },
    layers: "Layer", left: "left", done_at: "done at", nozzle: "Nozzle", bed: "Bed", chamber: "Chamber",
    spools: "Spools", new_spool: "New spool", no_printer: "No Bambu Lab printer found. Is the Bambu Lab integration installed?",
    not_loaded: "The Bambu Filament Manager integration is not set up yet (Settings → Devices & services).",
    empty: "Empty", unknown_spool: "?", drying: "Drying", scanned: "Scanned", tap_slot: "tap a slot to load it",
    cancel: "Cancel", unknown_tag: "Unknown NFC sticker", create_spool: "Create spool", discard: "Discard",
    slot: "Slot", linked: "Linked spool", none_linked: "No spool linked", bambu_rfid: "Original Bambu spool (RFID) – the AMS tracks the rest itself.",
    put_here: "Load here", assign: "Choose spool for this slot", search: "Search…", unlink: "Unlink", close: "Close",
    new_for_slot: "New spool for this slot", stale: "The slot shows different filament than the linked spool – choose the spool again.",
    on_printer: "Set on printer", name: "Name", vendor: "Vendor", profile: "Filament profile", custom_id: "Other filament ID…",
    material: "Material", filament_id: "Filament ID", color: "Color", nozzle: "Nozzle °C", spool_weight: "Empty spool (g)",
    net_weight: "Filament when new (g)", price: "Price of the spool", this_month: "This month", prints: "prints", export: "Export", import: "Import", imported: "Imported", added: "new", updated: "updated", import_err: "Not a valid export file", bed: "Bed °C", bed_auto: "auto", bed_hint: "empty = from the profile for this printer and plate", bed_short: "Bed", sw_hint: "(remembered per vendor)", remaining: "Remaining (g)", scale: "Or weigh: scale shows (g)", tag: "NFC sticker",
    take_tag: "Use last scanned sticker", save: "Save", delete: "Delete", delete_q: "Really delete this spool?", delete_tag: "Also delete the NFC sticker in Home Assistant",
    edit: "Edit spool", select: "Select (like NFC scan)", in_slot: "in", none: "No spools yet – create your first one.",
    needs: "needs", job: "Print job", linked_only: "linked (set color/profile on the printer)",
    no_control: "The printer does not accept commands from Home Assistant (only in LAN developer mode). The spool is only linked – set color and filament profile on the printer or in Bambu Handy.", saved: "Saved", sent: "sent to the printer", camera: "Camera", show_all: "Show all", used_up: "used up",
    rest_after: "after this print", low: "almost empty", sort: "Sort", by_name: "Name", by_rest: "Remaining", by_color: "Color", hide_empty: "Hide empty spools",
    printer: "Printer", show_camera: "Show camera", show_spools: "Show spool list",
    dry: "Dry", dry_title: "Dry filament", dry_temp: "Temperature", dry_time: "Duration", hours: "h", rotate: "Rotate spools while drying",
    dry_start: "Start drying", dry_stop: "Stop", drying_left: "left", dry_rec: "Recommended by the loaded spools", dry_max: "max.",
    dry_pla: "PLA is loaded in this AMS – too much heat can deform filament and spools. Check the recommendation of the spool.",
    dry_printing: "The printer is printing – drying may be refused or slow down the print.", dry_started: "Drying started", dry_stopped: "Drying stopped",
  },
  de: {
    status: { running: "Druckt", pause: "Pausiert", finish: "Fertig", failed: "Fehlgeschlagen", idle: "Bereit", prepare: "Vorbereitung", slicing: "Slicen", init: "Startet", offline: "Offline", unknown: "Unbekannt" },
    layers: "Schicht", left: "noch", done_at: "fertig um", nozzle: "Düse", bed: "Bett", chamber: "Raum",
    spools: "Rollen", new_spool: "Neue Rolle", no_printer: "Kein Bambu-Lab-Drucker gefunden. Ist die Bambu-Lab-Integration installiert?",
    not_loaded: "Die Integration Bambu Filament Manager ist noch nicht eingerichtet (Einstellungen → Geräte & Dienste).",
    empty: "Leer", unknown_spool: "?", drying: "Trocknet", scanned: "Gescannt", tap_slot: "Slot antippen zum Einlegen",
    cancel: "Abbrechen", unknown_tag: "Unbekannter NFC-Aufkleber", create_spool: "Rolle anlegen", discard: "Verwerfen",
    slot: "Slot", linked: "Verknüpfte Rolle", none_linked: "Keine Rolle verknüpft", bambu_rfid: "Original-Bambu-Rolle (RFID) – den Rest misst das AMS selbst.",
    put_here: "Hier einlegen", assign: "Rolle für diesen Slot wählen", search: "Suchen…", unlink: "Verknüpfung lösen", close: "Schließen",
    new_for_slot: "Neue Rolle für diesen Slot", stale: "Im Slot steht anderes Filament als in der verknüpften Rolle – Rolle bitte neu wählen.",
    on_printer: "Am Drucker eingestellt", name: "Name", vendor: "Hersteller", profile: "Filament-Profil", custom_id: "Andere Filament-ID…",
    material: "Material", filament_id: "Filament-ID", color: "Farbe", nozzle: "Düse °C", spool_weight: "Leere Spule (g)",
    net_weight: "Filament neu (g)", price: "Preis der Rolle", this_month: "Diesen Monat", prints: "Drucke", export: "Exportieren", import: "Importieren", imported: "Importiert", added: "neu", updated: "aktualisiert", import_err: "Keine gültige Export-Datei", bed: "Bett °C", bed_auto: "auto", bed_hint: "leer = aus dem Profil für diesen Drucker und die Platte", bed_short: "Bett", sw_hint: "(merkt sich je Hersteller)", remaining: "Rest (g)", scale: "Oder wiegen: Waage zeigt (g)", tag: "NFC-Aufkleber",
    take_tag: "Zuletzt gescannten Aufkleber nehmen", save: "Speichern", delete: "Löschen", delete_q: "Rolle wirklich löschen?", delete_tag: "NFC-Aufkleber auch in Home Assistant löschen",
    edit: "Rolle bearbeiten", select: "Auswählen (wie NFC-Scan)", in_slot: "in", none: "Noch keine Rollen – lege deine erste an.",
    needs: "braucht", job: "Druckauftrag", linked_only: "verknüpft (Farbe/Profil am Drucker einstellen)",
    no_control: "Der Drucker nimmt keine Befehle von Home Assistant an (nur im LAN-Entwicklermodus). Die Rolle wird nur verknüpft – Farbe und Filament-Profil bitte am Drucker oder in Bambu Handy einstellen.", saved: "Gespeichert", sent: "an den Drucker geschickt", camera: "Kamera", show_all: "Alle zeigen", used_up: "verbraucht",
    rest_after: "nach diesem Druck", low: "fast leer", sort: "Sortieren", by_name: "Name", by_rest: "Rest", by_color: "Farbe", hide_empty: "Leere Rollen ausblenden",
    printer: "Drucker", show_camera: "Kamera zeigen", show_spools: "Rollenliste zeigen",
    dry: "Trocknen", dry_title: "Filament trocknen", dry_temp: "Temperatur", dry_time: "Dauer", hours: "h", rotate: "Spulen beim Trocknen drehen",
    dry_start: "Trocknen starten", dry_stop: "Stopp", drying_left: "noch", dry_rec: "Empfehlung der eingelegten Rollen", dry_max: "max.",
    dry_pla: "In diesem AMS steckt PLA – zu viel Hitze kann Filament und Spulen verformen. Bitte die Empfehlung der Rolle beachten.",
    dry_printing: "Der Drucker druckt gerade – das Trocknen wird evtl. abgelehnt oder bremst den Druck.", dry_started: "Trocknung gestartet", dry_stopped: "Trocknung gestoppt",
  },
};

const SWATCHES = ["000000", "FFFFFF", "808080", "C0C0C0", "FF0000", "FF8000", "FFFF00", "00FF00", "008000", "00FFFF", "0000FF", "800080", "FF00FF", "FFC0CB", "8B4513", "F5DEB3"];

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (v, d = 0) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
const hex6 = (c) => String(c || "808080").replace("#", "").slice(0, 6).toUpperCase();
const alpha = (c) => { const s = String(c || "").replace("#", ""); return s.length >= 8 ? parseInt(s.slice(6, 8), 16) : 255; };
const lum = (c) => { const h = hex6(c); const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const css = (c) => `#${hex6(c)}`;

function fillStyle(colors) {
  const list = (colors || []).filter(Boolean);
  if (!list.length) return "background:#555";
  if (list.length === 1 && alpha(list[0]) < 40) return "background:repeating-conic-gradient(#bbb 0 25%,#eee 0 50%) 0 0/12px 12px";
  if (list.length === 1) return `background:${css(list[0])}`;
  const step = 100 / list.length;
  return `background:linear-gradient(90deg,${list.map((c, i) => `${css(c)} ${i * step}% ${(i + 1) * step}%`).join(",")})`;
}

class BambuFilamentCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._data = null;
    this._catalog = null;
    this._dialog = null; // {type:'slot'|'edit', ...}
    this._showList = false;
    this._sort = "name";
    this._sig = "";
    this._camTimer = null;
  }

  static getStubConfig() { return { show_spools: true }; }

  static getConfigForm() {
    return {
      schema: [
        { name: "printer", selector: { device: { integration: "bambu_lab" } } },
        { name: "show_camera", selector: { boolean: {} } },
        { name: "show_spools", selector: { boolean: {} } },
      ],
      computeLabel: (s) => {
        const l = (document.querySelector("home-assistant")?.hass?.locale?.language || "en").startsWith("de") ? I18N.de : I18N.en;
        return l[s.name] || s.name;
      },
    };
  }

  setConfig(config) {
    this._config = { show_spools: true, show_camera: false, ...config };
    this._sig = "";
    if (this._hass) this._render();
  }

  getCardSize() { return 8; }

  get _t() { const lang = (this._hass?.locale?.language || this._hass?.language || "en").slice(0, 2); return I18N[lang] || I18N.en; }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first || !this._unsub) this._subscribe();
    const sig = this._stateSig();
    if (sig !== this._sig) { this._sig = sig; this._render(); }
  }

  connectedCallback() {
    // Shown as preview in "Add card"? Then render a compact version.
    let n = this, inPicker = false;
    for (let i = 0; i < 40 && n; i++) {
      if (n.localName === "hui-card-picker") { inPicker = true; break; }
      n = n.parentNode || n.host || (n.getRootNode && n.getRootNode() !== n ? n.getRootNode().host : null);
    }
    if (inPicker !== !!this._inPicker) { this._inPicker = inPicker; this._sig = ""; if (this._hass) this._render(); }
    if (this._hass && !this._unsub) this._subscribe();
    this._startCam();
  }
  disconnectedCallback() {
    if (this._unsub) { this._unsub.then((u) => u && u()).catch(() => {}); this._unsub = null; }
    clearInterval(this._camTimer); this._camTimer = null;
  }

  _subscribe() {
    if (!this._hass?.connection || this._unsub) return;
    this._loadCatalog().then(() => { this._sig = ""; this._render(); });
    this._unsub = this._hass.connection.subscribeMessage((msg) => { this._data = msg; this._sig = ""; this._sig = this._stateSig(); this._render(); }, { type: `${DOMAIN}/subscribe` })
      .catch((err) => { this._data = { printers: [], spools: [], not_loaded: true, error: err?.message }; this._unsub = null; this._render(); });
  }

  async _loadCatalog() {
    if (this._catalog) return this._catalog;
    try { const r = await this._hass.callWS({ type: `${DOMAIN}/catalog` }); this._catalog = r.filaments || []; }
    catch (e) { this._catalog = []; }
    return this._catalog;
  }

  get _printer() {
    const ps = this._data?.printers || [];
    const want = this._config?.printer;
    if (want) {
      const p = ps.find((x) => x.device_id === want || x.units.some((u) => u.device_id === want));
      if (p) return p;
    }
    return ps[0];
  }

  _st(id) { return id ? this._hass?.states?.[id] : undefined; }
  _sv(id) { return this._st(id)?.state; }

  _stateSig() {
    const p = this._printer;
    if (!p || !this._hass) return "x";
    const ids = [...Object.values(p.entities)];
    p.units.forEach((u) => { ids.push(...Object.values(u.entities)); u.trays.forEach((t) => ids.push(t.entity_id)); });
    return ids.map((id) => { const s = this._st(id); return s ? s.last_updated : "-"; }).join("|");
  }

  _spool(id) { return (this._data?.spools || []).find((s) => s.id === id); }

  // ------------------------------------------------------------------ render
  _render() {
    if (!this._hass || !this._config) return;
    const t = this._t;
    const root = this.shadowRoot;
    if (!root.querySelector("ha-card")) {
      root.innerHTML = `<style>${STYLE}</style><ha-card><div id="main"></div></ha-card><div id="dlg"></div><div id="toast"></div>`;
      root.addEventListener("click", (e) => this._onClick(e));
      root.addEventListener("input", (e) => this._onInput(e));
      root.addEventListener("change", (e) => this._onChange(e));
    }
    const main = root.getElementById("main");
    if (!this._data) { main.innerHTML = `<div class="msg">…</div>`; return; }
    if (this._data.not_loaded) { main.innerHTML = `<div class="msg">${esc(t.not_loaded)}</div>`; return; }
    const p = this._printer;
    if (!p) { main.innerHTML = `<div class="msg">${esc(t.no_printer)}</div>`; return; }

    if (this._inPicker) {
      const st = this._sv(p.entities.print_status) || "unknown";
      main.innerHTML = `<div class="mini"><span>${esc(p.name)}</span><span class="chip s-${esc(st)}">${esc(this._t.status[st] || st)}</span></div>` +
        this._amsHtml(p, true);
      return;
    }
    main.innerHTML = this._headHtml(p) + this._camHtml(p) + this._bannerHtml() + this._amsHtml(p) +
      (this._config.show_spools ? this._listHtml() : "");
    this._startCam();
    if (this._dialog && this._dialog.type === "slot" && !root.activeElement) this._renderDialog();
  }

  _headHtml(p) {
    const t = this._t, e = p.entities;
    const status = this._sv(e.print_status) || "unknown";
    const online = this._sv(e.online);
    const st = online === "off" ? "offline" : status;
    const active = ["running", "pause", "prepare", "slicing", "init"].includes(st);
    const prog = num(this._sv(e.print_progress));
    const job = this._sv(e.subtask_name);
    const cover = this._st(e.cover_image)?.attributes?.entity_picture;
    const rem = num(this._sv(e.remaining_time)) * 60;
    const end = this._sv(e.end_time);
    const layer = this._sv(e.current_layer), layers = this._sv(e.total_layers);
    const temp = (a, b) => { const v = this._sv(a); if (v === undefined) return ""; const tg = num(this._sv(b)); return `${Math.round(num(v))}${tg ? `/${Math.round(tg)}` : ""} °C`; };
    let endTxt = "";
    if (active && end && !isNaN(Date.parse(end))) endTxt = `${t.done_at} ${new Date(end).toLocaleTimeString(this._hass.locale?.language || undefined, { hour: "2-digit", minute: "2-digit" })}`;
    const remTxt = active && rem > 0 ? `${t.left} ${rem >= 60 ? `${Math.floor(rem / 60)} h ` : ""}${Math.round(rem % 60)} min` : "";
    const showJob = job && job !== "unknown" && (active || ["finish", "failed"].includes(st));
    return `<div class="head">
      ${p.image ? `<img class="pimg" src="${esc(p.image)}" alt="">` : `<ha-icon class="pimg icon" icon="mdi:printer-3d"></ha-icon>`}
      <div class="info">
        <div class="title"><span>${esc(p.name)}</span><span class="chip s-${esc(st)}">${esc(t.status[st] || st)}</span></div>
        ${showJob ? `<div class="job" title="${esc(job)}">${esc(job)}</div>
        <div class="bar"><div style="width:${Math.min(100, prog)}%"></div></div>
        <div class="meta">${prog}%${layers && layers !== "0" ? ` · ${t.layers} ${esc(layer)}/${esc(layers)}` : ""}${remTxt ? ` · ${remTxt}` : ""}${endTxt ? ` · ${endTxt}` : ""}</div>` : ""}
        <div class="temps">
          ${e.nozzle_temp ? `<span><ha-icon icon="mdi:printer-3d-nozzle-heat"></ha-icon>${temp(e.nozzle_temp, e.target_nozzle_temp)}</span>` : ""}
          ${e.bed_temp ? `<span><ha-icon icon="mdi:radiator"></ha-icon>${temp(e.bed_temp, e.target_bed_temp)}</span>` : ""}
          ${e.chamber_temp ? `<span><ha-icon icon="mdi:thermometer"></ha-icon>${temp(e.chamber_temp)}</span>` : ""}
        </div>
      </div>
      ${showJob && cover ? `<img class="cover" src="${esc(cover)}" alt="">` : ""}
    </div>`;
  }

  _camHtml(p) {
    if (!this._config.show_camera || !p.entities.camera) return "";
    const s = this._st(p.entities.camera);
    if (!s) return "";
    return `<div class="cam"><img id="camimg" src="${esc(s.attributes.entity_picture || "")}" alt="${esc(this._t.camera)}"></div>`;
  }

  _startCam() {
    if (this._camTimer || !this._config?.show_camera) return;
    this._camTimer = setInterval(() => {
      const img = this.shadowRoot.getElementById("camimg");
      const p = this._printer;
      if (!img || !p?.entities?.camera) return;
      const s = this._st(p.entities.camera);
      if (s?.attributes?.access_token) img.src = `/api/camera_proxy/${p.entities.camera}?token=${s.attributes.access_token}&t=${Date.now()}`;
    }, 2500);
  }

  _bannerHtml() {
    const t = this._t, d = this._data;
    let h = "";
    const sp = d.pending && this._spool(d.pending);
    if (sp) h += `<div class="banner"><span class="dot" style="${fillStyle([sp.color])}"></span><div><b>${esc(t.scanned)}: ${esc(sp.name)}</b> <span class="nw">· ${Math.round(num(sp.remaining))} g</span><br><small>${esc(t.tap_slot)}</small></div><button class="btn flat" data-a="clear-pending">${esc(t.cancel)}</button></div>`;
    if (d.unknown_tag) h += `<div class="banner warn"><ha-icon icon="mdi:nfc-variant"></ha-icon><div><b>${esc(t.unknown_tag)}</b><br><small>${esc(d.unknown_tag)}</small></div><button class="btn" data-a="new-from-tag">${esc(t.create_spool)}</button><button class="btn flat" data-a="clear-tag">${esc(t.discard)}</button></div>`;
    return h;
  }

  _trayView(tr) {
    const s = this._st(tr.entity_id);
    const a = s?.attributes || {};
    const spool = tr.spool_id ? this._spool(tr.spool_id) : null;
    const emptyTray = !s || a.empty || s.state === "Empty" || s.state === "unavailable";
    let pct = null, grams = null;
    if (spool) {
      grams = num(spool.remaining);
      pct = spool.net_weight ? Math.max(0, Math.min(100, (grams / num(spool.net_weight, 1000)) * 100)) : null;
    } else if (num(a.remain, -1) >= 0 && tr.source === "bambu") {
      pct = num(a.remain);
      grams = (pct / 100) * (num(a.tray_weight) || 1000);
    }
    const colors = a.cols && a.cols.length ? a.cols : [a.color || "#808080"];
    return { s, a, spool, emptyTray, pct, grams, colors };
  }

  _amsHtml(p, mini = false) {
    const t = this._t;
    const low = num(this._data.low_threshold, 100);
    const job = {};
    Object.entries(p.job?.weights || {}).forEach(([k, g]) => { job[k] = Math.max(0, g - num(p.job?.consumed?.[k])); });
    return `<div class="units ${mini ? "minis" : ""}">${p.units.filter((u) => !mini || u.kind !== "external").map((u) => {
      const ue = u.entities;
      const hum = this._sv(ue.humidity), temp = this._sv(ue.ams_temp);
      const drying = this._sv(ue.drying) === "on";
      const canDry = !mini && ["AMS 2 Pro", "AMS HT"].includes(u.model);
      const dryInfo = drying ? this._dryInfo(u) : "";
      const humN = num(hum, NaN);
      const humCls = isNaN(humN) ? "" : humN < 40 ? "ok" : humN < 60 ? "mid" : "bad";
      const ext = u.kind === "external";
      return `<div class="ams ${ext ? "ext" : ""} ${u.kind}">
        <div class="ams-h"><span class="un">${esc(ext ? (u.name) : u.name)}</span>${!ext && u.model ? `<span class="model">${esc(u.model)}</span>` : ""}
          <span class="env">${hum !== undefined && hum !== "unavailable" ? `<span class="hum ${humCls}"><ha-icon icon="mdi:water-percent"></ha-icon>${esc(hum)}%</span>` : ""}
          ${temp !== undefined && temp !== "unavailable" ? `<span><ha-icon icon="mdi:thermometer"></ha-icon>${Math.round(num(temp))}°</span>` : ""}
          ${canDry && !drying ? `<button class="btn flat sm" data-a="dry-open" data-dev="${esc(u.device_id)}"><ha-icon icon="mdi:heat-wave"></ha-icon>${esc(t.dry)}</button>` : ""}</span></div>
        ${drying ? `<div class="dryrow"><ha-icon icon="mdi:fan" class="spin"></ha-icon><span>${esc(t.drying)}${dryInfo ? ` · ${esc(dryInfo)}` : ""}</span>
          ${canDry ? `<button class="btn sm danger" data-a="dry-stop" data-dev="${esc(u.device_id)}">${esc(t.dry_stop)}</button>` : ""}</div>` : ""}
        <div class="slots">${u.trays.map((tr) => {
          const v = this._trayView(tr);
          const need = job[tr.key] >= 0.5 ? job[tr.key] : 0;
          const afterLow = need && v.grams !== null && v.grams - need < low;
          const isLow = v.grams !== null && v.grams < low;
          const textCol = lum(v.colors[0]) > 0.6 || alpha(v.colors[0]) < 40 ? "#111" : "#fff";
          const type = v.emptyTray ? "" : (v.a.type || "");
          const label = v.spool ? v.spool.name : (v.emptyTray ? t.empty : (v.a.name || ""));
          const icon = tr.source === "bambu" ? "mdi:contactless-payment" : v.spool?.tag ? "mdi:nfc-variant" : v.spool ? "mdi:link-variant" : tr.stale_link ? "mdi:link-variant-off" : "";
          return `<div class="slot ${v.a.active ? "active" : ""} ${v.emptyTray ? "empty" : ""} ${isLow ? "low" : ""}" data-a="slot" data-tray="${esc(tr.entity_id)}">
            <div class="lbl">${esc(tr.label)}</div>
            <div class="spool">
              ${v.emptyTray ? `<div class="none"><ha-icon icon="mdi:plus"></ha-icon></div>` : `
              <div class="fill" style="height:${v.pct === null ? 100 : Math.max(4, v.pct)}%;${fillStyle(v.colors)}"></div>
              ${v.pct === null ? `<div class="unk"></div>` : ""}
              <div class="type ${v.pct !== null && v.pct < 35 ? "lowfill" : ""}" style="color:${v.pct !== null && v.pct < 35 ? "var(--primary-text-color)" : textCol}">${esc(type)}</div>`}
              ${icon ? `<ha-icon class="src" icon="${icon}"></ha-icon>` : ""}
            </div>
            <div class="nm" title="${esc(label)}">${esc(label)}</div>
            <div class="g">${v.emptyTray ? "&nbsp;" : v.grams === null ? esc(t.unknown_spool) : `${Math.round(v.grams)} g`}</div>
            ${need ? `<div class="need ${afterLow ? "bad" : ""}">−${Math.round(need)} g</div>` : ""}
          </div>`;
        }).join("")}</div></div>`;
    }).join("")}</div>`;
  }

  _monthHtml() {
    const m = this._data.month || {}, t = this._t;
    if (!num(m.grams)) return "";
    const lang = this._hass.locale?.language || "de";
    const cost = num(m.cost) ? ` · ${num(m.cost).toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${esc(this._data.currency || "")}` : "";
    return `<div class="month"><ha-icon icon="mdi:chart-bar"></ha-icon>${esc(t.this_month)}: <b>${Math.round(num(m.grams))} g</b>${cost}${m.prints ? ` · ${m.prints} ${esc(t.prints)}` : ""}</div>`;
  }

  async _export() {
    try {
      const r = await this._hass.callWS({ type: "call_service", domain: DOMAIN, service: "export_spools", service_data: {}, return_response: true });
      const blob = new Blob([JSON.stringify(r.response, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `filament-rollen-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) { this._toast(e?.message || String(e)); }
  }

  async _import(file) {
    const t = this._t;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data) && !Array.isArray(data?.spools)) throw new Error(t.import_err);
      const r = await this._hass.callWS({ type: "call_service", domain: DOMAIN, service: "import_spools", service_data: { data }, return_response: true });
      this._toast(`${t.imported}: ${r.response?.added ?? 0} ${t.added}, ${r.response?.updated ?? 0} ${t.updated}`);
    } catch (e) { this._toast(e instanceof SyntaxError ? t.import_err : (e?.message || String(e))); }
  }

  _listHtml() {
    const t = this._t;
    const spools = [...(this._data.spools || [])];
    const low = num(this._data.low_threshold, 100);
    const loc = {};
    (this._printer?.units || []).forEach((u) => u.trays.forEach((tr) => { if (tr.spool_id) loc[tr.spool_id] = tr.label; }));
    const hideEmpty = this._hideEmpty !== false;
    let list = spools.filter((s) => !hideEmpty || num(s.remaining) > 0 || loc[s.id]);
    const by = { name: (a, b) => a.name.localeCompare(b.name), rest: (a, b) => num(a.remaining) - num(b.remaining), color: (a, b) => lum(a.color) - lum(b.color) };
    list.sort(by[this._sort] || by.name);
    return `<div class="listbar">
      <button class="btn flat tog" data-a="toggle-list"><ha-icon icon="mdi:${this._showList ? "chevron-up" : "chevron-down"}"></ha-icon>${esc(t.spools)} (${spools.length})</button>
      <button class="btn" data-a="new"><ha-icon icon="mdi:plus"></ha-icon>${esc(t.new_spool)}</button>
    </div>
    ${this._monthHtml()}
    ${this._showList ? `<div class="listopts">
        <select data-a="sort">${["name", "rest", "color"].map((k) => `<option value="${k}" ${this._sort === k ? "selected" : ""}>${esc(t.sort)}: ${esc(t["by_" + k])}</option>`).join("")}</select>
        <label><input type="checkbox" data-a="hide-empty" ${hideEmpty ? "checked" : ""}> ${esc(t.hide_empty)}</label>
        <span class="grow"></span>
        <button class="btn flat sm" data-a="export"><ha-icon icon="mdi:download"></ha-icon>${esc(t.export)}</button>
        <button class="btn flat sm" data-a="import"><ha-icon icon="mdi:upload"></ha-icon>${esc(t.import)}</button>
        <input type="file" accept="application/json,.json" data-a="import-file" hidden>
      </div>
      <div class="list">${list.length ? list.map((s) => {
        const pct = s.net_weight ? Math.max(0, Math.min(100, (num(s.remaining) / num(s.net_weight, 1000)) * 100)) : 0;
        return `<div class="row ${num(s.remaining) < low ? "low" : ""}" data-a="edit" data-id="${esc(s.id)}">
          <span class="dot" style="${fillStyle([s.color])}"></span>
          <div class="rinfo"><div class="rn">${esc(s.name)}${s.tag ? ` <ha-icon icon="mdi:nfc-variant"></ha-icon>` : ""}${s.bambu_uuid ? ` <ha-icon icon="mdi:contactless-payment"></ha-icon>` : ""}</div>
            <div class="rs">${esc([s.vendor, s.material, this._spoolBed(s) ? `${t.bed_short} ${this._spoolBed(s)} °C` : ""].filter(Boolean).join(" · "))}</div>
            <div class="rbar"><div style="width:${pct}%;${fillStyle([s.color])}"></div></div></div>
          <div class="rg">${Math.round(num(s.remaining))} g${loc[s.id] ? `<span class="loc">${esc(loc[s.id])}</span>` : ""}</div>
        </div>`;
      }).join("") : `<div class="msg">${esc(t.none)}</div>`}</div>` : ""}`;
  }

  // ------------------------------------------------------------------ dialogs
  _renderDialog() {
    const root = this.shadowRoot.getElementById("dlg");
    if (!this._dialog) { root.innerHTML = ""; return; }
    const html = this._dialog.type === "slot" ? this._slotDialog() : this._dialog.type === "dry" ? this._dryDialog() : this._editDialog();
    root.innerHTML = `<div class="overlay" data-a="overlay"><div class="dialog" role="dialog">${html}</div></div>`;
  }

  _slotDialog() {
    const t = this._t;
    const p = this._printer;
    let tr = null, unit = null;
    p.units.forEach((u) => u.trays.forEach((x) => { if (x.entity_id === this._dialog.tray) { tr = x; unit = u; } }));
    if (!tr) return `<div class="msg">–</div>`;
    const v = this._trayView(tr);
    const pend = this._data.pending && this._spool(this._data.pending);
    const q = (this._dialog.q || "").toLowerCase();
    const loc = {};
    p.units.forEach((u) => u.trays.forEach((x) => { if (x.spool_id) loc[x.spool_id] = x.label; }));
    const candidates = (this._data.spools || []).filter((s) => !s.bambu_uuid && (!q || `${s.name} ${s.vendor} ${s.material}`.toLowerCase().includes(q)))
      .sort((a, b) => (num(b.remaining) > 0) - (num(a.remaining) > 0) || a.name.localeCompare(b.name));
    const a = v.a;
    return `<div class="dh"><span class="dot big" style="${fillStyle(v.colors)}"></span><div><div class="dt">${esc(t.slot)} ${esc(tr.label)}</div><div class="ds">${esc(unit.name)}${unit.model && unit.kind !== "external" ? ` · ${esc(unit.model)}` : ""}</div></div>
      <button class="icon-btn" data-a="close"><ha-icon icon="mdi:close"></ha-icon></button></div>
      <div class="dbody">
      ${!v.emptyTray ? `<div class="kv"><span>${esc(t.on_printer)}</span><b>${esc(a.name || "–")}</b> <small>${esc(a.type || "")} · ${esc(a.filament_id || "")} · ${esc(a.nozzle_temp_min || "")}–${esc(a.nozzle_temp_max || "")} °C</small></div>` : ""}
      ${tr.source === "bambu" ? `<div class="note"><ha-icon icon="mdi:contactless-payment"></ha-icon>${esc(t.bambu_rfid)}${num(a.remain, -1) >= 0 ? ` (${a.remain}%)` : ""}</div>` :
        v.spool ? `<div class="kv"><span>${esc(t.linked)}</span><b>${esc(v.spool.name)}</b> <small>${Math.round(num(v.spool.remaining))} g${this._spoolBed(v.spool) ? ` · ${esc(t.bed_short)} ${this._spoolBed(v.spool)} °C` : ""}</small> <button class="btn flat sm" data-a="edit" data-id="${esc(v.spool.id)}">${esc(t.edit)}</button></div>` :
        `<div class="kv"><span>${esc(t.linked)}</span><i>${esc(t.none_linked)}</i></div>${tr.stale_link ? `<div class="note warn">${esc(t.stale)}</div>` : ""}`}
      ${tr.source !== "bambu" && p.can_control === false ? `<div class="note warn"><ha-icon icon="mdi:lock-outline"></ha-icon> ${esc(t.no_control)}</div>` : ""}
      ${tr.source !== "bambu" ? `
        ${pend ? `<button class="btn wide" data-a="assign" data-id="${esc(pend.id)}"><span class="dot" style="${fillStyle([pend.color])}"></span>${esc(pend.name)} – ${esc(t.put_here)}</button>` : ""}
        <div class="sec">${esc(t.assign)}</div>
        <input class="inp" type="search" data-a="q" placeholder="${esc(t.search)}" value="${esc(this._dialog.q || "")}">
        <div class="pick">${candidates.map((s) => `<div class="row sm" data-a="assign" data-id="${esc(s.id)}"><span class="dot" style="${fillStyle([s.color])}"></span>
            <div class="rinfo"><div class="rn">${esc(s.name)}</div><div class="rs">${esc([s.vendor, s.material].filter(Boolean).join(" · "))}</div></div>
            <div class="rg">${Math.round(num(s.remaining))} g${loc[s.id] ? `<span class="loc">${esc(loc[s.id])}</span>` : ""}</div></div>`).join("") || `<div class="msg sm">${esc(t.none)}</div>`}</div>
        <div class="dact">
          <button class="btn flat" data-a="new-for-slot"><ha-icon icon="mdi:plus"></ha-icon>${esc(t.new_for_slot)}</button>
          ${v.spool || tr.stale_link ? `<button class="btn flat" data-a="unlink">${esc(t.unlink)}</button>` : ""}
        </div>` : ""}
      <div class="err" id="err"></div>
      </div>`;
  }

  _editDialog() {
    const t = this._t;
    const f = this._dialog.form;
    const cat = this._catalog || [];
    const groups = {};
    cat.forEach((c) => { (groups[c.vendor || "–"] = groups[c.vendor || "–"] || []).push(c); });
    const inCat = cat.some((c) => c.id === f.filament_id);
    const vendors = [...new Set((this._data.spools || []).map((s) => s.vendor).filter(Boolean))];
    const scaleRest = num(f.gross, 0) > 0 ? Math.max(0, num(f.gross) - num(f.spool_weight)) : null;
    const isNew = !this._dialog.id;
    const bambu = !!f.bambu_uuid;
    return `<div class="dh"><span class="dot big" style="${fillStyle([f.color])}"></span><div><div class="dt">${esc(isNew ? t.new_spool : t.edit)}</div>${this._dialog.tray ? `<div class="ds">→ ${esc(t.slot)} ${esc(this._dialog.trayLabel || "")}</div>` : ""}</div>
      <button class="icon-btn" data-a="close"><ha-icon icon="mdi:close"></ha-icon></button></div>
      <div class="dbody form">
        <label>${esc(t.name)}*<input class="inp" data-f="name" value="${esc(f.name)}" autocomplete="off"></label>
        <label>${esc(t.vendor)}<input class="inp" data-f="vendor" value="${esc(f.vendor)}" list="vendors" autocomplete="off"><datalist id="vendors">${vendors.map((v) => `<option value="${esc(v)}">`).join("")}</datalist></label>
        <label>${esc(t.profile)}<select class="inp" data-f="profile" ${bambu ? "disabled" : ""}>
          <option value="">–</option>
          ${Object.entries(groups).map(([g, items]) => `<optgroup label="${esc(g)}">${items.map((c) => `<option value="${esc(c.id)}" ${c.id === f.filament_id ? "selected" : ""}>${esc(c.name)} (${esc(c.id)})</option>`).join("")}</optgroup>`).join("")}
          <option value="__custom" ${f.filament_id && !inCat ? "selected" : ""}>${esc(t.custom_id)}</option>
        </select></label>
        <div class="two">
          <label>${esc(t.material)}<input class="inp" data-f="material" value="${esc(f.material)}"></label>
          <label>${esc(t.filament_id)}<input class="inp" data-f="filament_id" value="${esc(f.filament_id)}" ${bambu ? "disabled" : ""}></label>
        </div>
        <label>${esc(t.color)}</label>
        <div class="swatches">${SWATCHES.map((c) => `<span class="sw ${hex6(f.color) === c ? "on" : ""}" data-a="swatch" data-c="${c}" style="background:#${c}"></span>`).join("")}
          <input type="color" data-f="colorpick" value="#${hex6(f.color).toLowerCase()}"><input class="inp hex" data-f="color" value="${esc(String(f.color).replace("#", ""))}" maxlength="9"></div>
        <div class="two">
          <label>${esc(t.nozzle)} min<input class="inp" type="number" inputmode="numeric" data-f="nozzle_min" value="${esc(f.nozzle_min)}"></label>
          <label>${esc(t.nozzle)} max<input class="inp" type="number" inputmode="numeric" data-f="nozzle_max" value="${esc(f.nozzle_max)}"></label>
        </div>
        <label>${esc(t.bed)} <small class="hint">(${esc(t.bed_hint)})</small><input class="inp" type="number" inputmode="numeric" data-f="bed_temp" value="${num(f.bed_temp) > 0 ? esc(f.bed_temp) : ""}" placeholder="${esc(t.bed_auto)}${this._autoBed(f.filament_id) ? `: ${this._autoBed(f.filament_id)} °C` : ""}"></label>
        <div class="two">
          <label>${esc(t.spool_weight)}${this._dialog.id ? "" : ` <small class="hint">${esc(t.sw_hint)}</small>`}<input class="inp" type="number" inputmode="decimal" data-f="spool_weight" value="${esc(f.spool_weight)}"></label>
          <label>${esc(t.net_weight)}<input class="inp" type="number" inputmode="decimal" data-f="net_weight" value="${esc(f.net_weight)}"></label>
        </div>
        <label>${esc(t.price)}${this._data.currency ? ` (${esc(this._data.currency)})` : ""}<input class="inp" type="number" inputmode="decimal" step="0.01" data-f="price" value="${num(f.price) > 0 ? esc(f.price) : ""}" placeholder="—"></label>
        <div class="two">
          <label>${esc(t.remaining)}<input class="inp" type="number" inputmode="decimal" data-f="remaining" value="${esc(scaleRest !== null ? Math.round(scaleRest) : f.remaining)}" ${scaleRest !== null ? "disabled" : ""}></label>
          <label>${esc(t.scale)}<input class="inp" type="number" inputmode="decimal" data-f="gross" value="${esc(f.gross || "")}" placeholder="—"></label>
        </div>
        <label>${esc(t.tag)}<input class="inp" data-f="tag" value="${esc(f.tag)}" autocomplete="off"></label>
        ${this._data.unknown_tag && this._data.unknown_tag !== f.tag ? `<button class="btn flat sm" data-a="take-tag"><ha-icon icon="mdi:nfc-variant"></ha-icon>${esc(t.take_tag)}</button>` : ""}
        <div class="err" id="err"></div>
        <div class="dact">
          <button class="btn" data-a="save"><ha-icon icon="mdi:content-save"></ha-icon>${esc(t.save)}</button>
          ${!isNew ? `<button class="btn flat" data-a="select-spool">${esc(t.select)}</button>` : ""}
          ${!isNew ? `<button class="btn flat danger" data-a="ask-delete">${esc(t.delete)}</button>` : ""}
        </div>
        ${this._dialog.askDelete ? `<div class="confirm"><b>${esc(t.delete_q)}</b>
          ${f.tag ? `<label class="chk"><input type="checkbox" data-f="delete_tag" ${f.delete_tag ? "checked" : ""}> ${esc(t.delete_tag)}</label>` : ""}
          <div class="dact"><button class="btn danger" data-a="delete">${esc(t.delete)}</button><button class="btn flat" data-a="no-delete">${esc(t.cancel)}</button></div></div>` : ""}
      </div>`;
  }

  _dryInfo(u) {
    const t = this._t, ue = u.entities;
    const parts = [];
    const temp = this._sv(ue.drying_temperature);
    if (temp && !isNaN(parseFloat(temp))) parts.push(`${Math.round(num(temp))} °C`);
    const rs = this._st(ue.remaining_drying_time);
    if (rs && !isNaN(parseFloat(rs.state))) {
      let min = num(rs.state) * ((rs.attributes.unit_of_measurement || "h") === "h" ? 60 : rs.attributes.unit_of_measurement === "s" ? 1 / 60 : 1);
      if (min > 0) parts.push(`${t.drying_left} ${min >= 60 ? `${Math.floor(min / 60)} h ` : ""}${Math.round(min % 60)} min`);
    }
    return parts.join(" · ");
  }

  _dryUnit() { return this._printer.units.find((x) => x.device_id === this._dialog.dev); }

  _dryDialog() {
    const t = this._t, d = this._dialog, u = this._dryUnit(), p = this._printer;
    if (!u) return "";
    const max = u.model === "AMS HT" ? 85 : 65;
    const recs = [];
    let pla = false;
    u.trays.forEach((tr) => {
      const a = this._st(tr.entity_id)?.attributes || {};
      if (a.empty) return;
      if (String(a.type || "").toUpperCase().startsWith("PLA")) pla = true;
      if (num(a.dry_temp) > 0) recs.push(`${tr.label} ${esc(a.type || "")}: ${Math.round(num(a.dry_temp))} °C${num(a.dry_time) > 0 ? ` / ${Math.round(num(a.dry_time))} ${t.hours}` : ""}`);
    });
    const printing = ["running", "pause", "prepare"].includes(this._sv(p.entities.print_status));
    const chips = [45, 50, 55, 60, 65, 70, 75, 80, 85].filter((x) => x <= max);
    return `<div class="dh"><ha-icon icon="mdi:heat-wave" style="--mdc-icon-size:32px;color:#e07020"></ha-icon><div><div class="dt">${esc(t.dry_title)}</div><div class="ds">${esc(u.name)} · ${esc(u.model)} · ${esc(t.dry_max)} ${max} °C</div></div>
      <button class="icon-btn" data-a="close"><ha-icon icon="mdi:close"></ha-icon></button></div>
      <div class="dbody form">
        ${p.can_control === false ? `<div class="note warn"><ha-icon icon="mdi:lock-outline"></ha-icon> ${esc(t.no_control)}</div>` : ""}
        ${recs.length ? `<div class="note"><b>${esc(t.dry_rec)}:</b><br>${recs.join("<br>")}</div>` : ""}
        <label>${esc(t.dry_temp)}: <b id="drytv">${d.temp} °C</b><input type="range" min="45" max="${max}" step="1" data-f="dry_temp" value="${d.temp}" class="range"></label>
        <div class="chips">${chips.map((c) => `<span class="chipbtn ${c === d.temp ? "on" : ""}" data-a="dry-chip" data-v="${c}">${c} °C</span>`).join("")}</div>
        <label>${esc(t.dry_time)}: <b id="drydv">${d.hours} ${esc(t.hours)}</b><input type="range" min="1" max="24" step="1" data-f="dry_hours" value="${d.hours}" class="range"></label>
        <label class="chk"><input type="checkbox" data-f="dry_rotate" ${d.rotate ? "checked" : ""}> ${esc(t.rotate)}</label>
        ${pla && d.temp > 55 ? `<div class="note warn">${esc(t.dry_pla)}</div>` : ""}
        ${printing ? `<div class="note warn">${esc(t.dry_printing)}</div>` : ""}
        <div class="err" id="err"></div>
        <div class="dact"><button class="btn" data-a="dry-start" ${p.can_control === false ? "disabled" : ""}><ha-icon icon="mdi:play"></ha-icon>${esc(t.dry_start)}</button></div>
      </div>`;
  }

  async _openEdit(id, preset = {}) {
    await this._loadCatalog();
    const d = this._data;
    const s = id ? this._spool(id) : null;
    const form = s ? { ...s, gross: "" } : {
      name: "", vendor: "", material: "", filament_id: "", color: "808080FF", nozzle_min: "", nozzle_max: "",
      spool_weight: d.default_spool_weight, net_weight: d.default_net_weight, remaining: d.default_net_weight, gross: "", tag: "", ...preset,
    };
    this._dialog = { type: "edit", id: s?.id, form, tray: preset._tray, trayLabel: preset._trayLabel };
    delete form._tray; delete form._trayLabel;
    this._renderDialog();
    setTimeout(() => this.shadowRoot.querySelector('[data-f="name"]')?.focus(), 50);
  }

  _autoBed(fid) {
    const p = this._printer, c = (this._catalog || []).find((x) => x.id === fid);
    const bed = c?.bed; if (!bed || !p) return null;
    const fb = { P1S: "P1P", X1: "X1C", X1E: "X1C" }[p.model_key];
    return ((bed[p.model_key] || (fb && bed[fb]) || bed.default || {})[p.plate]) || null;
  }

  _spoolBed(s) {
    if (!s) return null;
    if (num(s.bed_temp) > 0) return num(s.bed_temp);
    return this._autoBed(s.filament_id);
  }

  _readForm() {
    const f = this._dialog.form;
    this.shadowRoot.querySelectorAll("#dlg [data-f]").forEach((el) => {
      const k = el.dataset.f;
      if (k === "profile" || k === "colorpick") return;
      f[k] = el.type === "checkbox" ? el.checked : el.value;
    });
    return f;
  }

  _err(msg) { const e = this.shadowRoot.getElementById("err"); if (e) e.textContent = msg || ""; }

  _toast(msg) {
    const el = this.shadowRoot.getElementById("toast");
    el.textContent = msg; el.className = "show";
    clearTimeout(this._toastT); this._toastT = setTimeout(() => (el.className = ""), 2500);
  }

  async _call(service, data) {
    try { await this._hass.callService(DOMAIN, service, data); return true; }
    catch (e) { this._err(e?.message || String(e)); if (!this._dialog) this._toast(e?.message || String(e)); return false; }
  }

  // ------------------------------------------------------------------ events
  _onInput(e) {
    const el = e.target;
    if (this._dialog?.type === "dry" && el.dataset.f) {
      if (el.dataset.f === "dry_temp") { this._dialog.temp = parseInt(el.value, 10); const v = this.shadowRoot.getElementById("drytv"); if (v) v.textContent = `${el.value} °C`;
        this.shadowRoot.querySelectorAll("#dlg .chipbtn").forEach((c) => c.classList.toggle("on", c.dataset.v === el.value)); }
      if (el.dataset.f === "dry_hours") { this._dialog.hours = parseInt(el.value, 10); const v = this.shadowRoot.getElementById("drydv"); if (v) v.textContent = `${el.value} ${this._t.hours}`; }
      return;
    }
    if (el.dataset.a === "q" && this._dialog) {
      this._dialog.q = el.value;
      const pos = el.selectionStart;
      this._renderDialog();
      const n = this.shadowRoot.querySelector('#dlg [data-a="q"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) {} }
      return;
    }
    if (!this._dialog || this._dialog.type !== "edit") return;
    const k = el.dataset.f;
    if (k === "colorpick") {
      const c = el.value.replace("#", "").toUpperCase() + "FF";
      this._dialog.form.color = c;
      const hex = this.shadowRoot.querySelector('#dlg [data-f="color"]'); if (hex) hex.value = c;
      this._updateDot();
    } else if (k === "color") { this._dialog.form.color = el.value; this._updateDot(); }
    else if (k === "gross" || k === "spool_weight") {
      if (k === "spool_weight" && e.isTrusted) this._dialog.swTouched = true;
      this._readForm();
      const f = this._dialog.form;
      const r = this.shadowRoot.querySelector('#dlg [data-f="remaining"]');
      if (r) {
        if (num(f.gross) > 0) { r.value = Math.max(0, Math.round(num(f.gross) - num(f.spool_weight))); r.disabled = true; }
        else { r.disabled = false; }
      }
    }
  }

  _updateDot() {
    const d = this.shadowRoot.querySelector("#dlg .dh .dot"); if (d) d.setAttribute("style", fillStyle([this._dialog.form.color]));
    this.shadowRoot.querySelectorAll("#dlg .sw").forEach((s) => s.classList.toggle("on", s.dataset.c === hex6(this._dialog.form.color)));
  }

  _vendorSpoolWeight(vendor) {
    // learned from your own spools: newest spool of the same vendor
    const v = String(vendor || "").trim().toLowerCase();
    if (!v) return null;
    const same = (this._data.spools || []).filter((s) => !s.bambu_uuid && String(s.vendor || "").trim().toLowerCase() === v && num(s.spool_weight) > 0)
      .sort((a, b) => String(b.updated || b.created || "").localeCompare(String(a.updated || a.created || "")));
    return same.length ? num(same[0].spool_weight) : null;
  }

  _onChange(e) {
    const el = e.target;
    if (this._dialog?.type === "dry") {
      if (el.dataset.f === "dry_rotate") this._dialog.rotate = el.checked;
      if (el.dataset.f === "dry_temp") this._renderDialog();  // refresh PLA warning
      return;
    }
    if (el.dataset.f === "vendor" && this._dialog?.type === "edit" && !this._dialog.id) {
      const w = this._vendorSpoolWeight(el.value);
      const sw = this.shadowRoot.querySelector('#dlg [data-f="spool_weight"]');
      if (w !== null && sw && !this._dialog.swTouched) { sw.value = w; this._dialog.form.spool_weight = w; this._onInput({ target: sw }); }
      return;
    }
    if (el.dataset.a === "sort") { this._sort = el.value; this._render(); return; }
    if (el.dataset.a === "import-file") { const f = el.files?.[0]; if (f) this._import(f); el.value = ""; return; }
    if (el.dataset.a === "hide-empty") { this._hideEmpty = el.checked; this._render(); return; }
    if (el.dataset.f === "profile" && this._dialog?.type === "edit") {
      const f = this._readForm();
      const c = (this._catalog || []).find((x) => x.id === el.value);
      if (c) {
        f.filament_id = c.id; f.material = c.type || f.material;
        if (c.min) f.nozzle_min = c.min; if (c.max) f.nozzle_max = c.max;
        if (!f.vendor && c.vendor && c.vendor !== "Generic") f.vendor = c.vendor;
        if (!f.name) f.name = c.name;
      } else if (el.value === "__custom") { f.filament_id = f.filament_id || ""; }
      this._renderDialog();
    }
  }

  async _onClick(e) {
    const el = e.target.closest("[data-a]");
    if (!el) return;
    const a = el.dataset.a;
    const t = this._t;
    if (a === "overlay" && e.target !== el) return;
    switch (a) {
      case "overlay": case "close": this._dialog = null; this._renderDialog(); break;
      case "export": this._export(); break;
      case "import": this.shadowRoot.querySelector('[data-a="import-file"]')?.click(); break;
      case "toggle-list": this._showList = !this._showList; this._render(); break;
      case "new": this._openEdit(null); break;
      case "new-from-tag": this._openEdit(null, { tag: this._data.unknown_tag }); break;
      case "clear-tag": await this._call("clear_unknown_tag", {}); break;
      case "clear-pending": await this._call("select_spool", { spool_id: null }); break;
      case "edit": this._openEdit(el.dataset.id); break;
      case "slot": {
        const pend = this._data.pending && this._spool(this._data.pending);
        const tr = this._printer.units.flatMap((u) => u.trays).find((x) => x.entity_id === el.dataset.tray);
        if (pend && tr && tr.source !== "bambu") {
          // scanned spool waiting: one tap loads it (like the old flow)
          if (await this._call("assign_spool", { tray: tr.entity_id, spool_id: pend.id })) this._toast(`${pend.name} → ${tr.label} ${this._printer.can_control === false ? t.linked_only : t.sent}`);
          break;
        }
        this._dialog = { type: "slot", tray: el.dataset.tray, q: "" };
        this._renderDialog();
        break;
      }
      case "assign": {
        const s = this._spool(el.dataset.id);
        if (await this._call("assign_spool", { tray: this._dialog.tray, spool_id: el.dataset.id })) {
          const label = this._printer.units.flatMap((u) => u.trays).find((x) => x.entity_id === this._dialog.tray)?.label || "";
          this._dialog = null; this._renderDialog(); this._toast(`${s?.name || ""} → ${label} ${this._printer.can_control === false ? t.linked_only : t.sent}`);
        }
        break;
      }
      case "dry-open": {
        const u = this._printer.units.find((x) => x.device_id === el.dataset.dev);
        let rec = 0, hrs = 0;
        (u?.trays || []).forEach((tr) => { const a = this._st(tr.entity_id)?.attributes || {}; if (!a.empty) { rec = Math.max(rec, num(a.dry_temp)); hrs = Math.max(hrs, num(a.dry_time)); } });
        const max = u?.model === "AMS HT" ? 85 : 65;
        this._dialog = { type: "dry", dev: el.dataset.dev, temp: Math.min(max, Math.max(45, Math.round(rec) || 45)), hours: Math.min(24, Math.max(1, Math.round(hrs) || 4)), rotate: false };
        this._renderDialog();
        break;
      }
      case "dry-chip": this._dialog.temp = parseInt(el.dataset.v, 10); this._renderDialog(); break;
      case "dry-start": {
        const d = this._dialog;
        try {
          await this._hass.callService("bambu_lab", "start_filament_drying", { device_id: d.dev, temp: d.temp, duration: d.hours, rotate_tray: !!d.rotate });
          this._dialog = null; this._renderDialog(); this._toast(`${t.dry_started}: ${d.temp} °C · ${d.hours} ${t.hours}`);
        } catch (err) { this._err(err?.message || String(err)); }
        break;
      }
      case "dry-stop": {
        try { await this._hass.callService("bambu_lab", "stop_filament_drying", { device_id: el.dataset.dev }); this._toast(t.dry_stopped); }
        catch (err) { this._toast(err?.message || String(err)); }
        break;
      }
      case "unlink": if (await this._call("unassign_tray", { tray: this._dialog.tray })) { this._dialog = null; this._renderDialog(); } break;
      case "new-for-slot": {
        const tr = this._printer.units.flatMap((u) => u.trays).find((x) => x.entity_id === this._dialog.tray);
        const at = this._st(tr.entity_id)?.attributes || {};
        const empty = at.empty || !at.filament_id;
        this._openEdit(null, {
          _tray: tr.entity_id, _trayLabel: tr.label,
          ...(empty ? {} : { filament_id: at.filament_id, material: at.type || "", color: String(at.color || "").replace("#", ""), nozzle_min: at.nozzle_temp_min, nozzle_max: at.nozzle_temp_max, name: at.name || "" }),
        });
        break;
      }
      case "swatch": this._dialog.form.color = el.dataset.c + "FF"; { const h = this.shadowRoot.querySelector('#dlg [data-f="color"]'); if (h) h.value = this._dialog.form.color; } this._updateDot(); break;
      case "take-tag": this._readForm().tag = this._data.unknown_tag; this._renderDialog(); break;
      case "ask-delete": this._readForm(); this._dialog.askDelete = true; this._renderDialog(); break;
      case "no-delete": this._dialog.askDelete = false; this._renderDialog(); break;
      case "delete": {
        const f = this._readForm();
        if (await this._call("delete_spool", { spool_id: this._dialog.id, delete_tag: !!f.delete_tag })) { this._dialog = null; this._renderDialog(); }
        break;
      }
      case "select-spool": if (await this._call("select_spool", { spool_id: this._dialog.id })) { this._dialog = null; this._renderDialog(); } break;
      case "save": {
        const f = this._readForm();
        if (!String(f.name || "").trim()) { this._err(t.name + "?"); break; }
        const data = {
          name: f.name.trim(), vendor: f.vendor || "", material: f.material || "", filament_id: f.filament_id || "",
          color: String(f.color || "808080").replace("#", ""), tag: (f.tag || "").trim(),
        };
        ["nozzle_min", "nozzle_max", "spool_weight", "net_weight"].forEach((k) => { if (f[k] !== "" && f[k] !== undefined && f[k] !== null) data[k] = num(f[k]); });
        data.bed_temp = num(f.bed_temp) > 0 ? num(f.bed_temp) : 0;
        data.price = num(f.price) > 0 ? num(f.price) : 0;
        if (num(f.gross) > 0) data.gross_weight = num(f.gross);
        else if (f.remaining !== "" && f.remaining !== undefined) data.remaining = num(f.remaining);
        if (f.bambu_uuid) { delete data.filament_id; }
        let ok;
        if (this._dialog.id) ok = await this._call("update_spool", { spool_id: this._dialog.id, ...data });
        else ok = await this._call("add_spool", { ...data, ...(this._dialog.tray ? { tray: this._dialog.tray } : {}) });
        if (ok) { this._dialog = null; this._renderDialog(); this._toast(t.saved); }
        break;
      }
      default: break;
    }
  }
}

const STYLE = `
:host{--bfc-bg:var(--ha-card-background,var(--card-background-color,#1c1c1c));--bfc-panel:rgba(127,127,127,.12);--bfc-slot:rgba(127,127,127,.22);--bfc-accent:#00ae42;--bfc-text:var(--primary-text-color);--bfc-sub:var(--secondary-text-color)}
ha-card{padding:14px;overflow:hidden}
ha-icon{--mdc-icon-size:16px;vertical-align:-3px}
.nw{white-space:nowrap}.mini{display:flex;align-items:center;gap:8px;font-weight:700}.minis{margin-top:8px}.minis .spool{height:64px}.minis .nm{display:none}.minis .ams-h .model{display:none}.msg{padding:12px;color:var(--bfc-sub);text-align:center}.msg.sm{padding:6px;font-size:.9em}
.head{display:flex;gap:12px;align-items:center}
.pimg{width:76px;height:76px;object-fit:contain;flex:none}.pimg.icon{--mdc-icon-size:56px;display:flex;align-items:center;justify-content:center;color:var(--bfc-sub)}
.info{flex:1;min-width:0}
.title{display:flex;align-items:center;gap:8px;font-size:1.15em;font-weight:600}
.chip{font-size:.72em;font-weight:600;padding:2px 8px;border-radius:10px;background:var(--bfc-slot);white-space:nowrap}
.s-running{background:var(--bfc-accent);color:#fff}.s-pause{background:#f0a020;color:#111}.s-failed{background:#e04040;color:#fff}.s-finish{background:#2a7fff;color:#fff}.s-offline{background:#666;color:#fff}
.job{margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bar{height:6px;border-radius:3px;background:var(--bfc-slot);margin:6px 0 3px;overflow:hidden}.bar>div{height:100%;background:var(--bfc-accent);border-radius:3px}
.meta,.temps{font-size:.82em;color:var(--bfc-sub)}.temps{display:flex;gap:10px;flex-wrap:wrap;margin-top:4px}
.cover{width:68px;height:68px;object-fit:contain;border-radius:8px;background:var(--bfc-panel);flex:none}
.cam{margin-top:10px}.cam img{width:100%;border-radius:10px;display:block;background:#000}
.banner{display:flex;align-items:center;gap:10px;margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(0,174,66,.14);border:1px solid rgba(0,174,66,.5)}
.banner.warn{background:rgba(240,160,32,.14);border-color:rgba(240,160,32,.6)}.banner>div{flex:1;min-width:0}.banner small{color:var(--bfc-sub);word-break:break-all}
.units{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}
.ams{flex:1 1 220px;min-width:0;box-sizing:border-box;background:var(--bfc-panel);border-radius:14px;padding:10px 10px 8px}
.ams.ext,.ams.ams_ht{flex:0 0 66px;padding:10px 6px 8px}.ams.ext .slot,.ams.ams_ht .slot{min-width:0}
.ams-h{display:flex;align-items:center;gap:6px;font-size:.85em;margin-bottom:8px;flex-wrap:wrap}
.un{font-weight:700}.model{color:var(--bfc-sub)}.env{margin-left:auto;display:flex;gap:8px;color:var(--bfc-sub);align-items:center;flex-wrap:wrap;justify-content:flex-end}.env>span{white-space:nowrap}
.hum.ok{color:#2fbf5b}.hum.mid{color:#e0a020}.hum.bad{color:#e04040}.dry{color:#e07020}
.slots{display:flex;gap:8px}
.slot{flex:1 1 0;min-width:42px;box-sizing:border-box;max-width:90px;text-align:center;cursor:pointer;border-radius:10px;padding:4px 2px;transition:background .15s;-webkit-tap-highlight-color:transparent;user-select:none}
.slot:hover{background:var(--bfc-slot)}
.lbl{font-size:.75em;font-weight:700;color:var(--bfc-sub);margin-bottom:3px}
.slot.active .lbl{color:var(--bfc-accent)}
.spool{position:relative;height:96px;border-radius:9px;background:var(--bfc-slot);overflow:hidden;box-shadow:inset 0 0 0 1px rgba(127,127,127,.35)}
.slot.active .spool{box-shadow:0 0 0 2px var(--bfc-accent),0 0 10px rgba(0,174,66,.6)}
.fill{position:absolute;left:0;right:0;bottom:0;transition:height .4s}
.unk{position:absolute;inset:0;background:repeating-linear-gradient(135deg,rgba(255,255,255,.18) 0 6px,transparent 6px 12px)}
.type.lowfill{text-shadow:none}.type{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);font-weight:800;font-size:.8em;text-shadow:0 0 3px rgba(0,0,0,.25);padding:0 2px;word-break:break-word}
.none{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--bfc-sub);--mdc-icon-size:22px}
.src{position:absolute;top:4px;right:4px;--mdc-icon-size:13px;color:#fff;background:rgba(0,0,0,.45);border-radius:50%;padding:2px}
.nm{font-size:.72em;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.g{font-size:.8em;font-weight:700}.slot.low .g{color:#e04040}
.need{font-size:.72em;color:var(--bfc-sub)}.need.bad{color:#e04040;font-weight:700}
.listbar{display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:8px}
.listopts{display:flex;gap:12px;align-items:center;margin:8px 0;font-size:.85em;flex-wrap:wrap}
.listopts select{background:var(--bfc-panel);color:var(--bfc-text);border:1px solid var(--divider-color,#444);border-radius:8px;padding:4px 6px}
.list,.pick{display:flex;flex-direction:column;gap:6px}.pick{max-height:38vh;overflow:auto;margin-top:6px}
.row{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:var(--bfc-panel);cursor:pointer}
.row:hover{background:var(--bfc-slot)}.row.sm{padding:6px 8px}
.dot{width:26px;height:26px;border-radius:50%;flex:none;box-shadow:inset 0 0 0 1px rgba(127,127,127,.5)}.dot.big{width:38px;height:38px}
.rinfo{flex:1;min-width:0}.rn{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rs{font-size:.8em;color:var(--bfc-sub)}
.rbar{height:4px;border-radius:2px;background:var(--bfc-slot);margin-top:4px;overflow:hidden}.rbar>div{height:100%}
.rg{text-align:right;font-weight:700;font-size:.9em;white-space:nowrap;display:flex;flex-direction:column;align-items:flex-end;gap:2px}
.row.low .rg{color:#e04040}
.loc{font-size:.72em;font-weight:700;background:var(--bfc-accent);color:#fff;border-radius:6px;padding:0 5px}
.btn{display:inline-flex;align-items:center;gap:4px;border:none;border-radius:18px;padding:7px 14px;background:var(--bfc-accent);color:#fff;font:inherit;font-size:.9em;font-weight:600;cursor:pointer}
.btn.flat{background:transparent;color:var(--primary-color);padding:7px 8px}.btn.sm{font-size:.8em;padding:3px 8px}
.btn.danger{background:#e04040;color:#fff}.btn.flat.danger{background:transparent;color:#e04040}
.btn.wide{width:100%;justify-content:center;margin:8px 0;padding:10px}.btn.tog{color:var(--bfc-text);font-weight:700}
.icon-btn{margin-left:auto;background:none;border:none;color:var(--bfc-text);cursor:pointer;padding:6px;--mdc-icon-size:22px}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px}
.dialog{background:var(--bfc-bg);color:var(--bfc-text);border-radius:18px;width:min(460px,100%);max-height:92vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.5)}
.dh{display:flex;align-items:center;gap:12px;padding:14px 14px 8px;position:sticky;top:0;background:var(--bfc-bg);z-index:1}
.dt{font-weight:700;font-size:1.1em}.ds{font-size:.85em;color:var(--bfc-sub)}
.dbody{padding:4px 14px 16px}
.kv{margin:6px 0}.kv>span{display:block;font-size:.78em;color:var(--bfc-sub)}.kv small{color:var(--bfc-sub)}
.note{font-size:.85em;padding:8px 10px;border-radius:10px;background:var(--bfc-panel);margin:8px 0}.note.warn{background:rgba(240,160,32,.15)}
.sec{font-weight:700;margin:12px 0 6px}
.inp{width:100%;box-sizing:border-box;background:var(--bfc-panel);color:var(--bfc-text);border:1px solid var(--divider-color,#555);border-radius:9px;padding:9px 10px;font:inherit;margin-top:3px}
.inp:disabled{opacity:.6}
.form label{display:block;font-size:.82em;color:var(--bfc-sub);margin-top:9px}
.form .inp{font-size:1rem;color:var(--bfc-text)}
.two{display:flex;gap:10px}.two>label{flex:1;min-width:0}
.swatches{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:4px}
.sw{width:26px;height:26px;border-radius:50%;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(127,127,127,.6)}.sw.on{outline:3px solid var(--bfc-accent);outline-offset:1px}
input[type=color]{width:34px;height:30px;border:none;background:none;padding:0;cursor:pointer}
.inp.hex{width:110px;margin-top:0;font-family:monospace}
.dact{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;align-items:center}
.confirm{margin-top:12px;padding:10px;border-radius:10px;background:rgba(224,64,64,.12)}
.chk{display:flex!important;gap:6px;align-items:center;color:var(--bfc-text)!important}
.hint{font-size:.85em;opacity:.8}.range{width:100%;margin-top:6px;accent-color:#e07020}.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.chipbtn{padding:4px 10px;border-radius:14px;background:var(--bfc-panel);cursor:pointer;font-size:.85em;border:1px solid var(--divider-color,#555)}.chipbtn.on{background:#e07020;color:#fff;border-color:#e07020}.btn:disabled{opacity:.5;cursor:not-allowed}.dryrow{display:flex;align-items:center;gap:6px;margin:-2px 0 8px;padding:6px 8px;border-radius:10px;background:rgba(224,112,32,.14);color:#e07020;font-size:.85em;font-weight:600}.dryrow span{flex:1}.spin{animation:bfcspin 2s linear infinite}@keyframes bfcspin{to{transform:rotate(360deg)}}.grow{flex:1}.month{display:flex;align-items:center;gap:6px;font-size:.85em;color:var(--bfc-sub);margin-top:8px}.err{color:#e04040;font-size:.85em;margin-top:8px;min-height:1em}
#toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(80px);background:#323232;color:#fff;padding:10px 16px;border-radius:10px;z-index:10000;opacity:0;transition:all .25s;pointer-events:none;max-width:90vw}
#toast.show{transform:translateX(-50%);opacity:1}
`;

if (!customElements.get("bambu-filament-card")) {
  customElements.define("bambu-filament-card", BambuFilamentCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "bambu-filament-card",
    name: "Bambu Filament",
    description: "AMS like in Bambu Studio, spool inventory with NFC and usage tracking (Bambu Filament Manager).",
    preview: true,
    documentationURL: "https://github.com/Trunks1982/ha-bambu-filament-manager",
  });
  console.info(`%c BAMBU-FILAMENT-CARD %c ${CARD_VERSION} `, "background:#00ae42;color:#fff;font-weight:700", "background:#333;color:#fff");
}
