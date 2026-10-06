// O palco principal: o encéfalo. Peças de malha anatômica (malhas.js) e peças desenhadas por código para o que o
// conjunto de malhas não traz. Aqui também ficam as subvistas do Atlas, dos Cortes, de Em volta e das Vias que usam
// este palco: cada uma diz quais camadas aparecem, onde passa o plano de corte e de onde a câmera olha.
// Coordenadas em cm: X = esquerda da pessoa, Y = cima, Z = frente. Plano mediano em X = 0.
import * as THREE from 'three';
import { Stage, V, ready } from './palco.js';
import { partGeometry, isMidline } from './malhas.js';
import { tube, curveOf, place, ovalTube, blob } from './geo.js';
import { PARTS, mapOf, NAT, CAP_NAT, VIVID } from './partes.js';
import { BY_ID } from './data.js';
import { LINHAS } from './linhas.dados.js';
import { tr } from '../../comum/lang.js';
import { addNuclei } from './nucleos.js';

const mirrorGeo = (g) => { // espelha uma geometria desenhada por código para o lado direito
  const m = g.clone(), p = m.attributes.position, n = m.attributes.normal, ix = m.index.array;
  for (let i = 0; i < p.count; i++) { p.setX(i, -p.getX(i)); if (n) n.setX(i, -n.getX(i)); }
  for (let t = 0; t < ix.length; t += 3) { const a = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = a; }
  m.boundsTree = null; m.boundingBox = null; m.boundingSphere = null;
  return m;
};

export function buildBrain() {
  const T0 = performance.now();
  const st = new Stage('enc', { box: { c: V(0, 0.3, 0), hw: 9.4, hh: 8.3 }, dir: V(1, 0.07, 0.1), dist: [3.5, 130], nat: NAT, capNat: CAP_NAT, pulse: 0.17 });
  const byKey = {}; // chave|lado → peça
  const inst = (card, geo, o) => { const it = st.add(card, geo, o); byKey[it.key + '|' + it.side] = it; return it; };

  /* ---------- peças de malha ---------- */
  for (const [key, p] of Object.entries(PARTS)) {
    const map = mapOf(p);
    for (const side of isMidline(key) ? ['m'] : ['e', 'd'])
      inst(map.n[0], partGeometry(key, side === 'd' ? 'd' : 'e'), { key, side, layer: p.L, pri: p.pri, map, capCard: p.capCard });
  }
  /** Peça desenhada por código. pair: desenha também o espelho do lado direito. */
  const draw = (card, geo, o = {}) => {
    const out = [inst(card, geo, { key: o.key || card, side: o.pair ? 'e' : 'm', ...o })];
    if (o.pair) out.push(inst(card, mirrorGeo(ready(geo)), { key: o.key || card, ...o, side: 'd' }));
    return out;
  };
  const geoOf = (key, side = 'e') => byKey[key + '|' + (isMidline(key) ? 'm' : side)].geo;
  /** Ponto da superfície de uma peça atingido por um raio (coordenadas do palco), ou null. */
  const _r = new THREE.Ray();
  const hitOn = (keys, from, dir, side = 'e') => {
    let best = null; _r.origin.copy(from); _r.direction.copy(dir).normalize();
    for (const k of keys) { const h = geoOf(k, side).boundsTree.raycastFirst(_r, THREE.DoubleSide); if (h && (!best || h.distance < best.distance)) best = h; }
    return best;
  };

  /* ---------- bulbo e tracto olfatórios: correm por baixo do lobo frontal, ao lado da linha média ---------- */
  {
    const pts = [];
    for (const [x, z] of [[1.0, 2.75], [0.95, 3.6], [0.92, 4.6], [0.95, 5.6], [1.0, 6.5], [1.02, 7.15]]) {
      const h = hitOn(['orbital', 'frontal-sup'], V(x, -4, z), V(0, 1, 0));
      pts.push(V(x, (h ? h.point.y : -0.2) - 0.1, z));
    }
    const c = curveOf(pts);
    const g = ovalTube(c, 0.15, 0.065, { segs: 36, radial: 14 }); // fita achatada: o tracto
    const bp = c.getPointAt(0.88), bulb = blob(V(bp.x, bp.y - 0.03, bp.z), [0.24, 0.13, 0.55], null, 20);
    for (const geo of [g, bulb]) draw('bulbo-olfatorio', geo, { pair: true, layer: 'olf', pri: 3, map: { n: 'bulbo-olfatorio', o: 'telencefalo' } });
  }

  /* ---------- começo da medula espinhal: continua o bulbo para baixo ---------- */
  {
    const a = V(0, -7.35, -2.02), d = V(0, -0.923, -0.385), pts = [a, a.clone().addScaledVector(d, 1.4), a.clone().addScaledVector(d, 2.8)];
    const g = tube(pts, (t) => 0.6 - 0.05 * t, { radial: 22, segs: 14, capStart: true, capEnd: true });
    const p = g.attributes.position; // um pouco mais larga que funda, como a medula
    for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * 1.16);
    g.computeVertexNormals();
    draw('medula-espinhal', g, { layer: 'cord', pri: 2, map: { n: 'medula-espinhal', o: 'medula-espinhal' } });
  }

  /* ---------- pedúnculos cerebelares cortados: só aparecem quando o cerebelo é retirado ---------- */
  {
    const a = V(1.15, -2.9, -1.3), d = V(0.42, 0.1, -0.9).normalize(), b = a.clone().addScaledVector(d, 0.75), N = 28;
    const side = V().crossVectors(d, V(0, 1, 0)).normalize(), up = V().crossVectors(side, d).normalize();
    const ring = (c, k) => { const o = []; for (let i = 0; i < N; i++) { const t = (i / N) * Math.PI * 2; o.push(c.clone().addScaledVector(side, Math.cos(t) * 0.6 * k).addScaledVector(up, Math.sin(t) * 0.84 * k)); } return o; };
    const fromRings = (rings, fan) => { // toco de secção oval; fan = fecha a ponta com um leque plano (a face de corte)
      const pos = [], idx = []; for (const r of rings) for (const q of r) pos.push(q.x, q.y, q.z);
      for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < N; i++) { const p0 = r * N + i, p1 = r * N + ((i + 1) % N); idx.push(p0, p0 + N, p1, p1, p0 + N, p1 + N); }
      if (fan) for (let i = 1; i < N - 1; i++) idx.push(0, i, i + 1);
      const q = new THREE.BufferGeometry(); q.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); q.setIndex(idx); q.computeVertexNormals(); return q;
    };
    const g = fromRings([ring(a, 1.04), ring(a.clone().lerp(b, 0.5), 1.02), ring(b, 1)]);
    const cut = fromRings([ring(b, 1)], true);
    draw('pedunculo-cerebelar', g, { pair: true, layer: 'ped', pri: 2, cap: false });
    draw('pedunculo-cerebelar', cut, { pair: true, layer: 'ped', cap: false, mat: { shade: 'cut', color: '#F5ECD8' } });
  }

  addNuclei(st, { draw, hitOn, geoOf });
  const CORTEX = Object.keys(PARTS).filter((k) => PARTS[k].L === 'cx');

  /* ---------- sulcos e fissuras: linhas traçadas sobre a malha, visíveis quando a ficha é escolhida ---------- */
  st.marks = [];
  const mark = (id, pts, o = {}) => {
    const g = tube(curveOf(pts), o.r || 0.055, { radial: 8, segs: pts.length * 4, capStart: true, capEnd: true });
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: BY_ID[id].color, clippingPlanes: st.planes, toneMapped: false }));
    m.visible = false; m.renderOrder = 3; st.group.add(m); st.extras.push(m);
    const mid = curveOf(pts).getPointAt(o.at ?? 0.5); if (o.right) mid.x = -mid.x; // rótulo do lado direito (vista medial)
    st.marks.push({ id, mesh: m, pos: mid.clone().add(st.origin), n: o.n || mid.clone().sub(V(mid.x * 0.3, 2, 0)).normalize(), subs: o.subs || [] });
    if (o.pair) { const m2 = new THREE.Mesh(mirrorGeo(ready(g)), m.material); m2.visible = false; m2.renderOrder = 3; st.group.add(m2); st.extras.push(m2); st.marks.push({ id, mesh: m2, twin: true, subs: [] }); }
  };
  /* Sulco central e fissura lateral: traçado tirado da malha (scripts/linhas-encefalo.mjs). */
  const lineOf = (id) => LINHAS[id].filter((p) => p[0] > 0.9).map((p) => V(p[0], p[1], p[2]));
  mark('sulco-central', lineOf('sulco-central'), { pair: true, at: 0.42, subs: ['lateral', 'dorsal'] });
  mark('fissura-lateral', lineOf('fissura-lateral'), { pair: true, at: 0.55, subs: ['lateral'] });
  {
    // fissura longitudinal: por cima, na linha média, pouco abaixo da altura dos hemisférios
    const top = [];
    for (let z = 7.6; z >= -7.9; z -= 0.7) { const h = hitOn(CORTEX, V(0.45, 12, z), V(0, -1, 0)); if (h) top.push(V(0, h.point.y - 0.1, z)); }
    if (top.length > 3) mark('fissura-longitudinal', top, { at: 0.42, n: V(0, 1, 0), subs: ['dorsal'] });
    // fissura calcarina: a malha do lobo occipital é lisa na face medial; a linha segue a depressão rasa que há ali
    // (posição aproximada). O rótulo fica do lado direito, que é o que a vista medial mostra.
    const calc = [];
    for (const [y, z] of [[0.5, -4.6], [0.45, -5.3], [0.25, -6.1], [-0.3, -6.9], [-0.75, -7.6], [-0.9, -8.3]]) { const h = hitOn(['occipital', 'cingulo', 'parietal-sup'], V(-3, y, z), V(1, 0, 0)); if (h) calc.push(h.point.clone().add(V(-0.03, 0, 0))); }
    if (calc.length > 3) mark('fissura-calcarina', calc, { pair: true, at: 0.5, right: true, n: V(1, 0, 0), subs: ['medial'] });
  }

  /* ---------- subvistas ----------
     Cada subvista diz o estado de cada peça ('solid', 'ghost' ou 'hide'), o plano de corte e o enquadramento.
     As do Atlas ficam aqui; cortes.js, volta.js e vias.js acrescentam as dos outros módulos. */
  const TEL = new Set(['cx', 'wm', 'deep', 'plexo', 'olf']);
  const OFF = new Set(['nuc', 'ped', 'osso', 'men', 'art', 'nc', 'gust', 'via', 'vil']);
  const isTel = (it) => TEL.has(it.layer) || it.key === 'vent-lateral' || it.key === 'forame';
  const base = (it) => (OFF.has(it.layer) ? 'hide' : 'solid');
  const atlas = (it, o) => (it.layer === 'gust' && o.mode === 'a' ? 'solid' : base(it));
  const A = (s) => ({ atlas: true, ...s, states: s.states ? ((f) => (it, o) => f(it, o, atlas(it, o)))(s.states) : atlas });
  st.base = base; st.isTel = isTel;
  st.fallback = 'lateral';
  st.subs = {
    lateral: A({ view: { box: { c: V(0, 0.3, 0), hw: 9.3, hh: 8.4 }, dir: V(1, 0.07, 0.1) } }),
    medial: A({ states: (it, o, b) => (it.side === 'e' ? 'hide' : it.key === 'vent-terceiro' ? 'ghost' : b), clip: [V(-1, 0, 0), V(0.002, 0, 0)], view: { box: { c: V(0, 0.3, 0), hw: 9.3, hh: 8.4 }, dir: V(1, 0.05, 0.04) } }),
    ventral: A({ view: { box: { c: V(0, 0, 0.2), hw: 7.4, hh: 9.6 }, dir: V(0, -1, 0.02) } }),
    dorsal: A({ view: { box: { c: V(0, 0, 0), hw: 7.4, hh: 9.4 }, dir: V(0, 1, -0.02) } }),
    cerebelo: A({ states: (it, o, b) => (isTel(it) || it.layer === 'olho' || it.layer === 'opt' ? 'hide' : b), view: { box: { c: V(0, -3.0, -2.6), hw: 6.4, hh: 6.6 }, dir: V(0, 0.5, -1) } }),
    tronco: A({ states: (it, o, b) => (isTel(it) || it.layer === 'cb' || it.layer === 'olho' || it.layer === 'ven' ? 'hide' : it.layer === 'ped' ? 'solid' : b), view: { box: { c: V(0, -3.0, -1.0), hw: 4.4, hh: 6.2 }, dir: V(0, 0.42, -1) } }),
    dentro: A({ states: (it, o, b) => (['cx', 'wm', 'cb', 'olf'].includes(it.layer) ? 'ghost' : b), view: { box: { c: V(0, 0.2, 0), hw: 9.0, hh: 7.6 }, dir: V(1, 0.22, 0.42) } }),
  };
  st.subs.teste = { ...st.subs.lateral, atlas: false };
  st.mode$ = (mode) => st.setMode(mode, VIVID[mode] || []);
  /** Aplica uma subvista deste palco e devolve o enquadramento. o.reveal: chaves de peças (lado esquerdo) que viram
      contorno para mostrar o que cobrem. */
  st.enter = (id, o = {}) => {
    const s = st.subs[id] || st.subs[st.fallback];
    if (st.cur && st.cur !== s && st.cur.leave) st.cur.leave();
    st.cur = s; st.opts = o;
    const mode = (typeof s.mode === 'function' ? s.mode(o) : s.mode) || (s.atlas ? o.mode : 'n') || 'n';
    if (mode !== st.mode) st.mode$(mode);
    const rv = o.reveal;
    st.setStates((it) => { const v = s.states(it, o); return rv && it.side === 'e' && v === 'solid' && rv.includes(it.key) ? 'ghost' : v; });
    const clip = typeof s.clip === 'function' ? s.clip(o) : s.clip;
    if (clip) st.setClip(clip[0], clip[1]); else st.setClip(null);
    if (s.enter) s.enter(o);
    return typeof s.view === 'function' ? s.view(o) : s.view;
  };
  /* Em que modo de cor a ficha aparece: as áreas do córtex pedem o modo "Áreas"; o resto fica no modo atual, se
     alguma peça responde por ela ali. */
  st.homeOf = (id, sub, ids) => {
    const s = st.subs[sub]; if (!s || !s.atlas) return null;
    if (BY_ID[id].g === 'areas') return { mode: 'a' };
    if (LOBES.has(id)) return { mode: 'l' }; // o lobo inteiro em uma cor só
    const has = (m) => st.insts.some((it) => (it.map[m] || it.map.n).some((c) => ids.includes(c)));
    if (has(st.mode)) return { mode: st.mode };
    for (const m of ['n', 'l', 'a', 'o']) if (has(m)) return { mode: m };
    return null;
  };
  const LOBES = new Set(['lobo-frontal', 'lobo-parietal', 'lobo-temporal', 'lobo-occipital']);
  st.frameOf = (ids) => { const m = st.marks.find((x) => !x.twin && ids.includes(x.id)); return m && !st.frame(ids) ? { t: m.pos.clone(), r: 3.4 } : null; };
  st.axes = { x: [tr('esq.', 'left'), tr('dir.', 'right')], y: ['dorsal', 'ventral'], z: ['anterior', 'posterior'] };
  st.draw = draw; st.geoOf = geoOf; st.hitOn = hitOn; st.byKey = byKey; st.stepViews = {};
  st.mode$('n');
  console.log('[t] encefalo', Math.round(performance.now() - T0));
  return st;
}

/* Fichas escondidas sob outras peças: ao escolher na lista, as peças que as cobrem viram contorno. */
const OPERCULO = ['frontal-inf', 'frontal-med', 'pre-central', 'pos-central', 'supramarginal', 'temporal-sup-a', 'temporal-sup-p', 'orbital'];
export const REVEAL = { insula: OPERCULO, 'cortex-gustatorio': OPERCULO };
export { mirrorGeo };
