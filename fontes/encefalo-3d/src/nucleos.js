// Estruturas internas que o conjunto de malhas não traz: núcleos do tálamo, do mesencéfalo, da ponte, do cerebelo
// e do bulbo, as pirâmides e o lemnisco medial. São sólidos fechados desenhados por código, com posição aproximada,
// guiada pelas figuras do apêndice do livro (cortes 1 a 9). Como são sólidos, aparecem em qualquer plano de corte.
// Coordenadas em cm: X = esquerda, Y = cima, Z = frente (no tronco encefálico, a frente é o lado ventral).
import * as THREE from 'three';
import { V } from './palco.js';
import { ovalTube, blob } from './geo.js';

/* Linha do centro, meia espessura (ventral-dorsal, em Z) e meia largura (em X) do bulbo, por altura Y, medidas na malha. */
const BULBO = [[-3.9, -0.58, 1.0, 1.25], [-4.5, -0.85, 1.16, 1.23], [-5.0, -1.1, 1.1, 1.09], [-5.5, -1.37, 0.885, 0.84], [-6.0, -1.61, 0.73, 0.78], [-6.5, -1.8, 0.675, 0.78], [-7.0, -1.92, 0.69, 0.77], [-7.6, -2.07, 0.66, 0.7], [-9.0, -2.66, 0.6, 0.68]];
const at = (T, y) => {
  let i = 0; while (i < T.length - 2 && y < T[i + 1][0]) i++;
  const a = T[i], b = T[i + 1], k = Math.max(0, Math.min(1, (y - a[0]) / (b[0] - a[0])));
  return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k];
};
/** Ponto no bulbo: u = fração da meia largura (0 = linha média); w = fração da meia espessura (+1 ventral, -1 dorsal). */
const inBulbo = (y, u, w) => { const [zc, hz, hx] = at(BULBO, y); return V(u * hx, y, zc + w * hz); };
const column = (y0, y1, u, w, n = 7) => { const pts = []; for (let i = 0; i < n; i++) pts.push(inBulbo(y0 + ((y1 - y0) * i) / (n - 1), u, w)); return pts; };

export function addNuclei(st, { draw }) {
  const nuc = (card, geo, org, o = {}) => draw(card, geo, { layer: 'nuc', pri: 5, map: { n: card, o: org }, ...o });
  const FWD = V(0, 0, 1);

  /* ---------- tálamo e vizinhança ---------- */
  nuc('nucleo-ventral-posterior', blob(V(1.5, 0.42, 0.25), [0.5, 0.36, 1.0], [0, -0.12, 0]), 'diencefalo', { pair: true });
  nuc('nucleo-ventral-lateral', blob(V(1.38, 1.12, 0.6), [0.5, 0.34, 0.85], [0, -0.1, 0]), 'diencefalo', { pair: true });
  nuc('nucleo-pulvinar', blob(V(1.2, 0.88, -1.12), [0.82, 0.62, 0.52]), 'diencefalo', { pair: true });
  nuc('subtalamo', blob(V(0.95, -0.14, 1.12), [0.46, 0.15, 0.4], [0, 0, -0.25]), 'diencefalo', { pair: true });
  nuc('area-septal', blob(V(0.2, 1.72, 1.55), [0.17, 0.3, 0.42]), 'telencefalo', { pair: true, pri: 6 });

  /* ---------- mesencéfalo ---------- */
  // substância cinzenta periaquedutal: um tubo em volta do aqueduto
  nuc('cinzenta-periaquedutal', ovalTube([V(0, 0.0, -0.27), V(0, -0.5, -0.47), V(0, -1.0, -0.56), V(0, -1.42, -0.6)], 0.37, 0.37, { up: FWD, segs: 16 }), 'mesencefalo', { pri: 4 });
  // substância nigra: faixa achatada na base, que vai da linha média para o lado e para trás
  nuc('substancia-nigra', ovalTube([V(0.92, 0.04, 1.0), V(0.92, -0.4, 0.86), V(0.92, -0.9, 0.76), V(0.92, -1.42, 0.7)], 0.74, 0.13, { up: V(0.489, 0, 0.872), segs: 12, radial: 20 }), 'mesencefalo', { pair: true, pri: 5 });
  nuc('nucleo-rubro', blob(V(0.44, -0.58, 0.27), [0.31, 0.33, 0.31]), 'mesencefalo', { pair: true, pri: 5 });

  /* ---------- ponte e cerebelo ---------- */
  nuc('nucleos-pontinos', blob(V(0, -2.75, 0.72), [1.45, 1.05, 0.56]), 'ponte', { pri: 4 });
  nuc('formacao-reticular', ovalTube([V(0.52, -1.7, -0.2), V(0.55, -2.6, -0.26), V(0.55, -3.5, -0.42)], 0.36, 0.26, { up: FWD, segs: 10 }), 'ponte', { pair: true, key: 'fr-pontina', pri: 4 });
  for (const [x, y, z, r] of [[0.42, -1.72, -2.92, [0.2, 0.26, 0.2]], [1.0, -1.72, -3.0, [0.26, 0.3, 0.24]], [1.82, -1.74, -3.08, [0.5, 0.42, 0.4]]])
    nuc('nucleos-cerebelares', blob(V(x, y, z), r), 'cerebelo', { pair: true, pri: 4 });

  /* ---------- bulbo ---------- */
  // pirâmides: duas colunas de secção triangular na face ventral
  const tri = (a) => 0.72 + 0.28 * Math.cos(3 * (a - Math.PI / 2));
  nuc('piramide-bulbar', ovalTube(column(-3.95, -6.75, 0.3, 0.86), 0.34, 0.3, { up: V(1, 0, 0), segs: 16, radial: 18, shape: tri }), 'bulbo', { pair: true, pri: 5 });
  // decussação: cada pirâmide cruza a linha média e vai para a coluna lateral do outro lado
  {
    const a = inBulbo(-6.7, 0.3, 0.84), mid = inBulbo(-7.2, -0.05, 0.3), b = inBulbo(-7.75, -0.5, -0.05);
    nuc('decussacao-piramidal', ovalTube([a, a.clone().lerp(mid, 0.6), mid, mid.clone().lerp(b, 0.5), b], 0.2, 0.2, { up: V(0, 0, 1), segs: 14 }), 'bulbo', { pair: true, pri: 6 });
  }
  // oliva inferior: contorno ondulado
  nuc('oliva-inferior', ovalTube(column(-4.25, -5.75, 0.55, 0.3, 5), 0.33, 0.27, { up: V(1, 0, 0), segs: 14, radial: 28, shape: (a) => 1 + 0.12 * Math.sin(a * 7) }), 'bulbo', { pair: true, pri: 5 });
  nuc('oliva-superior', blob(inBulbo(-4.05, 0.5, -0.12), [0.2, 0.26, 0.17]), 'bulbo', { pair: true, pri: 5 });
  nuc('nucleos-cocleares', blob(inBulbo(-4.15, 0.93, -0.72), [0.2, 0.3, 0.22]), 'bulbo', { pair: true, key: 'coclear-dorsal', pri: 5 });
  nuc('nucleos-cocleares', blob(inBulbo(-4.2, 1.0, -0.2), [0.19, 0.3, 0.26]), 'bulbo', { pair: true, key: 'coclear-ventral', pri: 5 });
  // núcleo da rafe: faixa estreita na linha média
  nuc('nucleo-da-rafe', ovalTube(column(-3.95, -5.6, 0, 0.06, 5), 0.46, 0.055, { up: V(1, 0, 0), segs: 12, radial: 14 }), 'bulbo', { pri: 6 });
  nuc('nucleos-vestibulares', ovalTube(column(-4.0, -5.3, 0.62, -0.62, 5), 0.2, 0.3, { up: V(1, 0, 0), segs: 10 }), 'bulbo', { pair: true, pri: 5 });
  nuc('nucleo-gustatorio', ovalTube(column(-4.3, -5.5, 0.3, -0.56, 5), 0.13, 0.15, { up: V(1, 0, 0), segs: 10 }), 'bulbo', { pair: true, pri: 5 });
  nuc('formacao-reticular', ovalTube(column(-4.3, -5.7, 0.42, -0.14, 5), 0.26, 0.3, { up: V(1, 0, 0), segs: 10 }), 'bulbo', { pair: true, key: 'fr-bulbar', pri: 4 });
  // lemnisco medial: fita junto à linha média, dorsal às pirâmides
  nuc('lemnisco-medial', ovalTube(column(-4.6, -7.1, 0.13, 0.3, 7), 0.28, 0.075, { up: V(1, 0, 0), segs: 16, radial: 14 }), 'bulbo', { pair: true, pri: 5 });
  nuc('nucleos-da-coluna-dorsal', ovalTube(column(-6.35, -7.45, 0.36, -0.58, 4), 0.2, 0.24, { up: V(1, 0, 0), segs: 8 }), 'bulbo', { pair: true, pri: 5 });

  /* ---------- córtex gustatório: ponto marcado no alto da ínsula ---------- */
  draw('cortex-gustatorio', blob(V(4.15, 2.75, 0.2), [0.14, 0.42, 0.5], [0, 0, 0.35]), { pair: true, layer: 'gust', pri: 2, cap: false, map: { n: 'cortex-gustatorio', o: 'telencefalo' } });
}

export { inBulbo };
