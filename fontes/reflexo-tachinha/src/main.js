import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GROUPS, ITEMS, BY_ID, VIEWS, STEPS } from './data.js';
import { buildScene } from './scene.js';
import { LANG, EN, tr, applyLang } from '../../comum/lang.js';
import { initPanes } from '../../comum/panes.js';
import { initNav } from '../../comum/nav.js';
import { initSpeed } from '../../comum/speed.js';

applyLang(); // inglês nos textos do HTML, chave PT/EN e links de volta ao hub

const $ = (id) => document.getElementById(id);
const app = $('app'), canvas = $('gl'), listEl = $('list'), insEl = $('inspector'), panes = $('panes'), segEl = $('seg');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const phone = window.matchMedia('(max-width: 900px)');
const ICON = {
  chev: '<svg class="ic chev" viewBox="0 0 16 16"><path d="m6 3.500 4.500 4.500L6 12.500"/></svg>',
  close: '<svg class="ic" viewBox="0 0 16 16"><path d="m4 4 8 8M12 4l-8 8"/></svg>',
  zoom: '<svg class="ic" viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.300"/><path d="m10.300 10.300 3.200 3.200M5.200 7h3.600M7 5.200v3.600"/></svg>',
  play: '<svg class="ic fill" viewBox="0 0 16 16"><path d="M4.5 2.8v10.4a.6.6 0 0 0 .9.5l8.3-5.2a.6.6 0 0 0 0-1L5.4 2.3a.6.6 0 0 0-.9.5z"/></svg>',
  pause: '<svg class="ic fill" viewBox="0 0 16 16"><rect x="3.5" y="2.5" width="3.2" height="11" rx="1"/><rect x="9.300" y="2.5" width="3.2" height="11" rx="1"/></svg>',
};
const dot = (c) => `<span class="dot" style="background:${c}"></span>`;
const groupName = (g) => GROUPS.find((x) => x.id === g).name;
const fold = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const state = { selected: null, hover: null, view: 'body', stage: 'body', labels: true };
// passo a passo: i = passo atual; t = ms já tocados; wait = espera antes de começar (troca de vista)
const stp = { i: 0, t: 0, wait: 0, playing: false, done: false, auto: false, touched: false };
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
  listEl.innerHTML = n ? html : `<p class="none">${tr(`Nenhuma estrutura com “${query.trim().replace(/[<>&]/g, '')}”.`, `No structure matching “${query.trim().replace(/[<>&]/g, '')}”.`)}</p>`;
}
listEl.addEventListener('click', (e) => { const b = e.target.closest('button[data-id]'); if (b) select(b.dataset.id, true); });
$('q').addEventListener('input', (e) => renderList(e.target.value));

/* ============================== ficha ============================== */
function renderIntro() {
  insEl.innerHTML = `<div class="ins">
    <h1>${tr('Reflexo da tachinha', 'Thumbtack reflex')}</h1>
    <p class="lead">${tr('Você pisa numa tachinha e levanta o pé. O modelo segue o sinal do contato na pele até a contração do músculo.', 'You step on a thumbtack and lift your foot. The model follows the signal from the contact on the skin to the contraction of the muscle.')}</p>
    <h2>${tr('O que o livro mostra', 'What the book shows')}</h2>
    <p>${tr('Na medula, o sinal se divide. Um caminho sobe ao encéfalo, onde a dor é registrada. O outro vai direto ao neurônio motor e levanta o pé, sem esperar o encéfalo.', 'In the spinal cord, the signal splits. One path goes up to the brain, where the pain is registered. The other goes straight to the motor neuron and lifts the foot, without waiting for the brain.')}</p>
    <h2>${tr('Passo a passo', 'Step by step')}</h2>
    <ol class="rows links">${STEPS.map((s, i) => `<li><button type="button" data-step="${i}"><span class="num">${i + 1}</span><span class="name">${s.title}</span>${ICON.chev}</button></li>`).join('')}</ol>
    <p class="foot">${tr('Clique em qualquer estrutura para abrir a ficha. Arraste para girar, role ou pince para aproximar, use dois dedos ou o botão direito para mover. Pelo teclado, as setas giram, W A S D movem e 0 recentraliza. Formas e tamanhos estão exagerados. Conteúdo conforme Bear, Connors e Paradiso, Neurociências, 4ª ed., capítulos 1 a 6; o que vem de fora desses capítulos aparece marcado como extra.', 'Click any structure to open its card. Drag to rotate, scroll or pinch to zoom, use two fingers or the right button to pan. On the keyboard, the arrows rotate, W A S D move and 0 recenters. Shapes and sizes are exaggerated. Content follows Bear, Connors and Paradiso, Neuroscience: Exploring the Brain, 4th ed., chapters 1 to 6; anything from outside those chapters is marked as extra.')}</p>
  </div>`;
}
function renderItem(id) {
  const it = BY_ID[id];
  const inSteps = STEPS.map((s, i) => (s.ids.includes(id) ? i : -1)).filter((i) => i >= 0);
  insEl.innerHTML = `<div class="ins">
    <div class="ins-top"><div><h1>${it.name}</h1>${it.aka ? `<p class="aka">${it.aka}</p>` : ''}</div>
      <button type="button" class="close" data-act="close" aria-label="${tr('Fechar ficha', 'Close card')}">${ICON.close}</button></div>
    <dl class="rows"><div><dt>${tr('Grupo', 'Group')}</dt><dd>${groupName(it.g)}</dd></div>${(it.rows || []).map((r) => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('')}</dl>
    <h2>${tr('Morfologia', 'Morphology')}</h2><p>${it.morf}</p>
    <h2>${tr('Função', 'Function')}</h2><p>${it.func}</p>
    ${it.clue ? `<h2>${it.clueTitle}</h2><p>${it.clue}</p>` : ''}
    ${it.more ? `<h2>${tr('Mais detalhes', 'More details')}</h2><ul class="more">${it.more.map((m) => (typeof m === 'string' ? `<li>${m}</li>` : `<li>${m.x} <span class="tag">${tr('extra', 'extra')}</span></li>`)).join('')}</ul>` : ''}
    <h2>${tr('Na cena', 'In the scene')}</h2><p>${it.where}</p>
    <div class="actions"><button type="button" class="btn" data-act="go">${ICON.zoom}${tr('Ver de perto', 'See up close')}</button></div>
    ${inSteps.length ? `<h2>${tr('Aparece nos passos', 'Appears in steps')}</h2><ol class="rows links">${inSteps.map((i) => `<li><button type="button" data-step="${i}"><span class="num">${i + 1}</span><span class="name">${STEPS[i].title}</span>${ICON.chev}</button></li>`).join('')}</ol>` : ''}
    ${it.rel && it.rel.length ? `<h2>${tr('Relacionados', 'Related')}</h2><ul class="rows links">${it.rel.map((r) => `<li><button type="button" data-id="${r}">${dot(BY_ID[r].color)}<span class="name">${BY_ID[r].name}</span>${ICON.chev}</button></li>`).join('')}</ul>` : ''}
  </div>`;
}
insEl.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.id) select(b.dataset.id, true);
  else if (b.dataset.step) goStep(+b.dataset.step, false);
  else if (b.dataset.act === 'go' && state.selected && three) three.goHome(state.selected);
  else if (b.dataset.act === 'close') select(null);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.selected) select(null); });

function select(id, fly) {
  state.selected = id && BY_ID[id] ? id : null;
  listEl.querySelectorAll('button[data-id]').forEach((b) => (b.dataset.id === state.selected ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
  if (state.selected) renderItem(state.selected); else renderIntro();
  const cur = listEl.querySelector('[aria-current]'); if (cur && !phone.matches) cur.scrollIntoView({ block: 'nearest' });
  insEl.scrollTop = 0;
  panes.dataset.pane = state.selected ? 'detail' : 'list';
  if (phone.matches && state.selected) sheet.to(fly ? 'half' : sheet.at === 'full' ? 'half' : sheet.at);
  if (state.selected && fly) panesUI.set('right', true); // escolher na lista é pedir a ficha
  if (state.selected && fly && three) { stp.playing = false; renderStepper(); three.goHome(state.selected); }
  if (three) three.dirty();
}

/* ============================== vistas ============================== */
segEl.innerHTML = VIEWS.map((v) => `<button type="button" data-view="${v.id}" aria-pressed="${v.id === state.view}">${v.name}</button>`).join('');
function markView(id) {
  state.view = id;
  segEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === id)));
}
segEl.addEventListener('click', (e) => { const b = e.target.closest('button[data-view]'); if (b && three) { stp.playing = false; renderStepper(); three.openView(b.dataset.view); } });

/* ============================== passo a passo ============================== */
const stPlay = $('stPlay'), stBar = $('stBar');
const speed = initSpeed(stPlay.parentElement, stPlay.parentElement.querySelector('.grow')); // multiplicador de tempo da animação
$('stDots').innerHTML = STEPS.map((s, i) => `<button type="button" data-step="${i}" aria-label="${tr(`Passo ${i + 1}: ${s.title}`, `Step ${i + 1}: ${s.title}`)}"></button>`).join('');
function renderStepper() {
  const s = STEPS[stp.i], last = stp.i === STEPS.length - 1;
  $('stCount').textContent = tr(`Passo ${stp.i + 1} de ${STEPS.length}`, `Step ${stp.i + 1} of ${STEPS.length}`);
  $('stTitle').textContent = s.title;
  if ($('stText').textContent !== s.text) $('stText').textContent = s.text;
  $('stPrev').disabled = stp.i === 0; $('stNext').disabled = last;
  $('stDots').querySelectorAll('button').forEach((b, i) => (i === stp.i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
  const label = stp.playing ? tr('Pausar', 'Pause') : !stp.touched ? tr('Começar', 'Start') : stp.done ? (last ? tr('Repetir do início', 'Replay from the start') : tr('Continuar', 'Continue')) : stp.t > 0 ? tr('Continuar', 'Continue') : tr('Reproduzir', 'Play');
  const html = (stp.playing ? ICON.pause : ICON.play) + label;
  if (stPlay.dataset.k !== html) { stPlay.dataset.k = html; stPlay.innerHTML = html; }
}
/** Vai para o passo i e toca a animação dele. auto = segue sozinho para os próximos. */
function goStep(i, auto) {
  stp.i = Math.max(0, Math.min(STEPS.length - 1, i));
  stp.t = 0; stp.done = false; stp.playing = true; stp.auto = !!auto; stp.touched = true;
  if (state.selected) select(null);
  if (phone.matches) sheet.to('peek');
  const s = STEPS[stp.i], changing = three && s.stage !== state.stage;
  stp.wait = reduce ? 0 : changing ? 700 : 950;
  if (three) three.openStep(s);
  renderStepper();
}
stPlay.addEventListener('click', () => {
  if (stp.playing) { stp.playing = false; stp.auto = false; renderStepper(); return; }
  if (stp.done) { goStep(stp.i === STEPS.length - 1 ? 0 : stp.i + 1, true); return; }
  if (stp.t > 0 && three && STEPS[stp.i].stage === state.stage) { stp.playing = true; stp.auto = true; stp.touched = true; renderStepper(); return; }
  goStep(stp.i, true);
});
$('stPrev').addEventListener('click', () => goStep(stp.i - 1, false));
$('stNext').addEventListener('click', () => goStep(stp.i + 1, false));
$('stDots').addEventListener('click', (e) => { const b = e.target.closest('button[data-step]'); if (b) goStep(+b.dataset.step, false); });

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
renderStepper();
if (phone.matches) sheet.to('peek');

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
  const { stages, home, materials } = built;
  for (const [name, s] of Object.entries(stages)) { s.group.visible = name === 'body'; scene.add(s.group); }

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.1; controls.screenSpacePanning = true; controls.zoomSpeed = 0.9; controls.rotateSpeed = 0.8;
  controls.zoomToCursor = true;
  const busy = $('busy'), stepper = $('stepper');

  /* ---------- tamanho, áreas livres e enquadramento ---------- */
  let W = 0, H = 0, needs = true, vis = { x: 0, y: 0, w: 1, h: 1 };
  const dirty = () => { needs = true; };
  function freeArea() {
    const a = app.getBoundingClientRect();
    const overTop = stepper.getClientRects().length ? stepper.getBoundingClientRect().top - a.top - 8 : Infinity;
    if (phone.matches) {
      const tb = $('toolbar').getBoundingClientRect(), sh = panes.getBoundingClientRect();
      const top = tb.bottom - a.top + 6, bottom = Math.max(Math.min(a.height - Math.min(sh.height, a.height * 0.5), overTop), top + 120);
      return { x: 0, y: top, w: a.width, h: bottom - top };
    }
    const l = $('sidebar').getBoundingClientRect().right - a.left + 8, r = (insEl.getClientRects().length ? insEl.getBoundingClientRect().left : a.right) - a.left - 8; // ficha recolhida: a cena vai até a borda
    const b = Math.min($('toolbar').getBoundingClientRect().top - a.top - 8, overTop);
    return { x: l, y: 8, w: Math.max(200, r - l), h: Math.max(200, b - 8) };
  }
  function resize() {
    const w = app.clientWidth, h = app.clientHeight; if (!w || !h) return;
    const first = !W;
    W = w; H = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    vis = freeArea();
    // desloca o centro óptico para o meio da área livre entre os painéis
    camera.setViewOffset(w, h, -(vis.x + vis.w / 2 - w / 2), -(vis.y + vis.h / 2 - h / 2), w, h);
    camera.updateProjectionMatrix();
    $('leaders').setAttribute('viewBox', `0 0 ${w} ${h}`);
    measure();
    if (first) goTo(whole('body'), true);
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
  }
  function setStage(name, view, instant) {
    const resolve = () => (typeof view === 'function' ? view() : view);
    if (name === state.stage) { goTo(resolve(), instant); return; }
    const apply = () => {
      ensureStage(name);
      for (const [n, s] of Object.entries(stages)) s.group.visible = n === name;
      state.stage = name; state.hover = null;
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
  function openView(id) { markView(id); setStage(id, () => whole(id)); }
  function openStep(s) { markView(s.stage); setStage(s.stage, () => built.stepView[s.id] || whole(s.stage)); }
  function goHome(id) {
    const name = home[id] ? home[id].stage : built.stageOf(id);
    markView(name);
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
      if (d.go) el.addEventListener('click', () => { stp.playing = false; renderStepper(); openView(d.go); });
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
  const selSet = () => (state.selected ? [state.selected] : []);
  function fits(bx, by, l, placed) {
    if (bx < vis.x + 2 || by < vis.y + 2 || bx + l.w > vis.x + vis.w - 2 || by + l.h > vis.y + vis.h - 2) return false;
    for (const p of placed) if (bx < p[2] && bx + l.w > p[0] && by < p[3] && by + l.h > p[1]) return false;
    return true;
  }
  function layoutLabels() {
    const placed = [], cand = [], sel = selSet();
    for (const l of labels) {
      l.show = false;
      if (l.stage !== state.stage) continue;
      const isSel = !!l.id && sel.includes(l.id);
      if (!state.labels && !isSel) continue;
      if (l.track) l.track.localToWorld(l.pos.copy(l.local)); // rótulo preso a uma peça que se move
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
  function pickAt(cx, cy) {
    const r = canvas.getBoundingClientRect(), st = stages[state.stage];
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(st.meshes, false).filter((h) => { const cp = h.object.material.userData.clip; return !(cp && cp.distanceToPoint(h.point) < 0); });
    if (!hits.length) return null;
    // um envoltório translúcido (nervo, raiz, gânglio) cede a vez ao que está dentro dele
    const first = hits[0];
    if (first.object.material.transparent && st.thru) {
      const inner = hits.find((h) => !h.object.material.transparent && h.distance - first.distance < st.thru);
      if (inner) return inner.object.userData.id;
    }
    return first.object.userData.id;
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
      const id = pickAt(last.clientX, last.clientY);
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
  const clay = new THREE.Color();
  let flashIds = [];
  function updateFocus(dt) {
    const sel = selSet(), h = state.selected && home[state.selected];
    const present = sel.some((id) => stages[state.stage].ids.has(id)) && !(h && h.stage === state.stage && !h.t);
    const k = reduce ? 1 : Math.min(1, dt * 9);
    let moving = false;
    for (const m of materials.values()) {
      const u = m.userData, id = u.id;
      let g = 0, e = 0;
      if (present) g = sel.includes(id) ? 0 : 1;
      if (id === state.hover) { e = 0.16; g *= 0.45; }
      if (present && sel.includes(id)) e = 0.06;
      if (flashIds.includes(id)) { e = 0.42; g = 0; }
      if (Math.abs(g - u.g) > 0.004 || Math.abs(e - u.e) > 0.004) { u.g += (g - u.g) * k; u.e += (e - u.e) * k; moving = true; } else { u.g = g; u.e = e; }
      m.color.copy(u.base).lerp(clay, u.g * 0.9);
      m.emissive.copy(u.base).multiplyScalar(u.e);
      if (m.transparent) m.opacity = u.op * (1 - 0.55 * u.g) + u.e * 0.4;
    }
    return moving;
  }

  /* ---------- tema ---------- */
  function applyTheme() {
    const cs = getComputedStyle(document.documentElement), get = (k, d) => cs.getPropertyValue(k).trim() || d;
    scene.fog.color.set(get('--fog', '#EEEEF2'));
    clay.set(get('--clay', '#DCDCE2'));
    built.setTheme({ ghost: get('--ghost', '#7C8AA5'), clay: get('--clay', '#DCDCE2') });
    dirty();
  }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- laço ---------- */
  $('tags').addEventListener('click', (e) => { state.labels = !state.labels; e.currentTarget.setAttribute('aria-pressed', String(state.labels)); dirty(); });
  let prev = performance.now(), clock = 0, autoAt = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - prev) / 1000), sdt = dt * speed.value; prev = now;
    if (fly) {
      const u = Math.min(1, (now - fly.t0) / fly.dur), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      controls.target.lerpVectors(fly.fromT, fly.toT, e); camera.position.lerpVectors(fly.fromP, fly.toP, e);
      if (u >= 1) fly = null;
      needs = true;
    }
    // passo a passo
    const s = STEPS[stp.i], here = s.stage === state.stage && !app.classList.contains('fade');
    if (stp.playing && here) {
      if (stp.wait > 0) stp.wait -= sdt * 1000;
      else {
        stp.t += sdt * 1000; clock += sdt;
        if (stp.t >= s.dur) { stp.t = s.dur; stp.playing = false; stp.done = true; autoAt = stp.auto && stp.i < STEPS.length - 1 ? now + 1100 : 0; if (!autoAt) stp.auto = false; renderStepper(); }
      }
      needs = true;
    }
    if (autoAt && now >= autoAt) { autoAt = 0; if (stp.done && stp.auto) goStep(stp.i + 1, true); }
    const p = stp.done ? 1 : stp.t / s.dur;
    stBar.style.transform = `scaleX(${p.toFixed(4)})`;
    nav.step(dt);
    controls.update();
    if (updateFocus(dt)) needs = true;
    if (!needs) return;
    needs = false;
    flashIds = stages[state.stage].animate(s.stage === state.stage && (stp.t > 0 || stp.done || stp.playing) ? s.id : null, p, clock) || [];
    const d = camera.position.distanceTo(controls.target);
    scene.fog.near = d * 0.85; scene.fog.far = d * 3.4;
    renderer.render(scene, camera);
    layoutLabels();
  }

  three = { dirty, resize, repane, goHome, openView, openStep };
  applyTheme();
  // prepara a primeira cena (luz e limites) e enquadra
  state.stage = null; setStage('body', () => whole('body'), true);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(app);
  window.addEventListener('resize', resize);
  phone.addEventListener('change', () => { if (phone.matches) sheet.to('peek'); else app.style.removeProperty('--sheet'); setTimeout(resize, 60); });
  resize();
  requestAnimationFrame(frame);
  // monta as outras vistas aos poucos, quando ninguém está mexendo na cena
  let lastInput = performance.now();
  for (const ev of ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart']) window.addEventListener(ev, () => { lastInput = performance.now(); }, { passive: true });
  (function prebuild() {
    const todo = built.pending(); if (!todo.length) return;
    const run = () => { if (performance.now() - lastInput > 1200 && !fly && !stp.playing && !document.hidden && !app.classList.contains('fade')) ensureStage(todo[0]); prebuild(); };
    setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(run, { timeout: 3000 }) : run()), 700);
  })();
}
start3D();
