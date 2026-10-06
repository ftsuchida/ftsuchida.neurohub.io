// Controle da câmera pelo teclado e por um painel na cena, igual em todos os itens com modelo 3D.
// Complementa o OrbitControls, que só gira em volta de um ponto fixo e trava a roda no limite de zoom:
// aqui, mover leva a câmera junto com esse ponto, e aproximar no limite passa a andar para a frente.
// Assim dá para chegar ao outro lado do modelo sem depender só de arrastar.
//   setas: girar · Shift + setas ou A D Q E: mover · W S ou + −: frente e trás · 0: recentralizar
// O painel liga e desliga por um botão na barra de vistas; a escolha fica guardada no navegador.
import * as THREE from 'three';
import { tr } from './lang.js';

const KEY = 'neurohub.nav';
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
  pad.innerHTML = `<div class="nav-mode">
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
  const showHelp = (on) => { help.hidden = !on; helpBtn.setAttribute('aria-expanded', String(on)); };

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
    if (!on) showHelp(false);
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
