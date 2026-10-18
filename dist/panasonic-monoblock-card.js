/*
 * Panasonic Monoblock Card
 * custom:panasonic-monoblock-card -> Panasonic monoblock, zonder buffervat
 * Opmaak geïnspireerd op AMensink/warmtepomp-cards (MIT); code volledig zelf geschreven.
 *
 * Stroomrichting: de animatie loopt altijd in de tekenrichting van het pad.
 * Met `reverse_flow: true` draai je alle stroomanimaties om.
 */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const isNum = (v) => v !== null && v !== undefined && !isNaN(v);
const fmt = (v, d = 1, u = '') =>
  isNum(v) ? Number(v).toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d }) + u : '–';
const fmtP = (w) => (!isNum(w) ? '–' : Math.abs(w) >= 1000 ? fmt(w / 1000, 2, ' kW') : fmt(w, 0, ' W'));
const fmtMin = (m) => (!isNum(m) ? '–' : m >= 60 ? `${Math.floor(m / 60)} u ${Math.round(m % 60)} min` : `${Math.round(m)} min`);
const STOPS = [[0, [47, 128, 208]], [0.28, [60, 190, 235]], [0.42, [240, 220, 150]], [0.58, [250, 170, 60]], [0.8, [245, 110, 40]], [1, [225, 50, 40]]];
const tempColor = (t, lo = 15, hi = 60) => {
  if (!isNum(t)) return '#9aa5b1';
  const k = clamp((t - lo) / (hi - lo), 0, 1);
  for (let i = 1; i < STOPS.length; i++) {
    if (k <= STOPS[i][0]) {
      const [k0, c0] = STOPS[i - 1], [k1, c1] = STOPS[i];
      const f = (k - k0) / (k1 - k0);
      return `rgb(${c0.map((v, j) => Math.round(v + (c1[j] - v) * f)).join(',')})`;
    }
  }
  return 'rgb(225,50,40)';
};
const ON_STATES = ['on', 'true', 'heating', 'heat', 'running', 'active', 'defrosting', 'open', 'online', 'connected'];
const OK_STATES = ['0', 'off', 'none', 'no fault', 'unknown', 'unavailable', '', 'false', 'ok', 'normal'];
const MODE_NL = { heat: 'Verwarmen', heating: 'Verwarmen', cool: 'Koelen', cooling: 'Koelen', off: 'Uit', auto: 'Auto', manual: 'Handmatig', eco: 'Eco+', 'eco+': 'Eco+', program: 'Programma', programmed: 'Programma', performance: 'Boost', electric: 'Elektrisch', standard: 'Standaard' };
const modeText = (v) => (v === null || v === undefined || v === '' ? '' : MODE_NL[String(v).toLowerCase()] || String(v));
const GREY = '#8b9097';

class WPBase extends HTMLElement {
  setConfig(config) {
    if (!config) throw new Error('Geen configuratie');
    this._c = { ...this.constructor.defaults(), ...config, entities: { ...(config.entities || {}) } };
    this._uid = 'u' + Math.random().toString(36).slice(2, 8);
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._sig = null;
    if (this._hass) this._render();
  }
  set hass(h) {
    this._hass = h;
    if (!this._c) return;
    const sig = Object.values(this._c.entities).map((id) => (h.states[id] ? h.states[id].last_updated : '-')).join('|');
    if (sig !== this._sig) { this._sig = sig; this._render(); }
  }
  getCardSize() { return 8; }
  _st(key) { const id = this._c.entities[key]; return id ? this._hass.states[id] : undefined; }
  _n(key) { const s = this._st(key); if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; }
  _attr(key, a) { const s = this._st(key); return s && s.attributes ? s.attributes[a] : undefined; }
  _has(key) { return !!this._st(key); }
  _on(key) {
    const s = this._st(key);
    if (!s) return false;
    if (ON_STATES.includes(String(s.state).toLowerCase())) return true;
    const v = parseFloat(s.state);
    return !isNaN(v) && v > 0;
  }
  _fault() { const s = this._st('fault'); return !!s && !OK_STATES.includes(String(s.state).toLowerCase()); }
  _wire() {
    this.shadowRoot.querySelectorAll('[data-e]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = this._c.entities[el.dataset.e];
        if (id) this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: id } }));
      });
    });
  }

  /* leiding met bewegende stippen; de stroom loopt van het begin naar het einde van `d` */
  _pipe(d, col, on, w = 6, dur = 1.4) {
    return `<path d="${d}" fill="none" stroke="${on ? col : GREY}" stroke-opacity="${on ? 0.95 : 0.45}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>` +
      (on ? `<path class="flow" style="--flow:${dur}s" d="${d}" fill="none" stroke="#fff3df" stroke-opacity=".85" stroke-width="${Math.max(2, w * 0.4)}"/>` : '');
  }
  _fan(cx, cy, r, on, dur, grille, _op, hub = true) {
    const blades = [0, 120, 240].map((a) =>
      `<ellipse cx="${cx}" cy="${cy - r * 0.52}" rx="${r * 0.3}" ry="${r * 0.5}" fill="#b9bfc6" stroke="rgba(0,0,0,.18)" transform="rotate(${a} ${cx} ${cy})"/>`).join('');
    let g = '';
    if (grille) {
      g = [0.97, 0.72, 0.47].map((k) => `<circle cx="${cx}" cy="${cy}" r="${r * k}" fill="none" stroke="rgba(150,150,150,.35)"/>`).join('') +
        Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * r * 0.97}" y2="${cy + Math.sin(a) * r * 0.97}" stroke="rgba(150,150,150,.28)"/>`; }).join('');
    }
    return `${g}<g class="sp ${on ? 'spin' : ''}" style="transform-origin:${cx}px ${cy}px;--spin:${dur}s">${blades}</g>${hub ? `<circle cx="${cx}" cy="${cy}" r="${r * 0.15}" fill="#6b7078"/>` : ''}`;
  }
  _pump(x, y, on) {
    const col = on ? '#3fcf5a' : '#6b7078';
    return `<circle cx="${x}" cy="${y}" r="12" style="fill:var(--card-background-color)" stroke="${col}" stroke-width="2.5"/>
      <g class="sp ${on ? 'spin' : ''}" style="transform-origin:${x}px ${y}px;--spin:1s" stroke="${col}" stroke-width="2.5" stroke-linecap="round" fill="none"><path d="M${x} ${y} v-7 M${x} ${y} l6 3.5 M${x} ${y} l-6 3.5"/></g>`;
  }
  _chip(label, on, key) { return `<span class="chip ${on ? 'on' : ''}" ${key ? `data-e="${key}"` : ''}><i class="dot"></i>${label}</span>`; }
  _stat(label, value, key) { return `<div class="stat" ${key ? `data-e="${key}"` : ''}><span>${label}</span><b>${value}</b></div>`; }
  _shell(title, pill, body) {
    this.shadowRoot.innerHTML = `
    <style>
      ha-card{display:block;padding:16px;overflow:hidden}
      .head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}
      .title{font-size:1.1rem;font-weight:600;color:var(--primary-text-color)}
      .pill{font-size:.82rem;padding:6px 14px;border-radius:999px;background:rgba(255,120,40,.16);color:#ff9a55;white-space:nowrap}
      .pill.idle{background:var(--secondary-background-color);color:var(--secondary-text-color)}
      .pill.fault{background:rgba(219,68,55,.2);color:#ff6b5e}
      svg{width:100%;height:auto;display:block}
      svg text{font-family:var(--paper-font-body1_-_font-family,system-ui,sans-serif)}
      .lbl{fill:var(--secondary-text-color);font-size:11.5px}
      .val{fill:var(--primary-text-color);font-size:14px;font-weight:700}
      .zone{fill:var(--secondary-text-color);font-size:10.5px;letter-spacing:1.6px}
      [data-e]{cursor:pointer}
      .chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 4px}
      .chip{display:inline-flex;align-items:center;gap:7px;font-size:.78rem;padding:5px 12px 5px 10px;border-radius:999px;background:var(--secondary-background-color);color:var(--secondary-text-color)}
      .chip.on{color:var(--primary-text-color)}
      .dot{width:8px;height:8px;border-radius:50%;background:#5b6068;display:inline-block}
      .chip.on .dot{background:#3fcf5a}
      .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:8px;margin-top:8px}
      .stat{background:var(--secondary-background-color);border-radius:12px;padding:10px 14px}
      .stat span{display:block;font-size:.74rem;color:var(--secondary-text-color);margin-bottom:3px}
      .stat b{display:block;font-size:1.02rem;color:var(--primary-text-color);font-weight:600;white-space:nowrap}
      .sp{transform-box:view-box}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes flow{to{stroke-dashoffset:-22}}
      @keyframes air{to{stroke-dashoffset:-20}}
      @keyframes rise{0%{opacity:0;transform:translateY(6px)}50%{opacity:.7}100%{opacity:0;transform:translateY(-8px)}}
      @keyframes glow{0%,100%{opacity:.55}50%{opacity:1}}
      .spin{animation:spin var(--spin,1s) linear infinite}
      .flow{stroke-dasharray:1 10;stroke-linecap:round;animation:flow var(--flow,1.4s) linear infinite}
      .air{stroke-dasharray:5 5;animation:air 1s linear infinite}
      .haze{animation:rise 2s ease-in-out infinite}
      .glow{animation:glow 1.4s ease-in-out infinite}
      svg.rev .flow,svg.rev .air{animation-direction:reverse}
      @media (prefers-reduced-motion:reduce){.spin,.flow,.air,.haze,.glow{animation:none!important}}
    </style>
    <ha-card>
      <div class="head"><div class="title">${title}</div>${pill ? `<div class="pill ${pill.cls || ''}">${pill.text}</div>` : ''}</div>
      ${body}
    </ha-card>`;
    this._wire();
  }
}

/* ================================================================== */
/*  Panasonic monoblock, zonder buffervat                              */
/* ================================================================== */
class PanasonicMonoblockCard extends WPBase {
  static defaults() { return { title: 'Warmtepomp', show_radiators: true, show_floor: true, reverse_flow: false }; }
  static getStubConfig() { return { type: 'custom:panasonic-monoblock-card', entities: { supply: 'sensor.aanvoer', return: 'sensor.retour' } }; }

  _render() {
    if (!this._hass || !this._c) return;
    const c = this._c, u = this._uid;
    const sup = this._n('supply'), ret = this._n('return'), flow = this._n('flow'), power = this._n('power');
    const compHz = this._n('comp_hz'), fanRpm = this._n('fan_rpm'), fanHz = this._n('fan_hz');
    const dT = isNum(sup) && isNum(ret) ? sup - ret : (this._has('delta') ? this._n('delta') : null);
    let heat = this._n('heat_power');
    if (!isNum(heat) && isNum(flow) && isNum(dT)) heat = Math.max(0, flow * 69.77 * dT);
    let cop = this._n('cop');
    if (!isNum(cop) && isNum(heat) && isNum(power) && power > 50) cop = heat / power;
    const copEstimated = !this._has('cop') && !this._has('heat_power');

    let running = false;
    if (isNum(compHz)) running = compHz > 0;
    else if (this._has('compressor')) running = this._on('compressor');
    else if (isNum(power)) running = power > 100;
    else if (isNum(flow)) running = flow > 1;
    const circ = running || (isNum(flow) && flow > 1);
    const defrost = this._on('defrost'), fault = this._fault();
    const showR = c.show_radiators !== false, showF = c.show_floor !== false;
    const radOn = showR && circ && (this._has('radiator_pump') ? this._on('radiator_pump') : true);
    const floorOn = showF && circ && (this._has('floor_pump') ? this._on('floor_pump') : true);

    const supC = tempColor(sup, 20, 55), retC = tempColor(ret, 20, 55);
    const avgC = tempColor(isNum(sup) && isNum(ret) ? sup * 0.7 + ret * 0.3 : null, 20, 55);
    const fd = isNum(flow) ? clamp(2.4 - flow * 0.1, 0.7, 2.4) : 1.4;
    const fanDur = isNum(fanRpm) && fanRpm > 0 ? clamp(2.2 - fanRpm / 300, 0.45, 2) : isNum(fanHz) && fanHz > 0 ? clamp(2 - fanHz / 40, 0.45, 2) : 1.1;
    const fanOn = running && (isNum(fanRpm) ? fanRpm > 0 : true);

    // gegevens in het buitenpaneel
    const topItems = [
      ['ambient', 'Buitenlucht', fmt(this._n('ambient'), 1, ' °C')],
      ['coil', 'Verdamper', fmt(this._n('coil'), 0, ' °C')],
      ['exhaust', 'Persgas', fmt(this._n('exhaust'), 0, ' °C')],
    ].filter((i) => this._has(i[0]));
    const fanTxt = isNum(fanRpm) ? fmt(fanRpm, 0, ' rpm') : isNum(fanHz) ? fmt(fanHz, 0, ' Hz') : null;
    const gridItems = [
      ['suction', 'Zuiggas', fmt(this._n('suction'), 0, ' °C')],
      ['comp_hz', 'Compressor', fmt(compHz, 0, ' Hz')],
      fanTxt ? [isNum(fanRpm) ? 'fan_rpm' : 'fan_hz', 'Ventilator', fanTxt] : null,
      ['hp_sat', 'Condensatie', fmt(this._n('hp_sat'), 0, ' °C')],
      ['eev', 'Exp.ventiel', fmt(this._n('eev'), 0, ' P')],
      ['flow', 'Debiet', fmt(flow, 1, ' L/min')],
      ['setpoint', 'Doel aanvoer', fmt(this._n('setpoint'), 1, ' °C')],
    ].filter((i) => i && this._has(i[0]));
    const cols = [22, 104, 186];
    const H = Math.max(420, 345 + Math.ceil(gridItems.length / 3) * 44 + 8);
    const topSvg = topItems.map((it, i) => `<text x="${cols[i]}" y="38" class="lbl">${it[1]}</text><text x="${cols[i]}" y="55" class="val" data-e="${it[0]}">${it[2]}</text>`).join('');
    const gridSvg = gridItems.map((it, i) => `<text x="${cols[i % 3]}" y="${345 + Math.floor(i / 3) * 44}" class="lbl">${it[1]}</text><text x="${cols[i % 3]}" y="${362 + Math.floor(i / 3) * 44}" class="val" data-e="${it[0]}">${it[2]}</text>`).join('');

    /* Waterleidingen, getekend in stroomrichting.
       Aanvoer: warmtepomp -> huis.  Retour: huis -> warmtepomp. */
    const supMain = 'M228 252 H601 V290';              // aanvoer naar verdeler vloerverwarming
    const supRiser = 'M320 252 V84 H428';              // aanvoer naar radiatoren
    const retRad = 'M562 118 H632 V392 H296 V278 H228'; // retour radiatoren -> warmtepomp
    const floorOut = 'M584 300 H382 C366 300 366 318 382 318 H556 C572 318 572 336 556 336 H382 C366 336 366 354 382 354 H584'; // verdeler -> lus -> verdeler
    const floorRet = 'M601 372 V392 H632';             // verdeler -> retourleiding
    const fins = Array.from({ length: 10 }, (_, i) => `<rect x="${432 + i * 13.2}" y="76" width="9" height="48" rx="3" fill="${radOn ? avgC : GREY}" fill-opacity="${radOn ? 1 : 0.5}"/>`).join('');
    const haze = (x, y, d) => `<path class="haze" style="animation-delay:${d}s" d="M${x} ${y} q5 -6 0 -12 t0 -12" fill="none" stroke="${avgC}" stroke-width="2" stroke-linecap="round"/>`;

    const svg = `
    <svg viewBox="0 0 640 ${H}" class="${c.reverse_flow ? 'rev' : ''}">
      <defs>
        <pattern id="${u}h" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="rgba(150,150,150,.5)" stroke-width="2"/></pattern>
      </defs>
      <!-- buitenpaneel + muur -->
      <rect x="0" y="0" width="262" height="${H}" rx="6" fill="rgba(110,150,210,.10)"/>
      <text x="22" y="16" class="zone">BUITEN</text>
      <rect x="262" y="0" width="26" height="${H}" fill="url(#${u}h)" stroke="rgba(150,150,150,.5)"/>
      <rect x="296" y="170" width="344" height="6" fill="rgba(150,150,150,.3)"/>
      <text x="338" y="18" class="zone">VERDIEPING</text>
      <text x="338" y="196" class="zone">BEGANE GROND</text>
      ${topSvg}

      <!-- buitenunit -->
      <rect x="18" y="70" width="226" height="236" rx="14" fill="none" stroke="#c3c8ce" stroke-opacity=".8" stroke-width="3"/>
      <rect x="34" y="306" width="22" height="8" rx="2" fill="${GREY}"/><rect x="206" y="306" width="22" height="8" rx="2" fill="${GREY}"/>
      ${[110, 135, 160].map((y, i) => `<path d="M4 ${y} q10 8 4 20" fill="none" stroke="#4c8df0" stroke-width="2.2" stroke-opacity="${running ? 0.9 : 0.3}" ${running ? `class="air" style="animation-delay:${i * 0.25}s"` : ''}/>`).join('')}
      ${this._fan(92, 160, 60, fanOn, fanDur, true)}
      <rect x="190" y="100" width="36" height="72" rx="16" fill="#9aa0a6" stroke="rgba(0,0,0,.2)" data-e="compressor"/>
      <rect x="202" y="92" width="12" height="12" rx="3" fill="#9aa0a6"/>
      <circle cx="208" cy="152" r="5" fill="${running ? '#3fcf5a' : '#5b6068'}"/>
      <rect x="190" y="236" width="38" height="56" rx="5" fill="rgba(127,127,127,.25)" stroke="#9aa0a6"/>
      ${[246, 256, 266, 276].map((y) => `<line x1="194" y1="${y}" x2="224" y2="${y}" stroke="rgba(150,150,150,.6)"/>`).join('')}
      ${this._pipe('M208 172 V236', '#e8551f', running, 4)}
      ${this._pipe('M190 270 H40 V240', '#3b82f6', running, 4)}
      <polygon points="115,262 123,270 115,278 107,270" fill="#9aa0a6"/>
      ${defrost ? `<rect x="34" y="82" width="100" height="20" rx="10" fill="#e8590c"/><text x="84" y="96" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">ONTDOOIEN</text>` : ''}
      ${gridSvg}

      <!-- waterleidingen huis: retour onder, aanvoer erboven -->
      ${this._pipe(retRad, retC, circ, 6, fd)}
      ${this._pipe(supMain, supC, circ, 6, fd)}
      ${showR ? this._pipe(supRiser, supC, radOn, 6, fd) : ''}
      ${showF ? this._pipe(floorOut, avgC, floorOn, 6, fd) : ''}
      ${showF ? this._pipe(floorRet, retC, floorOn, 6, fd) : ''}

      <!-- radiator -->
      ${showR ? `
        <rect x="424" y="70" width="138" height="60" rx="7" fill="none" stroke="${GREY}" stroke-width="2"/>${fins}
        <text x="493" y="150" text-anchor="middle" class="lbl">Radiatoren</text>` : ''}

      <!-- vloerverwarming + verdeler -->
      ${showF ? `
        <rect x="584" y="286" width="36" height="86" rx="6" style="fill:var(--card-background-color)" stroke="#c3c8ce" stroke-width="2.5"/>
        ${[300, 316, 332, 348].map((y) => `<line x1="590" y1="${y}" x2="614" y2="${y}" stroke="rgba(150,150,150,.6)"/>`).join('')}
        ${floorOn ? haze(420, 296, 0.3) + haze(470, 296, 0.9) + haze(520, 296, 1.5) : ''}
        <text x="470" y="384" text-anchor="middle" class="lbl">Vloerverwarming</text>
        <text x="601" y="410" text-anchor="middle" class="lbl">verdeler</text>` : ''}

      ${this._pump(296, 335, circ)}
      ${showF && this._has('floor_pump') ? this._pump(601, 270, floorOn) : ''}
      ${showR && this._has('radiator_pump') ? this._pump(320, 130, radOn) : ''}

      <!-- aanvoer / retour -->
      <text x="430" y="38" class="lbl">Aanvoer</text><text x="430" y="55" class="val" data-e="supply">${fmt(sup, 1, ' °C')}</text>
      <text x="505" y="38" class="lbl">Retour</text><text x="505" y="55" class="val" data-e="return">${fmt(ret, 1, ' °C')}</text>
      <text x="575" y="38" class="lbl">ΔT</text><text x="575" y="55" class="val" ${this._has('delta') ? 'data-e="delta"' : ''}>${fmt(dT, 1, ' K')}</text>
    </svg>`;

    const modeS = this._st('mode');
    const modeLabel = modeS ? modeText(modeS.state) : '';
    const chips = [
      this._chip('Compressor', running, 'compressor'),
      this._chip('Ventilator', fanOn),
      this._chip('Circulatie WP', circ, 'flow'),
      this._has('radiator_pump') ? this._chip('Cv-pomp', radOn, 'radiator_pump') : '',
      this._has('floor_pump') ? this._chip('Vloerpomp', floorOn, 'floor_pump') : '',
      this._has('defrost') ? this._chip('Ontdooien', defrost, 'defrost') : '',
      this._has('softstart') ? this._chip('Softstart', this._on('softstart'), 'softstart') : '',
      this._has('online') ? this._chip('Online', this._on('online'), 'online') : '',
      this._has('fault') ? this._chip('Storing', fault, 'fault') : '',
    ].join('');

    const thermo = this._has('thermostat') ? parseFloat(this._attr('thermostat', 'current_temperature')) : null;
    const wm = this._st('work_mode');
    const stats = [
      this._stat('Elektrisch', fmtP(power), 'power'),
      this._stat('Warmte-afgifte', fmtP(heat), this._has('heat_power') ? 'heat_power' : ''),
      this._stat(copEstimated ? 'COP (geschat)' : 'COP (actueel)', fmt(cop, 1), 'cop'),
      this._has('energy_today') ? this._stat('Vandaag', fmt(this._n('energy_today'), 2, ' kWh'), 'energy_today') : '',
      modeLabel ? this._stat('Modus', modeLabel, 'mode') : '',
      wm ? this._stat('Werkstand', wm.state, 'work_mode') : '',
      isNum(thermo) ? this._stat('Kamer', fmt(thermo, 1, ' °C'), 'thermostat') : '',
    ].join('');

    let pill;
    if (fault) pill = { text: 'Storing', cls: 'fault' };
    else if (defrost) pill = { text: 'Ontdooien' };
    else if (running) pill = { text: `${modeLabel || 'Verwarmen'}${isNum(compHz) ? ' · ' + fmt(compHz, 0, ' Hz') : ''}` };
    else pill = { text: 'Stand-by', cls: 'idle' };

    this._shell(c.title, pill, svg + `<div class="chips">${chips}</div><div class="stats">${stats}</div>`);
  }
}


customElements.define('panasonic-monoblock-card', PanasonicMonoblockCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'panasonic-monoblock-card', name: 'Panasonic monoblock', description: 'Geanimeerde kaart voor een Panasonic monoblock zonder buffervat', preview: false });
