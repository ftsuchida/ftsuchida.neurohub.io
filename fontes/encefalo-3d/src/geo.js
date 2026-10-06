import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';

THREE.Mesh.prototype.raycast = acceleratedRaycast;

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const curveOf = (pts) => new THREE.CatmullRomCurve3(pts, false, 'centripetal');

export function subCurve(curve, u0, u1, n = 12) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(curve.getPointAt(u0 + ((u1 - u0) * i) / n));
  return curveOf(pts);
}

/** Tubo ao longo de uma curva, com raio variável e pontas arredondadas opcionais. */
export function tube(src, radius, o = {}) {
  const curve = Array.isArray(src) ? curveOf(src) : src;
  const radial = o.radial || 14;
  const segs = o.segs || Math.max(6, Math.round(curve.getLength() * (o.density || 3)));
  const fr = curve.computeFrenetFrames(segs, false);
  const rf = typeof radius === 'function' ? radius : () => radius;
  const rings = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    rings.push({ c: curve.getPointAt(t), n: fr.normals[i], b: fr.binormals[i], r: rf(t) });
  }
  const cap = (ring, tan, sign) => {
    const out = [];
    for (let k = 1; k <= 5; k++) {
      const a = (k / 5) * (Math.PI / 2);
      out.push({
        c: ring.c.clone().addScaledVector(tan, sign * ring.r * Math.sin(a)),
        n: ring.n, b: ring.b, r: Math.max(ring.r * Math.cos(a), 1e-4),
      });
    }
    return out;
  };
  if (o.capStart) rings.unshift(...cap(rings[0], fr.tangents[0], -1).reverse());
  if (o.capEnd) rings.push(...cap(rings[rings.length - 1], fr.tangents[segs], 1));
  return skin(rings, radial, !!o.capStart, !!o.capEnd);
}

function skin(rings, radial, closeStart, closeEnd) {
  const pos = new Float32Array(rings.length * radial * 3);
  let p = 0;
  for (const g of rings) {
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const c = Math.cos(a) * g.r, s = Math.sin(a) * g.r;
      pos[p++] = g.c.x + c * g.n.x + s * g.b.x;
      pos[p++] = g.c.y + c * g.n.y + s * g.b.y;
      pos[p++] = g.c.z + c * g.n.z + s * g.b.z;
    }
  }
  const idx = [];
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j, a1 = i * radial + ((j + 1) % radial), b = a + radial, b1 = a1 + radial;
      idx.push(a, a1, b, b, a1, b1);
    }
  }
  // pontas arredondadas: fecha o furinho que sobra no bico, para a peça ser um sólido fechado
  const last = (rings.length - 1) * radial;
  for (let j = 1; j < radial - 1; j++) { if (closeStart) idx.push(0, j + 1, j); if (closeEnd) idx.push(last, last + j, last + j + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Perfil de raio de uma capa: fino nas pontas, cheio no meio. */
export const sleeve = (r0, r1, edge) => (t) => {
  let s = Math.min(t, 1 - t) / edge;
  s = Math.max(0, Math.min(1, s));
  s = s * s * (3 - 2 * s);
  return r0 + (r1 - r0) * s;
};

/** Solda a costura de uma geometria e recalcula normais suaves; fn deforma os vértices. */
export function organic(geo, fn) {
  geo.deleteAttribute('uv');
  geo.deleteAttribute('normal');
  let g = mergeVertices(geo, 1e-4);
  if (fn) {
    const p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      fn(v);
      p.setXYZ(i, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

const unitBalls = new Map();
export function ball(r, at, scale, seg = 26) {
  let u = unitBalls.get(seg);
  if (!u) { u = organic(new THREE.SphereGeometry(1, seg, Math.max(8, Math.round(seg * 0.7)))); unitBalls.set(seg, u); }
  const g = u.clone();
  g.scale(r * (scale ? scale[0] : 1), r * (scale ? scale[1] : 1), r * (scale ? scale[2] : 1));
  if (at) g.translate(at.x, at.y, at.z);
  return g;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);

/** Aplica posição, rotação (euler, quaternion ou direção do eixo Y) e escala a uma geometria. */
export function place(g, { p, rot, q, dir, s } = {}) {
  if (dir) _q.setFromUnitVectors(UP, dir.clone().normalize());
  else if (q) _q.copy(q);
  else if (rot) _q.setFromEuler(_e.set(rot[0], rot[1], rot[2], rot[3] || 'XYZ'));
  else _q.identity();
  if (typeof s === 'number') _s.setScalar(s); else if (s) _s.set(s[0], s[1], s[2]); else _s.setScalar(1);
  _m.compose(p || new THREE.Vector3(), _q, _s);
  g.applyMatrix4(_m);
  return g;
}

/** Corda de fitas trançadas entre dois pontos. */
export function rope(p0, p1, { amp = 0.06, r = 0.045, turns = 6, strands = 2, radial = 6 } = {}) {
  const axis = p1.clone().sub(p0), len = axis.length();
  axis.normalize();
  const n = Math.abs(axis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(axis, n).normalize();
  const w = new THREE.Vector3().crossVectors(axis, u).normalize();
  const out = [], steps = Math.max(12, Math.round(turns * 10));
  for (let k = 0; k < strands; k++) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, a = t * turns * Math.PI * 2 + (k / strands) * Math.PI * 2;
      pts.push(p0.clone().addScaledVector(axis, len * t).addScaledVector(u, Math.cos(a) * amp).addScaledVector(w, Math.sin(a) * amp));
    }
    out.push(tube(curveOf(pts), r, { radial, segs: steps * 2, capStart: true, capEnd: true }));
  }
  return out;
}

/** Superfície de revolução a partir de pontos de controle [raio, altura], suavizados por spline. */
export function lathe(profile, { samples = 48, segs = 56, phi = Math.PI * 2 } = {}) {
  const sp = new THREE.SplineCurve(profile.map((p) => new THREE.Vector2(p[0], p[1])));
  const pts = sp.getPoints(samples).map((p) => new THREE.Vector2(Math.max(p.x, 0), p.y));
  const g = new THREE.LatheGeometry(pts, segs, 0, phi);
  return phi >= Math.PI * 2 - 1e-6 ? organic(g) : g;
}

function prep(g) {
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.index) {
    const n = g.attributes.position.count;
    const idx = new Uint32Array(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    g.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  g.clearGroups();
  return g;
}

/** Junta geometrias por estrutura e tom, e cria uma malha por conjunto. */
export class Builder {
  constructor() { this.sets = new Map(); }
  add(id, geo, shade = 'main') {
    const key = id + '|' + shade;
    let e = this.sets.get(key);
    if (!e) { e = { id, shade, key, geos: [] }; this.sets.set(key, e); }
    (Array.isArray(geo) ? geo : [geo]).forEach((g) => e.geos.push(prep(g)));
    return this;
  }
  build(group, materialFor) {
    const meshes = [];
    for (const e of this.sets.values()) {
      const g = mergeGeometries(e.geos, false);
      g.computeBoundingSphere();
      g.boundsTree = new MeshBVH(g);
      const mat = materialFor(e.id, e.shade);
      const mesh = new THREE.Mesh(g, mat);
      mesh.userData.id = e.id;
      mesh.castShadow = !mat.transparent;
      mesh.receiveShadow = !mat.transparent;
      if (mat.transparent) mesh.renderOrder = 2;
      group.add(mesh);
      meshes.push(mesh);
    }
    return meshes;
  }
}

/**
 * Tubo de secção oval ao longo de uma curva, fechado e arredondado nas pontas. rx é o raio para o lado e ry o raio
 * na direção "up" (corrigida para ficar perpendicular à curva); os dois podem ser funções de t (0 a 1).
 * shape(a, t) (opcional) multiplica o raio no ângulo a, para secções que não são ovais (triângulo, crescente).
 */
export function ovalTube(src, rx, ry, o = {}) {
  const curve = Array.isArray(src) ? curveOf(src) : src, segs = o.segs || 24, radial = o.radial || 18;
  const up = (o.up || new THREE.Vector3(0, 1, 0)).clone().normalize();
  const fx = typeof rx === 'function' ? rx : () => rx, fy = typeof ry === 'function' ? ry : () => ry, sh = o.shape || (() => 1);
  const rings = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, c = curve.getPointAt(t), tg = curve.getTangentAt(t);
    const side = new THREE.Vector3().crossVectors(tg, up).normalize(), u = new THREE.Vector3().crossVectors(side, tg).normalize();
    rings.push({ c, side, u, tg, rx: fx(t), ry: fy(t), t });
  }
  const cap = (r, sign) => { const out = []; for (let k = 1; k <= 4; k++) { const a = (k / 4) * (Math.PI / 2), m = Math.min(r.rx, r.ry); out.push({ ...r, c: r.c.clone().addScaledVector(r.tg, sign * m * Math.sin(a)), rx: Math.max(r.rx * Math.cos(a), 1e-4), ry: Math.max(r.ry * Math.cos(a), 1e-4) }); } return out; };
  const all = [...cap(rings[0], -1).reverse(), ...rings, ...cap(rings[segs], 1)];
  const pos = new Float32Array(all.length * radial * 3); let p = 0;
  for (const g of all) for (let j = 0; j < radial; j++) {
    const a = (j / radial) * Math.PI * 2, k = sh(a, g.t), x = Math.cos(a) * g.rx * k, y = Math.sin(a) * g.ry * k;
    pos[p++] = g.c.x + x * g.side.x + y * g.u.x; pos[p++] = g.c.y + x * g.side.y + y * g.u.y; pos[p++] = g.c.z + x * g.side.z + y * g.u.z;
  }
  const idx = [];
  for (let i = 0; i < all.length - 1; i++) for (let j = 0; j < radial; j++) { const a = i * radial + j, a1 = i * radial + ((j + 1) % radial), b = a + radial, b1 = a1 + radial; idx.push(a, b, a1, b, b1, a1); }
  // fecha as duas pontas com um leque
  const first = 0, last = (all.length - 1) * radial;
  for (let j = 1; j < radial - 1; j++) { idx.push(first, first + j, first + j + 1); idx.push(last, last + j + 1, last + j); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Elipsoide: centro, raios [x, y, z] e, se vier, rotação (euler). */
export function blob(c, r, rot, seg = 22) {
  const g = ball(1, null, r, seg);
  return place(g, { p: c, rot });
}
