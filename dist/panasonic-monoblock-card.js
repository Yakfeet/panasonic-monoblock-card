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
let NUM_LOCALE = 'nl-NL'; /* wordt bij elke render gezet op de taal van Home Assistant (of `language`) */
const fmt = (v, d = 1, u = '') =>
  isNum(v) ? Number(v).toLocaleString(NUM_LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d }) + u : '–';
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
/* ---------- vertalingen: voeg hier een taal toe (zoals `de`) en kopieer de sleutels van `en` ---------- */
const TR = {
  nl: {
    title: 'Warmtepomp', supply: 'Aanvoer', ret: 'Retour', outside: 'BUITEN', first: 'VERDIEPING', ground: 'BEGANE GROND', defrostBadge: 'ONTDOOIEN',
    ambient: 'Buitenlucht', coil: 'Verdamper', exhaust: 'Persgas', suction: 'Zuiggas', compressor: 'Compressor', fan: 'Ventilator', condensing: 'Condensatie', expValve: 'Exp.ventiel', flow: 'Debiet', target: 'Doel aanvoer',
    radBed: 'Radiatoren slaapkamers', bath: 'Badkamer vloer', radGround: 'Radiator begane grond', floor: 'Vloerverwarming', garage: 'Garage vloer',
    chipCirc: 'Circulatie WP', chipRadPump: 'Cv-pomp', chipFloorPump: 'Vloerpomp', defrost: 'Ontdooien', softstart: 'Softstart', online: 'Online', fault: 'Storing',
    electric: 'Elektrisch', heatOut: 'Warmte-afgifte', copEst: 'COP (geschat)', copCur: 'COP (actueel)', today: 'Vandaag', mode: 'Modus', workMode: 'Werkstand', room: 'Kamer',
    standby: 'Stand-by', heating: 'Verwarmen', cooling: 'Koelen', on: 'Aan', off: 'Uit',
    modes: { heat: 'Verwarmen', heating: 'Verwarmen', cool: 'Koelen', cooling: 'Koelen', off: 'Uit', auto: 'Auto', manual: 'Handmatig', eco: 'Eco+', 'eco+': 'Eco+', program: 'Programma', programmed: 'Programma', performance: 'Boost', electric: 'Elektrisch', standard: 'Standaard' },
  },
  en: {
    title: 'Heat pump', supply: 'Supply', ret: 'Return', outside: 'OUTSIDE', first: 'FIRST FLOOR', ground: 'GROUND FLOOR', defrostBadge: 'DEFROSTING',
    ambient: 'Outdoor air', coil: 'Evaporator', exhaust: 'Discharge gas', suction: 'Suction gas', compressor: 'Compressor', fan: 'Fan', condensing: 'Condensing', expValve: 'Exp. valve', flow: 'Flow', target: 'Target supply',
    radBed: 'Bedroom radiators', bath: 'Bathroom floor', radGround: 'Ground floor radiator', floor: 'Underfloor heating', garage: 'Garage floor',
    chipCirc: 'HP circulation', chipRadPump: 'Heating pump', chipFloorPump: 'Floor pump', defrost: 'Defrost', softstart: 'Soft start', online: 'Online', fault: 'Fault',
    electric: 'Electrical', heatOut: 'Heat output', copEst: 'COP (estimated)', copCur: 'COP (current)', today: 'Today', mode: 'Mode', workMode: 'Work mode', room: 'Room',
    standby: 'Standby', heating: 'Heating', cooling: 'Cooling', on: 'On', off: 'Off',
    modes: { heat: 'Heating', heating: 'Heating', cool: 'Cooling', cooling: 'Cooling', off: 'Off', auto: 'Auto', manual: 'Manual', eco: 'Eco+', 'eco+': 'Eco+', program: 'Program', programmed: 'Program', performance: 'Boost', electric: 'Electric', standard: 'Standard' },
  },
};
const modeText = (v, t) => (v === null || v === undefined || v === '' ? '' : t.modes[String(v).toLowerCase()] || String(v));
const GREY = '#8b9097';

class WPBase extends HTMLElement {
  setConfig(config) {
    if (!config) throw new Error('No configuration');
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
  _wireActions() {
    this.shadowRoot.querySelectorAll('[data-act]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = this._c.entities[el.dataset.k];
        if (!id || !this._hass) return;
        if (el.dataset.act === 'power') {
          const on = this._hass.states[id] && this._hass.states[id].state === 'on';
          this._hass.callService(id.split('.')[0], on ? 'turn_off' : 'turn_on', { entity_id: id });
        } else if (el.dataset.act === 'mode') {
          this._hass.callService('select', 'select_option', { entity_id: id, option: el.dataset.opt });
        }
      });
    });
  }
  _chip(label, on, key) { return `<span class="chip ${on ? 'on' : ''}" ${key ? `data-e="${key}"` : ''}><i class="dot"></i>${label}</span>`; }
  _stat(label, value, key) { return `<div class="stat" ${key ? `data-e="${key}"` : ''}><span>${label}</span><b>${value}</b></div>`; }
  _shell(title, pill, body) {
    this.shadowRoot.innerHTML = `
    <style>
      ha-card{display:block;padding:16px;overflow:hidden;container-type:inline-size}
      .wrap{display:block}
      .wrap.horizontal{display:grid;grid-template-columns:minmax(0,2.6fr) minmax(250px,1fr);gap:20px;align-items:start}
      @container (min-width:1000px){.wrap.auto{display:grid;grid-template-columns:minmax(0,2.6fr) minmax(250px,1fr);gap:20px;align-items:start}}
      .wrap.horizontal .chips,.wrap.horizontal .ctrl{margin-top:0}
      @container (min-width:1000px){.wrap.auto .chips,.wrap.auto .ctrl{margin-top:0}}
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
      .ctrl{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 4px}
      .btn{flex:1 1 92px;min-width:0;display:flex;align-items:center;justify-content:center;gap:6px;min-height:46px;padding:0 8px;border-radius:14px;border:0;font:inherit;font-size:.85rem;font-weight:500;cursor:pointer;background:var(--secondary-background-color);color:var(--primary-text-color)}
      .btn:hover{filter:brightness(1.12)}
      .btn svg{width:18px;height:18px;flex:none}
      .btn.on{color:#fff}
      .btn.pw.on{background:#2fae4a}.btn.heat.on{background:#e8742a}.btn.cool.on{background:#3b8fe8}
      .btn.pw:not(.on){color:var(--secondary-text-color)}
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
      .sm{fill:var(--primary-text-color);font-size:12px;font-weight:600}
      @keyframes rflow{to{stroke-dashoffset:-38}}
      .rf{stroke-dasharray:3 35;stroke-linecap:round;animation:rflow 1.6s linear infinite}
      svg.rev .flow,svg.rev .air{animation-direction:reverse}
      @media (prefers-reduced-motion:reduce){.spin,.flow,.air,.haze,.glow,.rf{animation:none!important}}
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
  static defaults() { return { title: '', language: '', show_radiators: true, show_floor: true, show_bathroom: 'auto', show_garage: 'auto', show_radiators_ground: 'auto', show_controls: true, mode_heat: 'Heat only', mode_cool: 'Cool only', temp_min: 20, temp_max: 55, reverse_flow: false, view: 'full', layout: 'auto' }; }
  static getStubConfig() { return { type: 'custom:panasonic-monoblock-card', entities: { supply: 'sensor.aanvoer', return: 'sensor.retour' } }; }

  _render() {
    if (!this._hass || !this._c) return;
    const c = this._c, u = this._uid;
    const lang = String(c.language || (this._hass.locale && this._hass.locale.language) || this._hass.language || 'en').toLowerCase().slice(0, 2);
    const t = TR[lang] || TR.en;
    NUM_LOCALE = c.language ? (lang === 'nl' ? 'nl-NL' : 'en-GB') : (this._hass.locale && this._hass.locale.language) || this._hass.language || (lang === 'nl' ? 'nl-NL' : 'en-GB');
    let tLo = parseFloat(c.temp_min), tHi = parseFloat(c.temp_max); /* kleurschaal van de leidingen */
    if (isNaN(tLo)) tLo = 20; if (isNaN(tHi) || tHi <= tLo) tHi = tLo + 1;
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
    const supC = tempColor(sup, tLo, tHi), retC = tempColor(ret, tLo, tHi);
    const avgC = tempColor(isNum(sup) && isNum(ret) ? sup * 0.7 + ret * 0.3 : null, tLo, tHi);
    const fd = isNum(flow) ? clamp(2.4 - flow * 0.1, 0.7, 2.4) : 1.4;
    const fanDur = isNum(fanRpm) && fanRpm > 0 ? clamp(2.2 - fanRpm / 300, 0.45, 2) : isNum(fanHz) && fanHz > 0 ? clamp(2 - fanHz / 40, 0.45, 2) : 1.1;
    const fanOn = running && (isNum(fanRpm) ? fanRpm > 0 : true);
    const hasV = (k) => this._has(k + '_supply') || this._has(k + '_return');
    const vals = (k) => `${t.supply} <tspan class="sm" data-e="${k}_supply">${fmt(this._n(k + '_supply'), 1, ' °C')}</tspan>`;
    const valr = (k) => `${t.ret} <tspan class="sm" data-e="${k}_return">${fmt(this._n(k + '_return'), 1, ' °C')}</tspan>`;
    const vald = (k) => {
      const a = this._n(k + '_supply'), b = this._n(k + '_return');
      return isNum(a) && isNum(b) ? `ΔT <tspan class="sm">${fmt(a - b, 1, ' °C')}</tspan>` : '';
    };
    const tag2 = (x, y, name, k) => `<text x="${x}" y="${y}" class="lbl">${name}</text>` + (hasV(k) ? `<text x="${x}" y="${y + 15}" class="lbl">${vals(k)}</text><text x="${x}" y="${y + 29}" class="lbl">${valr(k)}</text>` + (vald(k) ? `<text x="${x}" y="${y + 43}" class="lbl">${vald(k)}</text>` : '') : '');
    /* lus van een verdeler: vier banen, de verdeler staat rechts */
    const loopPath = (y0, xv = 584, xL = xv - 72) => `M${xv} ${y0} H${xL} C${xL - 12} ${y0} ${xL - 12} ${y0 + 14} ${xL} ${y0 + 14} H${xv - 28} C${xv - 12} ${y0 + 14} ${xv - 12} ${y0 + 28} ${xv - 28} ${y0 + 28} H${xL} C${xL - 12} ${y0 + 28} ${xL - 12} ${y0 + 42} ${xL} ${y0 + 42} H${xv}`;
    const loopBox = (x, y, lines) => `<rect x="${x}" y="${y}" width="36" height="76" rx="6" style="fill:var(--card-background-color)" stroke="#c3c8ce" stroke-width="2.5"/>${lines.map((l) => `<line x1="${x + 6}" y1="${l}" x2="${x + 30}" y2="${l}" stroke="rgba(150,150,150,.6)"/>`).join('')}`;
    /* golfjes boven de vloerverwarming: x = begin van de lus, y = hoogte van de bovenste baan */
    const hz = (xL, y0, col) => [8, 33, 58].map((dx, i) => `<path class="haze" style="animation-delay:${[0.3, 0.9, 1.5][i]}s" d="M${xL + dx} ${y0 - 4} q4 -4.5 0 -9 t0 -9" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round"/>`).join('');
    /* de tekening */
    const build = (u) => {
    const showR = c.show_radiators !== false, showF = c.show_floor !== false;
    const autoShow = (opt, k) => (opt === true || opt === 'true') || (opt !== false && opt !== 'false' && (this._has(k + '_supply') || this._has(k + '_return')));
    const showB = autoShow(c.show_bathroom, 'bath'), showG = autoShow(c.show_garage, 'garage'), showRg = autoShow(c.show_radiators_ground, 'rad_ground');
    const hasG = showF || showRg || showG; /* circuits op de begane grond */
    const gx = 740, gm = gx + 18; /* de verdeler van de garage staat rechts naast de vloerverwarming */
    const yB = hasG ? 372 : 340; /* onderste retourleiding */
    const radOn = showR && circ && (this._has('radiator_pump') ? this._on('radiator_pump') : true);
    const floorOn = showF && circ && (this._has('floor_pump') ? this._on('floor_pump') : true);
    const bathOn = showB && circ, garOn = showG && circ, radGOn = showRg && circ;


    // gegevens in het buitenpaneel
    const topItems = [
      ['ambient', t.ambient, fmt(this._n('ambient'), 1, ' °C')],
      ['coil', t.coil, fmt(this._n('coil'), 0, ' °C')],
      ['exhaust', t.exhaust, fmt(this._n('exhaust'), 0, ' °C')],
    ].filter((i) => this._has(i[0]));
    const fanTxt = isNum(fanRpm) ? fmt(fanRpm, 0, ' rpm') : isNum(fanHz) ? fmt(fanHz, 0, ' Hz') : null;
    const gridItems = [
      ['suction', t.suction, fmt(this._n('suction'), 0, ' °C')],
      ['comp_hz', t.compressor, fmt(compHz, 0, ' Hz')],
      fanTxt ? [isNum(fanRpm) ? 'fan_rpm' : 'fan_hz', t.fan, fanTxt] : null,
      ['hp_sat', t.condensing, fmt(this._n('hp_sat'), 0, ' °C')],
      ['eev', t.expValve, fmt(this._n('eev'), 0, ' P')],
      ['flow', t.flow, fmt(flow, 1, ' L/min')],
      ['setpoint', t.target, fmt(this._n('setpoint'), 1, ' °C')],
    ].filter((i) => i && this._has(i[0]));
    const cols = [22, 116, 210];
    const GY = 96;
    const H = Math.max(yB + 24, 466);
    const W = showG ? 860 : 700;
    const topSvg = topItems.map((it, i) => `<text x="${cols[i]}" y="38" class="lbl">${it[1]}</text><text x="${cols[i]}" y="55" class="val" data-e="${it[0]}">${it[2]}</text>`).join('');
    const dTv = isNum(sup) && isNum(ret) ? sup - ret : (this._has('delta') ? this._n('delta') : null);
    const nearSvg = `<rect x="14" y="396" width="3" height="31" rx="1.5" fill="${circ ? tempColor(sup, tLo, tHi) : GREY}"/><text x="22" y="409" class="lbl">${t.supply}</text><text x="22" y="426" class="val" data-e="supply">${fmt(sup, 1, ' °C')}</text>
      <rect x="108" y="396" width="3" height="31" rx="1.5" fill="${circ ? tempColor(ret, tLo, tHi) : GREY}"/><text x="116" y="409" class="lbl">${t.ret}</text><text x="116" y="426" class="val" data-e="return">${fmt(ret, 1, ' °C')}</text>
      <text x="210" y="409" class="lbl">ΔT</text><text x="210" y="426" class="val" ${this._has('delta') ? 'data-e="delta"' : ''}>${fmt(dTv, 1, ' °C')}</text>`;
    const gridSvg = gridItems.map((it, i) => `<text x="${cols[i % 3]}" y="${GY + Math.floor(i / 3) * 44}" class="lbl">${it[1]}</text><text x="${cols[i % 3]}" y="${GY + 17 + Math.floor(i / 3) * 44}" class="val" data-e="${it[0]}">${it[2]}</text>`).join('');

    /* Waterleidingen, getekend in stroomrichting (huiscoördinaten, die later 60 naar rechts schuiven).
       Aanvoer: warmtepomp -> huis.  Retour: huis -> warmtepomp.  Elk circuit krijgt zijn eigen kleur uit zijn eigen sensoren. */
    const bc = (k) => {
      const S = isNum(this._n(k + '_supply')) ? this._n(k + '_supply') : sup, R = isNum(this._n(k + '_return')) ? this._n(k + '_return') : ret;
      return { s: tempColor(S, tLo, tHi), r: tempColor(R, tLo, tHi), a: tempColor(isNum(S) && isNum(R) ? S * 0.7 + R * 0.3 : null, tLo, tHi) };
    };
    const cR = bc('rad'), cB = bc('bath'), cF = bc('floor'), cG = bc('garage'), cRg = bc('rad_ground');
    const xR = 350, xB = 602; /* xB: midden van de verdeler van de badkamer */
    const supTrunk = 'M262 270 H312';
    const supUp = showR || showB ? `M312 270 V44 H${showB ? xB : xR}` : '';
    const supRad = showR ? `M${xR} 44 V70` : '', supBath = showB ? `M${xB} 44 V70` : '';
    const gEnd = showF ? 602 : showRg ? 350 : 312;
    const supGBus = showF || showRg ? `M312 270 H${gEnd}` : '';
    const supFloor = showF ? 'M602 270 V282' : '', supRg = showRg ? 'M350 270 V286' : '';
    const supGarBus = showG ? `M${gEnd} 270 H${gm}` : '', supGar = showG ? `M${gm} 270 V282` : '';
    const retRadDrop = showR ? `M${xR} 124 V152` : '', retBathDrop = showB ? `M${xB} 146 V152` : '';
    const retFloorDrop = showF ? 'M602 358 V372' : '', retRgDrop = showRg ? 'M350 340 V372' : '';
    const retGBus = ''; /* de retouren van de begane grond lopen via retMain */
    const retMain = hasG
      ? `${showR || showB ? `M${showR ? xR : xB} 152 H632 V372` : `M${showG ? 632 : showF ? 602 : 350} 372`} H296 V296 H262`
      : `M${showR ? xR : showB ? xB : 632} ${showR || showB ? 152 : yB} H632 V${yB} H296 V296 H262`;
    const bathCoil = loopPath(84), floorOut = loopPath(296), garOut = loopPath(296, gx, gx - 72);
    const garRet = `M${gm} 358 V372 H632`;
    const finsOf = (y, col, on) => Array.from({ length: 7 }, (_, i) => `<rect x="${344 + i * 15.5}" y="${y}" width="10" height="42" rx="3" fill="${on ? col : GREY}" fill-opacity="${on ? 1 : 0.5}"/>`).join('');
    const fins = finsOf(76, cR.a, radOn), finsG = finsOf(292, cRg.a, radGOn);
    const haze = (x, y, d) => `<path class="haze" style="animation-delay:${d}s" d="M${x} ${y} q4 -4.5 0 -9 t0 -9" fill="none" stroke="${cF.a}" stroke-width="2" stroke-linecap="round"/>`;

    const svg = `
    <svg viewBox="0 0 ${W} ${H}" class="${c.reverse_flow ? 'rev' : ''}">
      <defs>
        <pattern id="${u}h" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="rgba(150,150,150,.5)" stroke-width="2"/></pattern>
      </defs>
      <!-- buitenpaneel + muur -->
      <rect x="0" y="0" width="322" height="${H}" rx="6" fill="rgba(110,150,210,.10)"/>
      <text x="22" y="16" class="zone">${t.outside}</text>
      <g transform="translate(60 0)">
        <rect x="262" y="0" width="26" height="${H}" fill="url(#${u}h)" stroke="rgba(150,150,150,.5)"/>
        <rect x="296" y="226" width="${showG ? 480 : 344}" height="6" fill="rgba(150,150,150,.3)"/>
      </g>
      ${topSvg}

      <!-- buitenunit: donkere monoblock, rechts met "glazen" paneel zodat je de componenten ziet -->
      ${[270, 294, 318].map((y, i) => `<line x1="26" y1="${y}" x2="9" y2="${y}" stroke="${running ? '#4c8df0' : GREY}" stroke-opacity="${running ? 0.95 : 0.4}" stroke-width="2.4" stroke-linecap="round" ${running ? `class="air" style="animation-delay:${i * 0.25}s"` : ''}/><path d="M13 ${y - 5} L7 ${y} L13 ${y + 5}" fill="none" stroke="${running ? '#4c8df0' : GREY}" stroke-opacity="${running ? 0.95 : 0.4}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}
      <g transform="translate(30 222) scale(.26)">
        <defs>
          <linearGradient id="${u}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#43464c"/><stop offset="1" stop-color="#2e3136"/></linearGradient>
          <linearGradient id="${u}g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a6a22"/><stop offset=".45" stop-color="#e8c56b"/><stop offset="1" stop-color="#9c7a2a"/></linearGradient>
          <linearGradient id="${u}c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#15161a"/><stop offset=".35" stop-color="#40444b"/><stop offset="1" stop-color="#17181c"/></linearGradient>
          <linearGradient id="${u}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${circ ? supC : GREY}"/><stop offset="1" stop-color="${circ ? retC : GREY}"/></linearGradient>
        </defs>
        <!-- voetrail -->
        <rect x="4" y="574" width="1023" height="50" rx="6" fill="#2a2c30" stroke="#4a4d54" stroke-width="4"/>
        <rect x="200" y="590" width="110" height="20" rx="4" fill="#15161a"/><rect x="720" y="590" width="110" height="20" rx="4" fill="#15161a"/>
        <!-- behuizing -->
        <rect x="0" y="0" width="1030" height="562" rx="12" fill="url(#${u}b)" stroke="#5a5e66" stroke-width="5"/>
        <rect x="0" y="0" width="1030" height="16" rx="8" fill="#2a2c30"/>
        <line x1="467" y1="16" x2="467" y2="562" stroke="#202226" stroke-width="5"/>
        <rect x="37" y="32" width="75" height="35" rx="9" fill="#1c1d20" stroke="#55595f" stroke-width="4"/>
        <!-- ventilator met rooster -->
        <rect x="15" y="77" width="447" height="393" rx="10" fill="#1b1c1f"/>
        <circle cx="250" cy="275" r="195" fill="#121315"/>
        <g class="sp ${fanOn ? 'spin' : ''}" style="transform-origin:250px 275px;--spin:${fanDur}s">
          ${[0, 120, 240].map((a) => `<ellipse cx="250" cy="${275 - 100}" rx="62" ry="98" fill="#4b5057" stroke="#6b7179" stroke-width="4" transform="rotate(${a} 250 275)"/>`).join('')}
        </g>
        <circle cx="250" cy="275" r="30" fill="#8b9097"/><circle cx="250" cy="275" r="9" fill="#3a3d42"/>
        ${Array.from({ length: 17 }, (_, i) => `<line x1="22" y1="${88 + i * 22.4}" x2="455" y2="${88 + i * 22.4}" stroke="#555a62" stroke-opacity=".6" stroke-width="5"/>`).join('')}
        ${Array.from({ length: 9 }, (_, i) => `<line x1="${60 + i * 48}" y1="84" x2="${60 + i * 48}" y2="464" stroke="#555a62" stroke-opacity=".35" stroke-width="4"/>`).join('')}
        <rect x="15" y="77" width="447" height="393" rx="10" fill="none" stroke="#5c6068" stroke-width="8"/>
        ${defrost ? '<rect x="15" y="77" width="447" height="393" rx="10" fill="rgba(190,225,255,.3)"/>' : ''}
        <!-- rechter panelen: donker glas met de componenten erachter -->
        <rect x="500" y="300" width="70" height="190" rx="30" fill="url(#${u}c)"/>
        <rect x="598" y="250" width="134" height="250" rx="40" fill="url(#${u}c)" stroke="${running ? '#5b9a68' : '#3a3d42'}" stroke-width="5" data-e="compressor"/>
        <rect x="640" y="228" width="50" height="26" rx="6" fill="#2a2c30"/>
        <rect x="480" y="505" width="420" height="14" rx="4" fill="#2c2f34"/>
        ${(() => {
          const rp = (d, col, dur = 1.6) => `<path d="${d}" fill="none" stroke="#6b4a2e" stroke-opacity=".9" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>` +
            `<path d="${d}" fill="none" stroke="${running ? col : '#a07c58'}" stroke-opacity="${running ? 1 : 0.7}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>` +
            (running ? `<path class="rf" style="animation-duration:${dur}s" d="${d}" fill="none" stroke="#fff3df" stroke-opacity=".9" stroke-width="7"/>` : '');
          return rp('M480 90 H535 V300', '#8ac4ff') +
            rp('M570 450 H598', '#8ac4ff') + rp('M665 228 V150 H885', '#e5392b') + rp('M960 398 V535 H778', '#f08a24') + rp('M742 535 H480', '#4aa3f0');
        })()}
        <polygon points="760,517 778,535 760,553 742,535" fill="#d8b35a" stroke="#6b4a2e" stroke-width="4"/>
        <!-- platenwisselaar met het water erin -->
        <rect x="885" y="90" width="120" height="320" rx="22" fill="url(#${u}g)" stroke="#6b4a2e" stroke-width="5"/>
        <rect x="910" y="118" width="70" height="264" rx="12" fill="url(#${u}w)" fill-opacity="${circ ? 0.9 : 0.35}"/>
        ${Array.from({ length: 8 }, (_, i) => `<line x1="910" y1="${148 + i * 30}" x2="980" y2="${148 + i * 30}" stroke="rgba(0,0,0,.28)" stroke-width="4"/>`).join('')}
        <circle cx="980" cy="120" r="17" fill="${circ ? supC : GREY}" stroke="#3a2a18" stroke-width="5"/><circle cx="900" cy="410" r="17" fill="${circ ? retC : GREY}" stroke="#3a2a18" stroke-width="5"/>
        <!-- paneelglas, deurgreep en statuslampje -->
        <rect x="470" y="16" width="560" height="546" fill="rgba(10,12,16,.42)" pointer-events="none"/>
        <line x1="715" y1="16" x2="715" y2="562" stroke="#202226" stroke-width="5" stroke-opacity=".7"/>
        <rect x="557" y="182" width="77" height="38" rx="9" fill="#1c1d20" stroke="#55595f" stroke-width="4"/>
        <rect x="902" y="25" width="78" height="35" rx="9" fill="#1c1d20" stroke="#55595f" stroke-width="4"/>
        <circle cx="595" cy="120" r="10" fill="${running ? '#3fcf5a' : '#5b6068'}"/>
      </g>
      ${defrost ? `<rect x="30" y="228" width="100" height="20" rx="10" fill="#e8590c"/><text x="80" y="242" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">${t.defrostBadge}</text>` : ''}
      ${nearSvg}
      ${gridSvg}

      <!-- aansluitingen van de platenwisselaar naar de muur -->
      ${this._pipe('M285 253 V270 H322', supC, circ, 6, fd)}
      ${this._pipe('M322 296 H264 V329', retC, circ, 6, fd)}

      ${this._pump(264, 313, circ)}

      <g transform="translate(60 0)">
      <!-- hoofdleidingen: aanvoer en retour -->
      ${this._pipe(retMain, retC, circ, 6, fd)}
      ${this._pipe(supTrunk, supC, circ, 6, fd)}
      ${supUp ? this._pipe(supUp, supC, radOn || bathOn, 6, fd) : ''}
      ${supGBus ? this._pipe(supGBus, supC, floorOn || radGOn, 6, fd) : ''}
      ${supGarBus ? this._pipe(supGarBus, supC, garOn, 6, fd) : ''}
      ${retGBus ? this._pipe(retGBus, retC, floorOn || radGOn, 6, fd) : ''}
      ${supRad ? this._pipe(supRad, cR.s, radOn, 6, fd) : ''}
      ${supBath ? this._pipe(supBath, cB.s, bathOn, 6, fd) : ''}
      ${supFloor ? this._pipe(supFloor, cF.s, floorOn, 6, fd) : ''}
      ${supRg ? this._pipe(supRg, cRg.s, radGOn, 6, fd) : ''}
      ${supGar ? this._pipe(supGar, cG.s, garOn, 6, fd) : ''}

      <!-- verdieping: radiatoren slaapkamers + badkamervloer -->
      ${showR ? `
        ${this._pipe(retRadDrop, cR.r, radOn, 6, fd)}
        <rect x="336" y="70" width="120" height="54" rx="7" fill="none" stroke="${GREY}" stroke-width="2"/>${fins}
        ${tag2(336, 172, t.radBed, 'rad')}` : ''}
      ${showB ? `
        ${this._pipe(bathCoil, cB.a, bathOn, 6, fd)}
        ${this._pipe(retBathDrop, cB.r, bathOn, 6, fd)}
        ${bathOn ? hz(512, 84, cB.a) : ''}
        ${loopBox(584, 70, [84, 98, 112, 126])}
        ${tag2(500, 172, t.bath, 'bath')}` : ''}

      <!-- begane grond: radiator en vloerverwarming -->
      ${showRg ? `
        ${this._pipe(retRgDrop, cRg.r, radGOn, 6, fd)}
        <rect x="336" y="286" width="120" height="54" rx="7" fill="none" stroke="${GREY}" stroke-width="2"/>${finsG}
        ${tag2(336, 392, t.radGround, 'rad_ground')}` : ''}
      ${showF ? `
        ${this._pipe(floorOut, cF.a, floorOn, 6, fd)}
        ${this._pipe(retFloorDrop, cF.r, floorOn, 6, fd)}
        ${loopBox(584, 282, [296, 310, 324, 338])}
        ${floorOn ? haze(520, 292, 0.3) + haze(545, 292, 0.9) + haze(570, 292, 1.5) : ''}
        ${tag2(500, 392, t.floor, 'floor')}` : ''}

      <!-- garage -->
      ${showG ? `
        ${this._pipe(garOut, cG.a, garOn, 6, fd)}
        ${this._pipe(garRet, cG.r, garOn, 6, fd)}
        ${garOn ? hz(gx - 72, 296, cG.a) : ''}
        ${loopBox(gx, 282, [296, 310, 324, 338])}
        ${tag2(gx - 84, 392, t.garage, 'garage')}` : ''}

      <text x="338" y="18" class="zone">${t.first}</text>
      <text x="338" y="248" class="zone">${t.ground}</text>

      ${showF && this._has('floor_pump') ? this._pump(602, 270, floorOn) : ''}
      ${showR && this._has('radiator_pump') ? this._pump(312, 150, radOn) : ''}
      </g>
    </svg>`;
    return { svg, radOn, floorOn, topItems, gridItems, dTv };
    };
    const A = build(u);
    const { radOn, floorOn, topItems, gridItems, dTv } = A;

    const modeS = this._st('mode');
    const modeLabel = modeS ? modeText(modeS.state, t) : '';
    const chips = [
      this._chip(t.compressor, running, 'compressor'),
      this._chip(t.fan, fanOn),
      this._chip(t.chipCirc, circ, 'flow'),
      this._has('radiator_pump') ? this._chip(t.chipRadPump, radOn, 'radiator_pump') : '',
      this._has('floor_pump') ? this._chip(t.chipFloorPump, floorOn, 'floor_pump') : '',
      this._has('defrost') ? this._chip(t.defrost, defrost, 'defrost') : '',
      this._has('softstart') ? this._chip(t.softstart, this._on('softstart'), 'softstart') : '',
      this._has('online') ? this._chip(t.online, this._on('online'), 'online') : '',
      this._has('fault') ? this._chip(t.fault, fault, 'fault') : '',
    ].join('');

    const thermo = this._has('thermostat') ? parseFloat(this._attr('thermostat', 'current_temperature')) : null;
    const wm = this._st('work_mode');
    const stats = [
      this._stat(t.electric, fmtP(power), 'power'),
      this._stat(t.heatOut, fmtP(heat), this._has('heat_power') ? 'heat_power' : ''),
      this._stat(copEstimated ? t.copEst : t.copCur, fmt(cop, 1), 'cop'),
      this._has('energy_today') ? this._stat(t.today, fmt(this._n('energy_today'), 2, ' kWh'), 'energy_today') : '',
      modeLabel ? this._stat(t.mode, modeLabel, 'mode') : '',
      wm ? this._stat(t.workMode, wm.state, 'work_mode') : '',
      isNum(thermo) ? this._stat(t.room, fmt(thermo, 1, ' °C'), 'thermostat') : '',
    ].join('');

    let pill;
    if (fault) pill = { text: t.fault, cls: 'fault' };
    else if (defrost) pill = { text: t.defrost };
    else if (running) pill = { text: `${modeLabel || t.heating}${isNum(compHz) ? ' · ' + fmt(compHz, 0, ' Hz') : ''}` };
    else pill = { text: t.standby, cls: 'idle' };

    /* view: full = tekening + details | drawing = alleen tekening | details = alleen chips en waarden
       layout (bij view full): auto = naast elkaar zodra de kaart breed genoeg is | vertical | horizontal */
    const view = c.view === 'drawing' || c.view === 'details' ? c.view : 'full';
    const layout = c.layout === 'vertical' || c.layout === 'horizontal' ? c.layout : 'auto';
    /* in de losse detailkaart ontbreken de waarden die anders in de tekening staan, die komen dan als tegels */
    const dTiles = view === 'details' ? [
      this._stat(t.supply, fmt(sup, 1, ' °C'), 'supply'), this._stat(t.ret, fmt(ret, 1, ' °C'), 'return'),
      this._stat('ΔT', fmt(dTv, 1, ' °C'), this._has('delta') ? 'delta' : ''),
      ...topItems.map((it) => this._stat(it[1], it[2], it[0])), ...gridItems.map((it) => this._stat(it[1], it[2], it[0])),
    ].join('') : '';
    /* knoppen: aan/uit (switch) en verwarmen/koelen (select) */
    const eq = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
    const ICON = { power: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42A6.92 6.92 0 0 1 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.27 1.08-4.28 2.76-5.56L6.34 5.02A8.94 8.94 0 0 0 3 12a9 9 0 0 0 18 0c0-2.74-1.23-5.19-3.17-6.83z"/></svg>',
      heat: '<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 6v9M9.5 6v9M14.5 6v9M19 6v9"/><path d="M3 18h18" stroke-width="2.4"/></g></svg>',
      cool: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M22 11h-4.17l3.24-3.24-1.41-1.42L15 11h-2V9l4.66-4.66-1.42-1.41L13 6.17V2h-2v4.17L7.76 2.93 6.34 4.34 11 9v2H9L4.34 6.34 2.93 7.76 6.17 11H2v2h4.17l-3.24 3.24 1.41 1.42L9 13h2v2l-4.66 4.66 1.42 1.41L11 17.83V22h2v-4.17l3.24 3.24 1.42-1.41L13 15v-2h2l4.66 4.66 1.41-1.42L17.83 13H22v-2z"/></svg>' };
    let ctrl = '';
    if (c.show_controls !== false && view !== 'drawing') {
      const btns = [];
      if (this._has('power_switch')) btns.push(`<button class="btn pw ${this._on('power_switch') ? 'on' : ''}" data-act="power" data-k="power_switch">${ICON.power}${this._on('power_switch') ? t.on : t.off}</button>`);
      if (this._has('operating_mode')) {
        const cur = this._st('operating_mode').state;
        btns.push(`<button class="btn heat ${eq(cur, c.mode_heat) ? 'on' : ''}" data-act="mode" data-k="operating_mode" data-opt="${c.mode_heat}">${ICON.heat}${t.heating}</button>`);
        btns.push(`<button class="btn cool ${eq(cur, c.mode_cool) ? 'on' : ''}" data-act="mode" data-k="operating_mode" data-opt="${c.mode_cool}">${ICON.cool}${t.cooling}</button>`);
      }
      if (btns.length) ctrl = `<div class="ctrl">${btns.join('')}</div>`;
    }
    const info = `${ctrl}<div class="chips">${chips}</div><div class="stats">${dTiles}${stats}</div>`;
    const body = view === 'drawing' ? A.svg
      : view === 'details' ? info
      : `<div class="wrap ${layout}"><div class="draw">${A.svg}</div><div class="info">${info}</div></div>`;
    this._shell(c.title || t.title, pill, body);
    this._wireActions();
  }
}


/* Losse kaart met alleen de details (chips en waarden), voor bijvoorbeeld een liggend scherm */
class PanasonicMonoblockDetailsCard extends PanasonicMonoblockCard {
  static defaults() { return { ...PanasonicMonoblockCard.defaults(), view: 'details' }; }
  getCardSize() { return 4; }
}

customElements.define('panasonic-monoblock-card', PanasonicMonoblockCard);
customElements.define('panasonic-monoblock-details-card', PanasonicMonoblockDetailsCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'panasonic-monoblock-card', name: 'Panasonic monoblock', description: 'Animated card for a Panasonic monoblock heat pump without buffer tank', preview: false });
window.customCards.push({ type: 'panasonic-monoblock-details-card', name: 'Panasonic monoblock (details)', description: 'Only the details of the Panasonic monoblock: status and values', preview: false });
