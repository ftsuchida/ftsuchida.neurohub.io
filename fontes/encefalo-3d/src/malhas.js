// Lê o pacote de malhas (malhas.dados.js, gerado por scripts/malhas-encefalo.mjs) e monta as geometrias.
// Coordenadas da cena: 1 unidade = 1 cm; X = esquerda da pessoa, Y = cima, Z = frente. O plano mediano é X = 0.
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { MALHAS } from './malhas.dados.js';

const ABC = MALHAS.abc, VAL = new Int16Array(128);
for (let i = 0; i < ABC.length; i++) VAL[ABC.charCodeAt(i)] = i;
const BY_KEY = Object.fromEntries(MALHAS.parts.map((p) => [p.k, p]));

/** Origem da cena, em milímetros do conjunto original (x para a esquerda, y para trás, z para cima). */
export const ORIGIN = { x: MALHAS.x0, y: -90, z: 1552 };
/** Milímetros do conjunto original → cena. */
export const mm = (x, y, z) => new THREE.Vector3((x - ORIGIN.x) / 10, (z - ORIGIN.z) / 10, -(y - ORIGIN.y) / 10);
export const hasPart = (key) => key in BY_KEY;
/** true = peça ímpar, no plano mediano; false = peça par, guardada só do lado esquerdo. */
export const isMidline = (key) => !!BY_KEY[key].m;
/** Faixas de triângulos (regiões) de uma peça, na ordem do pacote. Sem regiões, uma faixa só. */
export const regionsOf = (key) => BY_KEY[key].g || [BY_KEY[key].nt];

const cache = new Map(), AO_FLOOR = { cerebelo: 96 };
function decode(p) {
  const s = p.d; let i = 0;
  const next = () => {
    const a = VAL[s.charCodeAt(i++)];
    if (a < 76) return a;
    if (a < 87) return 76 + (a - 76) * 88 + VAL[s.charCodeAt(i++)];
    let n = 0; for (let k = 0; k < 4; k++) n = n * 88 + VAL[s.charCodeAt(i++)];
    return n;
  };
  const un = (z) => (z & 1 ? -((z + 1) >> 1) : z >> 1);
  const pos = new Float32Array(p.nv * 3);
  let qx = 0, qy = 0, qz = 0;
  for (let v = 0; v < p.nv; v++) {
    qx += un(next()); qy += un(next()); qz += un(next());
    pos[v * 3] = (p.o[0] + qx * p.s - ORIGIN.x) / 10;
    pos[v * 3 + 1] = (p.o[2] + qz * p.s - ORIGIN.z) / 10;
    pos[v * 3 + 2] = -(p.o[1] + qy * p.s - ORIGIN.y) / 10;
  }
  const idx = p.nv > 65535 ? new Uint32Array(p.nt * 3) : new Uint16Array(p.nt * 3);
  let nx = 0;
  for (let k = 0; k < idx.length; k++) { const n = next(); idx[k] = n === 0 ? nx++ : nx - n; }
  const ao = new Uint8Array(p.nv).fill(255);
  const floor = AO_FLOOR[p.k] || 0; // piso: o fundo das fissuras fica escuro, mas não preto
  if (p.ao) { let a = 0; for (let v = 0; v < p.nv; v++) { a += un(next()); ao[v] = Math.max(floor, Math.min(255, a * 4 + 3)); } }
  return { pos, idx, ao };
}

/**
 * Geometria de uma peça. side: 'e' (esquerda, como está no pacote) ou 'd' (direita, espelhada).
 * A geometria vem com normais, a oclusão de ambiente no atributo "ao", os grupos das regiões e a árvore de busca
 * (boundsTree) usada pelo clique e pelos rótulos.
 */
export function partGeometry(key, side = 'e') {
  const id = key + '|' + side;
  if (cache.has(id)) return cache.get(id);
  const p = BY_KEY[key]; if (!p) throw new Error('peça sem malha: ' + key);
  const raw = cache.get(key + '|raw') || decode(p); cache.set(key + '|raw', raw);
  let { pos, idx } = raw;
  if (side === 'd') {
    pos = pos.slice(); for (let v = 0; v < pos.length; v += 3) pos[v] = -pos[v];
    idx = idx.slice(); for (let t = 0; t < idx.length; t += 3) { const a = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = a; } // espelhar inverte a face
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('ao', new THREE.BufferAttribute(raw.ao, 1, true));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  let start = 0; regionsOf(key).forEach((n, r) => { g.addGroup(start * 3, n * 3, r); start += n; });
  g.computeBoundingBox(); g.computeBoundingSphere();
  g.boundsTree = new MeshBVH(g);
  cache.set(id, g);
  return g;
}
