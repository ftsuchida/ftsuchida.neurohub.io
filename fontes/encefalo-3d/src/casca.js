// Casca em volta do encéfalo: a superfície "esticada" por cima dos giros, sem entrar nos sulcos. Serve de base para
// as meninges (que são desenhadas, não vêm no conjunto de malhas) e para o caminho do líquido no espaço subaracnóideo.
// A casca é uma superfície em estrela: para cada direção a partir de um centro, um raio.
import * as THREE from 'three';

const NT = 56, NP = 112; // passos em latitude (de cima para baixo) e em longitude
const _ray = new THREE.Ray();

/**
 * Mede a casca. hit(origem, direção) devolve a distância do primeiro encontro com o encéfalo, ou Infinity.
 * c: centro; opções: grow = quantos passos da grade a casca "estica" por cima dos sulcos.
 */
export function buildHull(hit, c, { grow = 2, far = 16 } = {}) {
  const R = new Float32Array((NT + 1) * NP), d = new THREE.Vector3(), o = new THREE.Vector3();
  const dirOf = (i, j, out = new THREE.Vector3()) => { const t = (Math.PI * i) / NT, p = (2 * Math.PI * j) / NP; return out.set(Math.sin(t) * Math.sin(p), Math.cos(t), Math.sin(t) * Math.cos(p)); };
  for (let i = 0; i <= NT; i++) for (let j = 0; j < NP; j++) {
    dirOf(i, j, d); o.copy(c).addScaledVector(d, far);
    const h = hit(o, d.clone().negate());
    R[i * NP + j] = h < Infinity ? far - h : 0;
  }
  const at = (a, i, j) => a[Math.max(0, Math.min(NT, i)) * NP + ((j % NP) + NP) % NP];
  // estica: cada ponto fica com o maior raio da vizinhança (tapa os sulcos e a fissura longitudinal); depois alisa.
  // A vizinhança é medida em ângulo, e não em passos da grade, porque perto dos polos os passos de longitude encolhem.
  const dirs = []; for (let i = 0; i <= NT; i++) for (let j = 0; j < NP; j++) dirs.push(dirOf(i, j));
  const near = (deg, fn) => { // para cada ponto, percorre os vizinhos a menos de deg graus
    const cos = Math.cos((deg * Math.PI) / 180), rows = Math.ceil(deg / (180 / NT));
    for (let i = 0; i <= NT; i++) for (let j = 0; j < NP; j++) { const a = dirs[i * NP + j]; for (let u = Math.max(0, i - rows); u <= Math.min(NT, i + rows); u++) for (let v = 0; v < NP; v++) { const w = a.dot(dirs[u * NP + v]); if (w >= cos) fn(i * NP + j, u * NP + v, w); } }
  };
  const big = new Float32Array(R.length); near(3.3 * grow, (p, q) => { if (R[q] > big[p]) big[p] = R[q]; });
  const sum = new Float32Array(R.length), wsum = new Float32Array(R.length); near(6, (p, q) => { sum[p] += big[q]; wsum[p]++; });
  const H = sum.map((s, p) => s / wsum[p]);

  /** Raio da casca em uma direção (interpolado na grade). */
  function radius(dir) {
    const t = Math.acos(Math.max(-1, Math.min(1, dir.y / dir.length()))), p = Math.atan2(dir.x, dir.z);
    const fi = (t / Math.PI) * NT, fj = ((p < 0 ? p + 2 * Math.PI : p) / (2 * Math.PI)) * NP, i = Math.min(NT - 1, Math.floor(fi)), j = Math.floor(fj), u = fi - i, v = fj - j;
    return (at(H, i, j) * (1 - v) + at(H, i, j + 1) * v) * (1 - u) + (at(H, i + 1, j) * (1 - v) + at(H, i + 1, j + 1) * v) * u;
  }
  /** Ponto da casca em uma direção, afastado de off (para fora, se positivo). */
  const point = (dir, off = 0, out = new THREE.Vector3()) => { const n = out.copy(dir).normalize(); return n.multiplyScalar(radius(n) + off).add(c); };
  /** Malha da casca afastada de off. */
  function shell(off) {
    const pos = new Float32Array((NT + 1) * NP * 3), idx = [];
    for (let i = 0; i <= NT; i++) for (let j = 0; j < NP; j++) { dirOf(i, j, d).multiplyScalar(H[i * NP + j] + off).add(c); pos.set([d.x, d.y, d.z], (i * NP + j) * 3); }
    for (let i = 0; i < NT; i++) for (let j = 0; j < NP; j++) { const a = i * NP + j, b = i * NP + ((j + 1) % NP), e = a + NP, f = b + NP; if (i > 0) idx.push(a, e, b); if (i < NT - 1) idx.push(b, e, f); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  return { c, radius, point, shell, raw: R };
}

/** hit() para um conjunto de geometrias com árvore de busca; mirror = testa também o espelho em X (peças pares). */
export function hitter(geos, mirror) {
  const o2 = new THREE.Vector3(), d2 = new THREE.Vector3();
  return (o, d) => {
    let best = Infinity;
    for (const g of geos) { _ray.origin.copy(o); _ray.direction.copy(d); const h = g.boundsTree.raycastFirst(_ray, THREE.DoubleSide); if (h && h.distance < best) best = h.distance; }
    if (mirror) for (const g of mirror) { _ray.origin.copy(o2.copy(o).setX(-o.x)); _ray.direction.copy(d2.copy(d).setX(-d.x)); const h = g.boundsTree.raycastFirst(_ray, THREE.DoubleSide); if (h && h.distance < best) best = h.distance; }
    return best;
  };
}
