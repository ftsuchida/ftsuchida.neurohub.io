// O palco principal: o encéfalo. Peças de malha anatômica (malhas.js) e peças desenhadas por código para o que o
// conjunto de malhas não traz. Aqui também ficam as subvistas do Atlas, dos Cortes, de Em volta e das Vias que usam
// este palco: cada uma diz quais camadas aparecem, onde passa o plano de corte e de onde a câmera olha.
// Coordenadas em cm: X = esquerda da pessoa, Y = cima, Z = frente. Plano mediano em X = 0.
import * as THREE from 'three';
import { Stage, V, ready } from './palco.js';
import { partGeometry, isMidline } from './malhas.js';
import { tube, curveOf, place, ovalTube, blob } from './geo.js';
import { PARTS, mapOf, NAT, CAP_NAT, VIVID, NERVOS } from './partes.js';
import { BY_ID } from './data.js';
import { LINHAS } from './linhas.dados.js';
import { tr } from '../../comum/lang.js';

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
    for (const geo of [g, bulb]) draw('bulbo-olfatorio', geo, { pair: true, layer: 'olf', pri: 3, map: { n: 'bulbo-olfatorio', o: 'telencefalo', v: 'nc-olfatorio' } }); // v: módulo dos nervos cranianos
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

  /* ---------- córtex gustatório: ponto marcado no alto da ínsula (região aproximada) ---------- */
  draw('cortex-gustatorio', blob(V(4.15, 2.75, 0.2), [0.14, 0.42, 0.5], [0, 0, 0.35]), { pair: true, layer: 'gust', pri: 2, cap: false, map: { n: 'cortex-gustatorio', o: 'telencefalo' } });
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
  const OFF = new Set(['ped', 'osso', 'men', 'art', 'nc', 'gust', 'via', 'vil', 'sas']);
  const isTel = (it) => TEL.has(it.layer) || it.key === 'vent-lateral' || it.key === 'forame';
  const base = (it) => (OFF.has(it.layer) || it.layer.startsWith('nuc') ? 'hide' : 'solid');
  const atlas = (it, o) => (it.layer === 'gust' && o.mode === 'a' ? 'solid' : base(it));
  /* Rótulos de cada vista no modo de cores Natural: os das figuras do apêndice e mais alguns que estão à vista.
     Nos outros modos de cor, os rótulos são os das fichas que o modo pinta. */
  const NAMES = {
    lateral: ['lobo-frontal', 'lobo-parietal', 'lobo-temporal', 'lobo-occipital', 'giro-pre-central', 'giro-pos-central', 'giro-temporal-superior', 'cerebelo', 'tronco-encefalico', 'bulbo-olfatorio', 'medula-espinhal'],
    medial: ['talamo', 'hipotalamo', 'pineal', 'tegmento', 'teto', 'ponte', 'bulbo', 'cerebelo', 'giro-do-cingulo', 'corpo-caloso', 'fornice', 'bulbo-olfatorio', 'quiasma-optico', 'aqueduto', 'quarto-ventriculo', 'canal-central', 'hipofise', 'septo-pelucido', 'medula-espinhal'],
    ventral: ['bulbo-olfatorio', 'quiasma-optico', 'nervo-optico', 'tracto-optico', 'hipotalamo', 'corpo-mamilar', 'mesencefalo', 'ponte', 'bulbo', 'lobo-frontal', 'lobo-temporal', 'cerebelo', 'hipofise', 'medula-espinhal', 'nervos-cranianos'],
    dorsal: ['lobo-frontal', 'lobo-parietal', 'lobo-occipital', 'giro-pre-central', 'giro-pos-central'],
    cerebelo: ['verme', 'hemisferio-cerebelar', 'medula-espinhal', 'bulbo', 'talamo', 'pineal', 'teto'],
    tronco: ['talamo', 'mesencefalo', 'ponte', 'bulbo', 'pineal', 'coliculo-superior', 'coliculo-inferior', 'pedunculo-cerebelar', 'medula-espinhal', 'tracto-optico'],
  };
  const CB = { 'hemisferio-cerebelar': 'cerebelo', verme: 'cerebelo' }, TETO = { 'coliculo-superior': 'teto', 'coliculo-inferior': 'teto' };
  const ALIAS = {
    lateral: { ...CB, ponte: 'tronco-encefalico', bulbo: 'tronco-encefalico', tegmento: 'tronco-encefalico' },
    medial: { ...CB, ...TETO }, ventral: { ...CB, tegmento: 'mesencefalo', ...Object.fromEntries(NERVOS.filter((k) => k.startsWith('nc-') && k !== 'nc-olfatorio').map((k) => [k, 'nervos-cranianos'])) }, cerebelo: TETO, tronco: { tegmento: 'mesencefalo' },
  };
  const natural = (o) => !o.mode || o.mode === 'n';
  const A = (id, s) => ({
    atlas: true, margin: true, ...s, view: { ...s.view, margin: true },
    states: s.states ? ((f) => (it, o) => f(it, o, atlas(it, o)))(s.states) : atlas,
    only: (o) => (natural(o) ? (NAMES[id] ? new Set(NAMES[id]) : null) : new Set(VIVID[o.mode])),
    alias: (o) => (natural(o) ? ALIAS[id] : null),
    extra: (o) => (natural(o) && s.extra ? s.extra(o) : []),
  });
  const onTop = (x, z) => { const h = hitOn(CORTEX, V(Math.abs(x), 12, z), V(0, -1, 0)); return V(x, h ? h.point.y : 7, z); };
  const v3 = byKey['vent-terceiro|m'].geo.boundingBox.getCenter(V());
  const floor4 = hitOn(['ponte', 'bulbo'], V(0.3, -3.5, -6), V(0, 0, 1));
  st.base = base; st.isTel = isTel;
  st.fallback = 'lateral';
  st.subs = {
    lateral: A('lateral', { view: { box: { c: V(0, 0.3, 0), hw: 9.3, hh: 8.4 }, dir: V(1, 0.07, 0.1) } }),
    medial: A('medial', { states: (it, o, b) => (it.side === 'e' ? 'hide' : it.key === 'vent-terceiro' ? 'ghost' : b), clip: [V(-1, 0, 0), V(0.002, 0, 0)], view: { box: { c: V(0, 0.3, 0), hw: 9.3, hh: 8.4 }, dir: V(1, 0.05, 0.04) },
      vivid: ['tegmento', 'coliculo-superior', 'coliculo-inferior', 'ponte', 'bulbo'], // o tronco em cores, como na figura do livro
      extra: () => [{ id: 'terceiro-ventriculo', pos: V(-0.02, v3.y + 0.2, v3.z), n: V(1, 0, 0), rank: 20 }] }),
    // de baixo e um pouco da frente, para o tronco encefálico aparecer de face; os tocos dos nervos cranianos entram aqui (nervos.js)
    ventral: A('ventral', { states: (it, o, b) => (it.layer === 'nc' ? 'solid' : b), view: { box: { c: V(0, -0.6, 0.4), hw: 7.4, hh: 8.6 }, dir: V(0, -1, 0.5) }, minArea: 10 }),
    dorsal: A('dorsal', { view: { box: { c: V(0, 0, 0), hw: 7.4, hh: 9.4 }, dir: V(0, 1, -0.02) },
      extra: () => [{ id: 'cerebro', text: tr('Hemisfério esquerdo', 'Left hemisphere'), pos: onTop(3.4, 4.6), n: V(0, 1, 0), rank: 25 }, { id: 'cerebro', text: tr('Hemisfério direito', 'Right hemisphere'), pos: onTop(-3.4, 4.6), n: V(0, 1, 0), rank: 25 }] }),
    cerebelo: A('cerebelo', { states: (it, o, b) => (isTel(it) || it.layer === 'olho' || it.layer === 'opt' ? 'hide' : b), view: { box: { c: V(0, -3.0, -2.6), hw: 6.4, hh: 6.6 }, dir: V(0, 0.5, -1) } }),
    tronco: A('tronco', { states: (it, o, b) => (isTel(it) || it.layer === 'cb' || it.layer === 'olho' || it.layer === 'ven' ? 'hide' : it.layer === 'ped' ? 'solid' : b), view: { box: { c: V(0, -3.0, -1.0), hw: 4.4, hh: 6.2 }, dir: V(0, 0.42, -1) },
      names: { 'pedunculo-cerebelar': tr('Pedúnculo cerebelar (seccionado)', 'Cerebellar peduncle (cut)') },
      extra: () => (floor4 ? [{ id: 'quarto-ventriculo', text: tr('Quarto ventrículo (assoalho)', 'Fourth ventricle (floor)'), pos: floor4.point.clone(), n: V(0, 0.3, -1).normalize(), rank: 20 }] : []) }),
    dentro: A('dentro', { states: (it, o, b) => (['cx', 'wm', 'cb', 'olf'].includes(it.layer) ? 'ghost' : b), view: { box: { c: V(0, 0.2, 0), hw: 9.0, hh: 7.6 }, dir: V(1, 0.22, 0.42) }, max: 18 }),
  };
  st.subs.teste = { ...st.subs.lateral, atlas: false, auto: false, margin: false, extra: null };
  st.vividOf = (mode) => VIVID[mode] || [];
  /* Em que modo de cor a ficha aparece: as áreas do córtex pedem o modo "Áreas"; o resto fica no modo atual, se
     alguma peça responde por ela ali. */
  st.homeOf = (id, sub, ids, mode) => {
    const s = st.subs[sub]; if (!s || !s.atlas) return null;
    if (BY_ID[id].g === 'areas') return { mode: 'a' };
    if (LOBES.has(id)) return { mode: 'l' }; // o lobo inteiro em uma cor só
    const has = (m) => st.insts.some((it) => (it.map[m] || it.map.n).some((c) => ids.includes(c)));
    const cur = ['n', 'l', 'a', 'o'].includes(mode) ? mode : 'n';
    return { mode: has(cur) ? cur : ['n', 'l', 'a', 'o'].find(has) || cur };
  };
  const LOBES = new Set(['lobo-frontal', 'lobo-parietal', 'lobo-temporal', 'lobo-occipital']);
  st.frameOf = (ids) => { const m = st.marks.find((x) => !x.twin && ids.includes(x.id)); return m && !st.frame(ids) ? { t: m.pos.clone(), r: 3.4 } : null; };
  st.axes = { x: [tr('esq.', 'left'), tr('dir.', 'right')], y: ['dorsal', 'ventral'], z: ['anterior', 'posterior'] };
  st.draw = draw; st.geoOf = geoOf; st.hitOn = hitOn; st.byKey = byKey; st.stepViews = {};
  st.setMode('n', []);
  console.log('[t] encefalo', Math.round(performance.now() - T0));
  return st;
}

/* Fichas escondidas sob outras peças: ao escolher na lista, as peças que as cobrem viram contorno. */
const OPERCULO = ['frontal-inf', 'frontal-med', 'pre-central', 'pos-central', 'supramarginal', 'temporal-sup-a', 'temporal-sup-p', 'orbital'];
export const REVEAL = { insula: OPERCULO, 'cortex-gustatorio': OPERCULO };
export { mirrorGeo };
