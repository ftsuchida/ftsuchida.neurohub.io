import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GROUPS, ITEMS, BY_ID, VIEWS, SUBS, SUB, STEPS } from './data.js';
import { buildScene } from './scene.js';
import { initTest } from './teste.js';
import { LANG, EN, tr, applyLang } from '../../comum/lang.js';
import { initPanes } from '../../comum/panes.js';
import { initNav } from '../../comum/nav.js';
import { initSpeed } from '../../comum/speed.js';
import { initMinimize } from '../../comum/minimize.js';

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
const esc = (s) => String(s).replace(/[<>&]/g, '');
const subsOf = (mod) => SUBS.filter((s) => s.mod === mod);
const stepsOf = (sub) => STEPS.filter((s) => s.seq === sub);

/* mod = módulo (barra de baixo); sub = subvista do módulo; mode = modo de cor do encéfalo; variant = camada dos cortes 1 a 3 */
const state = { selected: null, hover: null, mod: 'atlas', sub: 'lateral', stage: 'enc', labels: true, mode: 'n', variant: 'a', plane: 'coronal', cut: 0.5 };
const lastSub = {}; // última subvista aberta em cada módulo
// passo a passo da subvista atual: i = passo; t = ms já tocados; wait = espera antes de começar (troca de vista)
const stp = { list: [], i: 0, t: 0, wait: 0, playing: false, done: false, auto: false, touched: false };
let three = null; // preenchido quando a cena 3D sobe
const panesUI = initPanes(app, () => three && three.repane()); // lista e ficha recolhíveis
const MODES = [['n', tr('Natural', 'Natural')], ['l', tr('Lobos', 'Lobes')], ['a', tr('Áreas', 'Areas')], ['o', tr('Origem', 'Origin')]];

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
  listEl.innerHTML = n ? html : `<p class="none">${tr(`Nenhuma estrutura com “${esc(query.trim())}”.`, `No structure matching “${esc(query.trim())}”.`)}</p>`;
}
listEl.addEventListener('click', (e) => { const b = e.target.closest('button[data-id]'); if (b) select(b.dataset.id, true); });
$('q').addEventListener('input', (e) => renderList(e.target.value));

/* ============================== ficha ============================== */
const INTRO = {
  atlas: [tr('Encéfalo em 3D', 'Brain in 3D'), tr('O encéfalo humano por fora e por dentro, em malha anatômica. Clique em qualquer parte para abrir a ficha.', 'The human brain, outside and inside, as an anatomical mesh. Click any part to open its card.'),
    tr('É o atlas do apêndice do capítulo 7: as quatro vistas do encéfalo inteiro, o cerebelo e o tronco expostos, e uma visão de raio X do que fica sob o córtex. O seletor de cores pinta os lobos, as áreas do córtex ou a origem embrionária de cada parte.', 'This is the atlas from the appendix to chapter 7: the four views of the whole brain, the cerebellum and brain stem exposed, and an X-ray view of what lies beneath the cortex. The colour selector paints the lobes, the cortical areas or the embryonic origin of each part.')],
  cortes: [tr('Cortes', 'Sections'), tr('As nove secções do apêndice, perpendiculares ao neuroeixo, e um plano livre para fatiar o encéfalo onde quiser.', 'The nine sections from the appendix, perpendicular to the neuraxis, and a free plane to slice the brain wherever you like.'),
    tr('A face do corte sai da própria malha: o que você vê é a secção real de cada peça. Os núcleos sem malha são sólidos desenhados no lugar aproximado. Nos cortes 1 a 3 há duas camadas de rótulos, como no livro.', 'The cut face comes from the mesh itself: what you see is the real section of each part. Nuclei without a mesh are solids drawn at their approximate place. Sections 1 to 3 have two layers of labels, as in the book.')],
  volta: [tr('Em volta do encéfalo', 'Around the brain'), tr('O que protege, banha, irriga e liga o encéfalo ao resto do corpo.', 'What protects, bathes and supplies the brain, and connects it to the rest of the body.'),
    tr('Crânio e meninges, o caminho do líquido cerebrospinal, as artérias da base e os doze nervos cranianos.', 'Skull and meninges, the path of the cerebrospinal fluid, the arteries at the base and the twelve cranial nerves.')],
  vias: [tr('Vias e cruzamentos', 'Pathways and crossings'), tr('Oito caminhos pelo encéfalo, cada um em passo a passo.', 'Eight routes through the brain, each one step by step.'),
    tr('O capítulo 7 adianta algumas vias que o resto do livro detalha: por onde o comando do movimento desce, por onde o tato sobe, e onde cada uma cruza para o lado oposto. Os traçados são esquemáticos.', 'Chapter 7 previews some pathways that the rest of the book details: where the movement command descends, where touch ascends, and where each one crosses to the opposite side. The routes are schematic.')],
  origem: [tr('Do tubo ao encéfalo', 'From tube to brain'), tr('Como um tubo cheio de líquido vira o encéfalo. Acompanhar o desenvolvimento ajuda a ver como as partes do adulto se encaixam.', 'How a fluid-filled tube becomes the brain. Following development helps you see how the adult parts fit together.'),
    tr('Os desenhos são esquemáticos e fora de escala, como as figuras do livro. As cores seguem o código do capítulo: prosencéfalo em azul, mesencéfalo em rosa, rombencéfalo em verde, medula em amarelo.', 'The drawings are schematic and not to scale, like the figures in the book. The colours follow the chapter\'s code: forebrain in blue, midbrain in pink, hindbrain in green, spinal cord in yellow.')],
  medula: [tr('Medula espinhal', 'Spinal cord'), tr('A medula dentro da coluna, um segmento com as raízes e as meninges, e o mapa dos tractos.', 'The cord inside the spine, one segment with its roots and meninges, and the map of the tracts.'),
    tr('As vértebras são malha anatômica. A medula, as raízes e os tractos são desenhados, porque o conjunto de malhas só traz o canal central.', 'The vertebrae are anatomical meshes. The cord, the roots and the tracts are drawn, because the mesh set only includes the central canal.')],
  teste: [tr('Teste', 'Quiz'), tr('O apêndice do livro termina em exercícios de dar nome às estruturas. Aqui o modelo acende uma parte e você diz qual é, ou diz o nome e você a encontra.', 'The appendix in the book ends with exercises in naming structures. Here the model lights up a part and you say which it is, or names one for you to find.'),
    tr('Vale tudo o que aparece nas vistas do Atlas.', 'Everything that appears in the Atlas views is fair game.')],
};
function renderIntro() {
  const [title, lead, what] = INTRO[state.mod], seq = stp.list;
  const subs = subsOf(state.mod);
  insEl.innerHTML = `<div class="ins">
    <h1>${title}</h1>
    <p class="lead">${lead}</p>
    <h2>${tr('O que há aqui', 'What is here')}</h2>
    <p>${what}</p>
    ${seq.length ? `<h2>${tr('Passo a passo', 'Step by step')}: ${SUB[state.sub].title}</h2><ol class="rows links">${seq.map((s, i) => `<li><button type="button" data-step="${i}"><span class="num">${i + 1}</span><span class="name">${s.title}</span>${ICON.chev}</button></li>`).join('')}</ol>`
    : subs.length > 1 ? `<h2>${tr('Vistas', 'Views')}</h2><ul class="rows links">${subs.map((s) => `<li><button type="button" data-sub="${s.id}"><span class="name">${s.title}</span>${ICON.chev}</button></li>`).join('')}</ul>` : ''}
    <p class="foot">${tr('Arraste para girar, role ou pince para aproximar, use dois dedos ou o botão direito para mover. Pelo teclado, as setas giram, W A S D movem e 0 recentraliza. Conteúdo conforme Bear, Connors e Paradiso, Neurociências, 4ª ed., capítulo 7 e apêndice; o que vem de fora aparece marcado como extra. O que é desenho esquemático vem dito na ficha. Material de estudo: não é orientação médica.', 'Drag to rotate, scroll or pinch to zoom, use two fingers or the right button to pan. On the keyboard, the arrows rotate, W A S D move and 0 recenters. Content follows Bear, Connors and Paradiso, Neuroscience: Exploring the Brain, 4th ed., chapter 7 and its appendix; anything from outside is marked as extra. Schematic drawings are flagged on each card. Study material: not medical advice.')}</p>
    <p class="foot">${tr('Malhas anatômicas: BodyParts3D, © The Database Center for Life Science, licença CC Atribuição-CompartilhaIgual 2.1 Japão. Foram simplificadas, e o lado direito é o espelho do esquerdo.', 'Anatomical meshes: BodyParts3D, © The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan. They were simplified, and the right side is a mirror of the left.')}</p>
  </div>`;
}
function renderItem(id) {
  const it = BY_ID[id], termo = it.kind === 'termo';
  const inSteps = STEPS.map((s, i) => (s.ids.includes(id) ? i : -1)).filter((i) => i >= 0);
  insEl.innerHTML = `<div class="ins">
    <div class="ins-top"><div><h1>${it.name}</h1>${it.aka ? `<p class="aka">${it.aka}</p>` : ''}</div>
      <button type="button" class="close" data-act="close" aria-label="${tr('Fechar ficha', 'Close card')}">${ICON.close}</button></div>
    <dl class="rows"><div><dt>${tr('Grupo', 'Group')}</dt><dd>${groupName(it.g)}</dd></div>${(it.rows || []).map((r) => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('')}</dl>
    <h2>${termo ? tr('O que é', 'What it is') : tr('Morfologia', 'Morphology')}</h2><p>${it.morf}</p>
    <h2>${termo ? tr('No encéfalo', 'In the brain') : tr('Função', 'Function')}</h2><p>${it.func}</p>
    ${it.clue ? `<h2>${it.clueTitle}</h2><p>${it.clue}</p>` : ''}
    ${it.more ? `<h2>${tr('Mais detalhes', 'More details')}</h2><ul class="more">${it.more.map((m) => (typeof m === 'string' ? `<li>${m}</li>` : `<li>${m.x} <span class="tag">${tr('extra', 'extra')}</span></li>`)).join('')}</ul>` : ''}
    <h2>${tr('No modelo', 'In the model')}</h2><p>${it.where}</p>
    <div class="actions"><button type="button" class="btn" data-act="go">${ICON.zoom}${tr('Ver de perto', 'See up close')}</button></div>
    ${inSteps.length ? `<h2>${tr('Aparece nos passos', 'Appears in steps')}</h2><ol class="rows links">${inSteps.map((i) => `<li><button type="button" data-gstep="${STEPS[i].id}"><span class="name">${STEPS[i].title}<span class="sub">${SUB[STEPS[i].seq].title}</span></span>${ICON.chev}</button></li>`).join('')}</ol>` : ''}
    ${it.rel && it.rel.length ? `<h2>${tr('Relacionados', 'Related')}</h2><ul class="rows links">${it.rel.filter((r) => BY_ID[r]).map((r) => `<li><button type="button" data-id="${r}">${dot(BY_ID[r].color)}<span class="name">${BY_ID[r].name}</span>${ICON.chev}</button></li>`).join('')}</ul>` : ''}
  </div>`;
}
insEl.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.id) select(b.dataset.id, true);
  else if (b.dataset.step) goStep(+b.dataset.step, false);
  else if (b.dataset.gstep) { const s = STEPS.find((x) => x.id === b.dataset.gstep); select(null); openSub(s.seq); goStep(stepsOf(s.seq).indexOf(s), false); }
  else if (b.dataset.sub) openSub(b.dataset.sub);
  else if (b.dataset.act === 'go' && state.selected && three) three.goCard(state.selected);
  else if (b.dataset.act === 'close') select(null);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.selected && !test.on()) select(null); });

function select(id, fly) {
  if (test.on() && test.answer(id)) return; // no teste, o clique é a resposta
  state.selected = id && BY_ID[id] ? id : null;
  listEl.querySelectorAll('button[data-id]').forEach((b) => (b.dataset.id === state.selected ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
  if (state.selected) renderItem(state.selected); else renderIntro();
  const cur = listEl.querySelector('[aria-current]'); if (cur && !phone.matches) cur.scrollIntoView({ block: 'nearest' });
  insEl.scrollTop = 0;
  panes.dataset.pane = state.selected ? 'detail' : 'list';
  if (phone.matches && state.selected) sheet.to(fly ? 'half' : sheet.at === 'full' ? 'half' : sheet.at);
  if (state.selected && fly) panesUI.set('right', true); // escolher na lista é pedir a ficha
  if (state.selected && fly && three) { stp.playing = false; renderCtx(); three.goCard(state.selected); }
  if (three) three.dirty();
}

/* ============================== módulos e subvistas ============================== */
segEl.innerHTML = VIEWS.map((v) => `<button type="button" data-view="${v.id}" aria-pressed="${v.id === state.mod}">${v.name}</button>`).join('');
function markView() {
  segEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === state.mod)));
  const on = segEl.querySelector('[aria-pressed="true"]'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
segEl.addEventListener('click', (e) => { const b = e.target.closest('button[data-view]'); if (b) { if (state.selected) select(null); openSub(lastSub[b.dataset.view] || subsOf(b.dataset.view)[0].id); } });
/** Abre uma subvista (e o módulo dela). o.keep: não recomeça o passo a passo; o.view: enquadramento em vez do padrão. */
function openSub(id, o = {}) {
  const s = SUB[id]; if (!s) return;
  const was = state.sub;
  state.sub = id; state.mod = s.mod; lastSub[s.mod] = id;
  if (was !== id || !o.keep) { stp.list = stepsOf(id); stp.i = 0; stp.t = 0; stp.done = false; stp.playing = false; stp.auto = false; stp.touched = false; }
  markView();
  test.leave(s.mod !== 'teste');
  if (three) three.enter(o);
  renderCtx();
  if (!state.selected) renderIntro();
  if (s.mod === 'teste') test.start();
}

/* ============================== cartão sobre a cena: subvistas, texto e passo a passo ============================== */
const stPlay = $('stPlay'), stBar = $('stBar'), chipsEl = $('chips'), optsEl = $('stOpts');
const speed = initSpeed(stPlay.parentElement, stPlay.parentElement.querySelector('.grow')); // multiplicador de tempo da animação
const test = initTest({ host: optsEl, three: () => three, state, render: () => renderCtx() });
function renderChips() {
  const subs = subsOf(state.mod);
  chipsEl.hidden = subs.length < 2;
  chipsEl.innerHTML = subs.map((s) => `<button type="button" data-sub="${s.id}" aria-pressed="${s.id === state.sub}" title="${esc(s.title)}">${s.name}</button>`).join('');
  const on = chipsEl.querySelector('[aria-pressed="true"]'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
chipsEl.addEventListener('click', (e) => { const b = e.target.closest('button[data-sub]'); if (b) { if (state.selected) select(null); openSub(b.dataset.sub); } });
/** Controles próprios da subvista: modo de cor, camada do corte, plano livre. */
function renderOpts() {
  const s = SUB[state.sub]; let h = '';
  const seg = (name, list, cur) => `<div class="seg mini" role="group" data-opt="${name}">${list.map(([v, t]) => `<button type="button" data-v="${v}" aria-pressed="${v === cur}">${t}</button>`).join('')}</div>`;
  if (s.mod === 'atlas') h = `<span class="lbl">${tr('Cores', 'Colours')}</span>${seg('mode', MODES, state.mode)}${state.mode === 'a' ? `<span class="note">${tr('regiões aproximadas', 'approximate regions')}</span>` : ''}`;
  else if (['c1', 'c2', 'c3'].includes(s.id)) h = seg('variant', [['a', tr('Características gerais', 'Gross features')], ['b', tr('Células e fibras', 'Cells and fibers')]], state.variant);
  else if (s.id === 'livre') h = `${seg('plane', [['coronal', tr('Coronal', 'Coronal')], ['horizontal', tr('Horizontal', 'Horizontal')], ['sagital', tr('Sagital', 'Sagittal')]], state.plane)}<input type="range" id="cutBar" min="0" max="1" step="0.002" value="${state.cut}" aria-label="${tr('Posição do plano de corte', 'Position of the cutting plane')}">`;
  if (s.mod === 'teste') return; // o teste desenha os próprios controles
  optsEl.innerHTML = h; optsEl.hidden = !h;
}
optsEl.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-v]'); if (!b) return;
  const opt = b.parentElement.dataset.opt; if (!opt) return;
  state[opt] = b.dataset.v;
  if (three) three.enter({ keepView: opt !== 'plane' });
  renderOpts();
});
optsEl.addEventListener('input', (e) => { if (e.target.id === 'cutBar') { state.cut = +e.target.value; if (three) three.cut(); } });
optsEl.addEventListener('change', (e) => { if (e.target.id === 'cutBar' && three) three.relabel(); });
function renderCtx() {
  const s = SUB[state.sub], seq = stp.list, has = seq.length > 0;
  renderChips(); renderOpts();
  $('stCtl').hidden = !has; stBar.hidden = !has; $('stCount').hidden = !has; $('stepper').classList.toggle('steps', has);
  if (!has) {
    $('stTitle').textContent = s.title; $('stText').textContent = s.hint || ''; $('stText').hidden = !s.hint;
    $('stTitle').hidden = s.mod === 'teste';
    return;
  }
  const st = seq[stp.i], last = stp.i === seq.length - 1;
  $('stTitle').hidden = false; $('stText').hidden = false;
  $('stCount').textContent = tr(`${s.title} · passo ${stp.i + 1} de ${seq.length}`, `${s.title} · step ${stp.i + 1} of ${seq.length}`);
  $('stTitle').textContent = st.title;
  if ($('stText').textContent !== st.text) $('stText').textContent = st.text;
  $('stPrev').disabled = stp.i === 0; $('stNext').disabled = last;
  const dots = $('stDots');
  if (dots.dataset.k !== state.sub) { dots.dataset.k = state.sub; dots.innerHTML = seq.map((x, i) => `<button type="button" data-step="${i}" aria-label="${tr(`Passo ${i + 1}: ${esc(x.title)}`, `Step ${i + 1}: ${esc(x.title)}`)}"></button>`).join(''); }
  dots.querySelectorAll('button').forEach((b, i) => (i === stp.i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
  const label = stp.playing ? tr('Pausar', 'Pause') : !stp.touched ? tr('Começar', 'Start') : stp.done ? (last ? tr('Repetir do início', 'Replay from the start') : tr('Continuar', 'Continue')) : stp.t > 0 ? tr('Continuar', 'Continue') : tr('Reproduzir', 'Play');
  const html = (stp.playing ? ICON.pause : ICON.play) + label;
  if (stPlay.dataset.k !== html) { stPlay.dataset.k = html; stPlay.innerHTML = html; }
}
/** Vai para o passo i da subvista atual e toca a animação dele. auto = segue sozinho para os próximos. */
function goStep(i, auto) {
  if (!stp.list.length) return;
  stp.i = Math.max(0, Math.min(stp.list.length - 1, i));
  stp.t = 0; stp.done = false; stp.playing = true; stp.auto = !!auto; stp.touched = true;
  if (state.selected) select(null);
  if (phone.matches) sheet.to('peek');
  stp.wait = reduce ? 0 : 900;
  if (three) three.openStep(stp.list[stp.i]);
  renderCtx();
}
stPlay.addEventListener('click', () => {
  if (stp.playing) { stp.playing = false; stp.auto = false; renderCtx(); return; }
  if (stp.done) { goStep(stp.i === stp.list.length - 1 ? 0 : stp.i + 1, true); return; }
  if (stp.t > 0) { stp.playing = true; stp.auto = true; stp.touched = true; renderCtx(); return; }
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

stp.list = stepsOf(state.sub);
renderList();
renderIntro();
renderCtx();
markView();
if (phone.matches) sheet.to('peek');

/* ============================== cena 3D ============================== */
function start3D() {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, stencil: true, powerPreference: 'high-performance' }); }
  catch (err) { $('nogl').hidden = false; canvas.hidden = true; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.localClippingEnabled = true;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.42;
  scene.fog = new THREE.Fog(0xffffff, 10, 100);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 900);
  const TAN = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f9c, 0.42));
  // a luz principal acompanha a câmera (de cima e da esquerda de quem olha), para o relevo aparecer de qualquer lado
  const sun = new THREE.DirectionalLight(0xffffff, 1.85); scene.add(sun, sun.target);
  const rim = new THREE.DirectionalLight(0xdfe8ff, 0.5); scene.add(rim, rim.target);

  const built = buildScene();
  const { stages } = built;
  for (const [name, s] of Object.entries(stages)) { s.group.visible = name === 'enc'; scene.add(s.group); }
  const stage = () => stages[state.stage];

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.1; controls.screenSpacePanning = true; controls.zoomSpeed = 0.9; controls.rotateSpeed = 0.8;
  controls.zoomToCursor = true;
  const busy = $('busy'), stepper = $('stepper');
  initMinimize(stepper, { onChange: () => resize() }); // recolhe o texto para ver a cena

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
  let first = true;
  function resize() {
    const w = app.clientWidth, h = app.clientHeight; if (!w || !h) return;
    W = w; H = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    vis = freeArea();
    // desloca o centro óptico para o meio da área livre entre os painéis
    camera.setViewOffset(w, h, -(vis.x + vis.w / 2 - w / 2), -(vis.y + vis.h / 2 - h / 2), w, h);
    camera.updateProjectionMatrix();
    $('leaders').setAttribute('viewBox', `0 0 ${w} ${h}`);
    if (first) { first = false; enter({ instant: true }); } else relabel(200);
    placeGizmo();
    dirty();
  }
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
  /** Troca de palco (com um esmaecer rápido) e enquadra. */
  function setStage(name, view, instant, after) {
    if (name === state.stage) { if (after) after(); if (view) goTo(view, instant); return; }
    const apply = () => {
      built.ensure(name);
      for (const [n, s] of Object.entries(stages)) { if (!s.group.parent) scene.add(s.group); s.group.visible = n === name; }
      state.stage = name; state.hover = null;
      const s = stages[name];
      controls.minDistance = s.dist[0]; controls.maxDistance = s.dist[1];
      if (after) after();
      if (view) goTo(view, true);
      busy.hidden = true;
    };
    if (instant || reduce) { apply(); return; }
    if (!stages[name]) busy.hidden = false;
    app.classList.add('fade');
    setTimeout(() => { apply(); requestAnimationFrame(() => requestAnimationFrame(() => app.classList.remove('fade'))); }, 180);
  }
  /** Aplica a subvista atual: palco, camadas, corte, modo de cor, rótulos e câmera. */
  function enter(o = {}) {
    const name = built.stageOf(state.sub);
    let view = null;
    const after = () => {
      view = built.enter(state.sub, { mode: state.mode, variant: state.variant, plane: state.plane, cut: state.cut, reveal: o.reveal, step: o.step });
      relabel();
    };
    if (name === state.stage) { after(); if (!o.keepView) goTo(o.view || view, o.instant); dirty(); return; }
    setStage(name, null, o.instant, () => { after(); goTo(o.view || view, true); });
  }
  function openStep(s) {
    // o passo pode pedir outra subvista (por exemplo, o último passo da Origem mostra o encéfalo adulto)
    const name = built.stageOf(s.at || state.sub);
    const after = () => { const v = built.enter(s.at || state.sub, { mode: s.mode || state.mode, variant: state.variant, plane: state.plane, cut: state.cut, step: s.id }); relabel(); goTo(built.stepView(s.id) || v, name !== state.stage); };
    if (name === state.stage) { after(); dirty(); } else setStage(name, null, false, after);
  }
  /** Leva à subvista em que a ficha mora e enquadra a estrutura. */
  function goCard(id) {
    const h = built.home(id);
    if (h.mode && h.mode !== state.mode) state.mode = h.mode;
    const same = h.sub === state.sub && !h.reveal && !lastReveal;
    lastReveal = h.reveal || null;
    if (!same) { state.sub = h.sub; state.mod = SUB[h.sub].mod; lastSub[state.mod] = h.sub; stp.list = stepsOf(h.sub); stp.i = 0; stp.t = 0; stp.done = false; stp.playing = false; stp.touched = false; markView(); renderCtx(); }
    const name = built.stageOf(h.sub);
    const after = () => {
      const v = built.enter(h.sub, { mode: state.mode, variant: h.variant || state.variant, plane: state.plane, cut: state.cut, reveal: h.reveal });
      if (h.variant) state.variant = h.variant;
      relabel(); renderOpts();
      // estrutura pequena: chega perto, sem perder o entorno; estrutura grande: fica a vista inteira
      const f = built.frame(id, h.sub), base = v.box ? Math.min(v.box.hw, v.box.hh) : v.r, r = f ? Math.max(f.r * 1.7, base * 0.55) : 0;
      goTo(f && r < base * 0.92 ? { t: f.t, r, dir: h.dir || v.dir } : h.dir ? { ...v, dir: h.dir } : v, name !== state.stage);
    };
    if (name === state.stage) { after(); dirty(); } else setStage(name, null, false, after);
  }
  let lastReveal = null;
  controls.addEventListener('start', () => { fly = null; });
  controls.addEventListener('end', () => viewMoved());
  controls.addEventListener('change', dirty);
  const nav = initNav({ app, camera, controls, recenter: () => { if (lastView) goTo(lastView); }, bounds: () => { const b = stage().box; return { c: b.c, r: 2 * Math.max(b.hw, b.hh) }; } });

  /* ---------- rótulos: recalculados a cada subvista ---------- */
  const labelsEl = $('labels'), svg = $('leaders'), NS = 'http://www.w3.org/2000/svg';
  let labels = [];
  let labelsAt = 0, scanned = null; // labelsAt: quando refazer os rótulos (0 = não há pedido)
  const relabel = (wait = 0) => { labelsAt = performance.now() + wait; dirty(); };
  /** Câmera na pose final (a do fim do voo, se há um), enxergando só a área livre entre os painéis. */
  function scanCamera() {
    const c = camera.clone();
    if (fly) { c.position.copy(fly.toP); c.lookAt(fly.toT); }
    const v = camera.view;
    c.setViewOffset(W, H, (v ? v.offsetX : 0) + vis.x, (v ? v.offsetY : 0) + vis.y, vis.w, vis.h);
    c.updateMatrixWorld(); c.updateProjectionMatrix();
    return c;
  }
  function doLabels() {
    labelsAt = 0;
    const c = scanCamera();
    scanned = { p: c.position.clone(), t: (fly ? fly.toT : controls.target).clone(), sub: state.sub };
    for (const l of labels) { l.el.remove(); if (l.line) { l.line.remove(); l.dotEl.remove(); } }
    labels = built.labels(renderer, scene, state.sub, c).map(makeLabel);
    measure();
  }
  /** A pessoa girou, moveu ou aproximou: se a vista mudou de verdade, os rótulos são refeitos para o que está à mostra. */
  function viewMoved() {
    if (!scanned || scanned.sub !== state.sub) return;
    const d0 = scanned.p.distanceTo(scanned.t), d1 = camera.position.distanceTo(controls.target);
    const a = tmpA.copy(scanned.p).sub(scanned.t).normalize().dot(tmpB.copy(camera.position).sub(controls.target).normalize());
    if (a < 0.9976 || Math.abs(d1 / d0 - 1) > 0.07 || scanned.t.distanceTo(controls.target) > d0 * 0.04) relabel(240);
  }
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  function makeLabel(d) {
    const kind = d.kind || 'label';
    const el = document.createElement(kind === 'note' ? 'div' : 'button');
    el.className = 'lab' + (kind === 'note' ? ' note' : kind === 'hot' ? ' hot' : '');
    if (kind === 'hot') { el.innerHTML = ICON.zoom + '<span></span>'; el.title = d.title; el.setAttribute('aria-label', d.title); }
    (kind === 'hot' ? el.lastChild : el).textContent = d.text || (d.id && BY_ID[d.id] ? BY_ID[d.id].name : '');
    el.hidden = true;
    if (kind !== 'note') {
      el.type = 'button'; el.tabIndex = -1;
      if (d.go) el.addEventListener('click', () => { if (state.selected) select(null); openSub(d.go); });
      else { el.addEventListener('click', () => select(d.id, false)); el.addEventListener('dblclick', () => select(d.id, true)); }
    }
    labelsEl.appendChild(el);
    const o = { minPx: 0, ...d, kind, el, w: 0, h: 0 };
    if (kind === 'label') {
      o.line = document.createElementNS(NS, 'line'); o.dotEl = document.createElementNS(NS, 'circle'); o.dotEl.setAttribute('r', '2.4');
      o.line.style.display = o.dotEl.style.display = 'none';
      svg.append(o.line, o.dotEl);
    }
    return o;
  }
  function measure() { for (const l of labels) { const was = l.el.hidden; l.el.hidden = false; l.w = l.el.offsetWidth; l.h = l.el.offsetHeight; l.el.hidden = was; } }
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), OFFS = [[16, -26], [-16, -26], [16, 10], [-16, 10]];
  const selSet = () => (test.on() ? test.lit() : state.selected ? built.expand(state.selected) : []);
  function fits(bx, by, l, placed) {
    if (bx < vis.x + 2 || by < vis.y + 2 || bx + l.w > vis.x + vis.w - 2 || by + l.h > vis.y + vis.h - 2) return false;
    for (const p of placed) if (bx < p[2] && bx + l.w > p[0] && by < p[3] && by + l.h > p[1]) return false;
    return true;
  }
  function layoutLabels() {
    const placed = [], cand = [], sel = selSet(), hideAll = !state.labels || test.on();
    for (const l of labels) {
      l.show = false;
      const isSel = !!l.id && (l.id === state.selected || sel.includes(l.id)) && !test.on();
      if (hideAll && !isSel) continue;
      if (l.track) l.track.localToWorld(l.pos.copy(l.local)); // rótulo preso a uma peça que se move
      if (l.when && !l.when()) continue;
      // de costas para a câmera, o ponto está do outro lado da peça: o rótulo some
      if (l.n && tmp2.copy(camera.position).sub(l.pos).normalize().dot(l.n) < 0.12) continue;
      tmp.copy(l.pos).project(camera);
      if (tmp.z > 1 || tmp.z < -1) continue;
      const ppu = H / 2 / (TAN * camera.position.distanceTo(l.pos));
      if (ppu < l.minPx * (isSel ? 0.5 : 1)) continue;
      l.x = ((tmp.x + 1) / 2) * W; l.y = ((1 - tmp.y) / 2) * H;
      if (l.x < vis.x - 20 || l.x > vis.x + vis.w + 20 || l.y < vis.y - 20 || l.y > vis.y + vis.h + 20) continue;
      l.sel = isSel;
      l.pr = (isSel ? -1000 : 0) + (l.kind === 'hot' ? -200 : l.kind === 'note' ? 60 : 0) + l.minPx - (l.rank || 0);
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
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = stage().pick(ray);
    return h ? h.id : null;
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
  canvas.addEventListener('dblclick', (e) => { const id = pickAt(e.clientX, e.clientY); if (id && !test.on()) select(id, true); });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || e.buttons) return;
    last = e; if (queued) return; queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const id = pickAt(last.clientX, last.clientY);
      if (id !== state.hover) { state.hover = id; canvas.classList.toggle('pt', !!id); dirty(); }
      if (!id || test.on()) { tip.hidden = true; return; }
      const a = app.getBoundingClientRect();
      tip.textContent = BY_ID[id].name; tip.hidden = false;
      let x = last.clientX - a.left + 14; const y = last.clientY - a.top + 18;
      if (x + tip.offsetWidth > a.width - 8) x = last.clientX - a.left - tip.offsetWidth - 12;
      tip.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
    });
  });
  canvas.addEventListener('pointerleave', () => { state.hover = null; tip.hidden = true; canvas.classList.remove('pt'); dirty(); });

  /* ---------- indicador de direção: gira junto com o modelo ---------- */
  const giz = $('gizmo'), GA = [['x', 0], ['y', 1], ['z', 2]];
  function placeGizmo() { giz.style.left = Math.round(vis.x + 10) + 'px'; giz.style.top = Math.round(vis.y + (phone.matches ? 6 : 10)) + 'px'; }
  function drawGizmo() {
    const ax = stage().axes; giz.hidden = !ax || test.on();
    if (!ax) return;
    const m = camera.matrixWorldInverse.elements, R = 23;
    let html = '';
    const items = [];
    for (const [k, c] of GA) for (const s of [1, -1]) { const name = ax[k][s > 0 ? 0 : 1]; if (name) items.push({ x: m[c * 4] * s, y: -m[c * 4 + 1] * s, z: m[c * 4 + 2] * s, name, main: s > 0 }); }
    items.sort((a, b) => a.z - b.z);
    for (const it of items) {
      if (Math.abs(it.z) > 0.93) continue; // eixo de frente para a câmera: o nome cairia em cima do centro
      const x = 40 + it.x * R, y = 40 + it.y * R, o = (0.42 + 0.58 * (it.z * 0.5 + 0.5)).toFixed(2);
      html += `<line x1="40" y1="40" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" opacity="${o}"${it.main ? '' : ' class="neg"'}/><text x="${(40 + it.x * (R + 11)).toFixed(1)}" y="${(40 + it.y * (R + 9) + 3.5).toFixed(1)}" opacity="${o}">${it.name}</text>`;
    }
    giz.innerHTML = html;
  }

  /* ---------- tema ---------- */
  const clay = new THREE.Color();
  function applyTheme() {
    const cs = getComputedStyle(document.documentElement), get = (k, d) => cs.getPropertyValue(k).trim() || d;
    scene.fog.color.set(get('--fog', '#EEEEF2'));
    clay.set(get('--clay', '#DCDCE2'));
    built.setTheme({ ghost: get('--ghost', '#7C8AA5'), clay: get('--clay', '#DCDCE2'), dark: get('--bg1', '#fff').toLowerCase() === '#0a0a0c' });
    dirty();
  }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- laço ---------- */
  $('tags').addEventListener('click', (e) => { state.labels = !state.labels; e.currentTarget.setAttribute('aria-pressed', String(state.labels)); dirty(); });
  let prev = performance.now(), clock = 0, autoAt = 0, flashIds = [];
  const sv = new THREE.Vector3();
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
    const s = stp.list[stp.i], here = !!s && !app.classList.contains('fade');
    if (s && stp.playing && here) {
      if (stp.wait > 0) stp.wait -= dt * 1000;
      else {
        stp.t += sdt * 1000;
        if (stp.t >= s.dur) { stp.t = s.dur; stp.playing = false; stp.done = true; autoAt = stp.auto && stp.i < stp.list.length - 1 ? now + 1100 : 0; if (!autoAt) stp.auto = false; renderCtx(); }
      }
      needs = true;
    }
    if (autoAt && now >= autoAt) { autoAt = 0; if (stp.done && stp.auto) goStep(stp.i + 1, true); }
    const p = !s ? 0 : stp.done ? 1 : stp.t / s.dur;
    if (s) stBar.style.transform = `scaleX(${p.toFixed(4)})`;
    // animações que correm sozinhas (gotas do líquido, por exemplo) pedem quadros enquanto a subvista está aberta
    if (built.live(state.sub) && !document.hidden) { clock += sdt; needs = true; }
    nav.step(dt);
    controls.update();
    if (stage().focus(selSet(), test.on() ? null : state.hover, flashIds, dt, clay, reduce)) needs = true;
    if (labelsAt && now >= labelsAt && !app.classList.contains('fade')) { doLabels(); needs = true; }
    if (!needs) return;
    needs = false;
    flashIds = built.animate(state.sub, s && (stp.t > 0 || stp.done || stp.playing) ? s.id : null, p, clock, selSet()) || [];
    const d = camera.position.distanceTo(controls.target);
    scene.fog.near = d * 0.85; scene.fog.far = d * 3.4;
    // luz presa à câmera
    camera.updateMatrixWorld();
    sun.position.copy(camera.position).add(sv.set(-0.5, 0.75, 0.25).transformDirection(camera.matrixWorld).multiplyScalar(d)); sun.target.position.copy(controls.target);
    rim.position.copy(controls.target).add(sv.set(0.7, 0.2, -1).transformDirection(camera.matrixWorld).multiplyScalar(d)); rim.target.position.copy(controls.target);
    stage().beforeRender(camera);
    renderer.render(scene, camera);
    layoutLabels();
    drawGizmo();
  }

  three = {
    dirty, resize, repane, goCard, enter, openStep, scene: built,
    cut: () => { built.cut(state.sub, { plane: state.plane, cut: state.cut }); dirty(); },
    relabel,
    view: (v, instant) => goTo(v, instant),
  };
  applyTheme();
  const s0 = stages.enc; controls.minDistance = s0.dist[0]; controls.maxDistance = s0.dist[1];
  if (window.ResizeObserver) new ResizeObserver(resize).observe(app);
  window.addEventListener('resize', resize);
  phone.addEventListener('change', () => { if (phone.matches) sheet.to('peek'); else app.style.removeProperty('--sheet'); setTimeout(resize, 60); });
  resize();
  requestAnimationFrame(frame);
  // monta os outros palcos aos poucos, quando ninguém está mexendo na cena
  let lastInput = performance.now();
  for (const ev of ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart']) window.addEventListener(ev, () => { lastInput = performance.now(); }, { passive: true });
  (function prebuild() {
    const todo = built.pending(); if (!todo.length) return;
    const run = () => { if (performance.now() - lastInput > 1500 && !fly && !stp.playing && !document.hidden && !app.classList.contains('fade')) { built.ensure(todo[0]); const st = stages[todo[0]]; if (st && !st.group.parent) { st.group.visible = false; scene.add(st.group); } } prebuild(); };
    setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(run, { timeout: 3000 }) : run()), 900);
  })();
}
start3D();
void LANG; void EN;
