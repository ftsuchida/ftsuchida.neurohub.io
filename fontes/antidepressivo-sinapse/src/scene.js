import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { V, rng, curveOf, subCurve, tube, sleeve, organic, ball, place, lathe, Builder } from './geo.js';
import { BY_ID } from './data.js';
import { tr } from '../../comum/lang.js';

/* Tons secundários de cada estrutura. O tom "main" usa a cor da ficha. */
const MUTE = '#B4B8C2';
const SHADES = {
  'terminal|shell': { side: THREE.DoubleSide, clip: 'cut' },
  'terminal|inner': { color: '#DDE3FB', side: THREE.DoubleSide, clip: 'cut' },
  'pos|shell': { side: THREE.DoubleSide, clip: 'cut' },
  'pos|inner': { color: '#F7DDD0', side: THREE.DoubleSide, clip: 'cut' },
  'pos|shaft': { mute: 0.25 },
  'terminal|axon': { mute: 0.12 },
  'proteina-g|alpha': { color: '#3E9B4A' },
  'mitocondria|main': {},
};

const seg = (p, a, b) => Math.max(0, Math.min(1, (p - a) / (b - a)));
const ease = (x) => x * x * (3 - 2 * x);

export function buildScene() {
  let rnd = rng(21);
  const R = (a, b) => a + rnd() * (b - a);
  const builders = {};

  /* ---------- materiais ---------- */
  const clip = { cut: new THREE.Plane(V(0, 0, -1), 0.4) };
  const materials = new Map(), white = new THREE.Color('#ffffff');
  function materialFor(id, shade = 'main') {
    const key = id + '|' + shade;
    if (materials.has(key)) return materials.get(key);
    const o = SHADES[key] || {};
    const color = new THREE.Color(o.color || BY_ID[id].color);
    if (o.mute) color.lerp(new THREE.Color(MUTE), o.mute);
    const m = new THREE.MeshPhysicalMaterial({
      color, roughness: o.metal ? 0.32 : 0.56, metalness: o.metal ? 0.75 : 0,
      sheen: o.metal ? 0 : 0.45, sheenRoughness: 0.5, sheenColor: color.clone().lerp(white, 0.55),
      side: o.side || THREE.FrontSide,
    });
    if (o.clip) { m.clippingPlanes = [clip[o.clip]]; m.clipShadows = true; m.userData.clip = clip[o.clip]; }
    if (o.opacity != null) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; }
    m.userData.id = id; m.userData.base = color.clone(); m.userData.op = m.opacity; m.userData.g = 0; m.userData.e = 0;
    materials.set(key, m);
    return m;
  }
  const setTheme = () => {};

  const labels = [], home = {}, stages = {}, stepView = {};
  const L = (stage, text, id, pos, minPx = 0, kind = 'label', extra) => labels.push({ stage, text, id, pos, minPx, kind, ...extra });

  /* ---------- ajudantes ---------- */
  function makeStage(name, origin, o) {
    const group = new THREE.Group(); group.position.copy(origin);
    const st = { group, meshes: [], origin, animate: () => [], ...o };
    st.box = { ...o.box, c: o.box.c.clone().add(origin) };
    stages[name] = st;
    st.add = (B) => { st.meshes.push(...B.build(group, materialFor)); };
    // peça que se move ou muda de forma durante a animação
    st.live = (id, shade, geo, parent) => {
      const m = new THREE.Mesh(geo, materialFor(id, shade)); m.userData.id = id; m.castShadow = m.receiveShadow = !m.material.transparent;
      (parent || group).add(m); st.meshes.push(m); return m;
    };
    // pulsos amarelos: os potenciais de ação em trânsito
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0xfff3b0, toneMapped: false, fog: false });
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xffd65c, transparent: true, opacity: 0.3, depthTest: false, depthWrite: false, fog: false });
    st.pulses = [];
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(o.pulse, 18, 12), pulseMat), h = new THREE.Mesh(new THREE.SphereGeometry(o.pulse * 1.8, 18, 12), haloMat);
      m.add(h); m.visible = false; m.renderOrder = 9; h.renderOrder = 9; group.add(m); st.pulses.push(m);
    }
    st.hide = () => { for (const m of st.pulses) m.visible = false; };
    /** Trem de n pulsos ao longo da curva enquanto p vai de a até b. first = índice do primeiro pulso usado. */
    st.train = (curve, p, a, b, n = 3, first = 0, gap = 0.13) => {
      const q = ((p - a) / (b - a)) * (1 + (n - 1) * gap);
      for (let k = 0; k < n; k++) {
        const u = q - k * gap, m = st.pulses[first + k];
        if (u <= 0 || u >= 1) continue;
        m.position.copy(curve.getPointAt(u)); m.visible = true;
      }
    };
    return st;
  }
  const ringY = (rOut, rIn, h, n = 16) => {
    const sh = new THREE.Shape(); sh.absarc(0, 0, rOut, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); hole.absarc(0, 0, rIn, 0, Math.PI * 2, true); sh.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: n });
    g.rotateX(-Math.PI / 2); g.translate(0, -h / 2, 0);
    return toCreasedNormals(g, Math.PI / 5);
  };
  const ionsMesh = (st, id, n, r) => {
    const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 14, 10), materialFor(id), n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.castShadow = true; mesh.userData.id = id;
    st.group.add(mesh); st.meshes.push(mesh);
    return mesh;
  };
  const dummy = new THREE.Object3D();
  const setInst = (mesh, i, pos, s) => { dummy.position.copy(pos); dummy.scale.setScalar(Math.max(s, 0.0001)); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); };

  /* =====================================================================
     SINAPSE: o terminal serotoninérgico em cima, a fenda no meio e o
     neurônio pós-sináptico embaixo, os dois abertos em corte. A cena é
     uma só; as "vistas" são enquadramentos dela.

     A animação é uma função pura do tempo do episódio (te): um potencial
     de ação chega em te < 0, a serotonina sai em te = 0 e a fenda vai
     sendo limpa até te = E. Há um roteiro para cada condição, sem e com
     ISRS, sorteado uma vez só com semente fixa. Por isso dá para pausar,
     voltar e comparar as duas curvas.
     ===================================================================== */
  const E = 9; // duração do episódio, em segundos do modelo (sem escala)
  const st = makeStage('syn', V(0, 0, 0), { box: { c: V(0, -0.3, 0), hw: 2.8, hh: 3.5 }, dir: V(0.14, 0.1, 1), dist: [1.0, 60], shadow: 9, pulse: 0.24 });
  // o axônio é mais grosso que o pulso: o brilho precisa aparecer através dele
  st.pulses.forEach((m) => { m.material.depthTest = false; m.material.transparent = true; m.material.opacity = 0.96; m.children[0].material.opacity = 0.34; });
  const g = st.group, B = new Builder();

  /* ---------- terminal pré-sináptico ---------- */
  const preP = [[0, 0], [1.55, 0], [2.08, 0.14], [2.3, 0.68], [2.1, 1.34], [1.5, 1.95], [0.9, 2.36], [0.58, 2.9]];
  B.add('terminal', lathe(preP, { samples: 64, segs: 72 }), 'shell');
  B.add('terminal', lathe(preP.map((p, i) => [Math.max(0, p[0] - (i === 0 ? 0 : 0.13)), p[1] + (i < 2 ? 0.1 : 0)]), { samples: 64, segs: 72 }), 'inner');
  const axPts = [V(-5.4, 6.7, 0.25), V(-3.3, 5.05, 0.2), V(-1.45, 3.8, 0.08), V(-0.36, 3.14, 0), V(0, 2.84, 0)], axC = curveOf(axPts);
  B.add('terminal', tube(axC, (t) => 0.4 + 0.19 * t * t, { radial: 22, segs: 56, capStart: true }), 'axon');
  // zonas ativas, com as vesículas atracadas e os canais de Ca²⁺ ao lado
  const AZ = [-1.05, -0.35, 0.35, 1.05];
  AZ.forEach((x) => B.add('zona-ativa', place(new RoundedBoxGeometry(0.34, 0.08, 1.1, 2, 0.03), { p: V(x, 0.15, -0.25) })));
  const caAt = [-0.7, 0, 0.7].map((x) => V(x, 0.07, 0.12));
  const docks = []; AZ.forEach((x) => [-0.04, -0.52].forEach((z) => docks.push(V(x, 0.37, z))));
  // mitocôndrias, com a MAO na membrana externa
  const mitos = [{ c: V(-1.08, 1.12, -0.5), a: 0.95 }, { c: V(1.02, 1.36, -0.66), a: -0.7 }];
  const maoAt = [];
  for (const m of mitos) {
    B.add('mitocondria', place(new THREE.CapsuleGeometry(0.25, 0.72, 8, 20), { p: m.c, rot: [0, 0, m.a] }));
    const ax = V(-Math.sin(m.a), Math.cos(m.a), 0), side = V(Math.cos(m.a), Math.sin(m.a), 0);
    for (let k = 0; k < 6; k++) {
      const s = -0.36 + 0.144 * k, ang = (k % 2 ? 0.5 : -0.4) + 0.25 * Math.sin(k * 2.1);
      const p = m.c.clone().addScaledVector(ax, s).addScaledVector(side, Math.sin(ang) * 0.26).add(V(0, 0, Math.cos(ang) * 0.26));
      maoAt.push(p); B.add('mao', ball(0.062, p, [1.15, 0.85, 1], 10));
    }
  }
  // vesículas de reserva, soltas no citosol
  const reserve = [];
  const distSeg = (p, m) => { const ax = V(-Math.sin(m.a), Math.cos(m.a), 0), d = p.clone().sub(m.c), s = Math.max(-0.36, Math.min(0.36, d.dot(ax))); return d.addScaledVector(ax, -s).length(); };
  for (let i = 0, t = 0; i < 13 && t < 2000; t++) {
    const y = R(0.78, 2.05), rmax = 1.9 - Math.max(0, y - 0.9) * 1.12, a = R(0, Math.PI * 2), rr = Math.sqrt(rnd()) * rmax, p = V(Math.cos(a) * rr, y, Math.sin(a) * rr * 0.8 - 0.3);
    if (p.z > 0.12 || reserve.some((q) => q.distanceTo(p) < 0.42) || mitos.some((m) => distSeg(p, m) < 0.5)) continue;
    reserve.push(p); i++;
  }
  reserve.forEach((p) => B.add('vesicula', ball(0.18, p, null, 16)));

  /* ---------- neurônio pós-sináptico ---------- */
  const TOP = -0.62; // altura da membrana pós-sináptica; a fenda vai de TOP até 0
  const posP = [[0, TOP], [1.5, TOP], [1.98, TOP - 0.14], [2.14, TOP - 0.66], [1.9, TOP - 1.28], [1.25, TOP - 1.83], [0.66, TOP - 2.2], [0.52, TOP - 2.8]];
  B.add('pos', lathe(posP, { samples: 64, segs: 72 }), 'shell');
  B.add('pos', lathe(posP.map((p, i) => [Math.max(0, p[0] - (i === 0 ? 0 : 0.13)), p[1] - (i < 2 ? 0.1 : 0)]), { samples: 64, segs: 72 }), 'inner');
  B.add('pos', tube([V(-5.6, -4.05, -0.1), V(-2.6, -3.92, 0), V(0, -3.86, 0), V(2.6, -3.92, 0), V(5.6, -4.05, -0.1)], 0.62, { radial: 24, segs: 40, capStart: true, capEnd: true }), 'shaft');
  const recAt = []; [-0.95, -0.32, 0.32, 0.95].forEach((x) => [0.22, -0.42].forEach((z) => recAt.push(V(x, TOP - 0.04, z))));
  st.add(B);

  /* ---------- peças que se mexem ---------- */
  const vesGeo = ball(0.18, null, null, 18);
  const docked = docks.map((p) => { const m = st.live('vesicula', 'main', vesGeo); m.position.copy(p); return m; });
  const caGeo = ringY(0.115, 0.045, 0.22);
  const caCh = caAt.map((p) => { const m = st.live('canal-ca', 'main', caGeo); m.position.copy(p); return m; });
  // receptores, com a proteína G embaixo de cada um
  const recGeo = new THREE.CapsuleGeometry(0.115, 0.26, 6, 14), gA = ball(0.085, null, null, 12), gB = ball(0.066, null, null, 10), gC = ball(0.05, null, null, 10);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x8fc1ff, transparent: true, opacity: 0.34, depthWrite: false, fog: false });
  const recs = recAt.map((p) => {
    const body = st.live('receptor', 'main', recGeo); body.position.copy(p);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12), glowMat); glow.position.copy(p).add(V(0, 0.08, 0)); glow.visible = false; glow.renderOrder = 8; g.add(glow);
    const base = V(p.x, TOP - 0.37, p.z);
    const a = st.live('proteina-g', 'alpha', gA), b = st.live('proteina-g', 'main', gB), c = st.live('proteina-g', 'main', gC);
    b.position.copy(base).add(V(0.09, 0, 0.02)); c.position.copy(base).add(V(0.12, -0.085, -0.03));
    return { p, body, glow, a, base, top: V(p.x, p.y + 0.3, p.z) };
  });
  // transportadores de recaptação, na borda do piso do terminal, com a boca virada para a fenda
  const lobeGeo = new THREE.CapsuleGeometry(0.115, 0.34, 6, 14);
  const BLOCKED = [0, 1, 2, 4, 5]; // com o ISRS, só o transportador 3 continua livre
  const trans = [8, -30, -66, 172, 210, 246].map((deg) => {
    const th = (deg * Math.PI) / 180, cx = Math.cos(th), sz = Math.sin(th);
    const base = V(1.78 * cx, 0.07, 1.78 * sz), n = V(0.26 * cx, -0.965, 0.26 * sz).normalize(), tan = V(-sz, 0, cx);
    const grp = new THREE.Group(); grp.position.copy(base); grp.quaternion.setFromUnitVectors(V(0, 1, 0), n.clone().negate()); g.add(grp);
    const tl = tan.clone().applyQuaternion(grp.quaternion.clone().invert()); // direção de abertura, no referencial da peça
    const lobes = [-1, 1].map((s) => { const m = st.live('transportador', 'main', lobeGeo, grp); m.userData.s = s; return m; });
    return { base, n, tan, tl, grp, lobes, mouth: base.clone().addScaledVector(n, 0.3), inner: base.clone().addScaledVector(n, -0.5), ups: { off: [], on: [] } };
  });

  /* ---------- roteiro das moléculas (um por condição) ---------- */
  const N = docks.length * 5; // 5 moléculas desenhadas por vesícula atracada
  const CLEFT = { x: [-1.5, 1.5], y: [TOP + 0.14, -0.13], z: [-0.72, 0.3] };
  function schedule(cond, seed) {
    const r = rng(seed), U = (a, b) => a + r() * (b - a), expo = (mean) => -Math.log(1 - r() * 0.98) * mean;
    const way = () => V(U(CLEFT.x[0], CLEFT.x[1]), U(CLEFT.y[0], CLEFT.y[1]), U(CLEFT.z[0], CLEFT.z[1]));
    const on = cond === 'on';
    // 1. cada molécula: quando sai da vesícula e como deixa a fenda (recaptação, difusão, ou fica até o fim)
    const mols = [];
    for (let i = 0; i < N; i++) {
      const tr0 = U(0, 0.22), m = { i, tr0, exit: tr0 + 0.14, gone: Infinity, leave: Infinity, avail: tr0 + 0.95, binds: [], end: 'stay' };
      if (r() < (on ? 0.2 : 0.1)) { m.end = 'diff'; m.tEnd = on ? U(2.6, 8.4) : U(1.6, 3.4); m.leave = m.tEnd; m.gone = m.tEnd + 0.9; }
      else m.want = 1.25 + expo(on ? 2.6 : 0.85); // quando ela chegaria à boca de um transportador
      mols.push(m);
    }
    // os transportadores atendem uma molécula por vez; com o ISRS, só um continua livre
    const free = trans.map((_, j) => (on && BLOCKED.includes(j) ? Infinity : 1.2)), gapUp = on ? 0.95 : 0.42;
    for (const m of mols.filter((q) => q.want != null).sort((a, b) => a.want - b.want)) {
      let j = -1; for (let q = 0; q < trans.length; q++) if (free[q] !== Infinity && (j < 0 || free[q] < free[j])) j = q;
      const tu = Math.max(m.want, free[j]);
      if (tu >= E - 0.2) continue; // não deu tempo: continua na fenda
      free[j] = tu + gapUp; trans[j].ups[cond].push(tu);
      m.end = 'up'; m.up = { j, tu }; m.gone = tu; m.leave = tu - 0.5;
    }
    // 2. receptores: cada um vai sendo ocupado por quem estiver solto na fenda naquele momento
    const bind = recs.map(() => []), next = recs.map(() => U(1.15, 1.75));
    for (let guard = 0; guard < 4000; guard++) {
      let k = 0; for (let q = 1; q < recs.length; q++) if (next[q] < next[k]) k = q;
      const t0 = next[k]; if (t0 > E + 1) break;
      const dw = U(0.55, 1.05), cand = mols.filter((m) => m.avail <= t0 - 0.36 && t0 + dw + 0.45 <= m.leave);
      if (!cand.length) { next[k] = t0 + 0.3; continue; }
      const m = cand[Math.floor(r() * cand.length)];
      m.binds.push({ k, t0, t1: t0 + dw }); m.avail = t0 + dw + 0.76; bind[k].push([t0, t0 + dw]);
      next[k] = t0 + dw + U(0.15, 0.36);
    }
    // 3. o caminho de cada molécula, em quadros-chave
    for (const m of mols) {
      const dock = docks[Math.floor(m.i / 5)], K = [], key = (t, p, s = 1, w = 0) => K.push({ t, p, s, w });
      key(m.tr0, dock.clone().add(V(0, -0.1, 0)), 0);
      key(m.exit, V(dock.x + U(-0.1, 0.1), -0.11, dock.z + U(-0.08, 0.08)), 1);
      let here = way(); key(m.tr0 + 0.95, here, 1, 1);
      for (const b of m.binds) {
        key(b.t0 - 0.36, here, 1, 1); key(b.t0, recs[b.k].top, 1, 0); key(b.t1, recs[b.k].top, 1, 0);
        here = way(); key(b.t1 + 0.38, here, 1, 1);
      }
      if (m.end === 'up') {
        const T = trans[m.up.j], tu = m.up.tu;
        key(tu - 0.5, here, 1, 1); key(tu - 0.06, T.mouth, 1, 0); key(tu + 0.3, T.inner, 1, 0);
        if (r() < 0.62) { const v = reserve[Math.floor(r() * reserve.length)]; key(tu + 1.45, v.clone().add(V(0, 0, 0.19)), 0.9, 0); key(tu + 1.75, v, 0, 0); m.fate = 'ves'; }
        else { const q = maoAt[Math.floor(r() * maoAt.length)].clone().add(V(0, 0, 0.1)); key(tu + 1.45, q, 0.9, 0); key(tu + 1.95, q, 0, 0); m.fate = 'mao'; }
      } else if (m.end === 'diff') {
        const sx = here.x >= 0 ? 1 : -1;
        key(m.tEnd, here, 1, 1); key(m.tEnd + 1.5, V(sx * U(3.4, 4.2), U(TOP - 0.3, 0.1), U(-0.2, 0.9)), 0, 1);
      } else { key(E + 0.5, here, 1, 1); key(E + 1.5, way(), 1, 1); }
      K.sort((a, b) => a.t - b.t);
      m.K = K;
    }
    const count = (te) => { let c = 0; for (const m of mols) if (te >= m.exit && te < m.gone) c++; return c; };
    const bound = (te) => { let c = 0; for (const iv of bind) if (iv.some((v) => te >= v[0] && te < v[1])) c++; return c; };
    const curve = []; for (let t = 0; t <= E + 1e-6; t += 0.05) curve.push(count(t));
    return { mols, bind, count, bound, curve };
  }
  const SCH = { off: schedule('off', 4107), on: schedule('on', 9311) };

  /* ---------- partículas ---------- */
  const mol = ionsMesh(st, 'serotonina', N, 0.068);
  const ca = ionsMesh(st, 'calcio', 12, 0.05);
  const naBg = []; for (let i = 0; i < 12; i++) { const s = i % 2 ? 1 : -1; naBg.push({ p: V(s * R(2.3, 3.5), R(TOP - 0.25, 0.2), R(-0.3, 0.9)), ph: R(0, 6.3), f: R(0.6, 1.2) }); }
  const na = ionsMesh(st, 'sodio', naBg.length + N * 2, 0.034);
  // o fármaco: 5 moléculas que se encaixam nos transportadores e mais algumas soltas por perto
  const drugGeo = new THREE.CapsuleGeometry(0.078, 0.15, 6, 14);
  const drug = new THREE.InstancedMesh(drugGeo, materialFor('isrs'), BLOCKED.length + 5);
  drug.instanceMatrix.setUsage(THREE.DynamicDrawUsage); drug.frustumCulled = false; drug.castShadow = true; drug.userData.id = 'isrs'; g.add(drug); st.meshes.push(drug);
  const drugFrom = BLOCKED.map((j) => { const T = trans[j], s = T.base.x >= 0 ? 1 : -1; return T.mouth.clone().add(V(s * R(2.2, 3.0), R(-0.7, 0.5), R(0.5, 1.1))); });
  const drugLoose = []; for (let i = 0; i < 5; i++) { const s = i % 2 ? 1 : -1; drugLoose.push({ p: V(s * R(2.5, 3.6), R(TOP - 0.5, 0.45), R(-0.2, 0.9)), ph: R(0, 6.3), f: R(0.5, 1.0) }); }
  const UPQ = new THREE.Quaternion(), pos = V(), tmpA = V(), tmpB = V();

  const bell = (u) => (u <= 0 || u >= 1 ? 0 : ease(Math.min(1, Math.min(u, 1 - u) * 4)));
  /** Posição e tamanho da molécula m no instante te, interpolando o roteiro dela. */
  function at(m, te, out) {
    const K = m.K;
    if (te <= K[0].t) { out.copy(K[0].p); return 0; }
    const last = K[K.length - 1];
    let a = last, b = last, u = 0;
    for (let k = 0; k < K.length - 1; k++) if (te < K[k + 1].t) { a = K[k]; b = K[k + 1]; u = ease((te - a.t) / Math.max(1e-6, b.t - a.t)); break; }
    out.lerpVectors(a.p, b.p, u);
    const w = a.w + (b.w - a.w) * u, ph = m.i * 1.713;
    if (w > 0) { out.x += w * 0.12 * Math.sin(te * 2.1 + ph); out.y += w * 0.05 * Math.sin(te * 2.9 + ph * 2.3); out.z += w * 0.1 * Math.sin(te * 1.6 + ph * 0.7); }
    out.y = Math.min(out.y, te < m.gone ? -0.07 : 9); // dentro da fenda, nunca atravessa a membrana de cima
    return a.s + (b.s - a.s) * u;
  }

  let cur = { te: null, cond: 'off', d: 0 }; // último quadro aplicado (os rótulos consultam)
  /**
   * Aplica um quadro: te = tempo do episódio (null = repouso), cond = roteiro ('off' sem ISRS, 'on' com),
   * d = quanto do fármaco já se encaixou (0 a 1). time = relógio da cena, para o vaivém das partículas soltas.
   */
  st.apply = (fs, time) => {
    cur = fs;
    const te = fs.te, S = SCH[fs.cond] || SCH.off, live = te != null;
    st.hide();
    if (live) st.train(axC, te, -1.65, -0.5, 3);
    // canais e Ca²⁺
    const open = live ? ease(seg(te, -0.6, -0.42)) * (1 - ease(seg(te, 0.1, 0.4))) : 0;
    caCh.forEach((m) => m.scale.set(1 + 0.3 * open, 1, 1 + 0.3 * open));
    for (let k = 0; k < 12; k++) {
      const c = caAt[k % caAt.length], lag = (k % 4) * 0.08 + (k % 3) * 0.02, u = live ? seg(te, -0.5 + lag, 0.02 + lag) : 0;
      pos.set(c.x + 0.05 * Math.sin(k * 2.4), -0.34 + 0.95 * u, c.z + 0.04 * Math.cos(k * 1.7) - 0.25 * u);
      setInst(ca, k, pos, bell(u));
    }
    ca.instanceMatrix.needsUpdate = true;
    // vesículas atracadas: fundem-se na liberação e voltam recicladas
    const vs = !live || te < 0 ? 1 : te < 0.28 ? 1 - ease(te / 0.28) : te < 5.2 ? 0 : ease(seg(te, 5.2, 6.4));
    docked.forEach((m, k) => { m.scale.set(Math.max(vs, 0.001) * (1 + 0.25 * (1 - vs)), Math.max(vs, 0.001), Math.max(vs, 0.001)); m.position.y = docks[k].y - 0.2 * (1 - vs); m.visible = vs > 0.01; });
    // serotonina
    for (const m of S.mols) { const s = live ? at(m, te, pos) : 0; setInst(mol, m.i, pos, s); }
    mol.instanceMatrix.needsUpdate = true;
    // receptores e proteína G
    recs.forEach((r, k) => {
      let b = 0; if (live) for (const v of S.bind[k]) b = Math.max(b, ease(seg(te, v[0] - 0.08, v[0] + 0.12)) * (1 - ease(seg(te, v[1] - 0.05, v[1] + 0.2))));
      r.glow.visible = b > 0.04; r.glow.scale.setScalar(0.7 + 0.3 * b);
      r.body.scale.set(1 + 0.16 * b, 1, 1 + 0.16 * b);
      r.a.position.set(r.base.x - 0.075 - 0.24 * b, r.base.y - 0.07 * b, r.base.z + 0.05 * b); r.a.scale.setScalar(1 + 0.18 * b);
    });
    // transportadores: abrem quando uma molécula passa; com o fármaco na boca, ficam parados
    const d = Math.max(0, Math.min(1, fs.d || 0));
    trans.forEach((T, j) => {
      let o = 0; if (live) for (const tu of T.ups[fs.cond] || []) o = Math.max(o, bell((te - tu + 0.3) / 0.75));
      const gap = 0.108 + 0.05 * o;
      T.lobes.forEach((m) => m.position.copy(T.tl).multiplyScalar(gap * m.userData.s));
    });
    // Na⁺: os de fundo ficam fora; dois entram com cada molécula recaptada
    naBg.forEach((b, i) => { pos.set(b.p.x + 0.12 * Math.sin(time * b.f + b.ph), b.p.y + 0.09 * Math.sin(time * b.f * 1.3 + b.ph * 2), b.p.z); setInst(na, i, pos, 1); });
    for (const m of S.mols) {
      for (let k = 0; k < 2; k++) {
        let s = 0;
        if (live && m.up) {
          const T = trans[m.up.j], u = (te - m.up.tu + 0.34 - k * 0.09) / 0.7;
          s = bell(u);
          if (s > 0) pos.copy(T.mouth).lerp(T.inner, u).addScaledVector(T.tan, (k ? 0.085 : -0.085)).addScaledVector(T.n, 0.1 - 0.2 * u);
        }
        setInst(na, naBg.length + m.i * 2 + k, pos, s);
      }
    }
    na.instanceMatrix.needsUpdate = true;
    // fármaco
    BLOCKED.forEach((j, k) => {
      const T = trans[j], u = ease(seg(d, k * 0.11, k * 0.11 + 0.5));
      tmpA.copy(drugFrom[k]); tmpB.copy(T.mouth).addScaledVector(T.n, 0.03);
      dummy.position.lerpVectors(tmpA, tmpB, u); dummy.position.y += 0.35 * Math.sin(u * Math.PI) * (1 - u);
      dummy.quaternion.setFromUnitVectors(V(0, 1, 0), T.n).slerp(UPQ.set(0.3, 0.1, 0.2, 0.92).normalize(), 1 - u);
      dummy.scale.setScalar(ease(seg(d, k * 0.11 - 0.02, k * 0.11 + 0.12)));
      dummy.updateMatrix(); drug.setMatrixAt(k, dummy.matrix);
    });
    drugLoose.forEach((b, i) => {
      dummy.position.set(b.p.x + 0.14 * Math.sin(time * b.f + b.ph), b.p.y + 0.1 * Math.sin(time * b.f * 1.4 + b.ph * 2), b.p.z);
      dummy.quaternion.set(Math.sin(b.ph), Math.cos(b.ph * 1.3), 0.3, 0.8).normalize();
      dummy.scale.setScalar(ease(seg(d, 0.15 + i * 0.08, 0.5 + i * 0.08)));
      dummy.updateMatrix(); drug.setMatrixAt(BLOCKED.length + i, dummy.matrix);
    });
    drug.instanceMatrix.needsUpdate = true;
    dummy.quaternion.identity();
    return fs.flash || [];
  };

  /** Quadro de cada passo do roteiro: p vai de 0 a 1 dentro do passo. */
  const mix = (a, b, u) => a + (b - a) * u;
  st.stepFrame = (id, p) => {
    switch (id) {
      case 'chegada': return { cond: 'off', d: 0, te: mix(-1.7, -0.02, p), flash: p > 0.62 ? ['canal-ca'] : p > 0.08 && p < 0.5 ? ['terminal'] : [] };
      case 'liberacao': return { cond: 'off', d: 0, te: mix(-0.06, 1.25, p), flash: p < 0.3 ? ['vesicula'] : p < 0.6 ? ['serotonina'] : [] };
      case 'receptor': return { cond: 'off', d: 0, te: mix(1.0, 2.5, p), flash: p > 0.1 && p < 0.55 ? ['receptor'] : p >= 0.55 && p < 0.9 ? ['proteina-g'] : [] };
      case 'recaptacao': return { cond: 'off', d: 0, te: mix(1.2, 5.2, p), flash: p > 0.08 && p < 0.4 ? ['transportador'] : [] };
      case 'destino': return { cond: 'off', d: 0, te: mix(1.9, 6.6, p), flash: p > 0.15 && p < 0.45 ? ['vesicula'] : p > 0.5 && p < 0.8 ? ['mao'] : [] };
      case 'isrs': return { cond: 'on', d: ease(seg(p, 0.06, 0.88)), te: null, flash: p > 0.3 && p < 0.9 ? ['isrs'] : [] };
      case 'efeito': return { cond: 'on', d: 1, te: mix(-1.0, E, p), ghost: true, flash: p > 0.3 && p < 0.5 ? ['receptor'] : [] };
      case 'limites': return { cond: 'on', d: 1, te: E, ghost: true, flash: [] };
      default: return { cond: 'off', d: 0, te: null, flash: [] };
    }
  };
  st.animate = () => [];
  st.apply({ te: null, cond: 'off', d: 0 }, 0);

  /* ---------- rótulos e enquadramentos ---------- */
  const some = () => cur.te != null && SCH[cur.cond].count(cur.te) > 0;
  L('syn', tr('Terminal serotoninérgico', 'Serotonergic terminal'), 'terminal', V(-2.16, 1.25, 0.3), 0);
  L('syn', tr('Vesículas com serotonina', 'Vesicles with serotonin'), 'vesicula', reserve[0].clone().add(V(0, 0, 0.18)), 0);
  L('syn', tr('Zona ativa', 'Active zone'), 'zona-ativa', V(AZ[0], 0.17, 0.3), 15);
  L('syn', tr('Canal de Ca²⁺', 'Ca²⁺ channel'), 'canal-ca', caAt[2].clone().add(V(0, 0.1, 0.1)), 15);
  L('syn', tr('Mitocôndria', 'Mitochondrion'), 'mitocondria', mitos[1].c.clone().add(V(0.1, 0.2, 0.26)), 0);
  L('syn', 'MAO', 'mao', maoAt[2].clone(), 17);
  L('syn', tr('Transportador de recaptação', 'Reuptake transporter'), 'transportador', trans[0].base.clone().add(V(0.12, 0.12, 0.1)), 0);
  L('syn', tr('ISRS', 'SSRI'), 'isrs', trans[0].mouth.clone().addScaledVector(trans[0].n, 0.08), 0, 'label', { vis: () => cur.d > 0.6 });
  L('syn', tr('Serotonina', 'Serotonin'), 'serotonina', V(0.05, TOP + 0.32, 0.3), 0, 'label', { vis: some });
  L('syn', tr('Fenda sináptica', 'Synaptic cleft'), 'fenda', V(-2.05, TOP + 0.3, 0.35), 0);
  L('syn', tr('Receptor de serotonina', 'Serotonin receptor'), 'receptor', recAt[6].clone().add(V(0, 0.12, 0.1)), 0);
  L('syn', tr('Proteína G', 'G-protein'), 'proteina-g', V(recAt[0].x - 0.08, TOP - 0.39, recAt[0].z + 0.08), 15);
  L('syn', tr('Neurônio pós-sináptico', 'Postsynaptic neuron'), 'pos', V(2.0, TOP - 1.25, 0.3), 0);
  L('syn', 'Na⁺', 'sodio', naBg[0].p.clone(), 13);
  L('syn', tr('Axônio', 'Axon'), null, V(-3.0, 5.35, 0.5), 0, 'note');
  L('syn', tr('Dendrito', 'Dendrite'), null, V(2.9, -3.9, 0.7), 0, 'note');

  const dirC = V(0.1, 0.16, 1), dirT = V(0.42, 0.1, 1);
  const views = {
    syn: { box: st.box, dir: st.dir },
    cleft: { box: { c: V(0, -0.22, 0), hw: 2.75, hh: 1.5 }, dir: dirC },
    sert: { t: V(1.55, -0.02, 0.15), r: 1.35, dir: dirT },
  };
  Object.assign(home, {
    vesicula: { stage: 'syn', t: V(0, 0.9, 0), r: 1.7 },
    'zona-ativa': { stage: 'syn', t: V(0, 0.15, 0), r: 1.5, dir: dirC },
    'canal-ca': { stage: 'syn', t: caAt[1].clone(), r: 1.0, dir: dirC },
    calcio: { stage: 'syn', t: caAt[1].clone(), r: 1.1, dir: dirC },
    mitocondria: { stage: 'syn', t: V(0, 1.25, -0.4), r: 1.9 },
    mao: { stage: 'syn', t: mitos[0].c.clone(), r: 1.0 },
    serotonina: { stage: 'syn', t: V(0, TOP / 2, 0), r: 1.9, dir: dirC },
    fenda: { stage: 'syn', t: V(0, TOP / 2, 0), r: 2.1, dir: dirC },
    receptor: { stage: 'syn', t: V(0, TOP - 0.1, 0), r: 1.4, dir: dirC },
    'proteina-g': { stage: 'syn', t: V(recAt[0].x, TOP - 0.4, 0), r: 0.95, dir: V(0.1, -0.04, 1) },
    transportador: { stage: 'syn', ...views.sert },
    sodio: { stage: 'syn', ...views.sert },
    isrs: { stage: 'syn', ...views.sert },
  });
  Object.assign(stepView, {
    chegada: { box: { c: V(-0.75, 2.2, 0), hw: 3.5, hh: 3.2 }, dir: st.dir },
    liberacao: views.cleft,
    receptor: { box: { c: V(0, TOP - 0.12, 0), hw: 2.3, hh: 1.25 }, dir: V(0.08, 0.08, 1) },
    recaptacao: { t: V(1.45, 0.05, 0.1), r: 1.55, dir: dirT },
    destino: { box: { c: V(0, 0.95, 0), hw: 2.75, hh: 1.7 }, dir: V(0.1, 0.12, 1) },
    isrs: { t: V(1.7, -0.12, 0.15), r: 1.25, dir: dirT },
    efeito: views.cleft,
    limites: views.syn,
  });

  stages.syn.ids = new Set(st.meshes.map((m) => m.userData.id));
  const sim = { E, N, NR: recs.length, count: (cond, te) => (te == null ? 0 : SCH[cond].count(te)), bound: (cond, te) => (te == null ? 0 : SCH[cond].bound(te)), curve: { off: SCH.off.curve, on: SCH.on.curve }, dt: 0.05 };
  return { stages, labels, home, stepView, views, sim, materials, setTheme, ensure: () => null, stageOf: () => 'syn', pending: () => [] };
}
