// Controle da câmera pelo teclado e por um painel na cena, igual em todos os itens com modelo 3D.
// Complementa o OrbitControls, que só gira em volta de um ponto fixo e trava a roda no limite de zoom:
// aqui, mover leva a câmera junto com esse ponto, e aproximar no limite passa a andar para a frente.
// Assim dá para chegar ao outro lado do modelo sem depender só de arrastar.
//   setas: girar · Shift + setas ou A D Q E: mover · W S ou + −: frente e trás · 0: recentralizar
// O painel liga e desliga por um botão na barra de vistas e começa no canto inferior direito da cena.
// Dá para arrastá-lo pela borda; dois cliques nela o devolvem ao canto. Tudo fica guardado no navegador.
import * as THREE from 'three';
import { tr } from './lang.js';

const KEY = 'neurohub.nav', POS = 'neurohub.navPos';
const BELOW = ['toolbar', 'stepper', 'apcard', 'play', 'panes']; // o que mora embaixo da cena: o canto padrão fica acima disso
const ROT = 1.7, PAN = 0.9, ZOOM = 1.5; // por segundo: radianos; distâncias até o ponto de giro; fator (log) de aproximação
const NEAR = 1.25; // abaixo de minDistance × NEAR, aproximar vira andar para a frente

const svg = (d) => `<svg class="ic" viewBox="0 0 16 16"><path d="${d}"/></svg>`;
const ICON = {
  move: svg('M8 1.8v12.4M1.8 8h12.4M6 3.8l2-2 2 2M6 12.2l2 2 2-2M3.8 6l-2 2 2 2M12.2 6l2 2-2 2'),
  u: svg('M3.5 10 8 5.5l4.5 4.5'), d: svg('M3.5 6 8 10.5 12.5 6'), l: svg('M10 3.5 5.5 8l4.5 4.5'), r: svg('m6 3.5 4.5 4.5L6 12.5'),
  in: svg('M3.5 8h9M8 3.5v9'), out: svg('M3.5 8h9'),
  home: '<svg class="ic" viewBox="0 0 16 16"><circle cx="8" cy="8" r="4.6"/><circle cx="8" cy="8" r="1.1"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2"/></svg>',
};
const PAD = { orbit: { u: 'rotU', d: 'rotD', l: 'rotL', r: 'rotR' }, pan: { u: 'up', d: 'down', l: 'left', r: 'right' } };
const ARROWS = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r' };
const CODES = { KeyW: 'fwd', KeyS: 'back', KeyA: 'left', KeyD: 'right', KeyQ: 'down', KeyE: 'up', NumpadAdd: 'fwd', NumpadSubtract: 'back' };
const CHARS = { '+': 'fwd', '=': 'fwd', '-': 'back', _: 'back' };

/**
 * Liga o controle a uma cena. recenter() volta ao último enquadramento; bounds() diz até onde o ponto de giro
 * pode ir ({ c, r }), para ninguém se perder no vazio. A cada quadro, chame step(dt) antes de controls.update().
 * O controle avisa o OrbitControls com os mesmos eventos de um arrasto (start, change, end), então quem já
 * escuta esses eventos (para parar um voo da câmera ou redesenhar) não precisa de mais nada.
 */
export function initNav({ app, camera, controls, recenter, bounds }) {
  const canvas = controls.domElement, phone = window.matchMedia('(max-width: 900px)');
  const held = new Map(); // origem (tecla ou dedo) → ação
  let mode = 'orbit', moving = false;

  /* ---------- painel ---------- */
  const pad = document.createElement('div');
  pad.id = 'nav'; pad.className = 'glass'; pad.setAttribute('role', 'group'); pad.setAttribute('aria-label', tr('Controle da câmera', 'Camera controls'));
  const nb = (k, cls = '') => `<button type="button" class="nb ${cls}" data-k="${k}">${ICON[k]}</button>`;
  pad.innerHTML = `<div class="nav-grip" aria-hidden="true" title="${tr('Arraste para mover o painel. Dois cliques o devolvem ao canto.', 'Drag to move the panel. Double-click to send it back to the corner.')}"><span></span></div>
    <div class="nav-mode">
      <button type="button" data-mode="orbit" aria-pressed="true">${tr('Girar', 'Rotate')}</button>
      <button type="button" data-mode="pan" aria-pressed="false">${tr('Mover', 'Move')}</button></div>
    <div class="nav-pad">${nb('u', 'u')}${nb('l', 'l')}<button type="button" class="nb c" data-act="home" title="${tr('Recentralizar (0)', 'Recenter (0)')}" aria-label="${tr('Recentralizar', 'Recenter')}">${ICON.home}</button>${nb('r', 'r')}${nb('d', 'd')}</div>
    <div class="nav-z">${nb('out')}<button type="button" class="nb help" data-act="help" aria-expanded="false" aria-controls="navHelp" title="${tr('Atalhos', 'Shortcuts')}" aria-label="${tr('Atalhos de teclado', 'Keyboard shortcuts')}">?</button>${nb('in')}</div>
    <div class="nav-help glass" id="navHelp" hidden>
      <h3>${tr('Teclado', 'Keyboard')}</h3>
      <dl>
        <div><dt><kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd></dt><dd>${tr('girar', 'rotate')}</dd></div>
        <div><dt><kbd>Shift</kbd> + ${tr('setas', 'arrows')}</dt><dd>${tr('mover', 'move')}</dd></div>
        <div><dt><kbd>A</kbd><kbd>D</kbd></dt><dd>${tr('esquerda, direita', 'left, right')}</dd></div>
        <div><dt><kbd>Q</kbd><kbd>E</kbd></dt><dd>${tr('descer, subir', 'down, up')}</dd></div>
        <div><dt><kbd>W</kbd><kbd>S</kbd> ${tr('ou', 'or')} <kbd>+</kbd><kbd>−</kbd></dt><dd>${tr('frente, trás', 'forward, back')}</dd></div>
        <div><dt><kbd>0</kbd></dt><dd>${tr('recentralizar', 'recenter')}</dd></div>
      </dl>
      <p>${tr('Mover leva junto o ponto em volta do qual a câmera gira. Bem perto, aproximar (pela roda também) passa a andar para a frente, em vez de travar.', 'Moving takes along the point the camera rotates around. Up close, zooming in (with the wheel too) starts moving forward instead of stopping.')}</p>
    </div>`;
  app.appendChild(pad);
  const help = pad.querySelector('#navHelp'), helpBtn = pad.querySelector('[data-act="help"]');
  const NAMES = {
    orbit: { u: tr('Girar para cima', 'Rotate up'), d: tr('Girar para baixo', 'Rotate down'), l: tr('Girar para a esquerda', 'Rotate left'), r: tr('Girar para a direita', 'Rotate right') },
    pan: { u: tr('Mover para cima', 'Move up'), d: tr('Mover para baixo', 'Move down'), l: tr('Mover para a esquerda', 'Move left'), r: tr('Mover para a direita', 'Move right') },
  };
  const ZNAMES = { in: tr('Aproximar (+)', 'Zoom in (+)'), out: tr('Afastar (−)', 'Zoom out (−)') };
  function setMode(m) {
    mode = m;
    for (const b of pad.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === m));
    for (const b of pad.querySelectorAll('[data-k]')) { const n = NAMES[m][b.dataset.k] || ZNAMES[b.dataset.k]; b.setAttribute('aria-label', n); b.title = n; }
  }
  setMode('orbit');
  const action = (k) => (k === 'in' ? 'fwd' : k === 'out' ? 'back' : PAD[mode][k]);
  /** A ajuda abre do lado do painel que tem espaço; sem espaço dos lados (celular), abre acima ou abaixo. */
  function showHelp(on) {
    help.hidden = !on; helpBtn.setAttribute('aria-expanded', String(on));
    if (!on) return;
    const a = app.getBoundingClientRect(), p = pad.getBoundingClientRect(), w = help.offsetWidth + 8;
    const low = p.top + p.height / 2 > a.top + a.height / 2, right = p.left + p.width / 2 > a.left + a.width / 2;
    const s = help.style; s.left = s.right = s.top = s.bottom = '';
    if (p.left - a.left >= w || a.right - p.right >= w) {
      if (p.left - a.left >= w && (right || a.right - p.right < w)) s.right = 'calc(100% + 8px)'; else s.left = 'calc(100% + 8px)';
      if (low) s.bottom = '0'; else s.top = '0';
    } else {
      if (right) s.right = '0'; else s.left = '0';
      if (low) s.bottom = 'calc(100% + 8px)'; else s.top = 'calc(100% + 8px)';
    }
  }

  pad.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-k]'); if (!b || e.button > 0) return;
    e.preventDefault(); // segurar o botão não tira o foco de onde estava nem seleciona texto
    const src = 'p' + e.pointerId;
    hold(src, action(b.dataset.k)); b.classList.add('on');
    try { b.setPointerCapture(e.pointerId); } catch { /* sem captura, o pointerup no próprio botão ainda solta */ }
    const up = () => { release(src); b.classList.remove('on'); for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.removeEventListener(ev, up); };
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, up);
  });
  pad.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.mode) setMode(b.dataset.mode);
    else if (b.dataset.act === 'home') recenter();
    else if (b.dataset.act === 'help') showHelp(help.hidden);
    else if (b.dataset.k && e.detail === 0) { hold('kb', action(b.dataset.k)); setTimeout(() => release('kb'), 220); } // Enter ou espaço no botão: um passo curto
  });
  pad.addEventListener('contextmenu', (e) => e.preventDefault());

  /* ---------- posição: canto inferior direito da cena, ou onde a pessoa arrastou ---------- */
  const visible = (el) => el && el.getClientRects().length > 0;
  let spot = null; // { fx, fy }: fração do espaço livre na tela, para valer em qualquer tamanho de janela
  try { const s = JSON.parse(localStorage.getItem(POS) || 'null'); if (s && isFinite(s.fx) && isFinite(s.fy)) spot = s; } catch { /* começa no canto */ }
  const gap = () => parseFloat(getComputedStyle(app).getPropertyValue('--pad')) || 16;
  const room = () => ({ w: Math.max(0, app.clientWidth - pad.offsetWidth - 8), h: Math.max(0, app.clientHeight - pad.offsetHeight - 8) });
  function put(x, y) {
    const r = room();
    x = Math.max(4, Math.min(4 + r.w, x)); y = Math.max(4, Math.min(4 + r.h, y));
    pad.style.left = Math.round(x) + 'px'; pad.style.top = Math.round(y) + 'px';
    return { fx: r.w ? (x - 4) / r.w : 1, fy: r.h ? (y - 4) / r.h : 1 };
  }
  /** Canto padrão: borda direita da área livre (antes da ficha), no pé da tela, subindo o que for preciso
      para não cobrir a barra de vistas, o passo a passo, o gráfico ou a folha de baixo do celular. */
  function corner() {
    const a = app.getBoundingClientRect(), g = gap(), w = pad.offsetWidth, h = pad.offsetHeight;
    let right = a.width - g;
    if (!phone.matches) for (const id of ['inspector', 'gcard']) { const el = document.getElementById(id); if (visible(el)) right = Math.min(right, el.getBoundingClientRect().left - a.left - g); }
    const x = right - w;
    let y = a.height - g - h;
    const boxes = BELOW.map((id) => document.getElementById(id)).filter(visible).map((el) => el.getBoundingClientRect())
      .filter((b) => b.top + b.height / 2 > a.top + a.height / 2); // no celular a barra de vistas fica em cima e não conta
    for (let pass = 0, moved = true; moved && pass < 5; pass++) {
      moved = false;
      for (const b of boxes) {
        const l = b.left - a.left, t = b.top - a.top;
        if (x < l + b.width && x + w > l && y < t + b.height && y + h > t) { y = t - 8 - h; moved = true; }
      }
    }
    put(x, y);
  }
  function place() {
    if (pad.hidden) return;
    if (spot) { const r = room(); put(4 + spot.fx * r.w, 4 + spot.fy * r.h); } else corner();
    if (!help.hidden) showHelp(true);
  }
  // arrastar por qualquer parte do painel que não seja botão
  pad.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || e.target.closest('button, .nav-help')) return;
    e.preventDefault();
    const p = pad.getBoundingClientRect(), a = app.getBoundingClientRect(), dx = e.clientX - p.left, dy = e.clientY - p.top;
    pad.classList.add('dragging');
    try { pad.setPointerCapture(e.pointerId); } catch { /* sem captura, o arrasto para quando o ponteiro sai do painel */ }
    const move = (ev) => { spot = put(ev.clientX - dx - a.left, ev.clientY - dy - a.top); if (!help.hidden) showHelp(true); };
    const end = () => {
      pad.classList.remove('dragging');
      for (const [ev, f] of [['pointermove', move], ['pointerup', end], ['pointercancel', end]]) pad.removeEventListener(ev, f);
      if (spot) try { localStorage.setItem(POS, JSON.stringify(spot)); } catch { /* a posição vale só para esta visita */ }
    };
    for (const [ev, f] of [['pointermove', move], ['pointerup', end], ['pointercancel', end]]) pad.addEventListener(ev, f);
  });
  pad.addEventListener('dblclick', (e) => {
    if (e.target.closest('button, .nav-help')) return;
    spot = null; try { localStorage.removeItem(POS); } catch { /* nada guardado */ }
    place();
  });
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => place()); ro.observe(app); for (const id of BELOW) { const el = document.getElementById(id); if (el) ro.observe(el); } }
  window.addEventListener('resize', place);

  /* ---------- botão na barra de vistas ---------- */
  const tg = document.createElement('button');
  tg.type = 'button'; tg.className = 'tb icon'; tg.id = 'navTg'; tg.innerHTML = ICON.move;
  tg.setAttribute('aria-label', tr('Mostrar ou esconder o controle da câmera', 'Show or hide the camera controls')); tg.title = tr('Controle da câmera', 'Camera controls');
  const tags = document.getElementById('tags');
  tags.parentNode.insertBefore(tg, tags);
  let stored = null;
  try { stored = localStorage.getItem(KEY); } catch { /* sem armazenamento: vale o padrão */ }
  const show = (on, save) => {
    pad.hidden = !on; tg.setAttribute('aria-pressed', String(on));
    if (on) place(); else showHelp(false);
    if (save) try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* a escolha vale só para esta visita */ }
  };
  show(stored ? stored === 'on' : !phone.matches, false); // no celular, os dedos já movem a cena; o painel começa escondido
  tg.addEventListener('click', () => show(pad.hidden, true));

  /* ---------- teclado ---------- */
  const typing = (el) => el && el.closest && el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
    if (e.key === 'Escape' && !help.hidden) { showHelp(false); return; }
    if (e.key === '0' || e.key === 'Home') { e.preventDefault(); if (!e.repeat) recenter(); return; }
    const a = ARROWS[e.key] ? PAD[e.shiftKey ? 'pan' : 'orbit'][ARROWS[e.key]] : CODES[e.code] || CHARS[e.key];
    if (!a) return;
    e.preventDefault();
    hold('k' + e.code, a);
  });
  document.addEventListener('keyup', (e) => release('k' + e.code));
  const releaseAll = () => { held.clear(); for (const b of pad.querySelectorAll('.on')) b.classList.remove('on'); };
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
  document.addEventListener('pointerdown', (e) => { if (!help.hidden && !e.target.closest('#nav')) showHelp(false); });

  function hold(src, a) { held.set(src, a); }
  function release(src) { held.delete(src); }

  /* ---------- movimento ---------- */
  const off = new THREE.Vector3(), mv = new THREE.Vector3(), ax = new THREE.Vector3(), sph = new THREE.Spherical();
  /** Mantém o ponto de giro dentro dos limites da vista; a câmera vai junto. */
  function clampTarget() {
    const b = bounds(); if (!b) return;
    ax.copy(controls.target).sub(b.c);
    if (ax.length() > b.r) controls.target.copy(b.c).add(ax.setLength(b.r));
  }
  function step(dt) {
    if (!held.size) { if (moving) { moving = false; controls.dispatchEvent({ type: 'end' }); } return; }
    if (!moving) { moving = true; controls.dispatchEvent({ type: 'start' }); }
    const on = new Set(held.values()), n = (a, b) => (on.has(a) ? 1 : 0) - (on.has(b) ? 1 : 0);
    const t = controls.target;
    off.copy(camera.position).sub(t);
    // girar em volta do ponto, como no arrasto: → leva o modelo para a direita
    const yaw = n('rotR', 'rotL') * ROT * dt, pitch = n('rotU', 'rotD') * ROT * dt;
    if (yaw || pitch) {
      sph.setFromVector3(off);
      sph.theta -= yaw;
      sph.phi = Math.max(Math.max(0.02, controls.minPolarAngle), Math.min(Math.min(Math.PI - 0.02, controls.maxPolarAngle), sph.phi + pitch));
      off.setFromSpherical(sph);
    }
    // mover no plano da tela: câmera e ponto de giro andam juntos
    const r = off.length(), x = n('right', 'left'), y = n('up', 'down'), z = n('fwd', 'back');
    mv.set(0, 0, 0);
    camera.updateMatrixWorld();
    if (x) mv.addScaledVector(ax.setFromMatrixColumn(camera.matrixWorld, 0), x * PAN * r * dt);
    if (y) mv.addScaledVector(ax.setFromMatrixColumn(camera.matrixWorld, 1), y * PAN * r * dt);
    // frente e trás: aproxima do ponto; perto do limite, anda para a frente levando o ponto junto
    if (z) {
      const near = controls.minDistance * NEAR;
      if (z > 0 && r <= near * 1.001) mv.addScaledVector(ax.copy(off).normalize(), -r * ZOOM * dt);
      else off.setLength(Math.min(controls.maxDistance, Math.max(z > 0 ? near : 0, r * Math.exp(-z * ZOOM * dt))));
    }
    t.add(mv); clampTarget();
    camera.position.copy(t).add(off);
    controls.dispatchEvent({ type: 'change' });
  }

  /* ---------- roda do mouse no limite: anda na direção do cursor em vez de travar ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  canvas.addEventListener('wheel', (e) => {
    if (e.deltaY >= 0) return;
    const r = camera.position.distanceTo(controls.target);
    if (r > controls.minDistance * 1.08) return; // longe do limite, o OrbitControls cuida
    const px = -e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    const rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    mv.copy(ray.ray.direction).multiplyScalar(r * Math.min(0.5, px * 0.0016));
    off.copy(camera.position).sub(controls.target);
    controls.target.add(mv); clampTarget();
    camera.position.copy(controls.target).add(off);
    controls.dispatchEvent({ type: 'start' }); controls.dispatchEvent({ type: 'change' }); controls.dispatchEvent({ type: 'end' });
  }, { passive: true });

  return { step };
}
