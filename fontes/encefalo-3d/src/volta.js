// Módulo Em volta, no palco do encéfalo: crânio e meninges abertos em degraus, o caminho do líquido cerebrospinal,
// as artérias da base e os nervos cranianos. (O bloco ampliado das meninges é outro palco: camadas.js.)
// O crânio é malha anatômica. As meninges, o espaço subaracnóideo, as vilosidades, as artérias e os nervos III a XII
// são desenhados por código, com posição aproximada, porque o conjunto de malhas não os traz.
import * as THREE from 'three';
import { V } from './palco.js';
import { BY_ID } from './data.js';
import { PARTS, NERVOS } from './partes.js';
import { isMidline } from './malhas.js';
import { tube, curveOf, ball, rng } from './geo.js';
import { buildHull, hitter } from './casca.js';
import { ensureNerves } from './nervos.js';
import { ensureArteries } from './vasos.js';
import { tr } from '../../comum/lang.js';

const cosd = (a) => Math.cos((a * Math.PI) / 180);
const VENTRAL = { box: { c: V(0, -0.6, 0.4), hw: 7.4, hh: 8.6 }, dir: V(0, -1, 0.5), margin: true }; // de baixo e um pouco da frente: o tronco aparece de face
const ARTERIAS = ['art-vertebral', 'art-basilar', 'art-cerebelar-superior', 'art-cerebral-posterior', 'art-comunicante-posterior', 'art-carotida-interna', 'art-cerebral-media', 'art-cerebral-anterior', 'art-comunicante-anterior'];

export function addAround(st) {
  ensureNerves(st); ensureArteries(st);
  const t0 = performance.now();
  const C = V(0, 0.8, -0.6); // centro da casca
  const cortex = Object.keys(PARTS).filter((k) => PARTS[k].L === 'cx');
  const keys = Object.keys(PARTS).filter((k) => ['cx', 'cb', 'pon', 'bul', 'mes'].includes(PARTS[k].L));
  const hull = buildHull(hitter(keys.map((k) => st.geoOf(k)), keys.filter((k) => !isMidline(k)).map((k) => st.geoOf(k))), C);
  st.hull = hull;

  /* ---------- crânio e meninges ----------
     No conjunto de malhas o encéfalo encosta no osso. Para caber o desenho das meninges, com espessura exagerada,
     o crânio aparece 7% maior. O osso parietal esquerdo é retirado; por essa abertura, as meninges em degraus. */
  const GROW = 1.07;
  for (const it of st.insts) if (it.layer === 'osso') { it.mesh.scale.setScalar(GROW); it.mesh.position.copy(C).multiplyScalar(1 - GROW); }
  const W = st.byKey['osso-parietal|e'].geo.boundingBox.getCenter(V()).sub(C).normalize(); // eixo das janelas: o meio da abertura
  const win = (id, hole, limit) => ({ id, c: C, w: W, k: new THREE.Vector2(cosd(hole), limit == null ? -2 : cosd(limit)) });
  st.draw('dura-mater', hull.shell(0.46), { layer: 'men', cap: false, win: win('dura', 31), mat: { side: THREE.DoubleSide, rough: 0.8 } });
  st.draw('aracnoide', hull.shell(0.28), { layer: 'men', cap: false, win: win('arac', 22), mat: { side: THREE.DoubleSide, rough: 0.45, opacity: 0.66 } });
  // pia-máter: uma película colada ao córtex, que entra em cada sulco. Aparece na faixa entre a janela da aracnoide e o centro.
  const piaWin = win('pia', 12.5, 34);
  for (const k of cortex) st.add('pia-mater', st.geoOf(k), { key: 'pia-' + k, side: 'e', layer: 'men', cap: false, win: piaWin, lift: 0.03, mat: { shade: 'pia', offset: 2, clear: 0.8, rough: 0.28 } });
  const LOBOS = Object.fromEntries(['lobo-frontal', 'lobo-parietal', 'lobo-temporal', 'lobo-occipital', 'giro-pre-central', 'giro-pos-central', 'giro-temporal-superior'].map((k) => [k, 'encefalo']));
  st.subs.meninges = {
    states: (it) => (it.layer === 'osso' ? (it.key === 'osso-parietal' && it.side === 'e' ? 'hide' : 'solid') : it.layer === 'men' ? 'solid' : ['olho', 'opt', 'olf'].includes(it.layer) ? 'hide' : st.base(it)),
    view: { box: { c: V(0, 0.7, -0.3), hw: 9.6, hh: 8.8 }, dir: V(1, 0.62, 0.3), margin: true }, margin: true,
    only: new Set(['cranio', 'dura-mater', 'aracnoide', 'pia-mater', 'encefalo']), alias: LOBOS,
  };

  /* ---------- líquido cerebrospinal ---------- */
  // o espaço subaracnóideo: casca clara, translúcida, em volta do encéfalo
  st.draw('espaco-subaracnoideo', hull.shell(0.24), { layer: 'sas', cap: false, pick: false, label: false, see: true, mat: { shade: 'sas', glass: 0.1 } });
  // no alto, na linha média: o vaso que recebe o líquido (escuro) e as vilosidades aracnoides
  const topAt = (deg, off, x = 0) => hull.point(V(x, cosd(deg), Math.sin((deg * Math.PI) / 180)), off);
  { const pts = []; for (let a = -78; a <= 66; a += 9) pts.push(topAt(a, 0.62));
    st.draw('vilosidades-aracnoides', tube(curveOf(pts), 0.2, { radial: 12, segs: 48, capStart: true, capEnd: true }), { key: 'seio', layer: 'vil', cap: false, pick: false, label: false, see: true, mat: { shade: 'seio', color: '#3F4C86' } });
    const rnd = rng(11);
    for (let a = -62; a <= 52; a += 7.5) for (const s of [-1, 1]) st.draw('vilosidades-aracnoides', ball(0.1 + rnd() * 0.035, topAt(a + rnd() * 3, 0.36, s * (0.02 + rnd() * 0.012))), { key: 'vil', layer: 'vil', cap: false }); }

  /* gotas: cada uma percorre o caminho inteiro, do plexo corióideo às vilosidades, e recomeça */
  const N = 200, DROPS = 260, SEG = { lv: [0, 44], third: [44, 68], aq: [68, 88], v4: [88, 112], exit: [112, 128], sas: [128, 194], end: [194, 200] };
  const P = (a) => a.map((q) => V(q[0], q[1], q[2]));
  const LV = P([[2.5, -1.25, 2.12], [2.59, -0.9, 1.62], [3.01, -0.63, 0.81], [3.19, -0.47, 0.04], [3.11, -0.25, -0.81], [2.65, 0.23, -1.61], [2.55, 0.31, -2.38], [2.33, 0.55, -3.2], [2.2, 1.15, -2.9], [1.73, 1.55, -2.32], [1.38, 1.83, -1.55], [0.91, 2.17, -0.82], [0.65, 2.47, -0.04], [0.57, 2.48, 0.77], [0.55, 2.3, 1.35]]);
  const THIRD = P([[0.48, 1.99, 1.43], [0.28, 1.42, 1.43], [0.12, 1.15, 1.25], [0, 0.95, 0.95], [0, 0.65, 0.45], [0, 0.3, 0.0], [0, 0.09, -0.17]]);
  const AQ = P([[0, 0.09, -0.17], [0, -0.13, -0.32], [0, -0.44, -0.45], [0, -0.75, -0.54], [0, -1.05, -0.58], [0, -1.41, -0.61]]);
  const V4 = P([[0, -1.41, -0.61], [0, -1.88, -0.85], [0, -2.39, -1.25], [0, -2.9, -1.5], [0, -3.4, -1.45], [0, -3.9, -1.5]]);
  const EXIT_M = P([[0, -3.9, -1.5], [0, -4.3, -1.7], [0, -4.83, -2.26], [0, -5.15, -2.8], [0, -5.5, -3.35]]), EXIT_L = P([[0, -3.9, -1.5], [0.5, -4.0, -1.45], [1.2, -4.0, -1.35], [1.75, -4.05, -1.0], [2.3, -4.0, -0.4]]);
  const sample = (pts, n) => { const c = curveOf(pts), out = []; for (let i = 0; i < n; i++) out.push(c.getPointAt(i / (n - 1))); return out; };
  const slerp = (a, b, n, off) => { // sobre a casca, de uma direção à outra
    const da = a.clone().sub(C).normalize(), db = b.clone().sub(C).normalize(), q = new THREE.Quaternion().setFromUnitVectors(da, db), qi = new THREE.Quaternion(), out = [];
    for (let i = 0; i < n; i++) { const d = da.clone().applyQuaternion(qi.identity().slerp(q, i / (n - 1))); out.push(hull.point(d, off)); }
    return out;
  };
  const rnd = rng(77), route = new Float32Array(DROPS * N * 3), birth = new Float32Array(DROPS), phase = new Float32Array(DROPS);
  const RAD = (i) => (i < 44 ? 0.24 : i < 52 ? 0.07 : i < 68 ? 0.1 : i < 88 ? 0.035 : i < 112 ? 0.3 * Math.sin(((i - 88) / 24) * Math.PI) + 0.05 : i < 128 ? 0.1 : 0.09);
  for (let k = 0; k < DROPS; k++) {
    const side = k % 2 ? -1 : 1, kind = rnd(), jit = V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(Math.cbrt(rnd()));
    const mir = (pts) => pts.map((p) => V(p.x * side, p.y, p.z));
    const lateralExit = kind < 0.42, down = kind > 0.92;
    const ex = lateralExit ? mir(EXIT_L) : EXIT_M, start = ex[ex.length - 1];
    const target = topAt(-58 + rnd() * 110, 0.14, side * (0.03 + rnd() * 0.02));
    let sas;
    if (down) { const a = V(0, -7.2, -2.0), d = V(0, -0.923, -0.385), n = V(0, 0.385, -0.923); sas = sample([start, a.clone().addScaledVector(d, -1.2).addScaledVector(n, 0.85), a.clone().addScaledVector(d, 1).addScaledVector(n, 0.8), a.clone().addScaledVector(d, 2.9).addScaledVector(n, 0.8)], 66); }
    else if (lateralExit) { const m = hull.point(V(side, 0.1 + rnd() * 0.3, -0.5 + rnd()), 0.14); sas = [...slerp(start, m, 33, 0.14), ...slerp(m, target, 33, 0.14)]; sas[0].copy(start); }
    else if (kind < 0.62) { const m = hull.point(V(side * (0.3 + rnd() * 0.5), -0.55, 0.75), 0.14); sas = [...slerp(start, m, 33, 0.14), ...slerp(m, target, 33, 0.14)]; }
    else sas = slerp(start, target, 66, 0.14);
    const end = down ? sample([sas[65], sas[65].clone().add(V(0, -0.3, -0.12))], 6) : sample([sas[65], sas[65].clone().sub(C).normalize().multiplyScalar(0.5).add(sas[65])], 6);
    const all = [...sample(mir(LV), 44), ...sample(mir(THIRD), 24), ...sample(AQ, 20), ...sample(V4, 24), ...sample(ex, 16), ...sas, ...end];
    for (let i = 0; i < N; i++) { const p = all[i], r = RAD(i); route.set([p.x + jit.x * r, p.y + jit.y * r, p.z + jit.z * r], (k * N + i) * 3); }
    birth[k] = 0.2 * rnd() * rnd(); phase[k] = rnd();
  }
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.095, 10, 8), new THREE.MeshLambertMaterial({ color: BY_ID.lcs.color, emissive: '#2F7FE0', emissiveIntensity: 0.7 }), DROPS);
  drops.frustumCulled = false; drops.visible = false; st.group.add(drops); st.extras.push(drops);
  const RANGE = { 'lcs-plexo': [0, 0.23], 'lcs-terceiro': [0.12, 0.35], 'lcs-aqueduto': [0.3, 0.47], 'lcs-quarto': [0.42, 0.6], 'lcs-saida': [0.54, 0.76], 'lcs-volta': [0.64, 1] };
  const m4 = new THREE.Matrix4(), LAP = 30; // segundos para uma gota fazer o caminho inteiro
  function flow(range, clock) {
    for (let k = 0; k < DROPS; k++) {
      const b = birth[k], u = b + ((clock / LAP + phase[k]) % 1) * (1 - b);
      let s = u > 0.97 ? (1 - u) / 0.03 : u < b + 0.012 ? (u - b) / 0.012 : 1;
      if (range && (u < range[0] || u > range[1])) s = 0;
      const f = u * (N - 1), i = Math.min(N - 2, Math.floor(f)), t = f - i, o = (k * N + i) * 3;
      m4.makeScale(s, s, s).setPosition(route[o] + (route[o + 3] - route[o]) * t, route[o + 1] + (route[o + 4] - route[o + 1]) * t, route[o + 2] + (route[o + 5] - route[o + 2]) * t);
      drops.setMatrixAt(k, m4);
    }
    drops.instanceMatrix.needsUpdate = true;
  }
  const WHOLE = { box: { c: V(0, 0.6, -0.3), hw: 9.6, hh: 8.9 }, dir: V(1, 0.24, 0.3), margin: true };
  st.subs.lcs = {
    states: (it) => (it.layer === 'ven' ? 'glass' : it.layer === 'plexo' || it.layer === 'vil' ? 'solid' : it.layer === 'sas' ? 'glass' : ['cx', 'wm', 'cb', 'mes', 'pon', 'bul', 'cord', 'olf'].includes(it.layer) ? 'ghost' : 'hide'),
    view: WHOLE, margin: true, live: true,
    only: new Set(['ventriculo-lateral', 'terceiro-ventriculo', 'aqueduto', 'quarto-ventriculo', 'canal-central', 'plexo-corioideo', 'vilosidades-aracnoides']),
    extra: () => [{ id: 'espaco-subaracnoideo', pos: hull.point(V(0.45, 0.8, 0.5), 0.24), rank: 12 }, { id: 'lcs', pos: V(0.6, 2.46, 0.4), rank: 12 }],
    // o contorno do encéfalo fica mais leve aqui, para os ventrículos e as gotas aparecerem
    enter: () => { drops.visible = true; st.ghost.uniforms.uGain.value = 0.5; flow(null, 0); }, leave: () => { drops.visible = false; st.ghost.uniforms.uGain.value = 1; },
    animate: (stepId, p, clock) => { flow(RANGE[stepId] || null, clock); return null; },
  };
  Object.assign(st.stepViews, {
    'lcs-plexo': { t: V(1.2, 0.9, -0.6), r: 6.4, dir: V(1, 0.3, 0.3) }, 'lcs-terceiro': { t: V(0.4, 1.2, 0.4), r: 4.6, dir: V(0.85, 0.45, 0.6) },
    'lcs-aqueduto': { t: V(0, -0.5, -0.3), r: 3.8, dir: V(1, 0.15, 0.25) }, 'lcs-quarto': { t: V(0, -3.6, -1.6), r: 4.6, dir: V(1, 0.1, -0.1) },
    'lcs-saida': { t: V(0, -4.0, -2.2), r: 5.6, dir: V(0.75, 0.1, -0.8) }, 'lcs-volta': { box: WHOLE.box, dir: V(1, 0.38, -0.25) },
  });

  /* ---------- artérias e nervos: a base do encéfalo, vista de baixo e um pouco da frente ---------- */
  st.subs.arterias = {
    states: (it) => (it.layer === 'art' ? 'solid' : it.layer === 'olho' ? 'hide' : st.base(it)), view: VENTRAL, margin: true, minArea: 8,
    only: new Set(ARTERIAS),
  };
  st.subs.nervos = {
    mode: 'v', states: (it) => (it.layer === 'nc' ? 'solid' : st.base(it)), view: VENTRAL, margin: true, minArea: 5,
    only: new Set(NERVOS), names: { 'nervo-optico': BY_ID['nervo-optico'].name },
  };
  /* Onde cada artéria se vê melhor: a cerebral média, de lado; a cerebral anterior, pela face medial (o hemisfério
     esquerdo vira contorno). */
  const LEFT = Object.keys(PARTS).filter((k) => !isMidline(k) && ['cx', 'wm', 'deep', 'die', 'ven', 'plexo'].includes(PARTS[k].L));
  const VIEW = { 'art-cerebral-media': { dir: V(1, -0.22, 0.3) }, 'art-cerebral-anterior': { dir: V(1, 0.14, 0.32), reveal: LEFT }, 'art-comunicante-anterior': { dir: V(0, -0.75, 1) } };
  const homeOf = st.homeOf;
  st.homeOf = (id, sub, ids, mode) => (sub === 'arterias' ? VIEW[id] || null : homeOf(id, sub, ids, mode));
  console.log('[t] em volta', Math.round(performance.now() - t0));
}
