// O que os palcos (cenas) deste item compartilham: um material por ficha, a face de corte, o fantasma do raio X,
// o clique que entende corte e regiões, e os rótulos colocados sozinhos no centro do que cada ficha ocupa na tela.
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { BY_ID } from './data.js';
import './geo.js'; // liga a busca acelerada de raios (acceleratedRaycast)

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const WHITE = new THREE.Color('#ffffff'), FAR = 1e4;
const BIAS = 0.006; // quanto cada nível de prioridade da face de corte anda na direção da câmera (cm)

/** Deixa uma geometria pronta para o palco: índice, normais, o atributo "ao" e a árvore de busca. */
export function ready(g) {
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'ao') g.deleteAttribute(k);
  if (!g.index) { const n = g.attributes.position.count, idx = n > 65535 ? new Uint32Array(n) : new Uint16Array(n); for (let i = 0; i < n; i++) idx[i] = i; g.setIndex(new THREE.BufferAttribute(idx, 1)); }
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.ao) g.setAttribute('ao', new THREE.BufferAttribute(new Uint8Array(g.attributes.position.count).fill(255), 1, true));
  if (!g.boundingBox) g.computeBoundingBox();
  if (!g.boundingSphere) g.computeBoundingSphere();
  if (!g.boundsTree) g.boundsTree = new MeshBVH(g);
  return g;
}

/* A oclusão de ambiente vem pronta no atributo "ao" (0 a 1 por vértice) e escurece a luz que sai do material. */
function withAO(m) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float ao;\nvarying float vAo;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvAo = ao;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vAo;').replace('#include <opaque_fragment>', 'outgoingLight *= vAo;\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'ao';
  return m;
}

/* Face de corte. Para cada sólido fechado, dois desenhos:
   1. a "marca": a malha inteira (o que sobrou do corte), frente e verso, sem cor e sem profundidade, só invertendo
      um bit do estêncil. Um raio que entra no sólido pela secção atravessa um número ímpar de paredes; então o bit
      fica ligado exatamente nos pixels em que o plano de corte passa por dentro do sólido;
   2. a "tampa": um retângulo no plano de corte, na cor chapada da ficha, que só pinta onde o bit está ligado e o
      desliga ao passar, deixando o estêncil limpo para o sólido seguinte.
   Quando um sólido está dentro de outro, a tampa de maior prioridade fica um pouco mais perto da câmera. */
const CAP_GEO = new THREE.PlaneGeometry(900, 900);
const capStencil = { stencilWrite: true, stencilFunc: THREE.EqualStencilFunc, stencilRef: 1, stencilFuncMask: 1, stencilWriteMask: 1, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.ZeroStencilOp, stencilZPass: THREE.ZeroStencilOp };

/** Contorno translúcido (raio X): só as bordas aparecem, para deixar ver o que está dentro. */
function ghostMaterial(planes) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#7C8AA5') }, uGain: { value: 1 } },
    vertexShader: '#include <clipping_planes_pars_vertex>\nvarying vec3 vN; varying vec3 vV;\nvoid main() {\n  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);\n  vN = normalize(normalMatrix * normal); vV = normalize(-mvPosition.xyz);\n  gl_Position = projectionMatrix * mvPosition;\n  #include <clipping_planes_vertex>\n}',
    fragmentShader: '#include <clipping_planes_pars_fragment>\nuniform vec3 uColor; uniform float uGain; varying vec3 vN; varying vec3 vV;\nvoid main() {\n  #include <clipping_planes_fragment>\n  float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));\n  gl_FragColor = vec4(uColor, uGain * (0.035 + 0.5 * pow(f, 2.4)));\n  #include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false, clipping: true, clippingPlanes: planes,
  });
}

const _ray = new THREE.Ray(), _dir = V(0.3713, 0.7421, 0.5583).normalize(), _p = V(), _z = V(0, 0, 1), _c = new THREE.Color();

export class Stage {
  /**
   * origin: onde o palco fica no mundo (os palcos ficam longe uns dos outros e só um aparece por vez).
   * box, dir, dist: enquadramento inicial e limites de zoom. nat, capNat: cor "natural" de uma ficha na superfície
   * e na face de corte, quando difere da cor da ficha.
   */
  constructor(name, { origin = V(), box, dir, dist, nat = {}, capNat = {}, pulse = 0.12 } = {}) {
    this.name = name; this.origin = origin; this.group = new THREE.Group(); this.group.position.copy(origin);
    this.box = { ...box, c: box.c.clone().add(origin) }; this.dir = dir; this.dist = dist;
    this.plane = new THREE.Plane(V(0, -1, 0), FAR); this.planes = [this.plane]; this.clipOn = false;
    this.insts = []; this.fx = new Map(); this.mats = []; this.cache = new Map(); this.present = new Set();
    this.nat = nat; this.capNat = capNat; this.mode = 'n'; this.vivid = new Set(); this.extras = [];
    this.ghost = ghostMaterial(this.planes);
    // faces de corte: as marcas ficam em capRoot; as tampas, em capFrame, que acompanha o plano de corte
    this.capRoot = new THREE.Group(); this.capRoot.visible = false; this.capFrame = new THREE.Group(); this.capRoot.add(this.capFrame); this.group.add(this.capRoot);
    this.mark = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false, side: THREE.DoubleSide, clippingPlanes: this.planes, fog: false,
      stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc, stencilWriteMask: 1, stencilFail: THREE.InvertStencilOp, stencilZFail: THREE.InvertStencilOp, stencilZPass: THREE.InvertStencilOp });
    this.caps = 0; this.lit = new Set(); this.litKey = '';
    this.animate = () => [];
    // pulsos amarelos: os potenciais de ação em trânsito
    const pm = new THREE.MeshBasicMaterial({ color: 0xfff3b0, toneMapped: false, fog: false, clippingPlanes: this.planes });
    const hm = new THREE.MeshBasicMaterial({ color: 0xffd65c, transparent: true, opacity: 0.3, depthTest: false, depthWrite: false, fog: false });
    this.pulses = [];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(pulse, 18, 12), pm), h = new THREE.Mesh(new THREE.SphereGeometry(pulse * 1.8, 18, 12), hm);
      m.add(h); m.visible = false; m.renderOrder = 9; h.renderOrder = 9; this.group.add(m); this.pulses.push(m); this.extras.push(m);
    }
  }
  hidePulses() { for (const m of this.pulses) m.visible = false; }
  /** Trem de n pulsos ao longo da curva enquanto p vai de a até b. first = índice do primeiro pulso usado. */
  train(curve, p, a, b, n = 3, first = 0, gap = 0.13) {
    const q = ((p - a) / (b - a)) * (1 + (n - 1) * gap);
    for (let k = 0; k < n; k++) { const u = q - k * gap, m = this.pulses[first + k]; if (u <= 0 || u >= 1) continue; m.position.copy(curve.getPointAt(u)); m.visible = true; }
  }

  /* ---------- materiais: um conjunto por ficha ---------- */
  fxOf(id) {
    let f = this.fx.get(id);
    if (!f) {
      const it = BY_ID[id]; if (!it) throw new Error('ficha desconhecida: ' + id);
      const own = new THREE.Color(it.color);
      f = { id, own, base: own.clone(), capBase: own.clone(), g: 0, e: 0, s: 0 };
      this.fx.set(id, f); this.paint(f);
    }
    return f;
  }
  paint(f) {
    const own = this.vivid.has(f.id); // no modo de cor atual, esta ficha mostra a cor dela
    f.base.set(own ? f.own : this.nat[f.id] || f.own);
    f.capBase.set(own ? f.own : this.capNat[f.id] || this.nat[f.id] || f.own);
  }
  solid(id, o = {}) {
    const key = id + '|s|' + (o.shade || '');
    if (this.cache.has(key)) return this.cache.get(key);
    const f = this.fxOf(id);
    const m = withAO(new THREE.MeshPhysicalMaterial({ color: f.base.clone(), roughness: o.rough ?? 0.6, metalness: 0, sheen: 0.4, sheenRoughness: 0.5, sheenColor: f.base.clone().lerp(WHITE, 0.55), side: o.side || THREE.FrontSide, clippingPlanes: this.planes }));
    if (o.opacity != null) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; }
    m.userData = { ...m.userData, fx: f, kind: 'solid', op: m.opacity, tint: o.color ? new THREE.Color(o.color) : null, id };
    this.cache.set(key, m); this.mats.push(m);
    return m;
  }
  capOf(id, color) {
    const key = id + '|c|' + (color || '');
    if (this.cache.has(key)) return this.cache.get(key);
    const f = this.fxOf(id);
    const m = new THREE.MeshBasicMaterial({ color: f.capBase.clone(), ...capStencil });
    m.userData = { fx: f, kind: 'cap', tint: color ? new THREE.Color(color) : null, id };
    this.cache.set(key, m); this.mats.push(m);
    return m;
  }

  /* ---------- peças ---------- */
  /**
   * Põe uma peça no palco. card: ficha que ela abre. o.map: fichas por modo de cor e por região, por exemplo
   * { n: ['hemisferio-cerebelar', 'verme'], o: ['cerebelo', 'cerebelo'] }; sem o modo, vale o natural (n).
   * o.layer: camada (para ligar e desligar em bloco); o.side: 'e', 'd' ou 'm'; o.pri: prioridade na face de corte;
   * o.cap: false para peças abertas ou finas, que não têm secção.
   */
  add(card, geo, o = {}) {
    ready(geo);
    const map = {}; for (const [k, v] of Object.entries(o.map || { n: card })) map[k] = Array.isArray(v) ? v : [v];
    if (!map.n) map.n = [card];
    const it = { card, geo, key: o.key || card, side: o.side || 'm', layer: o.layer || '', pri: o.pri ?? 1, capable: o.cap !== false, map, state: o.state || 'solid', pick: o.pick !== false, label: o.label !== false, mat: o.mat || {}, capColor: o.capColor, capCard: o.capCard };
    it.mesh = new THREE.Mesh(geo, null); it.mesh.userData.inst = it;
    (o.parent || this.group).add(it.mesh);
    if (it.capable) {
      const k = this.caps++;
      it.mark = new THREE.Mesh(geo, this.mark); it.mark.renderOrder = 20 + 2 * k; this.capRoot.add(it.mark);
      it.cap = new THREE.Mesh(CAP_GEO, null); it.cap.renderOrder = 21 + 2 * k; it.cap.position.z = it.pri * BIAS; it.cap.frustumCulled = false; this.capFrame.add(it.cap);
    }
    this.insts.push(it); this.dress(it);
    return it;
  }
  dress(it) {
    it.cards = it.map[this.mode] || it.map.n;
    it.mats = it.cards.map((c) => this.solid(c, it.mat));
    if (it.cap) it.cap.material = this.capOf(it.capCard || it.cards[0], it.capColor);
    this.show(it);
  }
  show(it) {
    const s = it.state;
    it.mesh.visible = s !== 'hide';
    if (s === 'ghost') { // em contorno; a ficha escolhida aparece translúcida, na cor dela
      const ms = it.cards.map((c) => (this.lit.has(c) ? this.solid(c, { shade: 'glow', opacity: 0.5 }) : this.ghost));
      it.mesh.material = ms.every((m) => m === this.ghost) ? this.ghost : ms.length > 1 ? ms : ms[0];
    } else it.mesh.material = it.mats.length > 1 ? it.mats : it.mats[0];
    it.mesh.renderOrder = s === 'ghost' ? 6 : it.mats[0].transparent ? 2 : 0;
    if (it.cap) it.cap.visible = it.mark.visible = s === 'solid';
  }
  /** Modo de cor: 'n' natural, 'l' lobos, 'a' áreas, 'o' origem. Decide a que ficha cada peça responde.
      vivid: as fichas que aparecem com a cor própria nesse modo; as outras ficam na cor natural. */
  setMode(mode, vivid = []) {
    this.mode = mode; this.vivid = new Set(vivid);
    for (const f of this.fx.values()) this.paint(f);
    for (const it of this.insts) this.dress(it);
    this.census();
  }
  /** Estado de cada peça: fn(peça) devolve 'solid', 'ghost' ou 'hide'. */
  setStates(fn) { for (const it of this.insts) { it.state = fn(it) || 'solid'; this.show(it); } this.census(); }
  census() { this.present.clear(); for (const it of this.insts) if (it.state === 'solid') for (const c of it.cards) this.present.add(c); }
  /** Plano de corte, em coordenadas do palco: some o lado para onde a normal NÃO aponta. null desliga. */
  setClip(normal, point) {
    this.clipOn = !!normal;
    if (normal) {
      this.plane.setFromNormalAndCoplanarPoint(_p.copy(normal).normalize(), point.clone().add(this.origin));
      this.capFrame.position.copy(point); this.capFrame.quaternion.setFromUnitVectors(_z, _p.negate()); // +Z da tampa aponta para o lado retirado
    } else this.plane.set(V(0, -1, 0), FAR);
  }
  /** Antes de cada quadro: as faces de corte só são desenhadas quando a câmera está do lado retirado. */
  beforeRender(camera) { this.capRoot.visible = this.clipOn && this.plane.distanceToPoint(camera.position) < 0; }

  /* ---------- foco: a ficha escolhida fica com a cor dela; o resto vira argila ---------- */
  focus(sel, hover, flash, dt, clay, instant) {
    const key = sel.join() + '|' + flash.join();
    if (key !== this.litKey) { this.litKey = key; this.lit = new Set([...sel, ...flash]); for (const it of this.insts) if (it.state === 'ghost') this.show(it); }
    const k = instant ? 1 : Math.min(1, dt * 9), any = sel.some((id) => this.present.has(id));
    let moving = false;
    for (const f of this.fx.values()) {
      const on = sel.includes(f.id);
      let g = any && !on ? 1 : 0, e = any && on ? 0.06 : 0, s = on ? 1 : 0;
      if (f.id === hover) { e = 0.16; g *= 0.45; s = Math.max(s, 0.6); }
      if (flash.includes(f.id)) { e = 0.4; g = 0; s = 1; }
      if (Math.abs(g - f.g) > 0.004 || Math.abs(e - f.e) > 0.004 || Math.abs(s - f.s) > 0.004) { f.g += (g - f.g) * k; f.e += (e - f.e) * k; f.s += (s - f.s) * k; moving = true; } else { f.g = g; f.e = e; f.s = s; }
    }
    for (const m of this.mats) {
      const u = m.userData, f = u.fx;
      if (u.kind === 'cap') { _c.copy(u.tint || f.capBase).lerp(u.tint || f.own, f.s * 0.85).lerp(clay, f.g * 0.82).lerp(WHITE, f.e * 0.6); m.color.copy(_c); continue; }
      _c.copy(u.tint || f.base).lerp(u.tint || f.own, f.s);
      m.emissive.copy(_c).multiplyScalar(f.e);
      m.color.copy(_c).lerp(clay, f.g * 0.9);
      if (m.transparent) m.opacity = u.op * (1 - 0.55 * f.g) + f.e * 0.4;
    }
    return moving;
  }
  setTheme({ ghost }) { this.ghost.uniforms.uColor.value.set(ghost); }

  /* ---------- clique ---------- */
  contains(it, world) {
    _p.copy(world).sub(this.origin);
    if (!it.geo.boundingBox.containsPoint(_p)) return false;
    _ray.origin.copy(_p); _ray.direction.copy(_dir);
    return it.geo.boundsTree.raycast(_ray, THREE.DoubleSide).length % 2 === 1;
  }
  /** O que o raio encontra primeiro: { id, point, normal, inst, cap }. Entende o corte e a face de corte. */
  pick(raycaster) {
    let best = null;
    const on = this.clipOn, pl = this.plane;
    raycaster.firstHitOnly = !on;
    for (const it of this.insts) {
      if (it.state !== 'solid' || !it.pick) continue;
      for (const h of raycaster.intersectObject(it.mesh, false)) {
        if (on && pl.distanceToPoint(h.point) < 0) continue;
        if (!best || h.distance < best.distance) best = { distance: h.distance, point: h.point, inst: it, face: h.face, object: h.object };
        break;
      }
    }
    if (on && pl.distanceToPoint(raycaster.ray.origin) < 0) {
      const t = raycaster.ray.distanceToPlane(pl);
      if (t !== null && (!best || t < best.distance)) {
        const P = raycaster.ray.at(t, V());
        let top = null;
        for (const it of this.insts) if (it.cap && it.state === 'solid' && it.pick && (!top || it.pri > top.pri) && this.contains(it, P)) top = it;
        if (top) return { id: top.capCard || top.cards[0], point: P, normal: pl.normal.clone().negate(), inst: top, cap: true, distance: t };
      }
    }
    if (!best) return null;
    const it = best.inst, id = it.cards[Math.min(it.cards.length - 1, (best.face && best.face.materialIndex) || 0)];
    const n = best.face ? best.face.normal.clone().transformDirection(best.object.matrixWorld) : V(0, 1, 0);
    return { id, point: best.point, normal: n, inst: it, cap: false, distance: best.distance };
  }

  /* ---------- rótulos automáticos ---------- */
  idMat(i, cap) {
    const key = 'id|' + i + '|' + (cap ? 'c' : '');
    if (this.cache.has(key)) return this.cache.get(key);
    const m = new THREE.MeshBasicMaterial(cap ? { toneMapped: false, fog: false, ...capStencil } : { clippingPlanes: this.planes, toneMapped: false, fog: false });
    m.color.setRGB((i & 255) / 255, ((i >> 8) & 255) / 255, 1, THREE.LinearSRGBColorSpace);
    this.cache.set(key, m);
    return m;
  }
  /**
   * Desenha fora da tela um quadro em que cada ficha tem uma cor só, visto pela câmera cam, e devolve, para cada
   * ficha visível, o ponto mais "de dentro" da área que ela ocupa: [{ id, pos, n, area }]. Vale para superfícies
   * e para faces de corte. skip(peça) = true tira a peça da rotulagem, mas ela continua tapando o que está atrás.
   */
  scan(renderer, scene, cam, skip) {
    const W = 448, H = 336, ids = [], idx = new Map();
    const num = (card) => { let i = idx.get(card); if (i === undefined) { ids.push(card); i = ids.length; idx.set(card, i); } return i; };
    const keep = [];
    for (const it of this.insts) {
      keep.push([it.mesh.material, it.mesh.visible, it.cap && it.cap.material]);
      if (it.state !== 'solid') { it.mesh.visible = false; continue; }
      const mute = !it.label || (skip && skip(it));
      const ms = it.cards.map((c) => this.idMat(mute ? 0 : num(c)));
      it.mesh.material = ms.length > 1 ? ms : ms[0];
      if (it.cap) it.cap.material = this.idMat(mute ? 0 : num(it.capCard || it.cards[0]), true);
    }
    const ex = this.extras.map((x) => x.visible); for (const x of this.extras) x.visible = false;
    const rt = Stage.rt || (Stage.rt = new THREE.WebGLRenderTarget(W, H, { stencilBuffer: true })), buf = new Uint8Array(W * H * 4);
    this.beforeRender(cam);
    const prev = renderer.getRenderTarget(), col = renderer.getClearColor(new THREE.Color()), alpha = renderer.getClearAlpha(), fog = scene.fog;
    scene.fog = null; renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(true, true, true); renderer.render(scene, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
    scene.fog = fog; renderer.setRenderTarget(prev); renderer.setClearColor(col, alpha);
    this.insts.forEach((it, i) => { const k = keep[i]; it.mesh.material = k[0]; it.mesh.visible = k[1]; if (it.cap) it.cap.material = k[2]; });
    this.extras.forEach((x, i) => { x.visible = ex[i]; });
    // mapa de fichas e distância de cada ponto à borda da sua região
    const map = new Uint16Array(W * H), d = new Float32Array(W * H);
    for (let p = 0; p < W * H; p++) map[p] = buf[p * 4 + 2] > 127 ? buf[p * 4] | (buf[p * 4 + 1] << 8) : 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, v = map[i];
      d[i] = !v ? 0 : x === 0 || y === 0 || x === W - 1 || y === H - 1 || map[i - 1] !== v || map[i + 1] !== v || map[i - W] !== v || map[i + W] !== v ? 1 : 1e6;
    }
    for (let y = 1; y < H; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (d[i] > 1) d[i] = Math.min(d[i], d[i - 1] + 1, d[i - W] + 1, d[i - W - 1] + 1.414, d[i - W + 1] + 1.414); }
    for (let y = H - 2; y >= 0; y--) for (let x = W - 2; x > 0; x--) { const i = y * W + x; if (d[i] > 1) d[i] = Math.min(d[i], d[i + 1] + 1, d[i + W] + 1, d[i + W + 1] + 1.414, d[i + W - 1] + 1.414); }
    const best = ids.map(() => ({ d: 0, i: -1, area: 0 }));
    for (let p = 0; p < W * H; p++) { const v = map[p]; if (!v) continue; const b = best[v - 1]; b.area++; if (d[p] > b.d) { b.d = d[p]; b.i = p; } }
    const out = [], rc = new THREE.Raycaster(), ndc = new THREE.Vector2();
    best.forEach((b, k) => {
      if (b.i < 0 || b.area < 26) return;
      ndc.set(((b.i % W) + 0.5) / W * 2 - 1, (Math.floor(b.i / W) + 0.5) / H * 2 - 1);
      rc.setFromCamera(ndc, cam);
      const h = this.pick(rc);
      if (h && h.id === ids[k]) out.push({ id: h.id, pos: h.point.clone(), n: h.normal.clone(), area: b.area, cap: h.cap });
    });
    return out;
  }

  /** Esfera que envolve as peças sólidas de uma ou mais fichas (de preferência as do lado esquerdo e do meio). */
  frame(ids, side) {
    const box = new THREE.Box3(); let n = 0;
    const pass = (want) => { for (const it of this.insts) if (it.state !== 'hide' && it.cards.some((c) => ids.includes(c)) && (!want || want.includes(it.side))) { box.union(it.geo.boundingBox); n++; } };
    pass(side || ['e', 'm']); if (!n) pass(null);
    if (!n) return null;
    const s = box.getBoundingSphere(new THREE.Sphere());
    return { t: s.center.add(this.origin), r: s.radius };
  }
}
