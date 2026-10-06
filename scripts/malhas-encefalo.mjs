// Gera fontes/encefalo-3d/src/malhas.dados.js: as malhas do encéfalo, do crânio e da coluna, simplificadas
// e empacotadas como texto, a partir do BodyParts3D (CC BY-SA 2.1 Japão; ver LICENCAS-DE-TERCEIROS.md).
// Só é preciso rodar de novo para mudar a lista de peças ou o nível de detalhe: o resultado fica versionado.
// Uso: node scripts/malhas-encefalo.mjs [pasta com os .stl]
//      Sem a pasta, o script baixa só os arquivos necessários para .cache/bodyparts3d (uns 150 MB).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'fontes', 'encefalo-3d', 'src', 'malhas.dados.js');
const REPO = 'https://github.com/Kevin-Mattheus-Moerman/BodyParts3D', COMMIT = 'f0eeb6e843380cfe6b83797cf8c3e1af74de5e61', STL = 'assets/BodyParts3D_data/stl';

// No conjunto original o lado direito é quase o espelho do esquerdo (diferença mediana de 0,3 mm), em torno
// de x = -0,65 mm. O pacote guarda só o lado esquerdo das peças pares; a página espelha para montar o direito.
const X0 = -0.65;

/* Peças: [chave, arquivo(s), fração dos triângulos que fica, opções]
   lado: 'e' = só o lado esquerdo de um arquivo que traz os dois; ao: guarda a oclusão de ambiente (sombra dos sulcos);
   passo: tamanho da grade de posições, em mm; reg: regra que divide a peça em regiões (faixas de triângulos). */
const CX = { ao: 'cx', passo: 0.025 };
const PARTS = [
  // córtex (lado esquerdo; o direito é espelhado)
  ['frontal-sup', 'FMA72654', 0.3, { ...CX, reg: 'area6' }], ['frontal-med', 'FMA72656', 0.3, { ...CX, reg: 'area6' }], ['orbital', 'BP51', 0.3, { ...CX, lado: 'e' }],
  ['pre-central', 'FMA72662', 0.3, CX], ['pos-central', 'FMA72666', 0.3, CX], ['supramarginal', 'FMA72668', 0.3, CX], ['angular', 'FMA72670', 0.3, CX],
  ['parietal-sup', 'BP49', 0.3, CX], ['temporal-sup-a', 'FMA72801', 0.3, CX], ['temporal-sup-p', 'FMA72805', 0.3, CX], ['temporal-med', 'FMA72686', 0.3, CX],
  ['temporal-inf', 'FMA72688', 0.3, CX], ['fusiforme', 'FMA72690', 0.3, CX], ['para-hipocampal', 'FMA72706', 0.3, CX], ['cingulo', 'FMA72718', 0.3, CX],
  ['occipital', 'FMA72976', 0.3, CX], ['insula', 'FMA72978', 0.3, CX],
  // No conjunto, FMA72702 vem com o nome "accessory short gyrus", mas a malha ocupa o lugar do giro frontal inferior.
  ['frontal-inf', 'FMA72702', 0.3, { ...CX, reg: 'area6' }],
  // telencéfalo profundo
  ['branca', 'FMA61822', 0.2, { lado: 'e' }], ['caloso', 'FMA86464', 0.06, { meio: 1 }], ['septo', 'FMA61844', 0.08, { meio: 1 }], ['fornice', 'FMA72925', 0.08], ['fornice-c', 'FMA61970', 0.06, { meio: 1 }],
  ['caudado', 'FMA72827', 0.22], ['putame', 'FMA72829', 0.08], ['palido', 'FMA72831', 0.07], ['amigdala', 'FMA72833', 0.3], ['hipocampo', 'FMA72714', 0.6],
  ['capsula', 'FMA72909', 0.05],
  // diencéfalo e via óptica
  ['talamo', 'FMA258716', 0.5], ['hipotalamo', 'FMA62008nsn', 0.12, { meio: 1 }], ['tuber', 'FMA62327', 0.15, { meio: 1 }], ['mamilar', 'FMA74877', 0.5, { meio: 1 }],
  ['hipofise', 'FMA13889', 0.15, { meio: 1 }], ['pineal', 'FMA62033', 0.3, { meio: 1 }], ['gen-lat', 'FMA73304', 1], ['gen-med', 'FMA73310', 1],
  ['nervo-optico', 'FMA50878', 0.12], ['quiasma', 'FMA62045', 0.2, { meio: 1 }], ['tracto-optico', 'FMA67936', 0.15], ['olho', 'FMA12513', 0.25, { lado: 'e' }],
  // mesencéfalo, ponte, bulbo e cerebelo
  ['mesencefalo', 'FMA61993nsn', 0.08, { meio: 1, ao: 'tr' }], ['pedunculo', 'FMA62394', 0.1, { meio: 1, ao: 'tr' }], ['coliculo-sup', 'FMA73423', 1], ['coliculo-inf', 'FMA73435', 1],
  ['ponte', 'FMA67943', 0.08, { meio: 1, ao: 'tr' }], ['bulbo', 'FMA62004', 0.1, { meio: 1, ao: 'tr' }], ['cerebelo', 'FMA67944', 0.2, { meio: 1, ao: 'cb', passo: 0.025, reg: 'verme' }],
  // ventrículos
  ['vent-lateral', 'FMA78450', 0.11], ['forame', 'FMA75351', 0.2, { meio: 1 }], ['vent-terceiro', 'FMA78454', 0.15, { meio: 1 }], ['aqueduto', 'FMA78467', 0.4, { meio: 1 }],
  ['vent-quarto', 'FMA78469', 0.15, { meio: 1 }], ['canal-central', 'FMA78497', 0.3, { meio: 1 }], ['plexo', 'FMA274029', 0.2],
  // crânio
  ['osso-frontal', 'FMA52734', 0.2, { meio: 1, passo: 0.06 }], ['osso-parietal', 'FMA52789', 0.14, { passo: 0.06 }], ['osso-temporal', 'FMA52739', 0.3, { passo: 0.06 }],
  ['osso-occipital', 'FMA52735', 0.2, { meio: 1, passo: 0.06 }], ['osso-esfenoide', 'FMA52736', 0.3, { meio: 1, passo: 0.06 }],
  // coluna
  ...[['c1', 'FMA12519'], ['c2', 'FMA12520'], ['c3', 'FMA12521'], ['c4', 'FMA12522'], ['c5', 'FMA12523'], ['c6', 'FMA12524'], ['c7', 'FMA12525'],
    ['t1', 'FMA9165'], ['t2', 'FMA9187'], ['t3', 'FMA9209'], ['t4', 'FMA9248'], ['t5', 'FMA9922'], ['t6', 'FMA9945'], ['t7', 'FMA9968'], ['t8', 'FMA9991'],
    ['t9', 'FMA10014'], ['t10', 'FMA10037'], ['t11', 'FMA10059'], ['t12', 'FMA10081'],
    ['l1', 'FMA13072'], ['l2', 'FMA13073'], ['l3', 'FMA13074'], ['l4', 'FMA13075'], ['l5', 'FMA13076']].map(([k, f]) => ['vertebra-' + k, f, 1800, { meio: 1, passo: 0.08 }]),
  ['sacro', 'FMA16202', 5000, { meio: 1, passo: 0.08 }],
];

/* ---------- origem dos arquivos ---------- */
let dir = process.argv[2];
if (!dir) {
  const cache = path.join(root, '.cache', 'bodyparts3d');
  const git = (...a) => execFileSync('git', a, { stdio: ['ignore', 'pipe', 'inherit'] });
  if (!fs.existsSync(path.join(cache, '.git'))) { fs.mkdirSync(cache, { recursive: true }); git('clone', '--filter=blob:none', '--no-checkout', REPO, cache); }
  git('-C', cache, 'checkout', COMMIT, '--', ...PARTS.map((p) => `${STL}/${p[1]}.stl`));
  dir = path.join(cache, STL);
}

/* ---------- leitura e limpeza ---------- */
function readSTL(file) {
  const b = fs.readFileSync(file), n = b.readUInt32LE(80), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const key = new Map(), pos = [], idx = new Uint32Array(n * 3);
  for (let t = 0; t < n; t++) for (let v = 0; v < 3; v++) {
    const o = 84 + t * 50 + 12 + v * 12, x = dv.getFloat32(o, true), y = dv.getFloat32(o + 4, true), z = dv.getFloat32(o + 8, true);
    const k = x + ',' + y + ',' + z;
    let i = key.get(k);
    if (i === undefined) { i = pos.length / 3; key.set(k, i); pos.push(x, y, z); }
    idx[t * 3 + v] = i;
  }
  // triângulos degenerados (dois vértices iguais depois de soldar) saem
  let w = 0;
  for (let t = 0; t < n; t++) { const a = idx[t * 3], c = idx[t * 3 + 1], d = idx[t * 3 + 2]; if (a !== c && c !== d && a !== d) { idx[w++] = a; idx[w++] = c; idx[w++] = d; } }
  return { pos: new Float32Array(pos), idx: idx.slice(0, w) };
}
/** Fica só com as partes ligadas cujo centro está do lado esquerdo (x > X0). */
function leftOnly({ pos, idx }) {
  const nv = pos.length / 3, par = new Uint32Array(nv).map((_, i) => i);
  const find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  for (let t = 0; t < idx.length; t += 3) { const a = find(idx[t]), b = find(idx[t + 1]), c = find(idx[t + 2]); par[b] = a; par[c] = a; }
  const sum = new Map();
  for (let i = 0; i < nv; i++) { const r = find(i); const s = sum.get(r) || [0, 0]; s[0] += pos[i * 3]; s[1]++; sum.set(r, s); }
  const keep = new Set([...sum].filter(([, s]) => s[0] / s[1] > X0).map(([r]) => r));
  const out = [];
  for (let t = 0; t < idx.length; t += 3) if (keep.has(find(idx[t]))) out.push(idx[t], idx[t + 1], idx[t + 2]);
  return { pos, idx: new Uint32Array(out), comps: [sum.size, keep.size] };
}
await MeshoptSimplifier.ready; await MeshoptEncoder.ready;

const meshes = [];
for (const [k, file, frac, o = {}] of PARTS) {
  let m = readSTL(path.join(dir, file + '.stl'));
  const n0 = m.idx.length / 3;
  if (o.lado === 'e') m = leftOnly(m);
  const target = frac > 1 ? Math.min(m.idx.length, Math.round(frac) * 3) : Math.max(Math.min(m.idx.length, 600), Math.round((m.idx.length / 3) * frac) * 3);
  let ix = m.idx;
  if (target < ix.length) ix = MeshoptSimplifier.simplify(ix, m.pos, 3, target, 0.05, [])[0];
  meshes.push({ k, o, n0, src: m.pos, ix: new Uint32Array(ix) });
}

/* ---------- regiões dentro de uma peça ----------
   Cada regra recebe o centro do triângulo (mm) e devolve o número da região. As regiões viram faixas seguidas
   de triângulos, e a página põe um material em cada uma. */
const solid = (m) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(m.src, 3)); g.setIndex(new THREE.BufferAttribute(m.ix, 1)); return new MeshBVH(g); };
const pre = solid(meshes.find((m) => m.k === 'pre-central')), hit = {}, pt = new THREE.Vector3();
const REG = {
  // faixa junto ao giro pré-central: fica como área 6 (pré-motora e motora suplementar) no modo de áreas
  area6: (c) => (pre.closestPointToPoint(pt.set(c[0], c[1], c[2]), hit).distance < 17 ? 1 : 0),
  // verme: a faixa mediana do cerebelo
  verme: (c) => (Math.abs(c[0] - X0) < 8.5 ? 1 : 0),
};
for (const m of meshes) {
  const rule = REG[m.o.reg], nt = m.ix.length / 3, buckets = [];
  for (let t = 0; t < nt; t++) {
    const a = m.ix[t * 3], b = m.ix[t * 3 + 1], c = m.ix[t * 3 + 2];
    const r = rule ? rule([0, 1, 2].map((d) => (m.src[a * 3 + d] + m.src[b * 3 + d] + m.src[c * 3 + d]) / 3)) : 0;
    (buckets[r] ||= []).push(a, b, c);
  }
  // em cada região: ordem de triângulos boa para a compressão
  const parts = buckets.map((b) => { const ix = new Uint32Array(b || []); if (ix.length) { const copy = ix.slice(); const [remap] = MeshoptEncoder.reorderMesh(copy, true, true); const inv = new Uint32Array(remap.length); for (let i = 0; i < remap.length; i++) if (remap[i] !== 0xffffffff) inv[remap[i]] = i; for (let i = 0; i < copy.length; i++) copy[i] = inv[copy[i]]; return copy; } return ix; });
  // vértices numerados pela ordem de primeiro uso, de que o empacotamento depende
  const num = new Map(), pos = [], ix = new Uint32Array(m.ix.length); let w = 0;
  for (const part of parts) for (const i of part) {
    let j = num.get(i);
    if (j === undefined) { j = num.size; num.set(i, j); pos.push(m.src[i * 3], m.src[i * 3 + 1], m.src[i * 3 + 2]); }
    ix[w++] = j;
  }
  m.pos = new Float32Array(pos); m.ix = ix; m.g = parts.map((p) => p.length / 3); delete m.src;
}

/* ---------- oclusão de ambiente: escurece o fundo dos sulcos ---------- */
const geoOf = (list) => {
  const pos = [], idx = []; let base = 0;
  for (const m of list) { for (const v of m.pos) pos.push(v); for (const i of m.ix) idx.push(i + base); base += m.pos.length / 3; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setIndex(idx); return g;
};
const DIRS = (() => { // direções no hemisfério em torno de +z, com peso pelo cosseno
  const d = []; const N = 40;
  for (let i = 0; i < N; i++) { const u = (i + 0.5) / N, v = (i * 0.61803398875) % 1, r = Math.sqrt(u), a = 2 * Math.PI * v; d.push(new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), Math.sqrt(1 - u))); }
  return d;
})();
function bake(targets, occluders, far) {
  const bvh = new MeshBVH(geoOf(occluders)), ray = new THREE.Ray(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 0, 1), n = new THREE.Vector3(), d = new THREE.Vector3();
  for (const m of targets) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(m.pos, 3)); g.setIndex([...m.ix]); g.computeVertexNormals();
    const nor = g.attributes.normal.array, nv = m.pos.length / 3; m.ao = new Uint8Array(nv);
    for (let i = 0; i < nv; i++) {
      n.set(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]); q.setFromUnitVectors(up, n);
      ray.origin.set(m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]).addScaledVector(n, 0.08);
      let occ = 0;
      for (const dir of DIRS) {
        ray.direction.copy(d.copy(dir).applyQuaternion(q));
        const h = bvh.raycastFirst(ray, THREE.DoubleSide, 0, far);
        if (h) occ += 1 - h.distance / far;
      }
      const a = 1 - Math.min(1, (occ / DIRS.length) * 1.9);
      m.ao[i] = Math.round(63 * Math.max(0, Math.min(1, a)));
    }
  }
}
const by = (tag) => meshes.filter((m) => m.o.ao === tag);
console.log('oclusão de ambiente…');
bake(by('cx'), by('cx'), 9);
bake(by('cb'), by('cb'), 5);
bake(by('tr'), by('tr'), 6);

/* ---------- empacotamento em texto ----------
   88 caracteres seguros dentro de um <script> (sem aspas, barra invertida, $, crase nem <). Um número pequeno
   ocupa um caractere; os maiores, dois ou cinco. Posições vão como diferença para o vértice anterior; índices,
   como "vértice novo" (0) ou distância para trás na numeração. */
const ABC = [...Array(94).keys()].map((i) => String.fromCharCode(33 + i)).filter((c) => !'"$\'<\\`'.includes(c)).join('');
function pack(nums) {
  let s = '';
  for (const n of nums) {
    if (n < 76) s += ABC[n];
    else if (n < 76 + 11 * 88) { const m = n - 76; s += ABC[76 + Math.floor(m / 88)] + ABC[m % 88]; }
    else { let m = n, t = ''; for (let k = 0; k < 4; k++) { t = ABC[m % 88] + t; m = Math.floor(m / 88); } if (m) throw new Error('número grande demais: ' + n); s += ABC[87] + t; }
  }
  return s;
}
const zig = (d) => (d < 0 ? -2 * d - 1 : 2 * d);
let tris = 0, verts = 0;
const parts = meshes.map((m) => {
  const step = m.o.passo || 0.03, nv = m.pos.length / 3, nt = m.ix.length / 3, min = [Infinity, Infinity, Infinity];
  for (let i = 0; i < nv; i++) for (let c = 0; c < 3; c++) min[c] = Math.min(min[c], m.pos[i * 3 + c]);
  const nums = [], prev = [0, 0, 0];
  for (let i = 0; i < nv; i++) for (let c = 0; c < 3; c++) { const q = Math.round((m.pos[i * 3 + c] - min[c]) / step); nums.push(zig(q - prev[c])); prev[c] = q; }
  let next = 0;
  for (const i of m.ix) { if (i === next) { nums.push(0); next++; } else if (i < next) nums.push(next - i); else throw new Error(m.k + ': vértice fora da ordem de primeiro uso'); }
  if (m.ao) { let p = 0; for (const a of m.ao) { nums.push(zig(a - p)); p = a; } }
  tris += nt; verts += nv;
  const d = pack(nums);
  console.log(`${m.k.padEnd(18)} ${String(m.n0).padStart(7)} → ${String(nt).padStart(6)} triângulos  ${(d.length / 1024).toFixed(0).padStart(5)} KB`);
  return { k: m.k, nv, nt, o: min.map((v) => +v.toFixed(3)), s: step, ...(m.o.meio ? { m: 1 } : {}), ...(m.ao ? { ao: 1 } : {}), ...(m.g.length > 1 ? { g: m.g } : {}), d };
});

const head = `// Gerado por scripts/malhas-encefalo.mjs. Não edite à mão.\n// Malhas do BodyParts3D, © The Database Center for Life Science, sob CC Attribution-Share Alike 2.1 Japan\n// (versão 3.0, 2011-09-15), simplificadas. Coordenadas em milímetros: x para a esquerda, y para trás, z para cima.\n`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${head}export const MALHAS = ${JSON.stringify({ abc: ABC, x0: X0, parts })};\n`);
console.log(`\n${parts.length} peças, ${tris} triângulos, ${verts} vértices → ${path.relative(root, OUT)} ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
