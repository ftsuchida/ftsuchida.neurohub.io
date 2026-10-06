import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GROUPS, ITEMS, BY_ID, PATH, VIEWS } from './data.js';
import { buildScene } from './scene.js';
import { LANG, EN, tr, applyLang } from '../../comum/lang.js';
import { initPanes } from '../../comum/panes.js';
import { initNav } from '../../comum/nav.js';
import { createModel, Graph } from './ap.js';

applyLang(); // inglês nos textos do HTML, chave PT/EN e links de volta ao hub

const $ = (id) => document.getElementById(id);
const app = $('app'), canvas = $('gl'), listEl = $('list'), insEl = $('inspector'), panes = $('panes'), segEl = $('seg');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const phone = window.matchMedia('(max-width: 900px)');
const ICON = {
  chev: '<svg class="ic chev" viewBox="0 0 16 16"><path d="m6 3.500 4.500 4.500L6 12.500"/></svg>',
  close: '<svg class="ic" viewBox="0 0 16 16"><path d="m4 4 8 8M12 4l-8 8"/></svg>',
  zoom: '<svg class="ic" viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.300"/><path d="m10.300 10.300 3.200 3.200M5.200 7h3.600M7 5.200v3.600"/></svg>',
};
const dot = (c) => `<span class="dot" style="background:${c}"></span>`;
const groupName = (g) => GROUPS.find((x) => x.id === g).name;
const fold = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
// "sizeLabel" e "short" são textos do data.pt.js que não entram no data.en.js; o inglês deles fica aqui (sem inglês, vale o português)
const SIZE_EN = { Espessura: 'Thickness', Comprimento: 'Length', Espaçamento: 'Spacing', Fenda: 'Cleft', Largura: 'Width', Concentração: 'Concentration' };
const sizeLabel = (it) => (it.sizeLabel ? tr(it.sizeLabel, SIZE_EN[it.sizeLabel]) : tr('Tamanho', 'Size'));
const SHORT_EN = { citosol: 'Cytosol', extracelular: 'Extracellular', liquor: 'Ventricles', sangue: 'Blood' };
const shortName = (it) => tr(it.short, SHORT_EN[it.id]);

const state = { selected: null, hover: null, view: 'world', stage: 'world', labels: true, liquids: false };
let three = null; // preenchido quando a cena 3D sobe
const panesUI = initPanes(app, () => three && three.repane()); // lista e ficha recolhíveis

/* ============================== lista ============================== */
function renderList(query = '') {
  const q = fold(query.trim());
  let html = '', n = 0;
  for (const g of GROUPS) {
    const items = ITEMS.filter((i) => i.g === g.id && (!q || fold(i.name + ' ' + (i.aka || '')).includes(q)));
    if (!items.length) continue;
    n += items.length;
    html += `<h2>${g.name}</h2><ul>` + items.map((i) => `<li><button type="button" data-id="${i.id}"${i.id === state.selected ? ' aria-current="true"' : ''}>${dot(i.color)}<span>${i.name}</span></button></li>`).join('') + '</ul>';
  }
  listEl.innerHTML = n ? html : `<p class="none">${tr(`Nenhuma estrutura com “${query.trim().replace(/[<>&]/g, '')}”.`, `No structure matches “${query.trim().replace(/[<>&]/g, '')}”.`)}</p>`;
}
listEl.addEventListener('click', (e) => { const b = e.target.closest('button[data-id]'); if (b) select(b.dataset.id, true); });
$('q').addEventListener('input', (e) => renderList(e.target.value));

/* ============================== ficha ============================== */
function renderIntro() {
  insEl.innerHTML = `<div class="ins">
    <h1>${tr('Neurônio em 3D', 'Neuron in 3D')}</h1>
    <p class="lead">${tr('Clique em qualquer estrutura para ver a morfologia e a função dela. A lista leva a câmera até cada uma.', 'Click any structure to see its morphology and function. The list takes the camera to each one.')}</p>
    <h2>${tr('Caminho do sinal', 'Signal path')}</h2>
    <ol class="rows links">${PATH.map((p, i) => `<li><button type="button" data-id="${p[0]}"><span class="num">${i + 1}</span><span class="name">${BY_ID[p[0]].name}<span class="sub">${p[1]}</span></span>${ICON.chev}</button></li>`).join('')}</ol>
    <p class="foot">${tr('Arraste para girar, role ou pince para aproximar, use dois dedos ou o botão direito para mover. Pelo teclado, as setas giram, W A S D movem e 0 recentraliza. Formas e tamanhos estão exagerados para caber na cena; as medidas reais aparecem em cada ficha. Conteúdo conforme Bear, Connors e Paradiso, Neurociências, 4ª ed., capítulos 2 a 6; o que não está no livro aparece marcado como extra.', 'Drag to rotate, scroll or pinch to zoom, use two fingers or the right button to pan. On the keyboard, the arrows rotate, W A S D move and 0 recenters. Shapes and sizes are exaggerated to fit in the scene; the real measurements appear on each card. Content follows Bear, Connors and Paradiso, Neuroscience: Exploring the Brain, 4th ed., chapters 2 to 6; anything that is not in the book is marked as extra.')}</p>
  </div>`;
}
function renderItem(id) {
  const it = BY_ID[id];
  insEl.innerHTML = `<div class="ins">
    <div class="ins-top"><div><h1>${it.name}</h1>${it.aka ? `<p class="aka">${it.aka}</p>` : ''}</div>
      <button type="button" class="close" data-act="close" aria-label="${tr('Fechar ficha', 'Close card')}">${ICON.close}</button></div>
    <dl class="rows"><div><dt>${tr('Grupo', 'Group')}</dt><dd>${groupName(it.g)}</dd></div>${it.size ? `<div><dt>${sizeLabel(it)}</dt><dd>${it.size}</dd></div>` : ''}${(it.rows || []).map((r) => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('')}</dl>
    <h2>${tr('Morfologia', 'Morphology')}</h2><p>${it.morf}</p>
    <h2>${tr('Função', 'Function')}</h2><p>${it.func}</p>
    ${it.clue ? `<h2>${it.clueTitle || tr('A forma entrega a função', 'Form reveals function')}</h2><p>${it.clue}</p>` : ''}
    ${it.more ? `<h2>${tr('Mais detalhes', 'More details')}</h2><ul class="more">${it.more.map((m) => (typeof m === 'string' ? `<li>${m}</li>` : `<li>${m.x} <span class="tag">${tr('extra', 'extra')}</span></li>`)).join('')}</ul>` : ''}
    <h2>${tr('Na cena', 'In the scene')}</h2><p>${it.where}</p>
    <div class="actions"><button type="button" class="btn" data-act="go">${ICON.zoom}${tr('Ver de perto', 'See up close')}</button></div>
    ${it.rel && it.rel.length ? `<h2>${tr('Relacionados', 'Related')}</h2><ul class="rows links">${it.rel.map((r) => `<li><button type="button" data-id="${r}">${dot(BY_ID[r].color)}<span class="name">${BY_ID[r].name}</span>${ICON.chev}</button></li>`).join('')}</ul>` : ''}
  </div>`;
}
insEl.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.id) select(b.dataset.id, true);
  else if (b.dataset.act === 'go' && state.selected && three) three.goHome(state.selected);
  else if (b.dataset.act === 'close') select(null);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.selected) select(null); });

function select(id, fly) {
  state.selected = id && BY_ID[id] ? id : null;
  if (state.selected && BY_ID[state.selected].g === 'liq' && three && !state.liquids) three.setLiquids(true);
  listEl.querySelectorAll('button[data-id]').forEach((b) => (b.dataset.id === state.selected ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
  if (state.selected) renderItem(state.selected); else renderIntro();
  const cur = listEl.querySelector('[aria-current]'); if (cur && !phone.matches) cur.scrollIntoView({ block: 'nearest' });
  insEl.scrollTop = 0;
  panes.dataset.pane = state.selected ? 'detail' : 'list';
  if (phone.matches) sheet.to(state.selected ? (fly ? 'half' : sheet.at === 'full' ? 'half' : sheet.at) : sheet.at === 'peek' ? 'half' : sheet.at);
  if (state.selected && fly) panesUI.set('right', true); // escolher na lista é pedir a ficha
  if (state.selected && fly && three) three.goHome(state.selected);
  if (three) three.dirty();
}

/* ============================== vistas ============================== */
segEl.innerHTML = VIEWS.map((v) => `<button type="button" data-view="${v.id}" aria-pressed="${v.id === state.view}">${v.name}</button>`).join('');
function markView(id) {
  state.view = id;
  segEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === id)));
  const on = segEl.querySelector('[aria-pressed="true"]'); if (on && segEl.scrollWidth > segEl.clientWidth) segEl.scrollLeft = on.offsetLeft - (segEl.clientWidth - on.offsetWidth) / 2;
}
segEl.addEventListener('click', (e) => { const b = e.target.closest('button[data-view]'); if (b && three) three.openView(b.dataset.view); });

/* ============================== folha inferior (celular) ============================== */
const sheet = (() => {
  const H = { peek: () => 118, half: () => Math.round(app.clientHeight * 0.46), full: () => Math.round(app.clientHeight * 0.86) };
  const api = { at: 'half', to(name) { api.at = name; app.dataset.sheet = name; app.style.setProperty('--sheet', H[name]() + 'px'); setTimeout(() => three && three.resize(), 340); } };
  const grab = $('grab');
  let start = null;
  grab.addEventListener('pointerdown', (e) => { start = { y: e.clientY, h: panes.getBoundingClientRect().height, moved: false }; grab.setPointerCapture(e.pointerId); panes.classList.add('drag'); });
  grab.addEventListener('pointermove', (e) => {
    if (!start) return;
    const dy = e.clientY - start.y; if (Math.abs(dy) > 4) start.moved = true;
    app.style.setProperty('--sheet', Math.max(90, Math.min(H.full(), start.h - dy)) + 'px');
  });
  const end = () => {
    if (!start) return;
    panes.classList.remove('drag');
    const h = panes.getBoundingClientRect().height, order = ['peek', 'half', 'full'];
    if (!start.moved) api.to(order[(order.indexOf(api.at) + 1) % 3]);
    else api.to(order.reduce((a, b) => (Math.abs(H[b]() - h) < Math.abs(H[a]() - h) ? b : a)));
    start = null;
  };
  grab.addEventListener('pointerup', end); grab.addEventListener('pointercancel', end);
  return api;
})();

renderList();
renderIntro();
if (phone.matches) sheet.to('half');

/* ============================== cena 3D ============================== */
function start3D() {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (err) { $('nogl').hidden = false; canvas.hidden = true; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.42;
  scene.fog = new THREE.Fog(0xffffff, 10, 100);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 900);
  const TAN = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f9c, 0.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.9);
  const sunDir = new THREE.Vector3(-0.45, 0.8, 1).normalize();
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 5;
  scene.add(sun, sun.target);
  const rim = new THREE.DirectionalLight(0xdfe8ff, 0.55); rim.position.set(0.7, 0.3, -1); scene.add(rim);

  const built = buildScene();
  const { stages, home, materials, signal } = built;
  for (const [name, s] of Object.entries(stages)) { s.group.visible = name === 'world'; scene.add(s.group); }

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.1; controls.screenSpacePanning = true; controls.zoomSpeed = 0.9; controls.rotateSpeed = 0.8;
  controls.zoomToCursor = true;

  const model = createModel(), std = model.trace(1.5);
  const stdMax = { o: Math.max(...std.pts.map((s) => s.m ** 3 * s.h)), n4: Math.max(...std.pts.map((s) => s.n ** 4)), INa: Math.max(...std.pts.map((s) => Math.abs(s.INa))), IK: Math.max(...std.pts.map((s) => s.IK)) };
  const busy = $('busy'), card = $('apcard'), playBtn = $('play'), readEl = $('apRead'), phaseEl = $('apPhase'), graph = new Graph($('apSvg'), model);
  const mod = { mode: null, k: 1.5, tr: std, t: 0, playing: false, dirty: true, clock: 0 };

  /* ---------- tamanho, áreas livres e enquadramento ---------- */
  let W = 0, H = 0, needs = true, vis = { x: 0, y: 0, w: 1, h: 1 };
  const dirty = () => { needs = true; };
  function freeArea() {
    const a = app.getBoundingClientRect();
    const shown = (e) => !e.hidden && e.getClientRects().length > 0;
    const over = shown(card) ? card : shown(playBtn) ? playBtn : null, overTop = over ? over.getBoundingClientRect().top - a.top - 8 : Infinity;
    const lgB = shown(legend) ? legend.getBoundingClientRect().bottom - a.top + 6 : 0;
    if (phone.matches) {
      const tb = $('toolbar').getBoundingClientRect(), sh = panes.getBoundingClientRect();
      const top = Math.max(tb.bottom - a.top + 6, lgB), bottom = Math.max(Math.min(a.height - Math.min(sh.height, a.height * 0.5), overTop), top + 120);
      return { x: 0, y: top, w: a.width, h: bottom - top };
    }
    const l = $('sidebar').getBoundingClientRect().right - a.left + 8, r = (insEl.getClientRects().length ? insEl.getBoundingClientRect().left : a.right) - a.left - 8; // ficha recolhida: a cena vai até a borda
    const b = Math.min($('toolbar').getBoundingClientRect().top - a.top - 8, overTop), y = Math.max(8, lgB);
    return { x: l, y, w: Math.max(200, r - l), h: Math.max(200, b - y) };
  }
  function resize() {
    const w = app.clientWidth, h = app.clientHeight; if (!w || !h) return;
    const first = !W;
    W = w; H = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (mod.mode) graph.layout(phone.matches || mod.mode === 'world');
    vis = freeArea();
    // desloca o centro óptico para o meio da área livre entre os painéis
    camera.setViewOffset(w, h, -(vis.x + vis.w / 2 - w / 2), -(vis.y + vis.h / 2 - h / 2), w, h);
    camera.updateProjectionMatrix();
    $('leaders').setAttribute('viewBox', `0 0 ${w} ${h}`);
    measure();
    if (first) goTo(whole('world'), true);
    dirty();
  }
  const whole = (name) => { const s = stages[name]; return { box: s.box, dir: s.dir }; };
  function viewDistance(v) {
    if (v.box) return (Math.max((v.box.hh * H) / vis.h, (v.box.hw * H) / vis.w) / TAN) * 1.06;
    return ((v.r * H) / (Math.min(vis.w, vis.h) * TAN)) * 1.1;
  }
  let fly = null, lastView = null;
  /** Um painel abriu ou fechou: recalcula a área livre e ajusta a distância da câmera na mesma proporção,
      para a cena aproveitar o espaço sem perder o giro e o zoom que a pessoa já fez. */
  function repane() {
    const before = lastView ? viewDistance(lastView) : 0;
    resize();
    if (!before) return;
    const k = viewDistance(lastView) / before;
    camera.position.sub(controls.target).multiplyScalar(k).add(controls.target);
    if (fly) fly.toP.sub(fly.toT).multiplyScalar(k).add(fly.toT);
    controls.update(); dirty();
  }
  function goTo(v, instant) {
    lastView = v;
    const t = (v.box ? v.box.c : v.t).clone(), dir = (v.dir || new THREE.Vector3(0.1, 0.08, 1)).clone().normalize();
    const p = t.clone().addScaledVector(dir, viewDistance(v));
    if (instant || reduce) { controls.target.copy(t); camera.position.copy(p); controls.update(); fly = null; dirty(); return; }
    fly = { t0: performance.now(), dur: 900, fromT: controls.target.clone(), fromP: camera.position.clone(), toT: t, toP: p };
  }
  /** Monta a vista se ela ainda não existe (as vistas além da principal são montadas sob demanda). */
  function ensureStage(name) {
    const fresh = built.ensure(name); if (!fresh) return;
    const s = stages[name]; s.group.visible = false; scene.add(s.group);
    addLabels(fresh); measure();
    showFluids(s);
    if (name === 'ap') built.ap.setInk(ink);
  }
  function setStage(name, view, instant) {
    const resolve = () => (typeof view === 'function' ? view() : view);
    if (name === state.stage) { goTo(resolve(), instant); return; }
    const apply = () => {
      ensureStage(name);
      for (const [n, s] of Object.entries(stages)) s.group.visible = n === name;
      state.stage = name; state.hover = null;
      syncModule();
      const s = stages[name];
      controls.minDistance = s.dist[0]; controls.maxDistance = s.dist[1];
      sun.position.copy(s.box.c).addScaledVector(sunDir, 120); sun.target.position.copy(s.box.c);
      const c = sun.shadow.camera; c.left = c.bottom = -s.shadow; c.right = c.top = s.shadow; c.near = 20; c.far = 240; c.updateProjectionMatrix();
      for (const l of labels) l.el.hidden = true;
      goTo(resolve(), true);
      busy.hidden = true;
    };
    if (instant || reduce) { apply(); return; }
    if (!stages[name]) busy.hidden = false;
    app.classList.add('fade');
    setTimeout(() => { apply(); requestAnimationFrame(() => requestAnimationFrame(() => app.classList.remove('fade'))); }, 180);
  }
  function openView(id) {
    markView(id);
    if (id === 'soma') setStage('world', home.soma);
    else setStage(id, () => whole(id));
  }
  function goHome(id) {
    const name = home[id] ? home[id].stage : built.stageOf(id);
    markView(name === 'world' ? (BY_ID[id].g === 'soma' ? 'soma' : 'world') : name);
    setStage(name, () => { const v = home[id]; return v && v.t ? v : whole(name); });
  }
  controls.addEventListener('start', () => { fly = null; });
  controls.addEventListener('change', dirty);
  const nav = initNav({ app, camera, controls, recenter: () => goTo(lastView || whole(state.stage)), bounds: () => { const b = stages[state.stage].box; return { c: b.c, r: 2 * Math.max(b.hw, b.hh) }; } });

  /* ---------- rótulos ---------- */
  const labelsEl = $('labels'), svg = $('leaders'), NS = 'http://www.w3.org/2000/svg';
  const labels = [];
  function addLabels(list) { for (const d of list) labels.push(makeLabel(d)); }
  function makeLabel(d) {
    const el = document.createElement(d.kind === 'note' ? 'div' : 'button');
    el.className = 'lab' + (d.kind === 'note' ? ' note' : d.kind === 'hot' ? ' hot' : '');
    if (d.kind === 'hot') { el.innerHTML = ICON.zoom + '<span></span>'; el.title = d.title; el.setAttribute('aria-label', d.title); }
    (d.kind === 'hot' ? el.lastChild : el).textContent = d.text;
    el.hidden = true;
    if (d.kind !== 'note') {
      el.type = 'button'; el.tabIndex = -1;
      if (d.go) el.addEventListener('click', () => openView(d.go));
      else { el.addEventListener('click', () => select(d.id, false)); el.addEventListener('dblclick', () => select(d.id, true)); }
    }
    labelsEl.appendChild(el);
    const o = { ...d, el, w: 0, h: 0 };
    if (d.kind === 'label') {
      o.line = document.createElementNS(NS, 'line'); o.dotEl = document.createElementNS(NS, 'circle'); o.dotEl.setAttribute('r', '2.4');
      o.line.style.display = o.dotEl.style.display = 'none';
      svg.append(o.line, o.dotEl);
    }
    return o;
  }
  addLabels(built.labels);
  function measure() { for (const l of labels) { const was = l.el.hidden; l.el.hidden = false; l.w = l.el.offsetWidth; l.h = l.el.offsetHeight; l.el.hidden = was; } }
  const tmp = new THREE.Vector3(), OFFS = [[16, -26], [-16, -26], [16, 10], [-16, 10]];
  const selSet = () => { const s = state.selected; return s ? [s, ...(BY_ID[s].also || [])] : []; };
  function fits(bx, by, l, placed) {
    if (bx < vis.x + 2 || by < vis.y + 2 || bx + l.w > vis.x + vis.w - 2 || by + l.h > vis.y + vis.h - 2) return false;
    for (const p of placed) if (bx < p[2] && bx + l.w > p[0] && by < p[3] && by + l.h > p[1]) return false;
    return true;
  }
  function layoutLabels() {
    const placed = [], cand = [], sel = selSet();
    for (const l of labels) {
      l.show = false;
      if (l.stage !== state.stage || (l.liq && !state.liquids)) continue;
      const isSel = !!l.id && sel.includes(l.id);
      if (!state.labels && !isSel) continue;
      tmp.copy(l.pos).project(camera);
      if (tmp.z > 1 || tmp.z < -1) continue;
      const ppu = H / 2 / (TAN * camera.position.distanceTo(l.pos));
      if (ppu < l.minPx * (isSel ? 0.5 : 1)) continue;
      l.x = ((tmp.x + 1) / 2) * W; l.y = ((1 - tmp.y) / 2) * H;
      if (l.x < vis.x - 20 || l.x > vis.x + vis.w + 20 || l.y < vis.y - 20 || l.y > vis.y + vis.h + 20) continue;
      l.sel = isSel;
      l.pr = (isSel ? -1000 : 0) + (l.kind === 'hot' ? -200 : l.kind === 'note' ? 60 : 0) + l.minPx;
      cand.push(l);
    }
    cand.sort((a, b) => a.pr - b.pr);
    for (const l of cand) {
      let ok = false, bx, by;
      if (l.kind !== 'label') { bx = l.x - l.w / 2; by = l.y - l.h / 2; ok = fits(bx, by, l, placed); }
      else for (let o = 0; o < 4 && !ok; o++) { bx = l.x + OFFS[o][0] - (OFFS[o][0] < 0 ? l.w : 0); by = l.y + OFFS[o][1]; ok = fits(bx, by, l, placed); }
      if (!ok) continue;
      l.show = true; l.bx = bx; l.by = by;
      placed.push([bx - 4, by - 3, bx + l.w + 4, by + l.h + 3]);
    }
    for (const l of labels) {
      if (!l.show) { if (!l.el.hidden) l.el.hidden = true; if (l.line) l.line.style.display = l.dotEl.style.display = 'none'; continue; }
      l.el.hidden = false;
      l.el.style.transform = `translate(${Math.round(l.bx)}px,${Math.round(l.by)}px)`;
      l.el.classList.toggle('sel', !!l.sel);
      if (l.line) {
        const ex = l.bx > l.x ? l.bx + 2 : l.bx + l.w - 2, ey = l.by + l.h / 2;
        l.line.setAttribute('x1', l.x.toFixed(1)); l.line.setAttribute('y1', l.y.toFixed(1)); l.line.setAttribute('x2', ex.toFixed(1)); l.line.setAttribute('y2', ey.toFixed(1));
        l.dotEl.setAttribute('cx', l.x.toFixed(1)); l.dotEl.setAttribute('cy', l.y.toFixed(1));
        l.line.style.display = l.dotEl.style.display = '';
      }
    }
  }

  /* ---------- clique e passagem do mouse ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pickAt(cx, cy, bath = true) {
    const r = canvas.getBoundingClientRect(), st = stages[state.stage];
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    let solid = null;
    for (const h of ray.intersectObjects(st.meshes, false)) {
      const cp = h.object.material.userData.clip;
      if (cp && cp.distanceToPoint(h.point) < 0) continue;
      solid = h; break;
    }
    if (!state.liquids) return solid ? solid.object.userData.id : null;
    const fluid = ray.intersectObjects(st.fluids, false)[0];
    if (solid && !(fluid && solid.object.material.userData.box && fluid.distance < solid.distance)) return solid.object.userData.id;
    if (fluid) return fluid.object.userData.id;
    return bath ? 'extracelular' : null;
  }
  const tip = $('tip');
  let down = null, queued = false, last = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y, dt = performance.now() - down.t; down = null;
    if (dx * dx + dy * dy > 36 || dt > 700) return;
    const id = pickAt(e.clientX, e.clientY); if (id) select(id, false);
  });
  canvas.addEventListener('dblclick', (e) => { const id = pickAt(e.clientX, e.clientY); if (id) select(id, true); });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || e.buttons) return;
    last = e; if (queued) return; queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const id = pickAt(last.clientX, last.clientY, false);
      if (id !== state.hover) { state.hover = id; canvas.classList.toggle('pt', !!id); dirty(); }
      if (!id) { tip.hidden = true; return; }
      const a = app.getBoundingClientRect();
      tip.textContent = BY_ID[id].name; tip.hidden = false;
      let x = last.clientX - a.left + 14; const y = last.clientY - a.top + 18;
      if (x + tip.offsetWidth > a.width - 8) x = last.clientX - a.left - tip.offsetWidth - 12;
      tip.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
    });
  });
  canvas.addEventListener('pointerleave', () => { state.hover = null; tip.hidden = true; canvas.classList.remove('pt'); dirty(); });

  /* ---------- foco: a estrutura escolhida mantém a cor, o resto vira argila ---------- */
  const clay = new THREE.Color(), flash = { ids: [], until: 0 };
  let ink = '#1D1D1F';
  function updateFocus(dt, now) {
    const sel = selSet(), h = state.selected && home[state.selected];
    // a ficha cuja vista é a cena inteira (Sinapse) não apaga o resto dessa cena
    const present = sel.some((id) => stages[state.stage].ids.has(id)) && !(h && h.stage === state.stage && !h.t);
    const fl = now < flash.until ? flash.ids : [];
    const k = reduce ? 1 : Math.min(1, dt * 9);
    let moving = false;
    for (const m of materials.values()) {
      const u = m.userData, id = u.id;
      let g = 0, e = 0;
      if (present) g = sel.includes(id) ? 0 : 1;
      if (id === state.hover) { e = 0.16; g *= 0.45; }
      if (present && sel.includes(id)) e = 0.06;
      if (fl.includes(id)) { e = 0.5; g = 0; }
      if (Math.abs(g - u.g) > 0.004 || Math.abs(e - u.e) > 0.004) { u.g += (g - u.g) * k; u.e += (e - u.e) * k; moving = true; } else { u.g = g; u.e = e; }
      m.color.copy(u.base).lerp(clay, u.g * 0.9);
      m.emissive.copy(u.base).multiplyScalar(u.e);
      if (m.transparent) m.opacity = u.op * (1 - 0.55 * u.g) + u.e * 0.4;
    }
    return moving;
  }

  /* ---------- módulo do potencial de ação: o gráfico e a cena andam juntos ---------- */
  const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff6c4, toneMapped: false, fog: false }));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffd65c, transparent: true, opacity: 0.32, depthTest: false, depthWrite: false, fog: false }));
  pulse.add(halo); pulse.visible = false; pulse.renderOrder = 9; halo.renderOrder = 9; stages.world.group.add(pulse);
  const num = (v, d = 0) => v.toFixed(d).replace('.', tr(',', '.')).replace('-', '−');
  const SVG_PLAY = '<svg class="ic fill" viewBox="0 0 16 16"><path d="M4.5 2.8v10.4a.6.6 0 0 0 .9.5l8.3-5.2a.6.6 0 0 0 0-1L5.4 2.3a.6.6 0 0 0-.9.5z"/></svg>';
  const SVG_PAUSE = '<svg class="ic fill" viewBox="0 0 16 16"><rect x="3.5" y="2.5" width="3.2" height="11" rx="1"/><rect x="9.3" y="2.5" width="3.2" height="11" rx="1"/></svg>';
  let phaseKey = '', sig = null;
  function setPhase(title, text) { const key = title + '|' + text; if (key === phaseKey) return; phaseKey = key; phaseEl.innerHTML = `<b>${title}.</b> ${text}`; }
  function showModule(mode) {
    mod.mode = mode;
    card.hidden = !mode;
    $('apCtl').hidden = mode !== 'ap'; $('apCtlWorld').hidden = mode !== 'world'; $('apClose').hidden = mode !== 'world';
    playBtn.hidden = !(state.stage === 'world' && !mode);
    if (W) resize();
  }
  function syncModule() {
    if (state.stage === 'ap') {
      if (mod.mode === 'ap') return;
      showModule('ap'); graph.setTrace(mod.tr); mod.t = 0; mod.playing = !reduce; mod.dirty = true; stimLabel();
      if (phone.matches) sheet.to('peek');
    } else {
      if (state.stage !== 'world') stopSignal();
      showModule(state.stage === 'world' && mod.mode === 'world' ? 'world' : null);
    }
  }
  function stimLabel() { $('apStimV').textContent = mod.k < 0.01 ? tr('sem estímulo', 'no stimulus') : tr(`${num(mod.k, 2)}× o limiar`, `${num(mod.k, 2)}× threshold`); }
  $('apPlay').addEventListener('click', () => { if (mod.playing) mod.playing = false; else { if (mod.t >= model.T - 0.02) mod.t = 0; mod.playing = true; } mod.dirty = true; });
  $('apStim').addEventListener('input', (e) => { mod.k = +e.target.value; mod.tr = model.trace(mod.k); graph.setTrace(mod.tr); mod.t = 0.5; mod.playing = true; stimLabel(); });
  graph.onScrub = (t) => { if (mod.mode !== 'ap') return; mod.t = t; mod.playing = false; mod.dirty = true; };
  function stepModule(dt) {
    if (mod.playing) { mod.clock += dt; mod.t += dt * 0.7; if (mod.t >= model.T) { mod.t = model.T; mod.playing = false; } }
    const s = model.sample(mod.tr, mod.t);
    s.oNa = Math.min(1, (s.m ** 3 * s.h) / stdMax.o); s.oK = Math.max(0, Math.min(1, (s.n ** 4 - model.rest4) / (stdMax.n4 - model.rest4)));
    s.rNa = Math.min(1, Math.abs(s.INa) / stdMax.INa); s.rK = Math.min(1, Math.max(0, s.IK) / stdMax.IK);
    built.ap.update(s, mod.clock, mod.playing ? dt : 0);
    graph.setTime(mod.t);
    readEl.textContent = `Vm ${num(s.V)} mV · ${num(mod.t, 2)} ms`;
    const ph = model.phase(mod.tr, mod.t); setPhase(ph[0], ph[1]);
    const icon = mod.playing ? 'pause' : 'play', btn = $('apPlay');
    if (btn.dataset.icon !== icon) { btn.dataset.icon = icon; btn.innerHTML = mod.playing ? SVG_PAUSE : SVG_PLAY; btn.setAttribute('aria-label', mod.playing ? tr('Pausar', 'Pause') : tr('Reproduzir', 'Play')); }
  }

  /* sinal percorrendo o neurônio: no cone e em cada nódulo, o gráfico desenha o mesmo potencial de ação */
  function startSignal() {
    if (sig) return;
    markView('world');
    if (phone.matches) sheet.to('peek');
    showModule('world'); graph.setTrace(model.trace(0.75)); graph.setTime(0); readEl.textContent = ''; setPhase(tr('Sinal', 'Signal'), tr('Acompanhe o ponto amarelo pelo neurônio.', 'Follow the yellow dot through the neuron.'));
    setStage('world', () => whole('world'));
    sig = { i: 0, gi: -1, n: 0, t0: performance.now() + (reduce ? 0 : 900) }; $('apAgain').disabled = true;
  }
  function stopSignal() { if (!sig) return; sig = null; pulse.visible = false; flash.until = 0; $('apAgain').disabled = false; }
  playBtn.addEventListener('click', startSignal); $('apAgain').addEventListener('click', startSignal);
  $('apClose').addEventListener('click', () => { stopSignal(); showModule(null); });
  $('apGo').addEventListener('click', () => { stopSignal(); openView('ap'); });
  function stepSignal(now) {
    if (now < sig.t0) return;
    const s = signal[sig.i], e = now - sig.t0, total = s.dur + (s.hold || 0);
    if (e >= total) { sig.i++; sig.t0 = now; if (sig.i >= signal.length) stopSignal(); return; }
    const u = Math.min(1, e / s.dur);
    pulse.position.copy(s.c ? s.c.getPointAt(u) : s.at);
    const far = Math.min(3, Math.max(1, camera.position.distanceTo(pulse.position) / 70));
    pulse.scale.setScalar(far * (s.c ? 1 : 1 + 0.6 * Math.sin(u * Math.PI)));
    pulse.visible = true;
    if (sig.gi !== sig.i) {
      sig.gi = sig.i;
      sig.kind = sig.i === 0 ? 'sub' : sig.i === 1 ? 'sub2' : s.id === 'cone' || s.id === 'nodulo' ? 'ap' : null;
      if (sig.kind === 'ap') { sig.n++; graph.setTrace(std); readEl.textContent = sig.n === 1 ? tr('Potencial de ação nº 1', 'Action potential no. 1') : tr(`Potencial de ação nº ${sig.n}: mesmo tamanho`, `Action potential no. ${sig.n}: same size`); }
      else if (sig.kind === 'sub') readEl.textContent = tr('Despolarização pequena, abaixo do limiar', 'Small depolarization, below threshold');
      else if (!sig.kind) readEl.textContent = '';
      const cut = s.cap.indexOf(':'), rest = s.cap.slice(cut + 2); setPhase(s.cap.slice(0, cut), rest[0].toUpperCase() + rest.slice(1));
    }
    if (sig.kind === 'sub') graph.setTime(0.5 + u * 1.4);
    else if (sig.kind === 'sub2') graph.setTime(1.9 + u * 2.2);
    else if (sig.kind === 'ap') graph.setTime(0.6 + (e / total) * 5.6);
    flash.ids = [s.id]; flash.until = now + 80;
  }

  /* ---------- tema ---------- */
  function applyTheme() {
    const cs = getComputedStyle(app);
    scene.fog.color.set(cs.getPropertyValue('--fog').trim() || '#EEEEF2');
    clay.set(cs.getPropertyValue('--clay').trim() || '#DCDCE2');
    ink = cs.getPropertyValue('--label').trim() || '#1D1D1F';
    if (built.ap) built.ap.setInk(ink);
    dirty();
  }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- laço ---------- */
  const legend = $('legend'), liqBtn = $('liq');
  legend.innerHTML = ITEMS.filter((i) => i.g === 'liq').map((i) => `<button type="button" data-id="${i.id}">${dot(i.color)}${shortName(i)}</button>`).join('');
  legend.addEventListener('click', (e) => { const b = e.target.closest('button[data-id]'); if (b) select(b.dataset.id, false); });
  function showFluids(s) { for (const m of s.fluids) m.visible = state.liquids; if (s.motes) s.motes.visible = state.liquids; }
  function setLiquids(on) {
    state.liquids = on;
    app.dataset.liquids = on ? 'on' : 'off';
    liqBtn.setAttribute('aria-pressed', String(on));
    legend.hidden = !on;
    for (const s of Object.values(stages)) showFluids(s);
    if (!on && state.selected && BY_ID[state.selected].g === 'liq') select(null);
    applyTheme();
    if (W) resize();
  }
  liqBtn.addEventListener('click', () => setLiquids(!state.liquids));
  $('tags').addEventListener('click', (e) => { state.labels = !state.labels; e.currentTarget.setAttribute('aria-pressed', String(state.labels)); dirty(); });
  let prev = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - prev) / 1000); prev = now;
    if (fly) {
      const u = Math.min(1, (now - fly.t0) / fly.dur), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      controls.target.lerpVectors(fly.fromT, fly.toT, e); camera.position.lerpVectors(fly.fromP, fly.toP, e);
      if (u >= 1) fly = null;
      needs = true;
    }
    if (sig) { stepSignal(now); needs = true; }
    if (state.stage === 'ap' && mod.mode === 'ap' && (mod.playing || mod.dirty || needs)) { stepModule(dt); mod.dirty = false; needs = true; }
    nav.step(dt);
    controls.update();
    if (updateFocus(dt, now)) needs = true;
    if (!needs) return;
    needs = false;
    const d = camera.position.distanceTo(controls.target);
    scene.fog.near = d * (state.liquids ? 0.72 : 0.85); scene.fog.far = d * (state.liquids ? 2.5 : 3.4);
    renderer.render(scene, camera);
    layoutLabels();
  }

  three = { dirty, resize, repane, goHome, openView, setLiquids };
  applyTheme();
  // prepara a primeira cena (luz e limites) e enquadra
  state.stage = null; setStage('world', () => whole('world'), true);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(app);
  window.addEventListener('resize', resize);
  phone.addEventListener('change', () => { if (phone.matches) sheet.to('half'); else app.style.removeProperty('--sheet'); setTimeout(resize, 60); });
  resize();
  if (location.hash && BY_ID[location.hash.slice(1)]) select(location.hash.slice(1), true);
  requestAnimationFrame(frame);
  // monta as outras vistas aos poucos, quando ninguém está mexendo na cena
  let lastInput = performance.now();
  for (const ev of ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart']) window.addEventListener(ev, () => { lastInput = performance.now(); }, { passive: true });
  (function prebuild() {
    const todo = built.pending(); if (!todo.length) return;
    const run = () => { if (performance.now() - lastInput > 1500 && !fly && !sig && !document.hidden && !app.classList.contains('fade')) ensureStage(todo[0]); prebuild(); };
    setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(run, { timeout: 3000 }) : run()), 800);
  })();
}
start3D();
