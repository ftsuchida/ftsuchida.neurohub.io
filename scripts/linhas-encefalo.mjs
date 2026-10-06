// Gera fontes/encefalo-3d/src/linhas.dados.js: o traçado do sulco central e da fissura lateral sobre a malha.
// O conjunto de malhas traz os giros, não os sulcos. Um sulco é o vão entre dois grupos de giros; então o traçado
// sai da própria malha: olhando o hemisfério esquerdo de fora, em todas as direções, o sulco é a fronteira entre
// o que se vê de um grupo e o que se vê do outro.
// Uso: node scripts/linhas-encefalo.mjs        (depois de scripts/malhas-encefalo.mjs, se as malhas mudaram)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { partGeometry } from '../fontes/encefalo-3d/src/malhas.js';
import { PARTS } from '../fontes/encefalo-3d/src/partes.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'fontes', 'encefalo-3d', 'src', 'linhas.dados.js');
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* Linhas: [ficha, giros de um lado, giros do outro]. Coordenadas da cena, em cm. */
const LINES = [
  ['sulco-central', ['pre-central'], ['pos-central']],
  ['fissura-lateral', ['temporal-sup-a', 'temporal-sup-p'], ['frontal-inf', 'orbital', 'pre-central', 'pos-central', 'supramarginal', 'insula']],
];

/* ---------- o hemisfério esquerdo visto de fora, em uma grade de direções em torno do centro dele ---------- */
const CORTEX = Object.keys(PARTS).filter((k) => PARTS[k].L === 'cx');
const C = V(3.2, 1.5, -0.5), STEP = 0.01, T0 = 0.05, T1 = 2.35, P0 = -2.5, P1 = 2.5;
const NT = Math.round((T1 - T0) / STEP) + 1, NP = Math.round((P1 - P0) / STEP) + 1;
const dirOf = (i, j) => { const t = T0 + i * STEP, p = P0 + j * STEP; return V(Math.sin(t) * Math.cos(p), Math.cos(t), Math.sin(t) * Math.sin(p)); };
const who = new Int8Array(NT * NP).fill(-1), rad = new Float32Array(NT * NP);
const ray = new THREE.Ray(), geos = CORTEX.map((k) => partGeometry(k));
for (let i = 0; i < NT; i++) for (let j = 0; j < NP; j++) {
  const d = dirOf(i, j); ray.origin.copy(C).addScaledVector(d, 14); ray.direction.copy(d).negate();
  let best = Infinity, w = -1;
  for (let k = 0; k < geos.length; k++) { const h = geos[k].boundsTree.raycastFirst(ray, THREE.DoubleSide); if (h && h.distance < best) { best = h.distance; w = k; } }
  who[i * NP + j] = w; rad[i * NP + j] = w < 0 ? 0 : 14 - best;
}

function trace(A, B) {
  const a = new Set(A.map((k) => CORTEX.indexOf(k))), b = new Set(B.map((k) => CORTEX.indexOf(k)));
  const WIN = 8, pts = []; // janela (em passos da grade) em que se procura a altura das cristas vizinhas
  const pair = (p, q) => (a.has(who[p]) && b.has(who[q])) || (b.has(who[p]) && a.has(who[q]));
  for (let i = 0; i < NT - 1; i++) for (let j = 0; j < NP - 1; j++) for (const [di, dj] of [[0, 1], [1, 0]]) {
    if (!pair(i * NP + j, (i + di) * NP + j + dj)) continue;
    let top = 0;
    for (let u = Math.max(0, i - WIN); u <= Math.min(NT - 1, i + WIN); u++) for (let v = Math.max(0, j - WIN); v <= Math.min(NP - 1, j + WIN); v++) top = Math.max(top, rad[u * NP + v]);
    const d = dirOf(i, j).add(dirOf(i + di, j + dj)).normalize();
    pts.push(C.clone().addScaledVector(d, top + 0.02)); // na altura das cristas: a linha corre por cima do sulco, à vista
  }
  if (pts.length < 20) throw new Error('fronteira curta demais entre ' + A + ' e ' + B);
  // ordena ao longo da direção principal da nuvem de pontos
  const m = V(0, 0, 0); for (const p of pts) m.add(p); m.multiplyScalar(1 / pts.length);
  let ax = V(0.3, 1, 0.2).normalize();
  for (let k = 0; k < 40; k++) { const n = V(0, 0, 0); for (const p of pts) { const q = p.clone().sub(m); n.addScaledVector(q, q.dot(ax)); } ax = n.normalize(); }
  let s0 = Infinity, s1 = -Infinity; for (const p of pts) { const s = p.clone().sub(m).dot(ax); s0 = Math.min(s0, s); s1 = Math.max(s1, s); }
  const BINS = Math.max(8, Math.round((s1 - s0) / 0.45)), sum = Array.from({ length: BINS }, () => [V(0, 0, 0), 0]);
  for (const p of pts) { const k = Math.min(BINS - 1, Math.floor(((p.clone().sub(m).dot(ax) - s0) / (s1 - s0)) * BINS)); sum[k][0].add(p); sum[k][1]++; }
  const line = sum.filter((x) => x[1] > 0).map((x) => x[0].multiplyScalar(1 / x[1]));
  for (let k = 0; k < 2; k++) for (let i = 1; i < line.length - 1; i++) line[i].lerp(line[i - 1].clone().add(line[i + 1]).multiplyScalar(0.5), 0.5);
  return line;
}

const out = {};
for (const [id, A, B] of LINES) { out[id] = trace(A, B).map((p) => [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)]); console.log(id.padEnd(18), out[id].length, 'pontos, de', out[id][0].join(' '), 'a', out[id].at(-1).join(' ')); }
fs.writeFileSync(OUT, `// Gerado por scripts/linhas-encefalo.mjs. Não edite à mão.\n// Traçado de sulcos sobre a malha do hemisfério esquerdo, em cm (X = esquerda, Y = cima, Z = frente).\nexport const LINHAS = ${JSON.stringify(out)};\n`);
console.log('→', path.relative(root, OUT));
