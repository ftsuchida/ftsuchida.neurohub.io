import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { V, rng, curveOf, subCurve, tube, sleeve, organic, ball, place, lathe, Builder } from './geo.js';
import { BY_ID } from './data.js';

/* Tons secundários de cada estrutura. O tom "main" usa a cor da ficha. */
const MUTE = '#B4B8C2';
const SHADES = {
  'tachinha|main': { metal: true },
  'pele|surf': { color: '#D6A88E' },
  'nervo|main': { opacity: 0.3 },
  'raiz-dorsal|main': { opacity: 0.36 },
  'raiz-ventral|main': { opacity: 0.36 },
  'ganglio|main': { opacity: 0.42 },
  'encefalo|stem': { color: '#D8A7B2' },
  'motor|myelin': { color: '#EFE4C8' },
  'jnm|shell': { side: THREE.DoubleSide, clip: 'nmj' },
  'jnm|inner': { color: '#FBD6DF', side: THREE.DoubleSide, clip: 'nmj' },
  'jnm|dense': { color: '#B54C6C' },
  'ach|mol': { color: '#F7CB2D' },
  'musculo|band': { color: '#A8484A' },
  'musculo|far': { mute: 0.5 },
};
/* Em qual vista fica o "ver de perto" de cada ficha (o que não está aqui fica na vista Corpo). */
const HOME_STAGE = {
  skin: ['pele', 'terminacao', 'canal-est', 'sodio'],
  cord: ['raiz-dorsal', 'ganglio', 'cinzenta', 'branca', 'sinapse', 'interneuronio', 'raiz-ventral'],
  nmj: ['jnm', 'ach', 'placa', 'receptor', 'ache'],
};

const seg = (p, a, b) => Math.max(0, Math.min(1, (p - a) / (b - a)));
const ease = (x) => x * x * (3 - 2 * x);

export function buildScene() {
  let rnd = rng(21);
  const R = (a, b) => a + rnd() * (b - a);
  const builders = {};

  /* ---------- materiais ---------- */
  const clip = { nmj: new THREE.Plane(V(0, 0, -1), 0.4) };
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
  // corpo "fantasma": só o contorno aparece, para deixar ver o sistema nervoso por dentro
  const ghostMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#7C8AA5') } },
    vertexShader: 'varying vec3 vN; varying vec3 vV;\nvoid main() {\n  vec4 mv = modelViewMatrix * vec4(position, 1.0);\n  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);\n  gl_Position = projectionMatrix * mv;\n}',
    fragmentShader: 'uniform vec3 uColor; varying vec3 vN; varying vec3 vV;\nvoid main() {\n  float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));\n  gl_FragColor = vec4(uColor, 0.06 + 0.72 * pow(f, 2.0));\n  #include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false,
  });
  const groundMat = new THREE.MeshStandardMaterial({ color: '#DCDCE2', roughness: 1, metalness: 0 });
  const setTheme = ({ ghost, clay }) => { ghostMat.uniforms.uColor.value.set(ghost); groundMat.color.set(clay); };

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
     CORPO: o pé na tachinha, o nervo da perna, a medula e o encéfalo.
     1 unidade = 10 cm. A perna direita é articulada e se levanta no fim.
     ===================================================================== */
  {
    const st = makeStage('body', V(0, 0, 0), { box: { c: V(0.7, 8.55, 0), hw: 4.5, hh: 9.3 }, dir: V(0.5, 0.1, 1), dist: [1.5, 110], shadow: 12, pulse: 0.13, thru: 0.45 });
    const g = st.group, B = new Builder();
    const ghost = (geo, parent) => { const m = new THREE.Mesh(geo, ghostMat); m.renderOrder = 6; (parent || g).add(m); return m; };
    const HIPY = 8.757, HZ = 0.95, L1 = 4.2, L2 = 4.0;

    // chão
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.2, 0.1, 72), groundMat);
    ground.position.set(0.8, -0.05, 0); ground.receiveShadow = true; g.add(ground);

    // tronco, cabeça e braços
    const torso = lathe([[0, 8.15], [1.2, 8.3], [1.7, 8.9], [1.6, 9.8], [1.38, 10.8], [1.55, 11.9], [1.85, 13.0], [1.95, 13.7], [1.5, 14.15], [0.62, 14.4], [0.55, 14.95]], { samples: 64, segs: 48 });
    torso.scale(0.58, 1, 1);
    ghost(torso);
    ghost(ball(1.05, V(0.12, 15.95, 0), [0.92, 1.08, 0.85], 40));
    for (const s of [1, -1]) {
      const sw = s > 0 ? -0.35 : 0.5; // os braços balançam ao contrário das pernas
      ghost(tube([V(0, 13.7, s * 2.1), V(sw * 0.5, 11.0, s * 2.3), V(sw * 1.6 + 0.3, 8.7, s * 2.2)], (t) => 0.44 - 0.14 * t, { radial: 16, segs: 20, capStart: true, capEnd: true }));
      ghost(ball(0.36, V(sw * 1.75 + 0.35, 8.3, s * 2.2), [0.7, 1.15, 0.45], 16));
    }

    // pernas
    function makeLeg(z) {
      const hip = new THREE.Group(); hip.position.set(0, HIPY, z); g.add(hip);
      const knee = new THREE.Group(); knee.position.set(0, -L1, 0); hip.add(knee);
      const ankle = new THREE.Group(); ankle.position.set(0, -L2, 0); knee.add(ankle);
      ghost(tube([V(0, 0.25, 0), V(0, -L1 / 2, 0), V(0, -L1, 0)], (t) => 0.88 - 0.32 * t, { radial: 20, segs: 16, capStart: true, capEnd: true }), hip);
      ghost(tube([V(0, 0, 0), V(-0.05, -L2 / 2, 0), V(0, -L2, 0)], (t) => 0.56 - 0.22 * t + 0.12 * Math.sin(Math.min(1, t * 1.6) * Math.PI), { radial: 18, segs: 18, capStart: true, capEnd: true }), knee);
      ghost(ball(1, V(0.62, -0.38, 0), [1.3, 0.37, 0.5], 28), ankle);
      return { hip, knee, ankle, set(a, b, c) { hip.rotation.z = a; knee.rotation.z = b; ankle.rotation.z = c; } };
    }
    const legL = makeLeg(-HZ); legL.set(-0.26, -0.02, 0.28);
    const leg = makeLeg(HZ);
    const POSE0 = [0.32, -0.12, -0.2], POSE1 = [1.02, -1.38, 0.3];
    const setLeg = (l) => leg.set(POSE0[0] + (POSE1[0] - POSE0[0]) * l, POSE0[1] + (POSE1[1] - POSE0[1]) * l, POSE0[2] + (POSE1[2] - POSE0[2]) * l);
    setLeg(0);

    // sistema nervoso central
    B.add('encefalo', organic(new THREE.SphereGeometry(1, 48, 34), (v) => { const k = 1 + 0.045 * Math.sin(v.x * 9) * Math.sin(v.y * 8 + 1) * Math.sin(v.z * 9 + 0.5); v.set(v.x * 0.84 * k + 0.14, v.y * 0.66 * k + 16.18, v.z * 0.7 * k); }));
    B.add('encefalo', ball(0.34, V(-0.4, 15.62, 0), [1, 0.72, 1.35], 20), 'stem');
    B.add('encefalo', tube([V(-0.02, 15.8, 0), V(-0.26, 15.2, 0), V(-0.5, 14.6, 0)], (t) => 0.22 - 0.06 * t, { radial: 14, segs: 12 }), 'stem');
    const cordPts = [V(-0.5, 14.6, 0), V(-0.75, 13.4, 0), V(-0.8, 12.0, 0), V(-0.68, 10.7, 0), V(-0.66, 10.1, 0)];
    B.add('medula', tube(cordPts, (t) => 0.16 - 0.03 * t, { radial: 14, segs: 40, capEnd: true }));
    const ascPts = [V(-0.66, 10.78, 0.2), V(-0.79, 12.0, 0.2), V(-0.74, 13.4, 0.2), V(-0.49, 14.6, 0.2), V(-0.24, 15.25, 0.22), V(0.0, 15.8, 0.42), V(0.24, 16.22, 0.7)];
    B.add('ascendente', tube(ascPts, 0.05, { radial: 8, segs: 60, capStart: true }));
    B.add('ascendente', ball(0.1, ascPts[ascPts.length - 1], null, 12));

    // nervo: fibra sensorial (sobe) e fibra motora (desce) lado a lado. As fibras passam pelo centro
    // de cada articulação, deslocadas só em z, para continuarem inteiras quando a perna dobra.
    const FR = 0.055, zs = 0.06, zm = -0.06;
    const trunkS = [V(-0.68, 10.7, 0.12), V(-0.6, 10.0, 0.42), V(-0.38, 9.3, 0.82), V(0, HIPY, HZ + zs)];
    const trunkM = [V(-0.6, 10.62, 0.06), V(-0.5, 9.95, 0.32), V(-0.3, 9.3, 0.72), V(0, HIPY, HZ + zm)];
    const thighS = [V(0, 0, zs), V(-0.36, -1.4, zs), V(-0.4, -2.9, zs), V(0, -L1, zs)];
    const thighM = [V(0, 0, zm), V(-0.36, -0.75, -0.02), V(-0.5, -1.45, 0.2), V(-0.44, -1.95, 0.45)];
    const shankS = [V(0, 0, zs), V(-0.26, -1.3, zs), V(-0.2, -2.9, zs), V(0, -L2, zs)];
    const footS = [V(0, 0, zs), V(0.4, -0.42, 0.04), V(1.15, -0.66, 0)];
    B.add('sensorial', tube(trunkS, FR, { radial: 8, segs: 24 }));
    B.add('motor', tube(trunkM, FR, { radial: 8, segs: 24 }));
    B.add('nervo', tube([V(-0.64, 10.6, 0.1), V(-0.55, 9.97, 0.37), V(-0.34, 9.3, 0.77), V(0, HIPY, HZ)], 0.19, { radial: 12, segs: 24 }));
    st.add(B);
    const Bt = new Builder(), Bs = new Builder(), Bf = new Builder();
    Bt.add('sensorial', tube(thighS, FR, { radial: 8, segs: 30 }));
    Bt.add('motor', tube(thighM, FR, { radial: 8, segs: 20 }));
    Bt.add('jnm', ball(0.1, thighM[3], null, 12));
    Bt.add('nervo', tube([V(0, 0, 0), V(-0.36, -1.4, 0), V(-0.4, -2.9, 0), V(0, -L1, 0)], (t) => 0.19 - 0.05 * t, { radial: 12, segs: 30 }));
    Bs.add('sensorial', tube(shankS, FR, { radial: 8, segs: 30 }));
    Bs.add('nervo', tube([V(0, 0, 0), V(-0.26, -1.3, 0), V(-0.2, -2.9, 0), V(0, -L2, 0)], (t) => 0.14 - 0.03 * t, { radial: 10, segs: 30 }));
    Bf.add('sensorial', tube(footS, FR, { radial: 8, segs: 14 }));
    Bf.add('terminacao', ball(0.11, footS[2], null, 12));
    st.meshes.push(...Bt.build(leg.hip, materialFor), ...Bs.build(leg.knee, materialFor), ...Bf.build(leg.ankle, materialFor));
    // músculo atrás da coxa: engrossa e encurta ao contrair
    const mus = new THREE.Group(); mus.position.set(-0.46, -2.35, 0); mus.rotation.z = -0.05; leg.hip.add(mus);
    st.live('musculo', 'main', tube([V(0, 1.5, 0), V(0, 0, 0), V(0, -1.5, 0)], sleeve(0.1, 0.44, 0.5), { radial: 20, segs: 30, capStart: true, capEnd: true }), mus);

    // tachinha, embaixo da planta do pé
    g.updateMatrixWorld(true);
    const sole = leg.ankle.localToWorld(footS[2].clone()), T = V(sole.x, 0, sole.z);
    const tack = new THREE.LatheGeometry([[0, 0], [0.3, 0], [0.3, 0.045], [0.07, 0.07], [0.045, 0.2], [0, 0.31]].map((p) => new THREE.Vector2(p[0], p[1])), 28);
    const Bk = new Builder(); Bk.add('tachinha', toCreasedNormals(tack, Math.PI / 5).translate(T.x, 0, T.z)); st.add(Bk);

    // sombras de contato sob os pés (o corpo fantasma não projeta sombra de verdade)
    for (const m of st.meshes) if (m.userData.id !== 'tachinha') m.castShadow = false;
    const blobTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(0,0,0,0.3)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.13)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })();
    const blob = (node) => {
      const c = node.localToWorld(V(0.62, -0.38, 0));
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, toneMapped: false }));
      m.position.set(c.x, 0.006, c.z); m.scale.set(3.6, 1, 1.7); m.renderOrder = 1; g.add(m);
      return m;
    };
    blob(legL.ankle); const blobR = blob(leg.ankle);

    // trajetos dos pulsos, com a perna apoiada
    const w = (node, pts) => pts.map((p) => node.localToWorld(p.clone()));
    const sensCurve = curveOf([...w(leg.ankle, footS).reverse(), ...w(leg.knee, shankS).reverse().slice(1), ...w(leg.hip, thighS).reverse().slice(1), ...trunkS.slice().reverse().slice(1)]);
    const motCurve = curveOf([...trunkM, ...w(leg.hip, thighM).slice(1)]);
    const ascCurve = curveOf(ascPts);

    st.animate = (step, p) => {
      let l = 0, mc = 0; const fl = [];
      st.hide();
      if (step === 'pisada') { l = 0.3 * (1 - ease(seg(p, 0.12, 0.5))); if (p > 0.5) fl.push('tachinha'); if (p > 0.62) fl.push('terminacao'); }
      else if (step === 'nervo') { st.train(sensCurve, p, 0.04, 0.96); fl.push('sensorial'); }
      else if (step === 'encefalo') { st.train(ascCurve, p, 0.04, 0.82); fl.push('ascendente'); if (p > 0.74) fl.push('encefalo'); }
      else if (step === 'levanta') {
        st.train(motCurve, p, 0.02, 0.42); if (p < 0.46) fl.push('motor');
        mc = ease(seg(p, 0.38, 0.56)); l = ease(seg(p, 0.48, 0.95)); if (p > 0.38) fl.push('musculo');
      }
      setLeg(l); mus.scale.set(1 + 0.32 * mc, 1 - 0.1 * mc, 1 + 0.32 * mc); blobR.material.opacity = Math.max(0, 1 - l * 2.2);
      return fl;
    };

    const track = (node, local) => ({ track: node, local });
    L('body', 'Encéfalo', 'encefalo', V(0.55, 16.62, 0.4), 0);
    L('body', 'Medula espinhal', 'medula', V(-0.82, 11.6, 0.14), 0);
    L('body', 'Via para o encéfalo', 'ascendente', V(-0.72, 13.6, 0.26), 0);
    L('body', 'Nervo', 'nervo', V(-0.45, 9.6, 0.62), 0);
    L('body', 'Neurônio motor', 'motor', V(), 0, 'label', track(leg.hip, thighM[1]));
    L('body', 'Músculo', 'musculo', V(), 0, 'label', track(leg.hip, V(-0.86, -2.6, 0.2)));
    L('body', 'Neurônio sensorial', 'sensorial', V(), 0, 'label', track(leg.knee, shankS[2]));
    L('body', 'Terminação sensorial', 'terminacao', V(), 26, 'label', track(leg.ankle, footS[2]));
    L('body', 'Tachinha', 'tachinha', V(T.x + 0.2, 0.05, T.z + 0.2), 0);
    L('body', 'Pele', null, V(), 0, 'hot', { go: 'skin', title: 'Ver a pele por dentro', ...track(leg.ankle, V(2.9, 0.15, 0.3)) });
    L('body', 'Medula', null, V(-0.9, 10.55, 0.6), 0, 'hot', { go: 'cord', title: 'Abrir a medula em corte' });
    L('body', 'Junção', null, V(), 0, 'hot', { go: 'nmj', title: 'Ver a junção neuromuscular', ...track(leg.hip, V(-1.15, -1.6, 0.4)) });

    const dir = st.dir;
    Object.assign(home, {
      tachinha: { stage: 'body', t: V(T.x - 0.3, 0.7, T.z), r: 1.8, dir: V(0.45, 0.16, 1) },
      sensorial: { stage: 'body', t: V(1.1, 4.6, HZ), r: 5.4, dir },
      nervo: { stage: 'body', t: V(-0.3, 9.5, 0.5), r: 2.4, dir },
      medula: { stage: 'body', t: V(-0.75, 12.3, 0), r: 3.3, dir },
      ascendente: { stage: 'body', t: V(-0.5, 13.4, 0), r: 4.0, dir },
      encefalo: { stage: 'body', t: V(0.1, 16.0, 0), r: 1.9, dir },
      motor: { stage: 'body', t: V(0.2, 8.0, HZ), r: 3.0, dir },
      musculo: { stage: 'body', t: V(0.5, 6.6, HZ), r: 2.8, dir },
    });
    Object.assign(stepView, {
      pisada: { t: V(T.x - 0.5, 1.2, T.z), r: 2.7, dir: V(0.5, 0.14, 1) },
      nervo: { t: V(0.6, 5.6, 0.5), r: 6.4, dir },
      encefalo: { t: V(-0.2, 13.1, 0), r: 4.6, dir },
      levanta: { t: V(0.9, 5.5, 0.5), r: 6.3, dir },
    });
  }

  /* =====================================================================
     PELE: bloco da sola do pé cortado ao meio. A tachinha entra por baixo
     e estica a terminação sensorial.
     ===================================================================== */
  builders.skin = () => {
    rnd = rng(31);
    const st = makeStage('skin', V(0, -300, 0), { box: { c: V(0, 1.45, 0), hw: 5.8, hh: 4.2 }, dir: V(0.12, 0.08, 1), dist: [1.2, 60], shadow: 8, pulse: 0.25 });
    const g = st.group, B = new Builder();
    B.add('pele', place(new RoundedBoxGeometry(10.4, 4.3, 2.4, 4, 0.18), { p: V(0, 2.5, -0.88) }));
    B.add('pele', place(new RoundedBoxGeometry(10.44, 0.44, 2.44, 3, 0.16), { p: V(0, 0.2, -0.88) }), 'surf');
    // terminação: o axônio desce, se ramifica e termina em um botão logo acima da ponta da tachinha
    const ZF = 0.5, Bc = V(0.1, 2.0, ZF), Pb = V(0.5, 3.15, ZF), top = V(0.95, 4.9, ZF);
    const axPts = [top, V(0.78, 4.0, ZF), Pb];
    B.add('sensorial', tube(axPts, 0.2, { radial: 14, segs: 20, capStart: true }));
    B.add('terminacao', tube([Pb, V(0.3, 2.7, ZF), V(0.13, 2.4, ZF)], (t) => 0.2 - 0.03 * t, { radial: 14, segs: 12 }));
    [[V(-0.5, 2.8, 0.55), V(-1.6, 2.45, 0.5), V(-2.35, 1.75, 0.45)], [V(1.3, 2.85, 0.5), V(2.2, 2.4, 0.5), V(2.8, 1.65, 0.45)]].forEach((pts) => {
      B.add('terminacao', tube([Pb, ...pts], (t) => 0.17 - 0.07 * t, { radial: 12, segs: 26 }));
      B.add('terminacao', ball(0.2, pts[2], null, 16));
    });
    B.add('terminacao', ball(0.21, Pb, null, 14));
    st.add(B);
    const bulb = st.live('terminacao', 'main', ball(0.5, null, null, 32)); bulb.position.copy(Bc);
    // tachinha (sobe ao entrar)
    const tack = new THREE.Group(); tack.position.set(0.1, 0, ZF); g.add(tack);
    st.live('tachinha', 'main', toCreasedNormals(new THREE.LatheGeometry([[0, -2.25], [1.15, -2.25], [1.15, -2.06], [0.24, -1.97], [0.15, 0.7], [0, 1.52]].map((p) => new THREE.Vector2(p[0], p[1])), 36), Math.PI / 5), tack);
    // canais sensíveis a estiramento: duas metades que se afastam quando a membrana estica
    const chans = [[0, -0.5, 0.86], [-0.66, -0.12, 0.74], [0.66, -0.12, 0.74], [-0.4, 0.52, 0.76], [0.42, 0.52, 0.75], [0, 0.06, 1]].map((d) => {
      const n = V(d[0], d[1], d[2]).normalize(), t = V().crossVectors(n, V(0, 1, 0)).normalize(), grp = new THREE.Group();
      grp.quaternion.setFromUnitVectors(V(0, 1, 0), n); g.add(grp);
      const geo = new THREE.CapsuleGeometry(0.075, 0.2, 6, 12);
      const halves = [-1, 1].map((s) => { const m = st.live('canal-est', 'main', geo, grp); m.userData.s = s; return m; });
      const tl = t.clone().applyQuaternion(grp.quaternion.clone().invert()); // a direção de abertura, no referencial do canal
      return { n, tl, grp, halves };
    });
    // Na⁺: os de fundo ficam no líquido de fora; os de fluxo entram pelos canais abertos
    const bg = [];
    for (let i = 0, t = 0; i < 30 && t < 900; t++) { const p = V(R(-3.6, 3.8), R(1.0, 3.7), R(0.35, 1.1)); if (p.distanceTo(Bc) < 1.05 || Math.abs(p.x - 0.1) < 0.4 && p.y < 1.7) continue; bg.push({ p, ph: R(0, 6.3), f: R(0.6, 1.3) }); i++; }
    const na = ionsMesh(st, 'sodio', bg.length + chans.length * 2, 0.085);
    const sc = V(1, 1, 1), pos = V();
    const axCurve = curveOf([V(0.12, 2.5, ZF), V(0.3, 2.75, ZF), Pb, V(0.78, 4.0, ZF), top]);

    st.animate = (step, p, time) => {
      // fora do passo, a cena fica no instante em que a membrana está esticada e os canais abertos
      let inn = 1, s = 1, open = 1, flow = 0.55; const fl = [];
      st.hide();
      if (step === 'pele') {
        inn = ease(seg(p, 0.02, 0.2)); s = ease(seg(p, 0.12, 0.28)); open = ease(seg(p, 0.22, 0.38)); flow = seg(p, 0.3, 0.42) * (p < 0.62 ? 1 : 0.45);
        if (p > 0.22 && p < 0.62) fl.push('canal-est'); if (p > 0.34 && p < 0.64) fl.push('terminacao');
        st.train(axCurve, p, 0.6, 0.98); if (p > 0.6) fl.push('sensorial');
      }
      tack.position.y = -1.45 * (1 - inn);
      sc.set(1 + 0.3 * s, 1 - 0.2 * s, 1 + 0.1 * s);
      bulb.scale.copy(sc); bulb.position.set(Bc.x, Bc.y + 0.07 * s, Bc.z);
      chans.forEach((c, i) => {
        c.grp.position.set(bulb.position.x + c.n.x * 0.5 * sc.x, bulb.position.y + c.n.y * 0.5 * sc.y, bulb.position.z + c.n.z * 0.5 * sc.z);
        const d = 0.078 + 0.075 * open;
        c.halves.forEach((m) => m.position.copy(c.tl).multiplyScalar(d * m.userData.s));
        for (let k = 0; k < 2; k++) {
          const u = (time * 0.55 + k * 0.5 + i * 0.17) % 1;
          pos.copy(c.grp.position).addScaledVector(c.n, 0.8 - 1.15 * u);
          setInst(na, bg.length + i * 2 + k, pos, flow * ease(Math.min(1, Math.min(u, 1 - u) * 6)));
        }
      });
      bg.forEach((b, i) => { pos.set(b.p.x + 0.12 * Math.sin(time * b.f + b.ph), b.p.y + 0.1 * Math.sin(time * b.f * 1.3 + b.ph * 2), b.p.z); setInst(na, i, pos, 1); });
      na.instanceMatrix.needsUpdate = true;
      return fl;
    };

    const lp = (x, y, z) => st.origin.clone().add(V(x, y, z));
    L('skin', 'Pele', 'pele', lp(-4.3, 4.1, 0), 0);
    L('skin', 'Tachinha', 'tachinha', lp(0.9, -1.3, ZF + 0.3), 0);
    L('skin', 'Terminação sensorial', 'terminacao', lp(-1.6, 2.45, 0.65), 0);
    L('skin', 'Canal de Na⁺ sensível a estiramento', 'canal-est', lp(Bc.x + 0.4, Bc.y + 0.32, Bc.z + 0.4), 0);
    L('skin', 'Na⁺', 'sodio', lp(bg[3].p.x, bg[3].p.y, bg[3].p.z), 0);
    L('skin', 'Neurônio sensorial', 'sensorial', lp(0.84, 4.3, ZF + 0.2), 0);
    L('skin', 'Superfície da sola do pé', null, lp(3.4, -0.35, 0), 0, 'note');
    L('skin', 'Para a medula', null, lp(0.95, 5.3, ZF), 0, 'note');
    Object.assign(home, {
      pele: { stage: 'skin' },
      terminacao: { stage: 'skin', t: lp(0.1, 2.5, ZF), r: 1.9 },
      'canal-est': { stage: 'skin', t: lp(Bc.x, Bc.y, Bc.z), r: 1.05 },
      sodio: { stage: 'skin', t: lp(Bc.x, Bc.y + 0.2, Bc.z), r: 1.7 },
    });
    stepView.pele = { box: { c: lp(0.25, 2.2, ZF), hw: 3.9, hh: 3.05 }, dir: st.dir };
  };

  /* =====================================================================
     MEDULA: uma fatia em corte, com as raízes do lado direito (o da perna
     que pisou). Dorsal fica ao fundo; ventral, à frente.
     ===================================================================== */
  builders.cord = () => {
    rnd = rng(41);
    const st = makeStage('cord', V(0, -600, 0), { box: { c: V(2.9, 0.9, 0.2), hw: 8.4, hh: 4.4 }, dir: V(0, 0.82, 1), dist: [1.5, 80], shadow: 12, pulse: 0.15, thru: 1.4 });
    const B = new Builder(), HH = 1.3;
    const slab = (pts, h, y0) => { const e = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: h, bevelEnabled: false }); e.rotateX(-Math.PI / 2); e.translate(0, y0, 0); return toCreasedNormals(e, Math.PI / 5); };
    const outer = [];
    for (let i = 0; i < 120; i++) {
      const t = (i / 120) * Math.PI * 2, d1 = (t - Math.PI * 1.5) / 0.16, d2 = (t - Math.PI / 2) / 0.12, k = 1 - 0.14 * Math.exp(-d1 * d1) - 0.045 * Math.exp(-d2 * d2);
      outer.push(new THREE.Vector2(4.3 * Math.cos(t) * k, 3.4 * Math.sin(t) * k));
    }
    B.add('branca', slab(outer, HH, -HH));
    // substância cinzenta em forma de borboleta (u = direita, v = dorsal)
    const half = [[0, 0.42], [0.5, 0.62], [0.72, 1.5], [1.05, 2.45], [1.45, 2.85], [1.85, 2.55], [1.8, 1.6], [2.0, 0.75], [2.65, 0.2], [2.95, -0.8], [2.7, -1.85], [1.85, -2.4], [0.95, -2.15], [0.6, -1.2], [0, -0.5]];
    const ring = [...half, ...half.slice(1, -1).reverse().map((p) => [-p[0], p[1]])].map((p) => V(p[0], p[1], 0));
    const gray = new THREE.CatmullRomCurve3(ring, true, 'catmullrom', 0.5).getPoints(180).map((p) => new THREE.Vector2(p.x, p.y));
    B.add('cinzenta', slab(gray, HH + 0.03, -HH));

    const Y = 0.24, FR = 0.07;
    const J = V(8.2, 0.1, -0.2), G = V(5.6, 0.25, -2.1), Ed = V(1.75, 0.22, -3.05), Pb = V(1.35, Y, -2.0);
    const b1 = V(1.72, Y, -1.02), b2 = V(0.98, Y, -1.42), b3 = V(1.98, Y + 0.02, 1.18);
    const A = V(1.82, Y + 0.02, -0.72), Bn = V(0.92, Y + 0.02, -1.12), M = V(1.95, Y + 0.06, 1.62);
    const dorsal = [J, V(7.0, 0.2, -1.2), G, V(4.0, 0.25, -2.75), V(2.6, 0.22, -3.05), Ed];
    const sensIn = [V(10.3, 0.1, -0.2), ...dorsal, V(1.5, Y, -2.6), Pb];
    B.add('sensorial', tube(sensIn, FR, { radial: 10, segs: 90, capStart: true }));
    B.add('sensorial', tube([Pb, V(1.55, Y, -1.5), b1], (t) => FR - 0.02 * t, { radial: 8, segs: 14 }));
    B.add('sensorial', tube([Pb, V(1.1, Y, -1.78), b2], (t) => FR - 0.02 * t, { radial: 8, segs: 14 }));
    // corpo celular do neurônio sensorial, dentro do gânglio
    const somaS = G.clone().add(V(0.05, 0.1, -0.5));
    B.add('sensorial', ball(0.3, somaS, null, 20));
    B.add('sensorial', tube([G, G.clone().lerp(somaS, 0.5), somaS], FR, { radial: 8, segs: 8 }));
    B.add('raiz-dorsal', tube(dorsal, 0.4, { radial: 16, segs: 60 }));
    B.add('ganglio', ball(0.9, G.clone().add(V(0, 0, -0.12)), [1.3, 0.85, 1.05], 28));
    // interneurônio: do axônio sensorial ao neurônio motor
    const cell = (id, c, r, dirs, len) => {
      B.add(id, ball(r, c, [1.1, 0.85, 1], 20));
      dirs.forEach((d) => { const e = c.clone().add(V(d[0], 0, d[1]).multiplyScalar(len)); B.add(id, tube([c, c.clone().lerp(e, 0.5).add(V(0, 0.02, 0)), e], (t) => 0.07 - 0.04 * t, { radial: 7, segs: 8, capEnd: true })); });
    };
    cell('interneuronio', A, 0.27, [[-0.8, -0.5], [0.9, -0.3], [-0.7, 0.6]], 0.55);
    const aAxon = [A, V(2.08, Y, -0.1), V(2.12, Y, 0.7), b3];
    B.add('interneuronio', tube(aAxon, FR - 0.01, { radial: 8, segs: 30 }));
    // neurônio que manda o axônio para o encéfalo
    cell('ascendente', Bn, 0.27, [[-0.9, -0.3], [0.3, 0.95], [-0.5, -0.85]], 0.5);
    const bAxon = [Bn, V(0.5, Y, -0.55), V(0, Y, -0.05), V(-0.9, Y, 0.55), V(-2.2, Y, 1.3), V(-3.2, Y, 1.45), V(-3.32, 0.75, 1.45), V(-3.32, 3.5, 1.45)];
    B.add('ascendente', tube(curveOf(bAxon), FR, { radial: 8, segs: 80 }));
    B.add('ascendente', place(new THREE.ConeGeometry(0.2, 0.5, 14), { p: V(-3.32, 3.72, 1.45) }));
    // neurônio motor
    cell('motor', M, 0.44, [[-0.95, -0.25], [-0.55, 0.8], [0.75, -0.65], [0.95, 0.2], [-0.2, -0.98]], 0.75);
    const Ev = V(2.45, 0.22, 2.82), ventral = [Ev, V(4.2, 0.2, 2.6), V(6.2, 0.18, 1.5), V(7.3, 0.14, 0.55), V(8.2, 0.1, 0.1)];
    const motOut = [M, V(2.25, Y, 2.3), ...ventral, V(10.3, 0.1, 0.1)];
    B.add('motor', tube(motOut, FR + 0.01, { radial: 10, segs: 90, capEnd: true }));
    B.add('raiz-ventral', tube(ventral, 0.38, { radial: 16, segs: 50 }));
    B.add('nervo', tube([V(7.85, 0.1, -0.05), V(9.2, 0.1, -0.05), V(10.5, 0.1, -0.05)], 0.56, { radial: 18, segs: 12, capEnd: true }));
    [b1, b2, b3].forEach((b) => B.add('sinapse', ball(0.13, b, null, 14)));
    st.add(B);

    const cIn = curveOf(sensIn), cT1 = curveOf([Pb, V(1.55, Y, -1.5), b1]), cT2 = curveOf([Pb, V(1.1, Y, -1.78), b2]);
    const cA = curveOf(aAxon), cB = curveOf(bAxon), cM = curveOf(motOut);
    st.animate = (step, p) => {
      const fl = [];
      st.hide();
      if (step === 'medula') {
        st.train(cIn, p, 0.02, 0.44); if (p < 0.48) fl.push('sensorial');
        st.train(cT1, p, 0.4, 0.52, 1, 3); st.train(cT2, p, 0.4, 0.52, 1, 4);
        if (p > 0.48 && p < 0.72) fl.push('sinapse');
        if (p > 0.56) fl.push('interneuronio', 'ascendente');
        st.train(cB, p, 0.68, 1.0, 2, 0, 0.2); st.train(cA, p, 0.7, 0.96, 1, 5);
      } else if (step === 'motor') {
        st.train(cA, p, 0.02, 0.3); if (p < 0.34) fl.push('interneuronio');
        if (p > 0.26 && p < 0.5) fl.push('sinapse');
        if (p > 0.34) fl.push('motor');
        st.train(cM, p, 0.46, 0.98);
      }
      return fl;
    };

    const lp = (x, y, z) => st.origin.clone().add(V(x, y, z));
    L('cord', 'Substância branca', 'branca', lp(-2.7, 0.02, -1.9), 0);
    L('cord', 'Substância cinzenta', 'cinzenta', lp(-1.75, 0.06, 1.75), 0);
    L('cord', 'Raiz dorsal', 'raiz-dorsal', lp(3.6, 0.6, -2.85), 0);
    L('cord', 'Gânglio da raiz dorsal', 'ganglio', lp(5.6, 0.95, -2.3), 0);
    L('cord', 'Raiz ventral', 'raiz-ventral', lp(5.2, 0.52, 2.1), 0);
    L('cord', 'Nervo', 'nervo', lp(9.5, 0.62, 0), 0);
    L('cord', 'Neurônio sensorial', 'sensorial', lp(7.0, 0.3, -1.2), 0);
    L('cord', 'Sinapse', 'sinapse', lp(b1.x, b1.y + 0.1, b1.z), 9);
    L('cord', 'Interneurônio', 'interneuronio', lp(A.x + 0.2, A.y + 0.2, A.z), 0);
    L('cord', 'Via para o encéfalo', 'ascendente', lp(-2.2, Y + 0.05, 1.3), 0);
    L('cord', 'Neurônio motor', 'motor', lp(M.x + 0.2, M.y + 0.3, M.z), 0);
    L('cord', 'Dorsal (costas)', null, lp(-0.4, 0.1, -4.2), 0, 'note');
    L('cord', 'Ventral (frente)', null, lp(-0.4, 0.1, 4.3), 0, 'note');
    L('cord', 'Ao encéfalo', null, lp(-3.32, 4.4, 1.45), 0, 'note');
    L('cord', 'Para a perna', null, lp(11.2, 0.5, 0), 0, 'note');
    Object.assign(home, {
      sinapse: { stage: 'cord', t: lp(1.4, Y, -1.4), r: 1.5, dir: V(0, 1, 0.6) },
      interneuronio: { stage: 'cord', t: lp(1.9, Y, 0), r: 2.4, dir: V(0, 1, 0.6) },
      ganglio: { stage: 'cord', t: lp(G.x, G.y, G.z), r: 2.6 },
      'raiz-dorsal': { stage: 'cord', t: lp(4.6, 0.3, -2.4), r: 4.2 },
      'raiz-ventral': { stage: 'cord', t: lp(5.0, 0.2, 2.0), r: 4.2 },
      cinzenta: { stage: 'cord', t: lp(0, 0, 0), r: 4.0, dir: V(0, 1, 0.5) },
      branca: { stage: 'cord', t: lp(0, 0, 0), r: 5.0, dir: V(0, 1, 0.5) },
    });
  };

  /* =====================================================================
     MÚSCULO: a junção neuromuscular. O terminal do axônio motor, aberto em
     corte, fica apoiado nas dobras da placa motora.
     ===================================================================== */
  builders.nmj = () => {
    rnd = rng(51);
    const st = makeStage('nmj', V(0, -900, 0), { box: { c: V(-0.2, 0.25, 0), hw: 7.7, hh: 6.1 }, dir: V(0.14, 0.12, 1), dist: [1.2, 70], shadow: 11, pulse: 0.2 });
    const g = st.group, B = new Builder();
    // fibra muscular (contrai) e duas vizinhas
    const fib = new THREE.Group(); fib.position.set(0, -2.25, 0); g.add(fib);
    const Bfib = new Builder();
    Bfib.add('musculo', new THREE.CapsuleGeometry(1.5, 12.4, 10, 44).rotateZ(Math.PI / 2));
    for (let x = -6; x <= 6.01; x += 0.6) Bfib.add('musculo', new THREE.CylinderGeometry(1.513, 1.513, 0.17, 44, 1, true).rotateZ(Math.PI / 2).translate(x, 0, 0), 'band');
    // placa motora: dobras alinhadas com as zonas ativas
    const RX = [-1.56, -1.04, -0.52, 0, 0.52, 1.04, 1.56], prof = [new THREE.Vector2(-2.0, 1.3), new THREE.Vector2(-2.0, 1.5)];
    RX.forEach((cx) => prof.push(new THREE.Vector2(cx - 0.22, 1.5), new THREE.Vector2(cx - 0.14, 1.82), new THREE.Vector2(cx + 0.14, 1.82), new THREE.Vector2(cx + 0.22, 1.5)));
    prof.push(new THREE.Vector2(2.0, 1.5), new THREE.Vector2(2.0, 1.3));
    Bfib.add('placa', toCreasedNormals(new THREE.ExtrudeGeometry(new THREE.Shape(prof), { depth: 1.8, bevelEnabled: false }).translate(0, 0, -0.9), Math.PI / 5));
    const recs = [];
    RX.forEach((cx) => [-0.38, 0.42].forEach((z) => { recs.push(V(cx, 1.86, z)); Bfib.add('receptor', ringY(0.105, 0.04, 0.2).translate(cx, 1.86, z)); }));
    st.meshes.push(...Bfib.build(fib, materialFor));
    B.add('musculo', new THREE.CapsuleGeometry(1.5, 12.4, 10, 32).rotateZ(Math.PI / 2).translate(0.9, -2.9, -3.3), 'far');
    B.add('musculo', new THREE.CapsuleGeometry(1.5, 12.4, 10, 32).rotateZ(Math.PI / 2).translate(-0.7, -4.75, -1.5), 'far');
    // terminal do axônio motor, aberto em corte
    const bulbP = [[0, 0], [1.3, 0], [1.9, 0.12], [2.1, 0.62], [1.92, 1.22], [1.36, 1.76], [0.78, 2.14], [0.52, 2.6]];
    B.add('jnm', lathe(bulbP, { samples: 60, segs: 64 }), 'shell');
    B.add('jnm', lathe(bulbP.map((p, i) => [Math.max(0, p[0] - (i === 0 ? 0 : 0.13)), p[1] + (i < 2 ? 0.1 : 0)]), { samples: 60, segs: 64 }), 'inner');
    const AZ = [-1.04, -0.52, 0, 0.52, 1.04];
    AZ.forEach((x) => B.add('jnm', place(new RoundedBoxGeometry(0.32, 0.08, 1.1, 2, 0.03), { p: V(x, 0.15, -0.25) }), 'dense'));
    const axPts = [V(-6.4, 5.7, 0.2), V(-3.7, 4.25, 0.15), V(-1.55, 3.15, 0.05), V(-0.4, 2.72, 0), V(0, 2.45, 0)], axC = curveOf(axPts);
    B.add('motor', tube(axC, (t) => 0.4 + 0.12 * t * t, { radial: 20, segs: 50, capStart: true }));
    [[0.04, 0.34], [0.4, 0.7]].forEach((s) => B.add('motor', tube(subCurve(axC, s[0], s[1], 10), sleeve(0.42, 0.72, 0.1), { radial: 22, segs: 30 }), 'myelin'));
    // vesículas com acetilcolina: soltas e atracadas nas zonas ativas
    const ves = [];
    for (let i = 0, t = 0; i < 22 && t < 900; t++) {
      const y = R(0.55, 1.75), rmax = 1.85 - Math.max(0, y - 0.9) * 1.25, a = R(0, Math.PI * 2), rr = Math.sqrt(rnd()) * rmax, p = V(Math.cos(a) * rr, y, Math.sin(a) * rr * 0.75 - 0.25);
      if (p.z > 0.15 || ves.some((q) => q.distanceTo(p) < 0.4)) continue;
      ves.push(p); i++;
    }
    const docked = AZ.map((x, i) => V(x, 0.36, -0.1 - (i % 2) * 0.35));
    [...ves, ...docked].forEach((p) => B.add('ach', ball(0.17, p, null, 14)));
    const ache = [];
    for (let i = 0; i < 12; i++) { const p = V(R(-1.7, 1.7), R(-0.3, -0.14), R(-0.55, 0.7)); ache.push(p); B.add('ache', ball(0.075, p, [1.2, 0.8, 1], 10)); }
    st.add(B);

    // acetilcolina liberada: sai das zonas ativas e atravessa a fenda até os receptores
    const NM = 40, mol = new THREE.InstancedMesh(new THREE.SphereGeometry(0.058, 10, 8), materialFor('ach', 'mol'), NM);
    mol.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mol.frustumCulled = false; mol.userData.id = 'ach'; g.add(mol); st.meshes.push(mol);
    const recW = recs.map((r) => V(r.x, r.y - 2.25, r.z)); // posição dos receptores com a fibra relaxada
    const mols = []; for (let i = 0; i < NM; i++) { const a = AZ[i % AZ.length], r = recW[Math.floor(rnd() * recW.length)]; mols.push({ a: V(a + R(-0.12, 0.12), 0.0, R(-0.6, 0.5)), b: V(r.x + R(-0.16, 0.16), r.y + R(0.12, 0.3), r.z + R(-0.16, 0.16)), d: R(0, 0.35) }); }
    // Na⁺: os de fundo ficam na fenda; os de fluxo entram na fibra pelos receptores abertos
    const bg = []; for (let i = 0; i < 12; i++) bg.push({ p: V(R(-3.4, 3.4) * (i % 2 ? 1 : -1) * 0.5 + (i % 2 ? 2.4 : -2.4), R(-0.5, 0.35), R(0.2, 0.9)), ph: R(0, 6.3), f: R(0.6, 1.2) });
    const flowAt = recW.filter((_, i) => i % 2 === 1);
    const na = ionsMesh(st, 'sodio', bg.length + flowAt.length * 2, 0.07);
    const pos = V(), mL = curveOf([V(-2.2, -0.72, 0.95), V(-4.2, -0.72, 0.95), V(-6.4, -0.72, 0.95)]), mR = curveOf([V(2.2, -0.72, 0.95), V(4.2, -0.72, 0.95), V(6.4, -0.72, 0.95)]);

    st.animate = (step, p, time) => {
      let cross = 0, gone = 0, flow = 0, c = 0; const fl = [];
      st.hide();
      if (step === 'juncao') {
        st.train(axC, p, 0.0, 0.2); if (p < 0.24) fl.push('motor');
        if (p > 0.18 && p < 0.34) fl.push('jnm');
        cross = seg(p, 0.26, 0.5); gone = seg(p, 0.68, 0.84); if (p > 0.26 && p < 0.7) fl.push('ach');
        if (p > 0.44 && p < 0.76) fl.push('receptor'); flow = seg(p, 0.46, 0.54) * (1 - seg(p, 0.72, 0.8));
        if (p > 0.68 && p < 0.86) fl.push('ache');
        st.train(mL, p, 0.6, 0.84, 1, 3); st.train(mR, p, 0.6, 0.84, 1, 4);
        c = ease(seg(p, 0.8, 0.98)); if (p > 0.6) fl.push('musculo');
      }
      mols.forEach((m, i) => { const q = ease(seg(cross, m.d, m.d + 0.65)); pos.lerpVectors(m.a, m.b, q); pos.x += 0.05 * Math.sin(time * 5 + i); setInst(mol, i, pos, cross > m.d ? 1 - gone : 0); });
      mol.instanceMatrix.needsUpdate = true;
      flowAt.forEach((r, i) => { for (let k = 0; k < 2; k++) { const u = (time * 0.7 + k * 0.5 + i * 0.13) % 1; pos.set(r.x, r.y + 0.45 - 1.0 * u, r.z); setInst(na, bg.length + i * 2 + k, pos, flow * ease(Math.min(1, Math.min(u, 1 - u) * 6))); } });
      bg.forEach((b, i) => { pos.set(b.p.x + 0.1 * Math.sin(time * b.f + b.ph), b.p.y + 0.08 * Math.sin(time * b.f * 1.3 + b.ph * 2), b.p.z); setInst(na, i, pos, 1); });
      na.instanceMatrix.needsUpdate = true;
      fib.scale.set(1 - 0.18 * c, 1 + 0.1 * c, 1 + 0.1 * c); fib.position.y = -2.25 - 0.15 * c;
      return fl;
    };

    const lp = (x, y, z) => st.origin.clone().add(V(x, y, z));
    L('nmj', 'Neurônio motor', 'motor', lp(-1.55, 3.5, 0.45), 0);
    L('nmj', 'Junção neuromuscular', 'jnm', lp(2.05, 0.75, -0.2), 0);
    L('nmj', 'Vesículas com acetilcolina', 'ach', lp(ves[1].x, ves[1].y, ves[1].z + 0.18), 0);
    L('nmj', 'Zona ativa', 'jnm', lp(-1.04, 0.16, 0.3), 16);
    L('nmj', 'Acetilcolinesterase', 'ache', lp(ache[0].x, ache[0].y, ache[0].z), 12);
    L('nmj', 'Receptor nicotínico', 'receptor', lp(1.56, -0.36, 0.42), 0);
    L('nmj', 'Placa motora', 'placa', lp(-1.95, -0.62, 0.9), 0);
    L('nmj', 'Fibra muscular', 'musculo', lp(4.7, -1.25, 1.2), 0);
    L('nmj', 'Na⁺', 'sodio', lp(bg[1].p.x, bg[1].p.y, bg[1].p.z), 10);
    L('nmj', 'Fenda', null, lp(2.5, -0.2, 0.3), 12, 'note');
    Object.assign(home, {
      jnm: { stage: 'nmj' },
      ach: { stage: 'nmj', t: lp(0, 0.8, 0), r: 2.2 },
      placa: { stage: 'nmj', t: lp(0, -0.5, 0.2), r: 2.4, dir: V(0.1, 0.3, 1) },
      receptor: { stage: 'nmj', t: lp(0, -0.35, 0.2), r: 1.7, dir: V(0.1, 0.32, 1) },
      ache: { stage: 'nmj', t: lp(0, -0.2, 0.2), r: 1.7, dir: V(0.1, 0.2, 1) },
    });
    stepView.juncao = { box: { c: lp(-0.5, 0.75, 0), hw: 5.2, hh: 3.75 }, dir: st.dir };
  };

  const idsOf = (st) => new Set(st.meshes.map((m) => m.userData.id));
  /** Monta uma vista na primeira vez em que ela é aberta. Devolve os rótulos novos, ou null se já existia. */
  function ensure(name) {
    if (stages[name] || !builders[name]) return null;
    const n0 = labels.length;
    builders[name]();
    stages[name].ids = idsOf(stages[name]);
    return labels.slice(n0);
  }
  stages.body.ids = idsOf(stages.body);
  const stageOf = (id) => Object.keys(HOME_STAGE).find((k) => HOME_STAGE[k].includes(id)) || 'body';
  return { stages, labels, home, stepView, materials, ensure, stageOf, setTheme, pending: () => Object.keys(builders).filter((k) => !stages[k]) };
}
