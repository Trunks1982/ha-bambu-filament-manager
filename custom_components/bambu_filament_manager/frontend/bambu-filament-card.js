/* Bambu Filament Card – part of the Bambu Filament Manager integration.
 * Shows printer status and the AMS like in Bambu Studio / Handy, and manages spools.
 * No build step, no external dependencies. */
const DOMAIN = "bambu_filament_manager";
const CARD_VERSION = "0.2.0";

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
    net_weight: "Filament when new (g)", sw_hint: "(remembered per vendor)", remaining: "Remaining (g)", scale: "Or weigh: scale shows (g)", tag: "NFC sticker",
    take_tag: "Use last scanned sticker", save: "Save", delete: "Delete", delete_q: "Really delete this spool?", delete_tag: "Also delete the NFC sticker in Home Assistant",
    edit: "Edit spool", select: "Select (like NFC scan)", in_slot: "in", none: "No spools yet – create your first one.",
    needs: "needs", job: "Print job", saved: "Saved", sent: "sent to the printer", camera: "Camera", show_all: "Show all", used_up: "used up",
    rest_after: "after this print", low: "almost empty", sort: "Sort", by_name: "Name", by_rest: "Remaining", by_color: "Color", hide_empty: "Hide empty spools",
    printer: "Printer", show_camera: "Show camera", show_spools: "Show spool list",
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
    net_weight: "Filament neu (g)", sw_hint: "(merkt sich je Hersteller)", remaining: "Rest (g)", scale: "Oder wiegen: Waage zeigt (g)", tag: "NFC-Aufkleber",
    take_tag: "Zuletzt gescannten Aufkleber nehmen", save: "Speichern", delete: "Löschen", delete_q: "Rolle wirklich löschen?", delete_tag: "NFC-Aufkleber auch in Home Assistant löschen",
    edit: "Rolle bearbeiten", select: "Auswählen (wie NFC-Scan)", in_slot: "in", none: "Noch keine Rollen – lege deine erste an.",
    needs: "braucht", job: "Druckauftrag", saved: "Gespeichert", sent: "an den Drucker geschickt", camera: "Kamera", show_all: "Alle zeigen", used_up: "verbraucht",
    rest_after: "nach diesem Druck", low: "fast leer", sort: "Sortieren", by_name: "Name", by_rest: "Rest", by_color: "Farbe", hide_empty: "Leere Rollen ausblenden",
    printer: "Drucker", show_camera: "Kamera zeigen", show_spools: "Rollenliste zeigen",
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

  connectedCallback() { if (this._hass && !this._unsub) this._subscribe(); this._startCam(); }
  disconnectedCallback() {
    if (this._unsub) { this._unsub.then((u) => u && u()).catch(() => {}); this._unsub = null; }
    clearInterval(this._camTimer); this._camTimer = null;
  }

  _subscribe() {
    if (!this._hass?.connection || this._unsub) return;
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

  _amsHtml(p) {
    const t = this._t;
    const low = num(this._data.low_threshold, 100);
    const job = {};
    Object.entries(p.job?.weights || {}).forEach(([k, g]) => { job[k] = Math.max(0, g - num(p.job?.consumed?.[k])); });
    return `<div class="units">${p.units.map((u) => {
      const ue = u.entities;
      const hum = this._sv(ue.humidity), temp = this._sv(ue.ams_temp);
      const drying = this._sv(ue.drying) === "on";
      const humN = num(hum, NaN);
      const humCls = isNaN(humN) ? "" : humN < 40 ? "ok" : humN < 60 ? "mid" : "bad";
      const ext = u.kind === "external";
      return `<div class="ams ${ext ? "ext" : ""} ${u.kind}">
        <div class="ams-h"><span class="un">${esc(ext ? (u.name) : u.name)}</span>${!ext && u.model ? `<span class="model">${esc(u.model)}</span>` : ""}
          <span class="env">${hum !== undefined && hum !== "unavailable" ? `<span class="hum ${humCls}"><ha-icon icon="mdi:water-percent"></ha-icon>${esc(hum)}%</span>` : ""}
          ${temp !== undefined && temp !== "unavailable" ? `<span><ha-icon icon="mdi:thermometer"></ha-icon>${Math.round(num(temp))}°</span>` : ""}
          ${drying ? `<span class="dry"><ha-icon icon="mdi:fan"></ha-icon>${esc(t.drying)}</span>` : ""}</span></div>
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
    ${this._showList ? `<div class="listopts">
        <select data-a="sort">${["name", "rest", "color"].map((k) => `<option value="${k}" ${this._sort === k ? "selected" : ""}>${esc(t.sort)}: ${esc(t["by_" + k])}</option>`).join("")}</select>
        <label><input type="checkbox" data-a="hide-empty" ${hideEmpty ? "checked" : ""}> ${esc(t.hide_empty)}</label>
      </div>
      <div class="list">${list.length ? list.map((s) => {
        const pct = s.net_weight ? Math.max(0, Math.min(100, (num(s.remaining) / num(s.net_weight, 1000)) * 100)) : 0;
        return `<div class="row ${num(s.remaining) < low ? "low" : ""}" data-a="edit" data-id="${esc(s.id)}">
          <span class="dot" style="${fillStyle([s.color])}"></span>
          <div class="rinfo"><div class="rn">${esc(s.name)}${s.tag ? ` <ha-icon icon="mdi:nfc-variant"></ha-icon>` : ""}${s.bambu_uuid ? ` <ha-icon icon="mdi:contactless-payment"></ha-icon>` : ""}</div>
            <div class="rs">${esc([s.vendor, s.material].filter(Boolean).join(" · "))}</div>
            <div class="rbar"><div style="width:${pct}%;${fillStyle([s.color])}"></div></div></div>
          <div class="rg">${Math.round(num(s.remaining))} g${loc[s.id] ? `<span class="loc">${esc(loc[s.id])}</span>` : ""}</div>
        </div>`;
      }).join("") : `<div class="msg">${esc(t.none)}</div>`}</div>` : ""}`;
  }

  // ------------------------------------------------------------------ dialogs
  _renderDialog() {
    const root = this.shadowRoot.getElementById("dlg");
    if (!this._dialog) { root.innerHTML = ""; return; }
    const html = this._dialog.type === "slot" ? this._slotDialog() : this._editDialog();
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
        v.spool ? `<div class="kv"><span>${esc(t.linked)}</span><b>${esc(v.spool.name)}</b> <small>${Math.round(num(v.spool.remaining))} g</small> <button class="btn flat sm" data-a="edit" data-id="${esc(v.spool.id)}">${esc(t.edit)}</button></div>` :
        `<div class="kv"><span>${esc(t.linked)}</span><i>${esc(t.none_linked)}</i></div>${tr.stale_link ? `<div class="note warn">${esc(t.stale)}</div>` : ""}`}
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
        <div class="two">
          <label>${esc(t.spool_weight)}${this._dialog.id ? "" : ` <small class="hint">${esc(t.sw_hint)}</small>`}<input class="inp" type="number" inputmode="decimal" data-f="spool_weight" value="${esc(f.spool_weight)}"></label>
          <label>${esc(t.net_weight)}<input class="inp" type="number" inputmode="decimal" data-f="net_weight" value="${esc(f.net_weight)}"></label>
        </div>
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
    if (el.dataset.f === "vendor" && this._dialog?.type === "edit" && !this._dialog.id) {
      const w = this._vendorSpoolWeight(el.value);
      const sw = this.shadowRoot.querySelector('#dlg [data-f="spool_weight"]');
      if (w !== null && sw && !this._dialog.swTouched) { sw.value = w; this._dialog.form.spool_weight = w; this._onInput({ target: sw }); }
      return;
    }
    if (el.dataset.a === "sort") { this._sort = el.value; this._render(); return; }
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
          if (await this._call("assign_spool", { tray: tr.entity_id, spool_id: pend.id })) this._toast(`${pend.name} → ${tr.label} ${t.sent}`);
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
          this._dialog = null; this._renderDialog(); this._toast(`${s?.name || ""} → ${label} ${t.sent}`);
        }
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
.nw{white-space:nowrap}.msg{padding:12px;color:var(--bfc-sub);text-align:center}.msg.sm{padding:6px;font-size:.9em}
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
.un{font-weight:700}.model{color:var(--bfc-sub)}.env{margin-left:auto;display:flex;gap:8px;color:var(--bfc-sub)}
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
.hint{font-size:.85em;opacity:.8}.err{color:#e04040;font-size:.85em;margin-top:8px;min-height:1em}
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
    preview: false,
    documentationURL: "https://github.com/Trunks1982/ha-bambu-filament-manager",
  });
  console.info(`%c BAMBU-FILAMENT-CARD %c ${CARD_VERSION} `, "background:#00ae42;color:#fff;font-weight:700", "background:#333;color:#fff");
}
