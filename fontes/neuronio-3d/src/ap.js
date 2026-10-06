// Potencial de ação: modelo de Hodgkin–Huxley com os valores do livro (repouso −65 mV, EK −80 mV, ENa +62 mV)
// e o gráfico Vm × tempo que acompanha a cena 3D.

import { tr } from '../../comum/lang.js';

// Textos das fases e do gráfico. Ficam aqui em cima porque, dentro de phase() e de draw(), "tr" é o traço
// (a curva calculada) e esconde a função de idioma.
const TXT = {
  rest: tr('Repouso', 'Rest'),
  restText: tr('Só os canais de K⁺ de repouso estão abertos. O Vm fica em cerca de −65 mV.', 'Only the resting K⁺ channels are open. Vm stays at about −65 mV.'),
  noStimText: tr('Sem estímulo, nada muda.', 'With no stimulus, nothing changes.'),
  sub: tr('Abaixo do limiar', 'Below threshold'),
  subText: tr('O estímulo despolarizou a membrana, mas não o bastante. Nenhum potencial de ação: é tudo ou nada.', 'The stimulus depolarized the membrane, but not enough. No action potential: it is all or none.'),
  backText: tr('O Vm voltou a −65 mV sem disparar.', 'Vm returned to −65 mV without firing.'),
  stim: tr('Estímulo', 'Stimulus'),
  stimText: tr('A membrana despolariza em direção ao limiar.', 'The membrane depolarizes toward threshold.'),
  over: tr('Fase ascendente: ultrapassagem', 'Rising phase: overshoot'),
  rise: tr('Fase ascendente (despolarização)', 'Rising phase (depolarization)'),
  overText: tr('O interior ficou positivo. O Vm corre em direção ao ENa (+62 mV) e chega perto de +40 mV.', 'The interior has become positive. Vm races toward ENa (+62 mV) and gets close to +40 mV.'),
  riseText: tr('Canais de Na⁺ abrem. O Na⁺ entra, despolariza mais e abre mais canais.', 'Na⁺ channels open. Na⁺ enters, depolarizes further and opens more channels.'),
  fall: tr('Fase descendente (repolarização)', 'Falling phase (repolarization)'),
  fallText: tr('Os canais de Na⁺ se inativam. Os canais de K⁺, que abrem com atraso, deixam o K⁺ sair.', 'The Na⁺ channels inactivate. The K⁺ channels, which open with a delay, let K⁺ leave.'),
  under: tr('Hiperpolarização pós-potencial', 'Undershoot (after-hyperpolarization)'),
  underText: tr('Canais de K⁺ ainda abertos: o Vm passa do repouso e se aproxima do EK (−80 mV).', 'K⁺ channels still open: Vm goes past rest and approaches EK (−80 mV).'),
  closedText: tr('Os canais de K⁺ fecharam. O Vm voltou a −65 mV.', 'The K⁺ channels have closed. Vm is back at −65 mV.'),
  refrAbs: tr('refratário absoluto', 'absolute refractory'),
  refrRel: tr('relativo', 'relative'),
  depol: tr('despolarização', 'depolarization'),
  repol: tr('repolarização', 'repolarization'),
};

const P = { gNa: 110, gK: 36, gL: 1.0, ENa: 62, EK: -80, phi: 3.2, rest: -65 };
const T_END = 7, T_STIM = 1, STIM_DUR = 0.25, DT = 0.002, EVERY = 10; // amostra a cada 0,02 ms

const am = (V) => { const x = V + 40; return Math.abs(x) < 1e-6 ? 1 : (0.1 * x) / (1 - Math.exp(-x / 10)); };
const bm = (V) => 4 * Math.exp(-(V + 65) / 18);
const ah = (V) => 0.07 * Math.exp(-(V + 65) / 20);
const bh = (V) => 1 / (1 + Math.exp(-(V + 35) / 10));
const an = (V) => { const x = V + 55; return Math.abs(x) < 1e-6 ? 0.1 : (0.01 * x) / (1 - Math.exp(-x / 10)); };
const bn = (V) => 0.125 * Math.exp(-(V + 65) / 80);
const V0 = P.rest, M0 = am(V0) / (am(V0) + bm(V0)), H0 = ah(V0) / (ah(V0) + bh(V0)), N0 = an(V0) / (an(V0) + bn(V0));
// a corrente de vazamento é ajustada para a soma das correntes ser zero em −65 mV
const EL = V0 + (P.gNa * M0 ** 3 * H0 * (V0 - P.ENa) + P.gK * N0 ** 4 * (V0 - P.EK)) / P.gL;

function run(amp, amp2 = 0, t2 = 99) {
  let V = V0, m = M0, h = H0, n = N0;
  const out = [], N = Math.round(T_END / DT);
  for (let i = 0; i <= N; i++) {
    const t = i * DT;
    const I = (t >= T_STIM && t < T_STIM + STIM_DUR ? amp : 0) + (t >= t2 && t < t2 + STIM_DUR ? amp2 : 0);
    const gNa = P.gNa * m ** 3 * h, gK = P.gK * n ** 4;
    const INa = gNa * (V - P.ENa), IK = gK * (V - P.EK);
    if (i % EVERY === 0) out.push({ t, V, m, h, n, gNa, gK, INa, IK });
    V += DT * (I - INa - IK - P.gL * (V - EL));
    m += DT * P.phi * (am(V) * (1 - m) - bm(V) * m);
    h += DT * P.phi * (ah(V) * (1 - h) - bh(V) * h);
    n += DT * P.phi * (an(V) * (1 - n) - bn(V) * n);
  }
  return out;
}
const maxV = (pts, from = 0) => pts.reduce((a, s) => (s.t >= from && s.V > a ? s.V : a), -999);

export function createModel() {
  // menor estímulo que dispara (bisseção)
  let lo = 0, hi = 400;
  for (let k = 0; k < 30; k++) { const a = (lo + hi) / 2; if (maxV(run(a)) > 0) hi = a; else lo = a; }
  const thr = hi, vth = Math.round(maxV(run(lo * 0.985)));
  const cache = new Map();

  function trace(k) {
    const key = Math.round(k * 100);
    if (cache.has(key)) return cache.get(key);
    const pts = run(thr * k), peak = pts.reduce((a, s) => (s.V > a.V ? s : a)), fired = peak.V > 0;
    const tr = { k, pts, fired, peak, gNaMax: Math.max(...pts.map((s) => s.gNa)), gKMax: Math.max(...pts.map((s) => s.gK)) };
    if (fired) {
      tr.tOnset = pts.find((s) => s.t > T_STIM && s.V >= vth).t;
      tr.tPeak = peak.t;
      tr.tCross = pts.find((s) => s.t > peak.t && s.V <= V0).t;
      tr.min = pts.reduce((a, s) => (s.V < a.V ? s : a));
      tr.tBack = (pts.find((s) => s.t > tr.min.t && s.V >= V0 - 1.5) || pts[pts.length - 1]).t;
    } else {
      tr.tBack = k > 0 ? (pts.find((s) => s.t > peak.t && s.V <= V0 + 0.6) || pts[pts.length - 1]).t : T_STIM;
    }
    cache.set(key, tr);
    return tr;
  }
  function sample(tr, t) {
    const x = Math.max(0, Math.min(T_END, t)) / (DT * EVERY), i = Math.min(tr.pts.length - 2, Math.floor(x)), f = x - i;
    const a = tr.pts[i], b = tr.pts[i + 1], o = {};
    for (const key of Object.keys(a)) o[key] = a[key] + (b[key] - a[key]) * f;
    return o;
  }
  function phase(tr, t) {
    const s = sample(tr, t);
    if (t < T_STIM) return [TXT.rest, TXT.restText];
    if (!tr.fired) {
      if (tr.k <= 0.01) return [TXT.rest, TXT.noStimText];
      if (t < tr.tBack) return [TXT.sub, TXT.subText];
      return [TXT.rest, TXT.backText];
    }
    if (t < tr.tOnset) return [TXT.stim, TXT.stimText];
    if (t < tr.tPeak) return [s.V > 0 ? TXT.over : TXT.rise, s.V > 0 ? TXT.overText : TXT.riseText];
    if (t < tr.tCross) return [TXT.fall, TXT.fallText];
    if (t < tr.tBack) return [TXT.under, TXT.underText];
    return [TXT.rest, TXT.closedText];
  }

  // períodos refratários, medidos com um segundo estímulo sobre o disparo padrão
  const std = trace(1.5), refr = { abs: [std.tOnset, std.tCross], rel: [std.tCross, T_END] };
  const second = (k2, t2) => { const pts = run(thr * 1.5, thr * k2, t2); return maxV(pts, t2 + 0.3) > 0; };
  for (let t2 = std.tCross; t2 < T_END - 1.6; t2 += 0.1) if (second(5, t2)) { refr.abs[1] = t2; break; }
  refr.rel[0] = refr.abs[1];
  for (let t2 = refr.abs[1]; t2 < T_END - 1.6; t2 += 0.1) if (second(1.15, t2)) { refr.rel[1] = t2; break; }

  return { P, T: T_END, tStim: T_STIM, rest: V0, vth, thr, trace, sample, phase, refr, rest4: N0 ** 4 };
}

/* ============================== gráfico ============================== */
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
const fmt = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(Math.round(v));

export class Graph {
  constructor(svg, model) {
    this.svg = svg; this.model = model; this.tr = model.trace(1.5); this.t = 0; this.ghosts = 0; this.onScrub = null;
    this.gStatic = el('g', {}, svg); this.gDyn = el('g', {}, svg);
    const drag = (e) => { const r = svg.getBoundingClientRect(); this.onScrub && this.onScrub(this.tAt(e.clientX - r.left)); };
    svg.addEventListener('pointerdown', (e) => { svg.setPointerCapture(e.pointerId); this.dragging = true; drag(e); });
    svg.addEventListener('pointermove', (e) => { if (this.dragging) drag(e); });
    const stop = () => { this.dragging = false; };
    svg.addEventListener('pointerup', stop); svg.addEventListener('pointercancel', stop);
  }
  x(t) { return this.x0 + (t / this.model.T) * (this.x1 - this.x0); }
  y(v) { return this.y0 + ((70 - v) / 160) * (this.y1 - this.y0); }
  tAt(px) { return Math.max(0, Math.min(this.model.T, ((px - this.x0) / (this.x1 - this.x0)) * this.model.T)); }

  /** Recalcula o tamanho e redesenha tudo. compact = versão menor (celular). */
  layout(compact) {
    const W = Math.max(260, this.svg.clientWidth || 480), M = this.model;
    this.compact = compact;
    const plotH = compact ? 108 : 146, stripH = compact ? 22 : 28;
    this.x0 = 34; this.x1 = W - 70; this.y0 = 16; this.y1 = this.y0 + plotH;
    this.s0 = this.y1 + 12; this.s1 = this.s0 + stripH; this.r0 = this.s1 + 17; this.ax = this.r0 + 12; this.H = this.ax + 17;
    this.svg.setAttribute('viewBox', `0 0 ${W} ${this.H}`); this.svg.style.height = this.H + 'px';
    const g = this.gStatic; g.textContent = '';
    // linhas de referência, rotuladas direto
    const ref = (v, label, dy = 3.5) => {
      el('line', { x1: this.x0, x2: this.x1, y1: this.y(v), y2: this.y(v), class: 'g-ref' }, g);
      if (label) el('text', { x: this.x1 + 6, y: this.y(v) + dy, class: 'g-lab' }, g).textContent = label;
    };
    ref(M.P.ENa, 'E Na'); ref(0, ''); ref(M.rest, tr('repouso', 'rest')); ref(M.P.EK, 'E K', 7);
    el('line', { x1: this.x0, x2: this.x1, y1: this.y(M.vth), y2: this.y(M.vth), class: 'g-ref thr' }, g);
    el('text', { x: this.x0 + 5, y: this.y(M.vth) - 4, class: 'g-lab' }, g).textContent = tr(`limiar ≈ ${fmt(Math.round(M.vth / 5) * 5)} mV`, `threshold ≈ ${fmt(Math.round(M.vth / 5) * 5)} mV`);
    for (const v of [M.P.ENa, 0, M.rest, M.P.EK]) el('text', { x: this.x0 - 6, y: this.y(v) + (v === M.P.EK ? 7 : 3.5), class: 'g-tick', 'text-anchor': 'end' }, g).textContent = fmt(v);
    el('text', { x: this.x0 - 6, y: 8, class: 'g-unit', 'text-anchor': 'end' }, g).textContent = 'mV';
    // eixo do tempo
    el('line', { x1: this.x0, x2: this.x1, y1: this.ax, y2: this.ax, class: 'g-axis' }, g);
    for (let t = 0; t <= M.T; t++) {
      el('line', { x1: this.x(t), x2: this.x(t), y1: this.ax, y2: this.ax + 3, class: 'g-axis' }, g);
      el('text', { x: this.x(t), y: this.ax + 14, class: 'g-tick', 'text-anchor': 'middle' }, g).textContent = t;
    }
    el('text', { x: this.x1 + 6, y: this.ax + 14, class: 'g-unit' }, g).textContent = 'ms';
    // estímulo
    const sx = this.x(M.tStim), sy = this.y(M.rest) + 5;
    el('path', { d: `M${sx} ${sy} l-3.5 6 h7 z`, class: 'g-stim' }, g);
    el('text', { x: sx + 7, y: sy + 9, class: 'g-lab' }, g).textContent = tr('estímulo', 'stimulus');
    // faixa dos canais abertos
    el('text', { x: this.x1 + 6, y: this.s0 + 9, class: 'g-lab na' }, g).textContent = tr('Na⁺ abertos', 'Na⁺ open');
    el('text', { x: this.x1 + 6, y: this.s1 + 1, class: 'g-lab k' }, g).textContent = tr('K⁺ abertos', 'K⁺ open');
    this.draw();
  }

  setTrace(tr) { this.tr = tr; this.draw(); }
  setTime(t) { this.t = t; this.cursor(); }

  path(key, yOf, upTo = Infinity) {
    let d = '';
    for (const s of this.tr.pts) { if (s.t > upTo) break; d += (d ? 'L' : 'M') + this.x(s.t).toFixed(1) + ' ' + yOf(s[key]).toFixed(1); }
    return d;
  }
  draw() {
    if (!this.x1) return;
    const g = this.gDyn, tr = this.tr, M = this.model; g.textContent = '';
    const sy = (v, max) => this.s1 - (v / max) * (this.s1 - this.s0 - 2);
    const gmax = Math.max(M.trace(1.5).gNaMax, M.trace(1.5).gKMax);
    el('path', { d: this.path('gNa', (v) => sy(v, gmax)) + `L${this.x1} ${this.s1}L${this.x0} ${this.s1}Z`, class: 'g-area na' }, g);
    el('path', { d: this.path('gK', (v) => sy(v, gmax)) + `L${this.x1} ${this.s1}L${this.x0} ${this.s1}Z`, class: 'g-area k' }, g);
    el('line', { x1: this.x0, x2: this.x1, y1: this.s1, y2: this.s1, class: 'g-axis' }, g);
    if (tr.fired) {
      const R = M.refr, bar = (a, b, cls, label) => {
        el('rect', { x: this.x(a), y: this.r0, width: Math.max(0, this.x(b) - this.x(a)), height: 5, rx: 2.5, class: 'g-refr ' + cls }, g);
        if (!this.compact || cls === 'abs') el('text', { x: (this.x(a) + this.x(b)) / 2, y: this.r0 - 4, class: 'g-lab small', 'text-anchor': 'middle' }, g).textContent = label;
      };
      bar(R.abs[0], R.abs[1], 'abs', TXT.refrAbs); bar(R.rel[0], R.rel[1], 'rel', TXT.refrRel);
      const lab = (t, v, text, anchor, dx) => el('text', { x: this.x(t) + dx, y: this.y(v), class: 'g-lab halo', 'text-anchor': anchor }, g).textContent = text;
      if (!this.compact) { lab((tr.tOnset + tr.tPeak) / 2, -14, TXT.depol, 'end', -9); lab((tr.tPeak + tr.tCross) / 2, -14, TXT.repol, 'start', 10); }
    }
    for (let i = 0; i < this.ghosts; i++) el('path', { d: this.path('V', (v) => this.y(v)), class: 'g-ghost' }, g);
    el('path', { d: this.path('V', (v) => this.y(v)), class: 'g-full' }, g);
    this.prog = el('path', { class: 'g-vm' }, g);
    this.line = el('line', { y1: this.y0 - 4, y2: this.ax, class: 'g-cursor' }, g);
    this.dot = el('circle', { r: 4.5, class: 'g-dot' }, g);
    this.cursor();
  }
  cursor() {
    if (!this.prog) return;
    const s = this.model.sample(this.tr, this.t), x = this.x(this.t);
    this.prog.setAttribute('d', this.path('V', (v) => this.y(v), this.t) + `L${x.toFixed(1)} ${this.y(s.V).toFixed(1)}`);
    this.line.setAttribute('x1', x); this.line.setAttribute('x2', x);
    this.dot.setAttribute('cx', x); this.dot.setAttribute('cy', this.y(s.V));
  }
}
