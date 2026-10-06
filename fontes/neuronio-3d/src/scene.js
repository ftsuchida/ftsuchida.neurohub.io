import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { V, rng, curveOf, subCurve, tube, sleeve, organic, ball, place, rope, lathe, Builder } from './geo.js';
import { BY_ID } from './data.js';
import { tr } from '../../comum/lang.js';

/* Tons secundários de cada estrutura. O tom "main" usa a cor da ficha. */
const MUTE = '#B4B8C2';
const SHADES = {
  'citosol|main': { opacity: 0.3, wet: true },
  'extracelular|main': { opacity: 0.2, wet: true },
  'liquor|main': { opacity: 0.36, wet: true },
  'sangue|main': { opacity: 0.5, wet: true },
  'soma|shell': { side: THREE.DoubleSide, clip: 'soma' },
  'soma|inner': { color: '#E9E5FA', side: THREE.DoubleSide, clip: 'soma' },
  'soma|far': { mute: 0.5 },
  'nucleo|pore': { color: '#3D3796' },
  're-rugoso|main': { side: THREE.DoubleSide },
  're-rugoso|dot': { color: '#7A4BA6' },
  'mitocondria|main': { side: THREE.DoubleSide },
  'mitocondria|inner': { color: '#F8C6BF' },
  'membrana|in': { color: '#A9DFC3', box: true },
  'membrana|prot': { color: '#3C976F' },
  'cone|dot': { color: '#E5484D' },
  'cone|far': { mute: 0.5 },
  'nodulo|dot': { color: '#E5484D' },
  'dendritos|far': { mute: 0.5 },
  'espinhos|far': { mute: 0.45 },
  'axonio|far': { mute: 0.5 },
  'terminal|shell': { side: THREE.DoubleSide, clip: 'syn' },
  'terminal|inner': { color: '#FBD6DF', side: THREE.DoubleSide, clip: 'syn' },
  'terminal|dense': { color: '#B54C6C' },
  'terminal|far': { mute: 0.4 },
  'sinapse|halo': { opacity: 0.38 },
  'vesiculas|shell': { side: THREE.DoubleSide },
  'vesiculas|inner': { color: '#FBF0C8', side: THREE.DoubleSide },
  'fenda|main': { opacity: 0.16 },
  'canal-ca|ion': { color: '#2C8A7B' },
  'membrana|tail': { color: '#E7E3C2' },
  'canal-na|ball': { color: '#C2573B' },
  'capilar|main': { opacity: 0.4 },
  'capilar|rbc': { color: '#D8524E' },
  'soma|solid': {},
  'soma|tis': { mute: 0.36 },
  'dendritos|tis': { mute: 0.36 },
  'axonio|tis': { mute: 0.36 },
  'cone|tis': { mute: 0.36 },
  'terminal|tis': { mute: 0.15 },
  'schwann|nuc': { color: '#B56F57' },
  'ependimaria|main': { opacity: 0.5 },
  'ependimaria|nuc': { color: '#5C7594' },
};

/* Em qual vista fica o "ver de perto" de cada ficha (o que não está aqui fica na cena principal). */
const HOME_STAGE = {
  axon: ['membrana', 'microtubulo', 'neurofilamento', 'microfilamento'],
  syn: ['sinapse', 'vesiculas', 'neurotransmissor', 'granulos', 'zona-ativa', 'canal-ca', 'fenda', 'receptores'],
  glia: ['astrocito', 'oligodendrocito', 'microglia', 'schwann', 'ependimaria'],
  ap: ['canal-na', 'canal-k', 'canal-vaz', 'bomba', 'ion-na', 'ion-k', 'extracelular'],
  tissue: ['capilar', 'liquor', 'sangue'],
};

export function buildScene() {
  let rnd = rng(11), ap = null;
  const builders = {};
  const R = (a, b) => a + rnd() * (b - a);
  const rv = (s = 1) => V((rnd() - 0.5) * s, (rnd() - 0.5) * s, (rnd() - 0.5) * s);

  /* ---------- materiais ---------- */
  const clip = {
    soma: new THREE.Plane(V(0.18, 0.12, 1).normalize().negate(), 0.55),
    syn: new THREE.Plane(V(0, 0, -1), 0.45),
  };
  const materials = new Map();
  const white = new THREE.Color('#ffffff');
  function materialFor(id, shade) {
    const key = id + '|' + shade;
    if (materials.has(key)) return materials.get(key);
    const o = SHADES[key] || {};
    const color = new THREE.Color(o.color || BY_ID[id].color);
    if (o.mute) color.lerp(new THREE.Color(MUTE), o.mute);
    const m = new THREE.MeshPhysicalMaterial({
      color, roughness: 0.56, metalness: 0,
      sheen: 0.45, sheenRoughness: 0.5, sheenColor: color.clone().lerp(white, 0.55),
      side: o.side || THREE.FrontSide,
    });
    if (o.clip) { m.clippingPlanes = [clip[o.clip]]; m.clipShadows = true; m.userData.clip = clip[o.clip]; }
    if (o.opacity != null) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; }
    if (o.wet) { m.roughness = 0.14; m.sheen = 0; }
    m.userData.box = !!(o.box || o.clip); // recipiente: dá para ver o líquido de dentro pela abertura
    m.userData.id = id; m.userData.base = color.clone(); m.userData.op = m.opacity; m.userData.g = 0; m.userData.e = 0;
    materials.set(key, m);
    return m;
  }

  const labels = [], home = {}, stages = {};

  /* ---------- líquidos: volumes translúcidos e íons soltos, visíveis com o botão Líquidos ---------- */
  const rm = rng(909), RM = (a, b) => a + rm() * (b - a);
  const NA_C = new THREE.Color(BY_ID['ion-na'].color), K_C = new THREE.Color(BY_ID['ion-k'].color);
  /** n pontos; sample() devolve a posição ou null para tentar de novo; fracK = fração de K⁺ (o resto é Na⁺). */
  function scatter(n, sample, fracK) {
    const out = [];
    for (let i = 0, t = 0; i < n && t < n * 40; t++) { const p = sample(); if (!p) continue; out.push({ p, c: rm() < fracK ? K_C : NA_C }); i++; }
    return out;
  }
  let moteTex = null;
  function makeMotes(pts, size) {
    if (!moteTex) {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.beginPath(); x.arc(32, 32, 27, 0, Math.PI * 2); x.fill();
      moteTex = new THREE.CanvasTexture(c); moteTex.colorSpace = THREE.SRGBColorSpace;
    }
    const pos = new Float32Array(pts.length * 3), col = new Float32Array(pts.length * 3);
    pts.forEach((e, i) => { pos.set([e.p.x, e.p.y, e.p.z], i * 3); col.set([e.c.r, e.c.g, e.c.b], i * 3); });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    // com atenuação, o tamanho do ponto é medido em unidades da cena divididas por tan(fov/2)
    const mat = new THREE.PointsMaterial({ size: size / 0.268, map: moteTex, vertexColors: true, transparent: true, alphaTest: 0.5, opacity: 0.85, sizeAttenuation: true });
    // de longe, o ponto não encolhe abaixo de ~3 px, para o líquido continuar visível na vista inteira
    const minPx = (3.0 * Math.min(window.devicePixelRatio || 1, 2)).toFixed(1);
    mat.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <fog_vertex>', `#include <fog_vertex>\n\tgl_PointSize = max( gl_PointSize, ${minPx} );`); };
    return new THREE.Points(g, mat);
  }
  function addFluids(stage, FB, motes) {
    stage.fluids = FB ? FB.build(stage.group, materialFor) : [];
    for (const m of stage.fluids) { m.visible = false; m.renderOrder = 4; m.castShadow = m.receiveShadow = false; }
    if (motes) { motes.visible = false; stage.group.add(motes); }
    stage.motes = motes || null;
  }
  const L = (stage, text, id, pos, minPx = 0, kind = 'label', extra) => labels.push({ stage, text, id, pos, minPx, kind, ...extra });

  /* ---------- gerador de árvores (dendritos, glia) ---------- */
  function grow(B, id, shade, start, dir, len, r, depth, store, parent = -1, root = -1, o = {}) {
    const n = 5, pts = [start.clone()], d = dir.clone().normalize(), wob = o.wob || 0.42;
    let p = start.clone();
    for (let i = 1; i <= n; i++) {
      d.x += (rnd() - 0.5) * wob; d.y += (rnd() - 0.5) * wob; d.z += (rnd() - 0.5) * wob * (o.flat == null ? 0.7 : o.flat);
      d.normalize();
      p = p.clone().addScaledVector(d, len / n);
      pts.push(p);
    }
    const r1 = depth > 0 ? r * 0.7 : r * 0.34, curve = curveOf(pts);
    const flare = parent < 0 ? o.flare || 0 : 0;
    B.add(id, tube(curve, (t) => (r + (r1 - r) * t) * (1 + flare * Math.exp(-t * 7)), { radial: r > 0.25 ? 16 : r > 0.1 ? 10 : 7, segs: 14, capEnd: depth === 0 }), shade);
    if (depth > 0) B.add(id, ball(r1 * 1.02, p, null, 10), shade);
    const me = store.length;
    store.push({ curve, r0: r, r1, depth, parent, root: root < 0 ? me : root });
    if (depth > 0) {
      const k = rnd() < (o.three == null ? 0.28 : o.three) ? 3 : 2;
      for (let i = 0; i < k; i++) {
        const nd = d.clone().applyAxisAngle(rv().normalize(), R(0.4, 0.9));
        grow(B, id, shade, p, nd, len * R(0.72, 0.92), r1, depth - 1, store, me, root < 0 ? me : root, o);
      }
    }
    return me;
  }
  function spines(B, shade, store, maxDepth, density) {
    const heads = [];
    for (const s of store) {
      if (s.depth > maxDepth) continue;
      const n = Math.round(s.curve.getLength() * density);
      for (let i = 0; i < n; i++) {
        const t = R(0.08, 0.96), P = s.curve.getPointAt(t), T = s.curve.getTangentAt(t), r = s.r0 + (s.r1 - s.r0) * t;
        const nrm = rv(); nrm.addScaledVector(T, -nrm.dot(T)).normalize();
        B.add('espinhos', place(new THREE.CylinderGeometry(0.024, 0.03, 0.2, 5, 1), { p: P.clone().addScaledVector(nrm, r + 0.08), dir: nrm }), shade);
        const hp = P.clone().addScaledVector(nrm, r + 0.21);
        B.add('espinhos', ball(0.08, hp, null, 8), shade);
        heads.push(hp);
      }
    }
    return heads;
  }
  const dotsAlong = (curve, u0, u1, n, r, size = 0.055) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const u = R(u0, u1), P = curve.getPointAt(u), T = curve.getTangentAt(u), nr = rv();
      nr.addScaledVector(T, -nr.dot(T)).normalize();
      out.push(ball(size, P.addScaledVector(nr, typeof r === 'function' ? r(u) : r), null, 8));
    }
    return out;
  };
  function mito(B, pos, rot, r, len, cut) {
    if (!cut) { B.add('mitocondria', place(new THREE.CapsuleGeometry(r, len, 8, 20), { p: pos, rot })); return; }
    const prof = [];
    for (let k = 0; k <= 10; k++) { const a = -Math.PI / 2 + (k / 10) * (Math.PI / 2); prof.push(new THREE.Vector2(r * Math.cos(a), -len / 2 + r * Math.sin(a))); }
    for (let k = 0; k <= 10; k++) { const a = (k / 10) * (Math.PI / 2); prof.push(new THREE.Vector2(r * Math.cos(a), len / 2 + r * Math.sin(a))); }
    B.add('mitocondria', place(new THREE.LatheGeometry(prof, 28, 0, Math.PI * 1.25), { p: pos, rot }));
    for (let i = 0; i < 6; i++) {
      const g = new THREE.CylinderGeometry(r * 0.8, r * 0.8, 0.035, 20);
      g.translate((i % 2 ? 1 : -1) * r * 0.2, -len / 2 + ((i + 0.5) * len) / 6, 0);
      B.add('mitocondria', place(g, { p: pos, rot }), 'inner');
    }
  }
  /** Anel (ou setor de anel) extrudado ao longo de x, de x=0 a x=len. */
  function ringExtrude(rOut, rIn, len, a0 = 0, a1 = Math.PI * 2, n = 56) {
    const pts = [], full = a1 - a0 >= Math.PI * 2 - 1e-6;
    let sh;
    if (full) {
      sh = new THREE.Shape(); sh.absarc(0, 0, rOut, 0, Math.PI * 2, false);
      const h = new THREE.Path(); h.absarc(0, 0, rIn, 0, Math.PI * 2, true); sh.holes.push(h);
    } else {
      for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; pts.push(new THREE.Vector2(rOut * Math.cos(a), rOut * Math.sin(a))); }
      for (let i = n; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / n; pts.push(new THREE.Vector2(rIn * Math.cos(a), rIn * Math.sin(a))); }
      sh = new THREE.Shape(pts);
    }
    const g = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false, curveSegments: n });
    g.rotateY(Math.PI / 2);
    return toCreasedNormals(g, Math.PI / 5);
  }
  /** Mielina em espiral, extrudada ao longo de x. */
  function spiral(r0, pitch, thick, turns, len) {
    const N = Math.round(turns * 64), out = [], inn = [];
    for (let i = 0; i <= N; i++) {
      const th = (i / N) * turns * Math.PI * 2, r = r0 + (pitch * th) / (Math.PI * 2);
      out.push(new THREE.Vector2(r * Math.cos(th), r * Math.sin(th)));
      inn.push(new THREE.Vector2((r - thick) * Math.cos(th), (r - thick) * Math.sin(th)));
    }
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(out.concat(inn.reverse())), { depth: len, bevelEnabled: false, steps: 1 });
    g.rotateY(Math.PI / 2);
    return toCreasedNormals(g, Math.PI / 5);
  }

  /* =====================================================================
     CENA PRINCIPAL: neurônio, neurônio seguinte e glia do SNC
     ===================================================================== */
  const W = new Builder();
  const SR = 3.0;
  const somaShape = (v) => {
    const n = 1 + 0.045 * Math.sin(v.x * 1.1 + 0.5) * Math.sin(v.y * 1.3 + 1.2) + 0.035 * Math.sin(v.z * 1.7 + 2.1) * Math.sin(v.x * 0.9);
    v.set(v.x * n * 1.06, v.y * n, v.z * n * 0.96);
  };
  W.add('soma', organic(new THREE.SphereGeometry(SR, 80, 56), somaShape), 'shell');
  W.add('soma', organic(new THREE.SphereGeometry(SR - 0.17, 80, 56), somaShape), 'inner');

  // núcleo e poros
  const Nc = V(-0.35, 0.12, -0.1), NR = 1.1;
  W.add('nucleo', ball(NR, Nc, null, 48));
  for (let i = 0; i < 72; i++) {
    const y = 1 - (2 * (i + 0.5)) / 72, r = Math.sqrt(1 - y * y), a = i * 2.39996;
    const d = V(r * Math.cos(a), y, r * Math.sin(a));
    W.add('nucleo', place(ball(0.06, null, [1, 0.35, 1], 10), { p: Nc.clone().addScaledVector(d, NR), dir: d }), 'pore');
  }
  // RE rugoso: lâminas ao lado e atrás do núcleo, com ribossomos
  [[1.36, 2.75, 2.0, 0.6, 1.7], [1.54, 2.9, 2.2, 0.55, 1.75], [1.72, 2.65, 2.0, 0.7, 1.6], [1.9, 3.0, 1.9, 0.75, 1.5]].forEach((s) => {
    const g = new THREE.SphereGeometry(s[0], 48, 28, s[1], s[2], s[3], s[4]);
    g.translate(Nc.x, Nc.y, Nc.z);
    W.add('re-rugoso', g);
    for (let i = 0; i < 90; i++) {
      const ph = R(s[1], s[1] + s[2]), th = R(s[3], s[3] + s[4]), r = s[0] + (rnd() < 0.5 ? 0.035 : -0.035);
      W.add('re-rugoso', ball(0.042, V(Nc.x - r * Math.cos(ph) * Math.sin(th), Nc.y + r * Math.cos(th), Nc.z + r * Math.sin(ph) * Math.sin(th)), null, 6), 'dot');
    }
  });
  // Golgi: discos curvos empilhados, com vesículas
  const Gc = V(0.2, -1.95, 0.9), gRot = [0.5, 0.2, 0.25];
  for (let i = 0; i < 5; i++) {
    const a = 0.66 - i * 0.055, b = 0.44 - i * 0.03;
    const g = organic(new THREE.SphereGeometry(1, 36, 20), (v) => v.set(v.x * a, v.y * 0.06 + 0.24 * v.x * v.x * a + (i - 2) * 0.16, v.z * b));
    W.add('golgi', place(g, { p: Gc, rot: gRot }));
  }
  [[0.74, 0.18, 0.1], [-0.72, 0.05, 0.15], [0.62, -0.25, -0.2], [-0.55, 0.42, 0.25], [0.8, 0.5, 0.22], [0.1, 0.5, 0.36]].forEach((v) => W.add('golgi', place(ball(0.085, V(v[0], v[1], v[2]), null, 10), { p: Gc, rot: gRot })));
  // mitocôndrias (uma aberta, mostrando as dobras da membrana interna)
  const mitoShow = V(-1.3, -1.05, 1.5);
  mito(W, mitoShow, [0, 1.18, 1.0, 'ZYX'], 0.3, 0.82, true);
  [[0.9, 1.9, 1.0], [-1.9, -1.5, -0.3], [1.1, -2.2, -0.7], [-2.1, 1.1, -0.8], [1.9, 0.9, -1.4], [0.0, 2.2, -1.1]].forEach((v) => mito(W, V(v[0], v[1], v[2]), [R(0, 3), R(0, 3), R(0, 3)], 0.19, 0.5));
  // RE liso: rede de tubos
  const RLc = V(-1.2, 1.55, 1.2);
  [RLc, V(1.0, 1.7, -1.3)].forEach((c) => {
    for (let k = 0; k < 5; k++) {
      const pts = []; for (let i = 0; i < 5; i++) pts.push(c.clone().add(V(R(-0.45, 0.45), R(-0.45, 0.45), R(-0.3, 0.3))));
      W.add('re-liso', tube(pts, 0.075, { radial: 9, segs: 30, capStart: true, capEnd: true }));
    }
  });
  // ribossomos livres e polirribossomos
  const hDir = V(0.8, -0.6, 0).normalize(), polyAt = V(1.55, 1.25, 1.3);
  for (let n = 0, tries = 0; n < 110 && tries < 3000; tries++) {
    const p = rv().normalize().multiplyScalar(R(1.95, 2.6));
    if (p.dot(hDir) > 1.9 || p.distanceTo(Nc) < 2.0) continue;
    W.add('ribossomos', ball(0.04, p, null, 7)); n++;
  }
  [polyAt, V(-2.0, 0.2, 1.2), V(1.3, -1.0, 1.7)].forEach((c) => { for (let i = 0; i < 8; i++) W.add('ribossomos', ball(0.05, c.clone().add(V(Math.cos(i * 0.42) * 0.3, Math.sin(i * 0.42) * 0.3, i * 0.02)), null, 8)); });

  // dendritos e espinhos
  const dend = [];
  [[-1, 0.2, 0.1], [-0.6, 0.85, -0.25], [-0.65, -0.75, 0.2], [0.15, 1, -0.1], [-0.2, -1, -0.3], [-0.8, -0.25, -0.6], [0.8, 0.6, -0.35]].forEach((v) => {
    const d = V(v[0], v[1], v[2]).normalize();
    grow(W, 'dendritos', 'main', d.clone().multiplyScalar(2.82), d, 3.4, 0.44, 3, dend, -1, -1, { flare: 0.9 });
  });
  const spineHeads = spines(W, 'main', dend, 1, 2.3);

  // cone de implantação e axônio
  const hillPts = [2.7, 3.5, 4.4, 5.2].map((k) => hDir.clone().multiplyScalar(k));
  const hillR = (t) => 0.32 + 0.98 * Math.pow(1 - t, 2.0);
  const hillCurve = curveOf(hillPts);
  W.add('cone', tube(hillCurve, hillR, { radial: 28, segs: 30 }));
  const axCurve = curveOf([hillPts[3], V(6.4, -5.6, 0.2), V(8.4, -8.6, -0.2), V(10.6, -11.8, 0.2), V(12.6, -15.0, 0.1), V(14.4, -18.2, -0.2), V(16.4, -21.2, 0.1), V(18.6, -23.6, 0), V(19.8, -24.6, 0)]);
  const AXR = 0.32, SEG = [[0.075, 0.265], [0.295, 0.485], [0.515, 0.705], [0.735, 0.905]], NODES = [];
  W.add('axonio', tube(subCurve(axCurve, 0, SEG[0][0] + 0.012, 8), AXR, { radial: 16, segs: 16 }));
  W.add('axonio', tube(subCurve(axCurve, SEG[3][1] - 0.012, 1, 8), AXR, { radial: 16, segs: 16 }));
  SEG.forEach((s) => W.add('mielina', tube(subCurve(axCurve, s[0], s[1], 16), sleeve(AXR + 0.03, 0.78, 0.08), { radial: 24, segs: 54 })));
  for (let i = 0; i < SEG.length - 1; i++) {
    const u0 = SEG[i][1] - 0.012, u1 = SEG[i + 1][0] + 0.012;
    NODES.push((u0 + u1) / 2);
    W.add('nodulo', tube(subCurve(axCurve, u0, u1, 6), AXR, { radial: 16, segs: 10 }));
    W.add('nodulo', dotsAlong(axCurve, u0 + 0.016, u1 - 0.016, 14, AXR + 0.005, 0.045), 'dot');
  }
  W.add('cone', dotsAlong(hillCurve, 0.45, 1, 26, (u) => hillR(u) + 0.005, 0.045), 'dot');
  W.add('cone', dotsAlong(axCurve, 0.004, 0.055, 12, AXR + 0.005, 0.045), 'dot');

  // colateral: sai de um nódulo, em ângulo reto
  const colP = axCurve.getPointAt(NODES[2]);
  const colPts = [[0, 0, 0], [-1.2, -0.5, 0.15], [-3.2, -1.5, 0.4], [-4.9, -3.0, 0.5], [-5.6, -5.0, 0.4], [-5.5, -6.6, 0.2]].map((v) => colP.clone().add(V(v[0], v[1], v[2])));
  W.add('colaterais', tube(colPts, (t) => 0.2 - 0.05 * t, { radial: 12, segs: 44 }));
  const colEnd = colPts[colPts.length - 1];
  W.add('terminal', ball(0.38, colEnd, [1, 0.88, 1], 20));

  // arborização terminal e botões
  const E = axCurve.getPointAt(1), K = V(23.6, -25.2, 0.15), B0 = K.clone().add(V(-0.5, -0.45, 0));
  const branches = [
    [E, V(21.0, -25.0, 0.1), V(22.2, -25.5, 0.15), B0],
    [E, V(20.6, -25.9, -0.3), V(21.4, -27.3, -0.5), V(22.0, -28.5, -0.4)],
    [E, V(21.0, -24.2, 0.8), V(22.4, -23.3, 1.4), V(23.5, -22.7, 1.6)],
    [E, V(20.2, -25.8, 0.9), V(20.2, -27.4, 1.6), V(19.9, -28.8, 1.9)],
  ];
  branches.forEach((pts) => {
    W.add('axonio', tube(pts, (t) => 0.29 - 0.13 * t, { radial: 12, segs: 26 }));
    W.add('terminal', ball(0.42, pts[3], [1, 0.88, 1], 22));
  });
  W.add('axonio', ball(AXR, E, null, 14));
  const synMid = K.clone().add(B0).multiplyScalar(0.5);
  W.add('sinapse', ball(0.62, synMid, null, 20), 'halo');

  // neurônio seguinte (em tom apagado)
  const S2 = V(29.5, -28.5, 0);
  W.add('soma', organic(new THREE.SphereGeometry(2.2, 48, 32), somaShape).translate(S2.x, S2.y, S2.z), 'far');
  const n2Path = [V(28.0, -27.4, 0), V(26.6, -26.2, 0.2), V(25.1, -25.3, 0.2), K.clone().add(V(0.25, 0.22, 0)), V(22.9, -24.3, -0.3), V(22.0, -23.3, -0.7)];
  const n2Curve = curveOf(n2Path), far = [];
  W.add('dendritos', tube(n2Curve, (t) => 0.42 * (1 + 0.9 * Math.exp(-t * 7)) - 0.3 * t, { radial: 14, segs: 56, capEnd: true }), 'far');
  far.push({ curve: subCurve(n2Curve, 0.3, 1, 10), r0: 0.33, r1: 0.12, depth: 0 });
  [[0.3, 1, 0.2], [0.9, 0.3, -0.4], [0.5, -0.85, 0.2], [-0.5, -0.8, -0.3]].forEach((v) => {
    const d = V(v[0], v[1], v[2]).normalize();
    grow(W, 'dendritos', 'far', S2.clone().addScaledVector(d, 1.8), d, 2.4, 0.34, 2, far, -1, -1, { flare: 0.9 });
  });
  spines(W, 'far', far, 0, 2.0);
  const h2 = V(1, -0.22, 0).normalize();
  W.add('cone', tube([1.7, 2.5, 3.3].map((k) => S2.clone().addScaledVector(h2, k)), (t) => 0.26 + 0.85 * Math.pow(1 - t, 2), { radial: 20, segs: 18 }), 'far');
  W.add('axonio', tube([S2.clone().addScaledVector(h2, 3.3), S2.clone().addScaledVector(h2, 4.6).add(V(0, 0.1, 0.1)), S2.clone().addScaledVector(h2, 6.0)], 0.26, { radial: 12, segs: 14, capEnd: true }), 'far');

  // astrócito, com um prolongamento que envolve a sinapse
  const Ac = V(27.0, -20.4, 1.0);
  W.add('astrocito', ball(0.95, Ac, [1.1, 0.95, 1], 30));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.2, d = V(Math.cos(a), Math.sin(a) * 0.9, R(-0.6, 0.6)).normalize();
    if (d.y < -0.4 && d.x < 0.2) continue; // esse lado é do prolongamento até a sinapse
    grow(W, 'astrocito', 'main', Ac.clone().addScaledVector(d, 0.7), d, 2.1, 0.26, 2, [], -1, -1, { flare: 0.8, wob: 0.5 });
  }
  W.add('astrocito', tube([Ac.clone().add(V(-0.4, -0.6, 0)), V(25.9, -22.3, 0.9), V(24.8, -23.8, 0.6), synMid.clone().add(V(0.55, 0.45, 0.4))], (t) => 0.42 * (1 + 0.8 * Math.exp(-t * 7)) * (1 - 0.6 * t), { radial: 12, segs: 40 }));
  W.add('astrocito', ball(0.46, synMid.clone().add(V(0.55, 0.47, 0.4)), [0.9, 0.9, 1], 16));

  // oligodendrócito: braços até a mielina deste axônio e a de um vizinho
  const perp = V(0.85, 0.5, 0).normalize(), nbOff = perp.clone().multiplyScalar(2.3).add(V(0, 0, -4.4));
  const nbPts = []; for (let i = 0; i <= 10; i++) nbPts.push(axCurve.getPointAt(0.2 + (0.62 * i) / 10).add(nbOff));
  const nb = curveOf(nbPts);
  W.add('axonio', tube(nb, 0.28, { radial: 12, segs: 60, capStart: true, capEnd: true }), 'far');
  const nbSeg = [[0.1, 0.46], [0.5, 0.88]];
  nbSeg.forEach((s) => W.add('mielina', tube(subCurve(nb, s[0], s[1], 12), sleeve(0.3, 0.7, 0.09), { radial: 20, segs: 40 })));
  const P2 = axCurve.getPointAt(0.39), P3 = axCurve.getPointAt(0.61);
  const Oc = P2.clone().add(P3).multiplyScalar(0.5).addScaledVector(perp, 3.4).add(V(0, 0, -2.0));
  W.add('oligodendrocito', ball(0.85, Oc, [1.05, 0.95, 1], 28));
  [P2.clone().addScaledVector(perp, 0.74), P3.clone().addScaledVector(perp, 0.74), nb.getPointAt(0.28).add(V(0, 0, 0.68)), nb.getPointAt(0.69).add(V(0, 0, 0.68))].forEach((t, i) => {
    const mid = Oc.clone().lerp(t, 0.5).add(V(0, 0.35, i < 2 ? 0.4 : -0.3));
    W.add('oligodendrocito', tube([Oc.clone(), mid, t], (u) => 0.26 * (1 + 0.9 * Math.exp(-u * 6)) * (1 - 0.55 * u), { radial: 10, segs: 26 }));
    W.add('oligodendrocito', ball(0.2, t, [1.7, 0.55, 1.3], 12));
  });

  // micróglia
  const Mc = V(6.9, 4.5, 1.8);
  W.add('microglia', ball(0.42, Mc, [1.25, 0.85, 0.9], 20));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2, d = V(Math.cos(a), Math.sin(a), R(-0.7, 0.7)).normalize();
    grow(W, 'microglia', 'main', Mc.clone().addScaledVector(d, 0.3), d, 1.15, 0.1, 2, [], -1, -1, { wob: 0.75, flare: 0.8 });
  }

  const gWorld = new THREE.Group();
  stages.world = { group: gWorld, meshes: W.build(gWorld, materialFor), box: { c: V(11.5, -10.4, 0), hw: 24.5, hh: 23 }, dir: V(0, 0, 1), dist: [3, 220], shadow: 34 };

  {
    const WF = new Builder();
    WF.add('citosol', organic(new THREE.SphereGeometry(SR - 0.21, 64, 44), somaShape));
    const pts = scatter(540, () => { const p = V(RM(-14, 37), RM(-35, 14), RM(-9, 9)); return p.length() < 3.5 || p.distanceTo(S2) < 2.6 ? null : p; }, 1 / 31)
      .concat(scatter(64, () => { const p = V(RM(-2.7, 2.7), RM(-2.6, 2.6), RM(-2.5, 2.5)); return p.length() > 2.55 ? null : p; }, 100 / 115));
    addFluids(stages.world, WF, makeMotes(pts, 0.12));
  }
  const spineAt = spineHeads[Math.floor(spineHeads.length * 0.3)];
  L('world', tr('Soma', 'Soma'), 'soma', V(-0.6, 2.95, -0.6), 0);
  L('world', tr('Citosol', 'Cytosol'), 'citosol', V(2.05, -0.2, 0.9), 22);
  L('world', tr('Líquido extracelular', 'Extracellular fluid'), 'extracelular', V(-9, -15, 0), 0, 'label', { liq: true });
  L('world', tr('Núcleo', 'Nucleus'), 'nucleo', Nc.clone().add(V(-0.45, 0.85, 0.55)), 22);
  L('world', tr('RE rugoso', 'Rough ER'), 're-rugoso', Nc.clone().add(V(1.5, 0.7, 0.1)), 26);
  L('world', tr('Ribossomos livres', 'Free ribosomes'), 'ribossomos', polyAt, 32);
  L('world', tr('RE liso', 'Smooth ER'), 're-liso', RLc, 28);
  L('world', tr('Aparelho de Golgi', 'Golgi apparatus'), 'golgi', Gc, 24);
  L('world', tr('Mitocôndria', 'Mitochondrion'), 'mitocondria', mitoShow, 26);
  const trunks = dend.map((s, i) => (s.parent < 0 ? i : -1)).filter((i) => i >= 0);
  L('world', tr('Dendritos', 'Dendrites'), 'dendritos', (dend.find((s) => s.root === trunks[1] && s.depth === 2) || dend[trunks[1]]).curve.getPointAt(0.6), 0);
  L('world', tr('Espinhos dendríticos', 'Dendritic spines'), 'espinhos', spineAt, 12);
  L('world', tr('Cone de implantação', 'Axon hillock'), 'cone', hDir.clone().multiplyScalar(3.6).add(V(0.25, 0.7, 0.3)), 6.5);
  L('world', tr('Axônio', 'Axon'), 'axonio', axCurve.getPointAt(0.955).add(V(0, 0.3, 0)), 0);
  L('world', tr('Bainha de mielina', 'Myelin sheath'), 'mielina', axCurve.getPointAt(0.17).add(V(0.3, 0.7, 0.2)), 0);
  L('world', tr('Nódulo de Ranvier', 'Node of Ranvier'), 'nodulo', axCurve.getPointAt(NODES[0]).add(V(-0.15, -0.3, 0.1)), 5);
  L('world', tr('Colateral', 'Axon collateral'), 'colaterais', colPts[2], 5);
  L('world', tr('Terminal axonal', 'Axon terminal'), 'terminal', branches[1][3], 5);
  L('world', tr('Sinapse', 'Synapse'), 'sinapse', synMid, 5);
  L('world', tr('Astrócito', 'Astrocyte'), 'astrocito', Ac.clone().add(V(0.2, 0.9, 0.3)), 0);
  L('world', tr('Oligodendrócito', 'Oligodendrocyte'), 'oligodendrocito', Oc.clone().add(V(0, 0.8, 0.2)), 0);
  L('world', tr('Micróglia', 'Microglia'), 'microglia', Mc.clone().add(V(0, 0.35, 0.2)), 4);
  L('world', tr('Neurônio seguinte', 'Next neuron'), null, S2.clone().add(V(0.6, -3.2, 0)), 4, 'note');
  L('world', tr('Axônio vizinho', 'Neighboring axon'), null, nb.getPointAt(0.97).add(V(0, 0.9, 0)), 7, 'note');
  L('world', tr('Por dentro', 'Inside'), null, axCurve.getPointAt(0.6).add(V(-1.4, -0.3, 0.3)), 4, 'hot', { go: 'axon', title: tr('Ver o axônio por dentro', 'See inside the axon') });
  L('world', tr('Ampliar', 'Zoom in'), null, synMid.clone().add(V(0.3, -1.2, 0.6)), 4, 'hot', { go: 'syn', title: tr('Ampliar a sinapse', 'Zoom in on the synapse') });
  L('world', tr('Canais', 'Channels'), null, axCurve.getPointAt(NODES[0]).add(V(-4.4, -1.7, 0.3)), 4, 'hot', { go: 'ap', title: tr('Ver os canais da membrana durante o potencial de ação', 'See the membrane channels during the action potential') });

  const viewDir = V(0.2, 0.14, 1);
  Object.assign(home, {
    soma: { stage: 'world', t: V(0.4, -0.1, 0.3), r: 4.3, dir: viewDir },
    citosol: { stage: 'world', t: V(0.4, -0.1, 0.3), r: 4.3, dir: viewDir },
    nucleo: { stage: 'world', t: Nc, r: 2.1, dir: viewDir },
    're-rugoso': { stage: 'world', t: Nc.clone().add(V(1.0, 0.3, -0.3)), r: 2.4, dir: V(0.75, 0.3, 1) },
    ribossomos: { stage: 'world', t: polyAt, r: 1.4, dir: V(0.45, 0.3, 1) },
    're-liso': { stage: 'world', t: RLc, r: 1.5, dir: V(-0.3, 0.35, 1) },
    golgi: { stage: 'world', t: Gc, r: 1.6, dir: V(0.1, -0.25, 1) },
    mitocondria: { stage: 'world', t: mitoShow, r: 1.3, dir: V(-0.15, -0.1, 1) },
    neuritos: { stage: 'world', t: V(5, -6, 0), r: 17 },
    dendritos: { stage: 'world', t: V(-2.5, 0.3, 0), r: 12 },
    espinhos: { stage: 'world', t: spineAt, r: 1.9 },
    cone: { stage: 'world', t: hDir.clone().multiplyScalar(3.7), r: 3.0 },
    axonio: { stage: 'world', t: axCurve.getPointAt(0.5), r: 15.5 },
    colaterais: { stage: 'world', t: colPts[3], r: 5.6 },
    mielina: { stage: 'world', t: axCurve.getPointAt(0.39), r: 4.4, dir: V(0.25, 0.3, 1) },
    nodulo: { stage: 'world', t: axCurve.getPointAt(NODES[0]), r: 1.8, dir: V(0.25, 0.3, 1) },
    terminal: { stage: 'world', t: E.clone().add(V(1.6, -1.4, 0.6)), r: 4.4 },
  });

  /* sinal: trajeto e legendas */
  const signal = (() => {
    const tip = dend.find((s) => s.depth === 0 && s.root === 0), chain = [], pts = [];
    for (let s = tip; s; s = s.parent >= 0 ? dend[s.parent] : null) chain.push(s);
    chain.forEach((c) => { for (let i = 10; i >= 1; i--) pts.push(c.curve.getPointAt(i / 10)); });
    pts.push(dend[0].curve.getPointAt(0));
    const SALT = tr('Condução saltatória: o impulso salta de nódulo em nódulo e é regenerado em cada um', 'Saltatory conduction: the impulse jumps from node to node and is regenerated at each one');
    const st = [
      { c: curveOf(pts), dur: 1500, cap: tr('Dendrito: o sinal entra', 'Dendrite: the signal comes in'), id: 'dendritos' },
      { c: curveOf([pts[pts.length - 1].clone(), V(0, 0, 0.3), hillPts[0]]), dur: 800, cap: tr('Soma: o sinal é integrado no corpo celular', 'Soma: the signal is integrated in the cell body'), id: 'soma' },
      { c: hillCurve, dur: 1100, hold: 350, cap: tr('Cone de implantação: nasce o potencial de ação', 'Axon hillock: the action potential is born'), id: 'cone' },
    ];
    const cuts = [0, ...NODES, 1];
    for (let k = 0; k < cuts.length - 1; k++) {
      st.push({ c: subCurve(axCurve, cuts[k], cuts[k + 1], 12), dur: k === 0 ? 900 : 450, cap: k === 0 ? tr('Axônio: o impulso segue para longe do soma', 'Axon: the impulse travels away from the soma') : SALT, id: k === 0 ? 'axonio' : 'mielina' });
      if (k < cuts.length - 2) st.push({ at: axCurve.getPointAt(cuts[k + 1]), dur: 650, cap: SALT, id: 'nodulo' });
    }
    st.push({ c: curveOf(branches[0]), dur: 800, hold: 300, cap: tr('Terminal axonal: o sinal elétrico vira químico', 'Axon terminal: the electrical signal becomes chemical'), id: 'terminal' });
    st.push({ c: curveOf([B0.clone(), K.clone().add(V(0.05, 0.3, 0))]), dur: 700, cap: tr('Fenda sináptica: o neurotransmissor atravessa', 'Synaptic cleft: the neurotransmitter crosses'), id: 'sinapse' });
    st.push({ c: curveOf([...n2Path.slice(0, 4).reverse(), S2.clone()]), dur: 1500, cap: tr('Dendrito do neurônio seguinte: o sinal volta a ser elétrico', 'Dendrite of the next neuron: the signal becomes electrical again'), id: 'dendritos' });
    return st;
  })();

  /* =====================================================================
     AXÔNIO POR DENTRO: camadas descascadas da esquerda para a direita
     ===================================================================== */
  builders.axon = () => {
  rnd = rng(31);
  const A = new Builder(), Oa = V(0, -200, 0), Ra = 1.5;
  // microtúbulos: tubos ocos
  [[0.35, 0.3], [-0.55, 0.5], [0.05, -0.62], [-0.62, -0.4], [0.8, -0.3]].forEach((p) => {
    const g = ringExtrude(0.21, 0.125, 14.5, 0, Math.PI * 2, 22);
    g.translate(-7.5, p[0], p[1]);
    A.add('microtubulo', g);
  });
  // neurofilamentos: cordas trançadas
  [[0.9, 0.45], [-0.1, 0.98], [-1.02, 0.1], [-0.02, -0.06], [-0.2, -1.05], [0.5, -0.95], [0.55, 0.9]].forEach((p, i) => {
    A.add('neurofilamento', rope(V(-7.0 - (i % 3) * 0.12, p[0], p[1]), V(7, p[0], p[1]), { amp: 0.062, r: 0.048, turns: 16, radial: 6 }));
  });
  // membrana em duas camadas, com janela aberta na frente e em cima
  const a0 = (205 * Math.PI) / 180, a1 = (455 * Math.PI) / 180, MX0 = -3.6, MLEN = 4.6;
  const mo = ringExtrude(Ra, Ra - 0.055, MLEN, a0, a1), mi = ringExtrude(Ra - 0.085, Ra - 0.14, MLEN, a0, a1);
  mo.translate(MX0, 0, 0); mi.translate(MX0, 0, 0);
  A.add('membrana', mo); A.add('membrana', mi, 'in');
  const wallDir = (phi) => V(0, Math.sin(phi), -Math.cos(phi));
  for (let i = 0; i < 11; i++) {
    const phi = a0 + ((a1 - a0) * (i + R(0.2, 0.8))) / 11, n = wallDir(phi), x = R(MX0 + 0.4, 0.2);
    A.add('membrana', place(new THREE.CylinderGeometry(0.13, 0.13, 0.4, 12), { p: V(x, n.y * (Ra - 0.07), n.z * (Ra - 0.07)), dir: n }), 'prot');
  }
  // microfilamentos: fitas finas trançadas, presas por dentro da membrana
  for (let i = 0; i < 13; i++) {
    const phi = (250 + (i * 170) / 13 + R(-4, 4)) * (Math.PI / 180), n = wallDir(phi), x = R(MX0 + 0.3, -0.6), len = R(1.1, 1.9);
    const c = V(x, n.y * (Ra - 0.26), n.z * (Ra - 0.26)), t = V(1, R(-0.25, 0.25), R(-0.25, 0.25)).normalize();
    A.add('microfilamento', rope(c.clone().addScaledVector(t, -len / 2), c.clone().addScaledVector(t, len / 2), { amp: 0.034, r: 0.024, turns: len * 2.4, radial: 5 }));
  }
  // mielina em espiral
  const sp = spiral(Ra + 0.1, 0.2, 0.11, 4.25, 6.5);
  sp.translate(0.5, 0, 0);
  A.add('mielina', sp);
  const gAxon = new THREE.Group(); gAxon.position.copy(Oa);
  stages.axon = { group: gAxon, meshes: A.build(gAxon, materialFor), box: { c: Oa.clone().add(V(-0.2, 0, 0)), hw: 6.9, hh: 3.4 }, dir: V(-0.55, 0.26, 1), dist: [3, 70], shadow: 10 };
  {
    const AF = new Builder();
    AF.add('citosol', place(new THREE.CylinderGeometry(Ra - 0.17, Ra - 0.17, 10.6, 48), { p: V(1.7, 0, 0), rot: [0, 0, Math.PI / 2] }));
    const pts = scatter(190, () => { const p = V(RM(-8, 8), RM(-4.6, 4.6), RM(-4.6, 4.6)); return Math.hypot(p.y, p.z) < (p.x > 0.3 ? 2.8 : 1.8) ? null : p; }, 1 / 31)
      .concat(scatter(44, () => { const p = V(RM(-3.4, 0.3), RM(-1.2, 1.2), RM(-1.2, 1.2)); return Math.hypot(p.y, p.z) > 1.2 ? null : p; }, 100 / 115));
    addFluids(stages.axon, AF, makeMotes(pts, 0.1));
  }
  const la = (x, y, z) => Oa.clone().add(V(x, y, z));
  L('axon', tr('Citosol', 'Cytosol'), 'citosol', la(-3.6, -0.7, 0.8), 0, 'label', { liq: true });
  L('axon', tr('Líquido extracelular', 'Extracellular fluid'), 'extracelular', la(-5.6, 3.1, 0), 0, 'label', { liq: true });
  L('axon', tr('Microtúbulo', 'Microtubule'), 'microtubulo', la(-7.5, 0.35, 0.3), 0);
  L('axon', tr('Neurofilamento', 'Neurofilament'), 'neurofilamento', la(-6.2, -0.2, -1.05), 0);
  L('axon', tr('Microfilamento', 'Microfilament'), 'microfilamento', la(-2.2, 1.1, -0.55), 12);
  L('axon', tr('Membrana neuronal', 'Neuronal membrane'), 'membrana', la(-2.6, -Ra, 0.1), 0);
  L('axon', tr('Proteína de membrana', 'Membrane protein'), 'membrana', la(-1.2, -1.2, 0.95), 16);
  L('axon', tr('Bainha de mielina', 'Myelin sheath'), 'mielina', la(3.8, 2.15, 1.2), 0);
  Object.assign(home, {
    membrana: { stage: 'axon', t: la(-1.8, 0, 0), r: 3.4, dir: V(-0.45, 0.3, 1) },
    microtubulo: { stage: 'axon', t: la(-5.6, 0, 0), r: 2.6, dir: V(-0.9, 0.25, 1) },
    neurofilamento: { stage: 'axon', t: la(-5.6, 0, 0), r: 2.6, dir: V(-0.9, 0.25, 1) },
    microfilamento: { stage: 'axon', t: la(-1.9, 0.3, -0.4), r: 2.3, dir: V(-0.35, 0.4, 1) },
  });
  };

  /* =====================================================================
     SINAPSE
     ===================================================================== */
  builders.syn = () => {
  rnd = rng(32);
  const S = new Builder(), Os = V(0, -600, 0);
  const bulb = [[0, -0.42], [1.2, -0.42], [1.95, -0.3], [2.4, 0.3], [2.45, 1.0], [2.2, 1.7], [1.6, 2.3], [0.95, 2.75], [0.62, 3.2]];
  S.add('terminal', lathe(bulb, { samples: 60, segs: 64 }), 'shell');
  S.add('terminal', lathe(bulb.map((p, i) => [Math.max(0, p[0] - (i === 0 ? 0 : 0.13)), p[1] + (i < 2 ? 0.1 : 0)]), { samples: 60, segs: 64 }), 'inner');
  S.add('axonio', tube([V(-0.5, 5.3, 0), V(-0.12, 4.2, 0), V(0, 3.1, 0)], (t) => 0.5 + 0.13 * t * t, { radial: 22, segs: 22 }));
  S.add('zona-ativa', place(new THREE.CylinderGeometry(1.4, 1.4, 0.09, 40), { p: V(0, -0.27, 0) }));
  // vesículas: soltas e ancoradas na face voltada para a fenda
  const vesAt = [], cutVes = [V(-1.05, 0.82, 1.2), V(0.95, 1.3, 1.1)], granAt = [V(0.05, 2.5, 0.25), V(-1.55, 1.35, 0.2)];
  for (let i = 0, t = 0; i < 18 && t < 600; t++) {
    const a = R(0, Math.PI * 2), rr = Math.sqrt(rnd()) * 1.75, p = V(Math.cos(a) * rr, R(0.25, 1.75), Math.sin(a) * rr * 0.8);
    if (vesAt.some((q) => q.distanceTo(p) < 0.42) || cutVes.some((q) => q.distanceTo(p) < 0.66) || granAt.some((q) => q.distanceTo(p) < 0.6)) continue;
    vesAt.push(p); i++;
  }
  // duas vesículas abertas: o neurotransmissor fica guardado no lúmen
  const rs = rng(77), RS = (a, b) => a + rs() * (b - a);
  cutVes.forEach((c) => {
    const ph0 = Math.PI / 2 + 0.95, phL = Math.PI * 2 - 1.9;
    S.add('vesiculas', place(new THREE.SphereGeometry(0.36, 30, 20, ph0, phL), { p: c }), 'shell');
    S.add('vesiculas', place(new THREE.SphereGeometry(0.315, 30, 20, ph0, phL), { p: c }), 'inner');
    for (let i = 0; i < 18; ) { const d = V(RS(-1, 1), RS(-1, 1), RS(-1, 1)); if (d.length() > 1) continue; S.add('neurotransmissor', ball(0.042, c.clone().addScaledVector(d, 0.24), null, 7)); i++; }
  });
  granAt.forEach((c) => S.add('granulos', ball(0.34, c, null, 22)));
  // canais de Ca²⁺ na zona ativa, vistos em corte
  [-1.2, -0.45, 0.5, 1.22].forEach((x) => {
    S.add('canal-ca', ringExtrude(0.135, 0.05, 0.5, 0, Math.PI * 2, 16).rotateZ(Math.PI / 2).translate(x, -0.6, 0.36));
    [[0.02, -0.02], [-0.1, -0.78], [0.12, -0.9]].forEach((d) => S.add('canal-ca', ball(0.04, V(x + d[0], d[1], 0.4), null, 7), 'ion'));
  });
  [[-0.7, 0.2], [0.1, -0.25], [0.75, 0.3], [-0.2, 0.6]].forEach((v) => vesAt.push(V(v[0], -0.02, v[1])));
  vesAt.forEach((p) => S.add('vesiculas', ball(0.2, p, null, 16)));
  mito(S, V(-0.95, 2.05, -0.35), [0, 0, 1.15], 0.25, 0.7); mito(S, V(0.9, 2.15, -0.4), [0.4, 0, -1.0], 0.25, 0.65);
  // fenda: neurotransmissor
  for (let i = 0; i < 48; i++) { const a = R(0, Math.PI * 2), rr = Math.sqrt(rnd()) * 1.2; S.add('neurotransmissor', ball(0.045, V(Math.cos(a) * rr, R(-0.92, -0.5), Math.sin(a) * rr), null, 7)); }
  S.add('fenda', place(new THREE.CylinderGeometry(1.6, 1.6, 0.42, 40), { p: V(0, -0.72, 0) }));
  // lado pós-sináptico: espinho, receptores e dendrito
  S.add('espinhos', lathe([[0, -1.0], [0.85, -1.02], [1.42, -1.22], [1.6, -1.65], [1.38, -2.15], [0.72, -2.55], [0.44, -2.95], [0.44, -3.45], [0.62, -3.85], [1.1, -4.25]], { samples: 60, segs: 56 }));
  [[0, 0], [0.45, 0.1], [-0.45, -0.05], [0.2, 0.45], [-0.25, 0.42], [0.25, -0.42], [-0.2, -0.45], [0.82, -0.2], [-0.82, 0.22], [0, 0.82]].forEach((v) => {
    S.add('receptores', ringExtrude(0.12, 0.045, 0.26, 0, Math.PI * 2, 14).rotateZ(Math.PI / 2).translate(v[0], -1.12, v[1]));
  });
  S.add('dendritos', tube([V(-4.3, -4.95, 0), V(-1.4, -5.15, 0), V(1.4, -5.1, 0), V(4.3, -4.9, 0)], 0.95, { radial: 28, segs: 30, capStart: true, capEnd: true }));
  // prolongamentos do astrócito em volta da fenda
  [-1, 1].forEach((s) => {
    S.add('astrocito', tube([V(s * 5.4, 2.3, 0.2), V(s * 4.2, 0.7, 0.2), V(s * 3.2, -0.3, 0.1), V(s * 2.65, -0.7, 0)], (t) => 0.5 - 0.14 * t, { radial: 18, segs: 30, capStart: true }));
    S.add('astrocito', ball(0.62, V(s * 2.45, -0.74, 0), [0.6, 1.05, 1.3], 24));
  });
  const gSyn = new THREE.Group(); gSyn.position.copy(Os);
  stages.syn = { group: gSyn, meshes: S.build(gSyn, materialFor), box: { c: Os.clone().add(V(0, -0.3, 0)), hw: 5.9, hh: 6.1 }, dir: V(0.12, 0.08, 1), dist: [3, 60], shadow: 9 };
  {
    const SF = new Builder();
    SF.add('citosol', lathe(bulb.map((p, i) => [Math.max(0, p[0] - (i === 0 ? 0 : 0.24)), p[1] + (i < 2 ? 0.24 : 0)]), { samples: 60, segs: 56 }));
    const inTerm = (p, k) => { const dx = p.x / (2.6 * k), dy = (p.y - 1.1) / (1.8 * k), dz = p.z / (2.6 * k); return dx * dx + dy * dy + dz * dz < 1; };
    const pts = scatter(240, () => {
      const p = V(RM(-7, 7), RM(-6.4, 6), RM(-4, 4));
      if (inTerm(p, 1) || p.distanceTo(V(0, -2.2, 0)) < 2.0 || (Math.abs(p.y + 5) < 1.25 && Math.abs(p.z) < 1.25 && Math.abs(p.x) < 5.4) || (p.y > 2.6 && Math.hypot(p.x, p.z) < 0.9)) return null;
      return p;
    }, 1 / 31).concat(scatter(34, () => { const p = V(RM(-2, 2), RM(-0.1, 2.3), RM(-2, 2)); return inTerm(p, 0.74) ? p : null; }, 100 / 115));
    addFluids(stages.syn, SF, makeMotes(pts, 0.085));
  }
  const ls = (x, y, z) => Os.clone().add(V(x, y, z));
  L('syn', tr('Citosol', 'Cytosol'), 'citosol', ls(-1.8, 0.35, 0.3), 12);
  L('syn', tr('Líquido extracelular', 'Extracellular fluid'), 'extracelular', ls(4.7, -2.7, 0), 0, 'label', { liq: true });
  L('syn', tr('Axônio', 'Axon'), 'axonio', ls(-0.3, 4.4, 0.45), 0);
  L('syn', tr('Terminal axonal', 'Axon terminal'), 'terminal', ls(2.3, 1.2, -0.3), 0);
  L('syn', tr('Vesículas sinápticas', 'Synaptic vesicles'), 'vesiculas', ls(vesAt[2].x, vesAt[2].y, vesAt[2].z + 0.2), 0);
  L('syn', tr('Mitocôndria', 'Mitochondrion'), 'mitocondria', ls(0.95, 2.2, -0.2), 14);
  L('syn', tr('Neurotransmissor no lúmen', 'Neurotransmitter in the lumen'), 'neurotransmissor', ls(cutVes[0].x, cutVes[0].y, cutVes[0].z + 0.15), 0);
  L('syn', tr('Grânulo secretor', 'Secretory granule'), 'granulos', ls(granAt[0].x, granAt[0].y + 0.2, granAt[0].z + 0.2), 14);
  L('syn', tr('Zona ativa', 'Active zone'), 'zona-ativa', ls(-0.8, -0.24, 0.5), 14);
  L('syn', tr('Canal de Ca²⁺', 'Ca²⁺ channel'), 'canal-ca', ls(1.22, -0.4, 0.5), 14);
  L('syn', tr('Fenda sináptica', 'Synaptic cleft'), 'fenda', ls(1.55, -0.72, 0.3), 0);
  L('syn', tr('Receptores', 'Receptors'), 'receptores', ls(-0.82, -1.0, 0.22), 14);
  L('syn', tr('Espinho dendrítico', 'Dendritic spine'), 'espinhos', ls(-1.5, -1.9, 0.5), 0);
  L('syn', tr('Dendrito', 'Dendrite'), 'dendritos', ls(3.2, -4.7, 0.7), 0);
  L('syn', tr('Astrócito', 'Astrocyte'), 'astrocito', ls(-4.3, 0.9, 0.5), 0);
  Object.assign(home, {
    sinapse: { stage: 'syn' },
    vesiculas: { stage: 'syn', t: ls(0, 0.7, 0.3), r: 2.6, dir: V(0.15, 0.12, 1) },
    neurotransmissor: { stage: 'syn', t: ls(cutVes[0].x + 0.3, cutVes[0].y - 0.3, 0.8), r: 1.7, dir: V(-0.1, 0.1, 1) },
    granulos: { stage: 'syn', t: ls(-0.5, 1.9, 0.2), r: 2.1 },
    'zona-ativa': { stage: 'syn', t: ls(0, -0.3, 0.2), r: 2.0, dir: V(0.1, 0.38, 1) },
    'canal-ca': { stage: 'syn', t: ls(0.4, -0.45, 0.3), r: 1.7, dir: V(0.1, 0.2, 1) },
    fenda: { stage: 'syn', t: ls(0, -0.7, 0), r: 2.2 },
    receptores: { stage: 'syn', t: ls(0, -1.0, 0.2), r: 1.8, dir: V(0.1, 0.32, 1) },
  });
  };

  /* =====================================================================
     GLIA: os cinco tipos lado a lado
     ===================================================================== */
  builders.glia = () => {
  rnd = rng(33);
  const G = new Builder(), Og = V(0, -1000, 0);
  // astrócito, com uma sinapse que ele envolve
  const gA = V(-11.6, 5.6, 0), gSyn2 = V(-8.5, 3.0, 0.5);
  G.add('astrocito', ball(1.0, gA, [1.1, 0.95, 1], 30));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.5, d = V(Math.cos(a), Math.sin(a), R(-0.5, 0.5)).normalize();
    if (d.x > 0.5 && d.y < -0.2) continue;
    grow(G, 'astrocito', 'main', gA.clone().addScaledVector(d, 0.75), d, 2.0, 0.27, 2, [], -1, -1, { flare: 0.8, wob: 0.5 });
  }
  G.add('astrocito', tube([gA.clone().add(V(0.6, -0.5, 0)), V(-10.2, 4.3, 0.3), V(-9.3, 3.6, 0.5), gSyn2.clone().add(V(-0.45, 0.35, 0.1))], (t) => 0.45 * (1 + 0.8 * Math.exp(-t * 7)) * (1 - 0.55 * t), { radial: 12, segs: 34 }));
  G.add('astrocito', ball(0.5, gSyn2.clone().add(V(-0.42, 0.3, 0.1)), [0.6, 1.1, 1.1], 16));
  G.add('terminal', ball(0.42, gSyn2.clone().add(V(0.12, 0.3, 0)), [1, 0.85, 1], 18), 'far');
  G.add('axonio', tube([gSyn2.clone().add(V(0.25, 0.55, 0)), gSyn2.clone().add(V(1.0, 1.5, 0)), gSyn2.clone().add(V(2.2, 2.0, 0))], 0.17, { radial: 10, segs: 16, capEnd: true }), 'far');
  G.add('espinhos', ball(0.32, gSyn2.clone().add(V(0.14, -0.42, 0)), [1.1, 0.8, 1.1], 14), 'far');
  G.add('dendritos', tube([gSyn2.clone().add(V(-1.6, -1.25, 0)), gSyn2.clone().add(V(0.2, -1.1, 0)), gSyn2.clone().add(V(2.0, -1.35, 0))], 0.4, { radial: 14, segs: 16, capStart: true, capEnd: true }), 'far');
  G.add('espinhos', place(new THREE.CylinderGeometry(0.12, 0.16, 0.5, 10), { p: gSyn2.clone().add(V(0.15, -0.72, 0)) }), 'far');
  // oligodendrócito: uma célula, três axônios
  const gO = V(0.3, 8.1, -0.2);
  G.add('oligodendrocito', ball(0.92, gO, [1.05, 0.95, 1], 28));
  [[4.9, 1.7, 0.4], [3.7, -0.3, -0.6], [5.3, -2.3, 0.9]].forEach((a, i) => {
    const c = curveOf([V(-4.4, a[0] + 0.1, a[1]), V(-1.4, a[0] - 0.08, a[1]), V(1.8, a[0] + 0.08, a[1]), V(5.0, a[0], a[1])]);
    G.add('axonio', tube(c, 0.26, { radial: 12, segs: 40, capStart: true, capEnd: true }), 'far');
    const u0 = 0.2 + a[2] * 0.12, u1 = u0 + 0.5;
    G.add('mielina', tube(subCurve(c, u0, u1, 10), sleeve(0.28, 0.68, 0.1), { radial: 22, segs: 40 }));
    const t = c.getPointAt((u0 + u1) / 2).add(V(0, 0.66, 0));
    G.add('oligodendrocito', tube([gO.clone(), gO.clone().lerp(t, 0.5).add(V((i - 1) * 0.5, 0.2, 0)), t], (u) => 0.28 * (1 + 0.9 * Math.exp(-u * 6)) * (1 - 0.55 * u), { radial: 10, segs: 26 }));
    G.add('oligodendrocito', ball(0.2, t, [1.8, 0.5, 1.3], 12));
  });
  // micróglia
  const gM = V(11.6, 5.6, 0);
  G.add('microglia', ball(0.5, gM, [1.25, 0.85, 0.9], 22));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3, d = V(Math.cos(a), Math.sin(a), R(-0.5, 0.5)).normalize();
    grow(G, 'microglia', 'main', gM.clone().addScaledVector(d, 0.35), d, 1.5, 0.13, 2, [], -1, -1, { wob: 0.75, flare: 0.8 });
  }
  // células de Schwann: uma célula por trecho, um só axônio
  const sc = curveOf([V(-13.2, -5.4, 0), V(-9.5, -5.55, 0), V(-5.0, -5.45, 0), V(-0.8, -5.5, 0)]);
  G.add('axonio', tube(sc, 0.26, { radial: 14, segs: 50, capStart: true, capEnd: true }), 'far');
  const SCH = [[0.08, 0.47], [0.53, 0.92]];
  SCH.forEach((s, i) => {
    G.add('mielina', tube(subCurve(sc, s[0], s[1], 10), sleeve(0.28, 0.6, 0.08), { radial: 22, segs: 40 }));
    const end = i === 0 ? s[1] - 0.004 : s[0] + (s[1] - s[0]) * 0.56;
    G.add('schwann', tube(subCurve(sc, s[0] + 0.004, end, 10), i === 0 ? sleeve(0.3, 0.76, 0.09) : (t) => { const k = Math.min(1, t / 0.16); return 0.3 + 0.46 * k * k * (3 - 2 * k); }, { radial: 24, segs: 40 }));
    if (i === 1) { const pe = sc.getPointAt(end); G.add('schwann', ringExtrude(0.76, 0.58, 0.04, 0, Math.PI * 2, 28).translate(pe.x - 0.04, pe.y, pe.z)); }
    const nu = s[0] + (end - s[0]) * 0.5;
    G.add('schwann', ball(0.46, sc.getPointAt(nu).add(V(0, 0.7, 0.1)), [1.55, 0.55, 1], 20), 'nuc');
  });
  G.add('nodulo', tube(subCurve(sc, 0.462, 0.538, 4), 0.26, { radial: 14, segs: 8 }));
  G.add('nodulo', dotsAlong(sc, 0.476, 0.524, 14, 0.27), 'dot');
  // células ependimárias: uma camada de células lado a lado
  for (let i = 0; i < 6; i++) {
    const x = 4.3 + i * 1.5, g = new RoundedBoxGeometry(1.42, 1.9, 1.5, 5, 0.24);
    G.add('ependimaria', place(g, { p: V(x, -5.5, 0) }));
    G.add('ependimaria', ball(0.4, V(x, -5.75, 0), [1, 1.1, 1], 18), 'nuc');
  }
  const gGlia = new THREE.Group(); gGlia.position.copy(Og);
  stages.glia = { group: gGlia, meshes: G.build(gGlia, materialFor), box: { c: Og.clone().add(V(-0.2, 0.9, 0)), hw: 16.4, hh: 9.8 }, dir: V(0.06, 0.06, 1), dist: [3, 120], shadow: 17 };
  addFluids(stages.glia, null, makeMotes(scatter(330, () => V(RM(-16.5, 16.5), RM(-9, 11), RM(-4, 4)), 1 / 31), 0.12));
  const lg = (x, y, z) => Og.clone().add(V(x, y, z));
  L('glia', tr('Líquido extracelular', 'Extracellular fluid'), 'extracelular', lg(-13.8, -1.3, 0), 0, 'label', { liq: true });
  L('glia', tr('Astrócito', 'Astrocyte'), 'astrocito', lg(gA.x - 0.2, gA.y + 0.95, 0.3), 0);
  L('glia', tr('Oligodendrócito', 'Oligodendrocyte'), 'oligodendrocito', lg(gO.x, gO.y + 0.9, 0), 0);
  L('glia', tr('Micróglia', 'Microglia'), 'microglia', lg(gM.x, gM.y + 0.45, 0.2), 0);
  L('glia', tr('Célula de Schwann', 'Schwann cell'), 'schwann', lg(-10.6, -4.75, 0.3), 0);
  L('glia', tr('Células ependimárias', 'Ependymal cells'), 'ependimaria', lg(8.05, -4.5, 0.75), 0);
  L('glia', tr('Bainha de mielina', 'Myelin sheath'), 'mielina', lg(-2.6, -5.0, 0.4), 9);
  L('glia', tr('Nódulo de Ranvier', 'Node of Ranvier'), 'nodulo', lg(-7.0, -5.75, 0.2), 9);
  L('glia', tr('Envolve a sinapse', 'Wraps around the synapse'), null, lg(gSyn2.x + 0.6, gSyn2.y - 2.0, 0), 6, 'note');
  L('glia', tr('Uma célula, vários axônios', 'One cell, several axons'), null, lg(0.3, 2.6, 0), 6, 'note');
  L('glia', tr('Uma célula, um só axônio', 'One cell, a single axon'), null, lg(-7.0, -7.0, 0), 6, 'note');
  L('glia', tr('Revestem os ventrículos', 'They line the ventricles'), null, lg(8.05, -7.0, 0), 6, 'note');
  Object.assign(home, {
    astrocito: { stage: 'glia', t: lg(-10.6, 4.9, 0), r: 4.9 },
    oligodendrocito: { stage: 'glia', t: lg(0.3, 5.6, 0), r: 5.2 },
    microglia: { stage: 'glia', t: lg(gM.x, gM.y, 0), r: 3.4 },
    schwann: { stage: 'glia', t: lg(-7.0, -5.5, 0), r: 6.6 },
    ependimaria: { stage: 'glia', t: lg(8.05, -5.5, 0), r: 4.9, dir: V(0.3, 0.2, 1) },
  });
  };

  /* =====================================================================
     IMPULSO: um trecho de membrana do axônio, com canais, bomba e íons.
     As proteínas e os íons se movem; main.js chama ap.update a cada quadro.
     ===================================================================== */
  builders.ap = () => {
  rnd = rng(34);
  const Op = V(0, -1400, 0), gAp = new THREE.Group(); gAp.position.copy(Op);
  const Pm = new Builder(), ra = rng(5), RA = (a, b) => a + ra() * (b - a);
  const PROT = [
    { id: 'canal-na', x: -6.4, z: 0.6, r: 1.32 }, { id: 'canal-vaz', x: -3.5, z: -1.5, r: 1.14 }, { id: 'canal-na', x: -0.6, z: 1.0, r: 1.32 },
    { id: 'canal-k', x: 2.3, z: -0.5, r: 1.32 }, { id: 'bomba', x: 5.0, z: 1.1, r: 1.5 }, { id: 'canal-k', x: 7.4, z: -0.8, r: 1.32 },
  ];
  // bicamada de fosfolipídios: cabeças para fora, caudas no meio
  const headGeo = ball(0.23, null, null, 8), tailGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.56, 4, 1, true);
  const HX = 0.56, HZ = 0.485;
  for (let iz = 0; iz * HZ <= 7.8; iz++) {
    for (let ix = 0; ix * HX <= 18.2; ix++) {
      const x = -9.1 + ix * HX + (iz % 2 ? HX / 2 : 0), z = -3.9 + iz * HZ;
      if (PROT.some((q) => Math.hypot(x - q.x, z - q.z) < q.r)) continue;
      for (const s of [1, -1]) {
        Pm.add('membrana', headGeo.clone().translate(x, s * 0.8, z));
        Pm.add('membrana', tailGeo.clone().translate(x - 0.09, s * 0.36, z), 'tail');
        Pm.add('membrana', tailGeo.clone().translate(x + 0.09, s * 0.36, z), 'tail');
      }
    }
  }
  const apMeshes = Pm.build(gAp, materialFor);
  const live = (id, shade, geo, parent) => {
    const m = new THREE.Mesh(geo, materialFor(id, shade)); m.userData.id = id; m.castShadow = m.receiveShadow = true;
    (parent || gAp).add(m); apMeshes.push(m); return m;
  };
  const smooth = (x) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };
  // canal: quatro partes em volta do poro; abrir = afastar as partes
  function makeChannel(q, { r = 0.5, len = 2.3, closed = 0.5, open = 0.82 } = {}) {
    const g = new THREE.Group(); g.position.set(q.x, 0, q.z); gAp.add(g);
    const lobes = [], geo = new THREE.CapsuleGeometry(r, len, 8, 18);
    for (let k = 0; k < 4; k++) lobes.push(live(q.id, 'main', geo, g));
    const ch = {
      q, g, a: -1,
      set(a) {
        if (Math.abs(a - ch.a) < 0.002) return; ch.a = a;
        const rho = closed + (open - closed) * a;
        lobes.forEach((m, k) => { const an = Math.PI / 4 + (k * Math.PI) / 2; m.position.set(Math.cos(an) * rho, 0, Math.sin(an) * rho); });
      },
    };
    ch.set(0);
    return ch;
  }
  const naCh = PROT.filter((q) => q.id === 'canal-na').map((q) => {
    const ch = makeChannel(q);
    // a parte globular que tampa o poro na inativação, presa por um fio
    const ballM = live('canal-na', 'ball', new THREE.SphereGeometry(0.34, 22, 16), ch.g);
    const tether = live('canal-na', 'ball', new THREE.CylinderGeometry(0.04, 0.04, 1, 6), ch.g);
    const hang = V(1.35, -2.8, 0.4), plug = V(0, -1.9, 0), anchor = V(0.78, -1.62, 0.35), dv = V();
    ch.inact = (b) => {
      ballM.position.lerpVectors(hang, plug, b);
      dv.subVectors(ballM.position, anchor);
      tether.position.copy(anchor).addScaledVector(dv, 0.5);
      tether.scale.set(1, dv.length(), 1);
      tether.quaternion.setFromUnitVectors(V(0, 1, 0), dv.clone().normalize());
    };
    ch.inact(0);
    return ch;
  });
  const kCh = PROT.filter((q) => q.id === 'canal-k').map((q) => makeChannel(q));
  const leakQ = PROT.find((q) => q.id === 'canal-vaz'), pumpQ = PROT.find((q) => q.id === 'bomba');
  makeChannel(leakQ, { r: 0.42, len: 2.1, closed: 0.72, open: 0.72 });
  const pump = live('bomba', 'main', organic(new THREE.SphereGeometry(1, 36, 26), (v) => { const k = 1 - 0.2 * Math.exp(-v.y * v.y * 5); v.set(v.x * 1.22 * k, v.y * 1.95, v.z * 1.12 * k); }));
  pump.position.set(pumpQ.x, 0.05, pumpQ.z);

  // íons: os de fundo só balançam; os de fluxo atravessam os canais
  function ions(id, groups) {
    const list = [];
    for (const g of groups) for (let i = 0; i < g.n; i++) list.push({ ...g, i, base: g.box ? V(RA(-8.7, 8.7), RA(g.box[0], g.box[1]), RA(-3.5, 3.5)) : null, ph: [RA(0, 6.3), RA(0, 6.3), RA(0, 6.3)], f: [RA(0.5, 1.3), RA(0.5, 1.3), RA(0.5, 1.3)], off: RA(0, 1), spread: V(RA(-0.9, 0.9), 0, RA(-0.9, 0.9)) });
    const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 16, 12), materialFor(id, 'main'), list.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.castShadow = true; mesh.userData.id = id;
    gAp.add(mesh); apMeshes.push(mesh);
    return { mesh, list };
  }
  const flowsNa = naCh.map((ch) => ({ ch, n: 6, dir: -1, clock: 0 })), flowsK = kCh.map((ch) => ({ ch, n: 6, dir: 1, clock: 0 }));
  const leakFlow = { ch: { q: leakQ }, n: 2, dir: 1, clock: 0 }, pumpNa = { ch: { q: pumpQ }, n: 1, dir: 1, clock: 0, side: -0.55 }, pumpK = { ch: { q: pumpQ }, n: 1, dir: -1, clock: 0.5, side: 0.55 };
  const naIons = ions('ion-na', [{ n: 38, box: [2.3, 5.4] }, { n: 4, box: [-5.4, -2.6] }, ...flowsNa.map((fl) => ({ n: fl.n, fl })), { n: 1, fl: pumpNa }]);
  const kIons = ions('ion-k', [{ n: 34, box: [-5.4, -2.6] }, { n: 3, box: [2.3, 5.4] }, ...flowsK.map((fl) => ({ n: fl.n, fl })), { n: 2, fl: leakFlow }, { n: 1, fl: pumpK }]);
  const dummy = new THREE.Object3D();
  function placeIons(set, time) {
    set.list.forEach((it, idx) => {
      let s = 1;
      if (it.base) {
        dummy.position.set(it.base.x + 0.3 * Math.sin(time * it.f[0] + it.ph[0]), it.base.y + 0.26 * Math.sin(time * it.f[1] + it.ph[1]), it.base.z + 0.3 * Math.sin(time * it.f[2] + it.ph[2]));
      } else {
        const fl = it.fl, u = (it.off + fl.clock) % 1, y = fl.dir * (-3.8 + 7.6 * u), wide = smooth((Math.abs(y) - 1.7) / 2.0);
        dummy.position.set(fl.ch.q.x + (fl.side || 0) + it.spread.x * wide, y, fl.ch.q.z + it.spread.z * wide);
        s = it.i < Math.ceil((fl.rate == null ? 1 : fl.rate) * fl.n - 0.02) ? smooth(Math.min(u, 1 - u) * 8) : 0;
      }
      dummy.scale.setScalar(Math.max(s, 0.0001)); dummy.updateMatrix(); set.mesh.setMatrixAt(idx, dummy.matrix);
    });
    set.mesh.instanceMatrix.needsUpdate = true;
  }
  // cargas coladas às duas faces da membrana
  const glyph = (ch) => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    x.strokeStyle = '#fff'; x.lineWidth = 9; x.lineCap = 'round'; x.beginPath(); x.moveTo(14, 32); x.lineTo(50, 32);
    if (ch === '+') { x.moveTo(32, 14); x.lineTo(32, 50); } x.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const texPlus = glyph('+'), texMinus = glyph('-'), chargeMat = [0, 1].map(() => new THREE.SpriteMaterial({ map: texPlus, transparent: true, depthWrite: false, fog: false }));
  for (const side of [0, 1]) for (let i = 0; i < 9; i++) { const sp = new THREE.Sprite(chargeMat[side]); sp.scale.setScalar(0.4); sp.position.set(-8 + i * 2, side ? -1.55 : 1.55, 4.3); gAp.add(sp); }
  ap = {
    /** s: amostra do modelo com oNa/oK (fração de canais abertos, 0–1) e rNa/rK (corrente relativa, 0–1). */
    update(s, time, dt) {
      naCh.forEach((ch, i) => { ch.set(smooth((s.oNa - [0.06, 0.3][i]) / 0.25)); ch.inact(smooth((0.5 - s.h) / 0.32)); });
      kCh.forEach((ch, i) => ch.set(smooth((s.oK - [0.1, 0.35][i]) / 0.25)));
      flowsNa.forEach((fl) => { fl.rate = s.rNa; fl.clock += dt * (0.25 + 1.5 * s.rNa); });
      flowsK.forEach((fl) => { fl.rate = s.rK; fl.clock += dt * (0.25 + 1.3 * s.rK); });
      leakFlow.clock += dt * 0.14; pumpNa.clock += dt * 0.11; pumpK.clock += dt * 0.11;
      pump.rotation.z = 0.07 * Math.sin(time * 1.4);
      placeIons(naIons, time); placeIons(kIons, time);
      const out = s.V < 0 ? texPlus : texMinus, inn = s.V < 0 ? texMinus : texPlus, op = Math.max(0.12, Math.min(1, Math.abs(s.V) / 55));
      chargeMat[0].map = out; chargeMat[1].map = inn; chargeMat[0].opacity = chargeMat[1].opacity = op;
    },
    setInk(color) { chargeMat.forEach((m) => m.color.set(color)); },
  };
  stages.ap = { group: gAp, meshes: apMeshes, box: { c: Op.clone().add(V(0, 0, 0)), hw: 10.6, hh: 6.6 }, dir: V(0.16, 0.2, 1), dist: [3, 80], shadow: 13, live: true };
  {
    const PF = new Builder();
    PF.add('extracelular', place(new RoundedBoxGeometry(18.9, 4.75, 8.3, 4, 0.45), { p: V(0, 3.55, 0) }));
    PF.add('citosol', place(new RoundedBoxGeometry(18.9, 4.75, 8.3, 4, 0.45), { p: V(0, -3.55, 0) }));
    addFluids(stages.ap, PF, null);
  }
  const lp = (x, y, z) => Op.clone().add(V(x, y, z));
  L('ap', tr('Canal de Na⁺', 'Na⁺ channel'), 'canal-na', lp(-6.4, 1.9, 0.9), 0);
  L('ap', tr('Canal de K⁺', 'K⁺ channel'), 'canal-k', lp(2.3, 1.9, -0.2), 0);
  L('ap', tr('Canal de K⁺ de repouso', 'Resting K⁺ channel'), 'canal-vaz', lp(-3.5, 1.75, -1.3), 0);
  L('ap', tr('Bomba de Na⁺ e K⁺', 'Na⁺-K⁺ pump'), 'bomba', lp(5.0, 2.05, 1.4), 0);
  L('ap', 'Na⁺', 'ion-na', lp(-8.4, 4.4, 2.5), 0);
  L('ap', 'K⁺', 'ion-k', lp(-8.4, -4.4, 2.5), 0);
  L('ap', tr('Bicamada de fosfolipídios', 'Phospholipid bilayer'), 'membrana', lp(8.6, 0.8, 3.7), 0);
  L('ap', tr('Parte que tampa o poro', 'Part that plugs the pore'), 'canal-na', lp(-5.05, -2.8, 1.0), 16);
  L('ap', tr('Líquido extracelular', 'Extracellular fluid'), 'extracelular', lp(7.6, 5.0, 1.5), 0);
  L('ap', tr('Membrana do axônio, como em um nódulo de Ranvier', 'Axon membrane, as at a node of Ranvier'), null, lp(-4.2, 6.3, 0), 0, 'note');
  L('ap', tr('Citosol', 'Cytosol'), 'citosol', lp(7.6, -5.0, 1.5), 0);
  Object.assign(home, {
    'canal-na': { stage: 'ap', t: lp(-6.1, -0.5, 0.6), r: 3.6, dir: V(0.2, 0.12, 1) },
    'canal-k': { stage: 'ap', t: lp(2.3, 0, -0.5), r: 3.3, dir: V(0.1, 0.15, 1) },
    'canal-vaz': { stage: 'ap', t: lp(-3.5, 0, -1.5), r: 3.0, dir: V(0.1, 0.15, 1) },
    bomba: { stage: 'ap', t: lp(5.0, 0, 1.1), r: 3.4, dir: V(0.1, 0.15, 1) },
    'ion-na': { stage: 'ap' },
    extracelular: { stage: 'ap' },
    'ion-k': { stage: 'ap' },
  });
  };

  /* =====================================================================
     TECIDO: o neurônio no meio em que ele vive
     ===================================================================== */
  builders.tissue = () => {
  rnd = rng(35);
  const Tb = new Builder(), Ot = V(0, -1800, 0);
  /** Neurônio simplificado: soma, dendritos, cone, axônio mielinizado e botões. Devolve mielinas e botões. */
  function liteNeuron(c, o) {
    const sh = o.main ? 'main' : 'tis', r = o.r, out = { myelin: [], boutons: [], c, r };
    Tb.add('soma', organic(new THREE.SphereGeometry(r, 44, 30), (v) => { const n = 1 + 0.05 * Math.sin(v.x * 1.3 + c.x) * Math.sin(v.y * 1.5 + c.y); v.multiplyScalar(n); }).translate(c.x, c.y, c.z), o.main ? 'solid' : 'tis');
    const store = [];
    o.trunks.forEach((t) => { const d = V(t[0], t[1], t[2]).normalize(); grow(Tb, 'dendritos', sh, c.clone().addScaledVector(d, r * 0.82), d, o.len || 3.3, r * 0.15, o.depth || 2, store, -1, -1, { flare: 0.9 }); });
    out.dend = store;
    const h = V(o.h[0], o.h[1], o.h[2]).normalize(), hp = [0.8, 1.25, 1.75].map((k) => c.clone().addScaledVector(h, r * k));
    Tb.add('cone', tube(hp, (t) => 0.27 + r * 0.34 * Math.pow(1 - t, 2), { radial: 20, segs: 16 }), sh);
    const ax = curveOf([hp[2], ...o.axon.map((p) => V(p[0], p[1], p[2]))]), len = ax.getLength();
    Tb.add('axonio', tube(ax, 0.26, { radial: 12, segs: Math.round(len * 2.2) }), sh);
    out.ax = ax;
    const nSeg = Math.max(1, Math.round((len * 0.8) / 5.4)), span = 0.82 / nSeg;
    for (let i = 0; i < nSeg; i++) {
      const u0 = 0.09 + i * span + 0.012, u1 = 0.09 + (i + 1) * span - 0.012, sc2 = subCurve(ax, u0, u1, 10);
      Tb.add('mielina', tube(sc2, sleeve(0.28, 0.66, 0.09), { radial: 18, segs: 30 }));
      out.myelin.push(ax.getPointAt((u0 + u1) / 2));
    }
    const E2 = ax.getPointAt(1), T2 = ax.getTangentAt(1), side = V().crossVectors(T2, V(0, 0, 1)).normalize();
    [[0.9, 0.2], [-0.8, 0.5], [0.1, -0.7]].forEach((k) => {
      const end = E2.clone().addScaledVector(T2, 1.5).addScaledVector(side, k[0] * 1.3).add(V(0, 0, k[1] * 1.4));
      Tb.add('axonio', tube([E2, E2.clone().lerp(end, 0.5).addScaledVector(T2, 0.3), end], (t) => 0.24 - 0.1 * t, { radial: 10, segs: 14 }), sh);
      Tb.add('terminal', ball(0.36, end, [1, 0.88, 1], 16), sh);
      out.boutons.push(end);
    });
    return out;
  }
  const NEU = [
    liteNeuron(V(-7, 4, 0), { main: true, r: 2.6, depth: 3, trunks: [[-1, 0.3, 0.1], [-0.5, 0.9, -0.2], [0.3, 1, 0.2], [-0.7, -0.6, 0.3], [0.9, 0.5, -0.3], [-0.2, -1, -0.2]], h: [0.75, -0.66, 0], axon: [[-1, -2.5, 0.3], [3, -8, 0], [6, -12.5, 0.8], [8.2, -15.2, 1.4]] }),
    liteNeuron(V(-23, -14, -4), { r: 2.3, trunks: [[-1, 0.2, 0], [-0.3, 1, 0.2], [-0.5, -0.9, 0.2], [0.6, -0.8, -0.2], [0.2, 0.3, -1]], h: [0.9, 0.42, 0.1], axon: [[-17.5, -9.5, -3], [-14, -4.5, -1.6], [-12.2, -1.2, -0.8]] }),
    liteNeuron(V(6, 20, -6), { r: 2.4, trunks: [[1, 0.3, 0.1], [0.3, 1, 0.1], [-0.6, 0.8, -0.2], [0.8, -0.6, 0.2], [0, 0.2, -1]], h: [-0.8, -0.6, 0.2], axon: [[1.2, 15.6, -4], [-1.2, 12.4, -2], [-3.2, 9.9, -1]] }),
    liteNeuron(V(12.5, -19.5, 3), { r: 2.5, trunks: [[0.2, 1, -0.2], [1, 0.3, 0.1], [0.7, -0.7, 0.2], [-0.5, 0.8, -0.3], [0.1, -0.3, 1]], h: [-1, -0.28, 0], axon: [[5, -22.5, 2], [-4, -24.6, 0], [-13.5, -22.6, -2]] }),
    liteNeuron(V(-22, 17, 3), { r: 2.2, trunks: [[-1, 0, 0.1], [-0.4, 1, 0], [-0.5, -0.9, 0.1], [0.3, -0.9, -0.3], [0, 0.2, 1]], h: [0.9, 0.3, -0.3], axon: [[-14, 19.6, 0.5], [-7, 22, -2.5], [0.2, 21.6, -5]] }),
    liteNeuron(V(33, 5, 1), { r: 2.3, trunks: [[1, 0.2, 0], [0.4, 1, 0.2], [0.8, -0.7, -0.1], [-0.6, 0.8, 0.2], [0, 0.1, -1]], h: [-0.6, -0.8, 0], axon: [[29.6, -4, 1.5], [25.4, -10.5, 2.6], [19.6, -15.6, 3]] }),
  ];
  // capilar, com hemácias visíveis através da parede
  const cap = curveOf([V(27, 29, -5), V(23.5, 15, -4.5), V(22, 3, -4), V(24, -10, -4.5), V(28, -29, -5)]), CAPR = 1.3;
  Tb.add('capilar', tube(cap, CAPR, { radial: 26, segs: 80 }));
  for (let i = 0; i < 15; i++) {
    const u = (i + 0.5) / 15, p = cap.getPointAt(u), t = cap.getTangentAt(u);
    Tb.add('capilar', place(ball(0.82, null, [1, 0.3, 1], 16), { p: p.add(rv(0.5)), dir: t.clone().add(rv(0.9)) }), 'rbc');
  }
  // oligodendrócitos: braços até as mielinas mais próximas
  const allMy = NEU.flatMap((n) => n.myelin);
  [V(1.5, -13.5, -2.5), V(-11, 14.5, -3), V(-17.5, -3.5, -4), V(24.5, -16.5, 1)].forEach((o) => {
    const near = allMy.map((m) => ({ m, d: m.distanceTo(o) })).filter((e) => e.d < 12).sort((a, b) => a.d - b.d).slice(0, 4);
    if (!near.length) return;
    Tb.add('oligodendrocito', ball(0.8, o, [1.05, 0.95, 1], 22));
    near.forEach(({ m }) => {
      const t = m.clone().add(o.clone().sub(m).normalize().multiplyScalar(0.62));
      Tb.add('oligodendrocito', tube([o.clone(), o.clone().lerp(t, 0.5).add(V(0, 0.6, 0.5)), t], (u) => 0.24 * (1 + 0.9 * Math.exp(-u * 6)) * (1 - 0.55 * u), { radial: 9, segs: 22 }));
      Tb.add('oligodendrocito', ball(0.19, t, [1.5, 0.7, 1.3], 10));
    });
  });
  // astrócitos: prolongamentos pelo tecido, nas sinapses e encostados no capilar
  const allBt = NEU.flatMap((n) => n.boutons), astroAt = [V(15, 6.5, -1), V(17, -9, 0), V(-13.5, 7.5, 2), V(29.5, 19, -2), V(-27.5, 1.5, -2), V(-4, -14, 2)];
  astroAt.forEach((a) => {
    Tb.add('astrocito', ball(0.95, a, [1.1, 0.95, 1], 24));
    for (let i = 0; i < 8; i++) { const an = (i / 8) * Math.PI * 2 + a.x, d = V(Math.cos(an), Math.sin(an), R(-0.6, 0.6)).normalize(); grow(Tb, 'astrocito', 'main', a.clone().addScaledVector(d, 0.7), d, 2.2, 0.25, 2, [], -1, -1, { flare: 0.8, wob: 0.5 }); }
    const arm = (t, foot) => {
      Tb.add('astrocito', tube([a.clone(), a.clone().lerp(t, 0.5).add(V(0, 0.5, 0.4)), t], (u) => 0.4 * (1 + 0.8 * Math.exp(-u * 7)) * (1 - 0.6 * u), { radial: 10, segs: 26 }));
      Tb.add('astrocito', ball(foot, t, [1.15, 0.6, 1.15], 14));
    };
    let best = null; for (let i = 0; i <= 60; i++) { const p = cap.getPointAt(i / 60), d = p.distanceTo(a); if (!best || d < best.d) best = { p, d }; }
    if (best.d < 13) arm(best.p.clone().add(a.clone().sub(best.p).normalize().multiplyScalar(CAPR + 0.12)), 0.6);
    const bt = allBt.map((b) => ({ b, d: b.distanceTo(a) })).sort((x, y) => x.d - y.d)[0];
    if (bt.d < 11) arm(bt.b.clone().add(a.clone().sub(bt.b).normalize().multiplyScalar(0.5)), 0.42);
  });
  // micróglia
  [V(-2, -5.5, 3), V(-30, -23, 0), V(14, 11.5, 3), V(32, -12, -1), V(-31, 11, 1)].forEach((m) => {
    Tb.add('microglia', ball(0.45, m, [1.25, 0.85, 0.9], 16));
    for (let i = 0; i < 6; i++) { const an = (i / 6) * Math.PI * 2 + m.y, d = V(Math.cos(an), Math.sin(an), R(-0.6, 0.6)).normalize(); grow(Tb, 'microglia', 'main', m.clone().addScaledVector(d, 0.3), d, 1.3, 0.11, 2, [], -1, -1, { wob: 0.75, flare: 0.8 }); }
  });
  // parede do ventrículo: camada de células ependimárias
  const wallX = (y) => -37 - 0.007 * y * y;
  for (let iy = 0; iy < 30; iy++) for (let iz = 0; iz < 4; iz++) {
    const y = -25.4 + iy * 1.75, z = -2.7 + iz * 1.8, x = wallX(y);
    Tb.add('ependimaria', place(new RoundedBoxGeometry(1.9, 1.66, 1.7, 3, 0.26), { p: V(x, y, z) }));
    Tb.add('ependimaria', ball(0.4, V(x - 0.25, y, z), [1.1, 1, 1], 12), 'nuc');
  }
  const gTis = new THREE.Group(); gTis.position.copy(Ot);
  stages.tissue = { group: gTis, meshes: Tb.build(gTis, materialFor), box: { c: Ot.clone().add(V(-3.5, 0, 0)), hw: 43.5, hh: 30 }, dir: V(0, 0, 1), dist: [5, 320], shadow: 46 };
  {
    const TF = new Builder(), edge = [];
    for (let y = -27.5; y <= 27.5; y += 1.25) edge.push(new THREE.Vector2(wallX(y) - 1.08, y));
    edge.push(new THREE.Vector2(-53, 27.5), new THREE.Vector2(-53, -27.5));
    const vg = new THREE.ExtrudeGeometry(new THREE.Shape(edge), { depth: 7.6, bevelEnabled: false }); vg.translate(0, 0, -3.8);
    TF.add('liquor', toCreasedNormals(vg, Math.PI / 5));
    TF.add('sangue', tube(cap, CAPR - 0.16, { radial: 22, segs: 70 }));
    const capPts = []; for (let i = 0; i <= 48; i++) capPts.push(cap.getPointAt(i / 48));
    const pts = scatter(760, () => {
      const p = V(RM(-36, 41), RM(-29, 29), RM(-9, 9));
      if (p.x < wallX(p.y) + 1.3 || NEU.some((n) => p.distanceTo(n.c) < n.r + 0.3) || capPts.some((q) => p.distanceTo(q) < 1.8)) return null;
      return p;
    }, 1 / 31);
    addFluids(stages.tissue, TF, makeMotes(pts, 0.2));
  }
  const lt = (v, dx = 0, dy = 0, dz = 0) => Ot.clone().add(v).add(V(dx, dy, dz));
  L('tissue', tr('Líquido extracelular', 'Extracellular fluid'), 'extracelular', lt(V(-29.5, 9.5, 0)), 0, 'label', { liq: true });
  L('tissue', tr('Líquido dos ventrículos', 'Ventricular fluid'), 'liquor', lt(V(-45.5, -9, 3.8)), 0, 'label', { liq: true });
  L('tissue', tr('Sangue', 'Blood'), 'sangue', lt(cap.getPointAt(0.66), 0.2, 0, 1.1), 0, 'label', { liq: true });
  const n0 = NEU[0];
  L('tissue', tr('Abrir neurônio', 'Open neuron'), null, lt(n0.c, 0.4, -0.2, 2.7), 0, 'hot', { go: 'world', title: tr('Abrir este neurônio', 'Open this neuron') });
  L('tissue', tr('Dendritos', 'Dendrites'), 'dendritos', lt(n0.dend[1].curve.getPointAt(0.8)), 5);
  L('tissue', tr('Axônio', 'Axon'), 'axonio', lt(NEU[3].ax.getPointAt(0.06), 0, -0.2, 0.2), 5);
  L('tissue', tr('Bainha de mielina', 'Myelin sheath'), 'mielina', lt(n0.myelin[1], 0.4, 0.5, 0.3), 5);
  L('tissue', tr('Terminal axonal', 'Axon terminal'), 'terminal', lt(n0.boutons[0]), 7);
  L('tissue', tr('Astrócito', 'Astrocyte'), 'astrocito', lt(astroAt[0], 0, 0.9, 0.3), 0);
  L('tissue', tr('Oligodendrócito', 'Oligodendrocyte'), 'oligodendrocito', lt(V(1.5, -13.5, -2.5), 0, 0.8, 0), 0);
  L('tissue', tr('Micróglia', 'Microglia'), 'microglia', lt(V(14, 11.5, 3), 0, 0.4, 0), 0);
  L('tissue', tr('Capilar', 'Capillary'), 'capilar', lt(cap.getPointAt(0.3), 1.2, 0, 0.4), 0);
  L('tissue', tr('Células ependimárias', 'Ependymal cells'), 'ependimaria', lt(V(wallX(8), 8, 3.4), 0.9, 0, 0), 0);
  L('tissue', tr('Ventrículo', 'Ventricle'), null, lt(V(-43.5, 0, 0)), 0, 'note');
  L('tissue', tr('Outro neurônio', 'Another neuron'), null, lt(NEU[5].c, 0.4, -3.3, 0), 3.5, 'note');
  L('tissue', tr('Outro neurônio', 'Another neuron'), null, lt(NEU[1].c, 0, -3.3, 0), 3.5, 'note');
  Object.assign(home, {
    capilar: { stage: 'tissue', t: lt(cap.getPointAt(0.45), -2, 0, 0), r: 10 },
    sangue: { stage: 'tissue', t: lt(cap.getPointAt(0.6), -1, 0, 0), r: 8 },
    liquor: { stage: 'tissue', t: lt(V(-41, 0, 0)), r: 15 },
  });
  };

  const idsOf = (st) => new Set([...st.meshes, ...(st.fluids || [])].map((m) => m.userData.id));
  /** Monta uma vista na primeira vez em que ela é aberta. Devolve os rótulos novos, ou null se já existia. */
  function ensure(name) {
    if (stages[name] || !builders[name]) return null;
    const n0 = labels.length;
    builders[name]();
    stages[name].ids = idsOf(stages[name]);
    return labels.slice(n0);
  }
  stages.world.ids = idsOf(stages.world);
  const stageOf = (id) => Object.keys(HOME_STAGE).find((k) => HOME_STAGE[k].includes(id)) || 'world';
  return { stages, labels, home, materials, signal, ensure, stageOf, pending: () => Object.keys(builders).filter((k) => !stages[k]), get ap() { return ap; } };
}
