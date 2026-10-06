// Estruturas internas que o conjunto de malhas não traz: núcleos do tálamo, do mesencéfalo, da ponte, do cerebelo
// e do bulbo, as pirâmides e o lemnisco medial. São sólidos fechados desenhados por código, com posição aproximada,
// guiada pelas figuras do apêndice do livro (cortes 1 a 9). Como são sólidos, aparecem em qualquer plano de corte.
// Cada um é ajustado para caber dentro da peça de malha que o contém (fitInside), para não vazar na face do corte.
// Só entram quando os Cortes ou as Vias abrem (ensureNuclei): o Atlas não precisa deles.
// Coordenadas em cm: X = esquerda, Y = cima, Z = frente (no tronco encefálico, a frente é o lado ventral).
import * as THREE from 'three';
import { V } from './palco.js';
import { ovalTube, blob } from './geo.js';
import { tr } from '../../comum/lang.js';

/* Linha do centro, meia espessura (ventral-dorsal, em Z) e meia largura (em X) do bulbo, por altura Y, medidas na malha. */
const BULBO = [[-3.9, -0.58, 1.0, 1.25], [-4.5, -0.85, 1.16, 1.23], [-5.0, -1.1, 1.1, 1.09], [-5.5, -1.37, 0.885, 0.84], [-6.0, -1.61, 0.73, 0.78], [-6.5, -1.8, 0.675, 0.78], [-7.0, -1.92, 0.69, 0.77], [-7.6, -2.07, 0.66, 0.7], [-9.0, -2.66, 0.6, 0.68]];
const at = (T, y) => {
  let i = 0; while (i < T.length - 2 && y < T[i + 1][0]) i++;
  const a = T[i], b = T[i + 1], k = Math.max(0, Math.min(1, (y - a[0]) / (b[0] - a[0])));
  return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k];
};
/** Ponto no bulbo: u = fração da meia largura (0 = linha média); w = fração da meia espessura (+1 ventral, -1 dorsal). */
export const inBulbo = (y, u, w) => { const [zc, hz, hx] = at(BULBO, y); return V(u * hx, y, zc + w * hz); };
const column = (y0, y1, u, w, n = 7) => { const pts = []; for (let i = 0; i < n; i++) pts.push(inBulbo(y0 + ((y1 - y0) * i) / (n - 1), u, w)); return pts; };
/* Plano da secção 6 (ponte e cerebelo): ponto, sentido rostral e sentido dorsal. Os núcleos do cerebelo ficam nele. */
export const P6 = V(0, -2.8, -0.5), R6 = V(0, 0.951, 0.309), U6 = V(0, 0.309, -0.951);
const on6 = (x, s, t = 0) => P6.clone().addScaledVector(U6, s).addScaledVector(R6, t).setX(x);

const _r = new THREE.Ray(), _d = V(0.3713, 0.7421, 0.5583).normalize(), _hit = {};
/** Ajusta um sólido para caber dentro de outras peças, com folga m: cada vértice que está fora (ou colado na parede)
    vai para a parede mais próxima e entra m para dentro. */
function fitInside(geo, gs, m = 0.045) {
  const p = geo.attributes.position, v = V(), best = V();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let deep = false, score = Infinity, into = false;
    for (const g of gs) {
      const h = g.boundsTree.closestPointToPoint(v, _hit); if (!h) continue;
      _r.origin.copy(v); _r.direction.copy(_d);
      const inside = g.boundingBox.containsPoint(v) && g.boundsTree.raycast(_r, THREE.DoubleSide).length % 2 === 1;
      if (inside && h.distance >= m) { deep = true; break; }
      const sc = inside ? h.distance - 100 : h.distance; // de preferência, a peça em que o ponto já está
      if (sc < score) { score = sc; best.copy(h.point); into = inside; }
    }
    if (deep || score === Infinity) continue;
    const dir = into ? v.clone().sub(best) : best.clone().sub(v);
    if (dir.lengthSq() < 1e-12) continue;
    v.copy(best).addScaledVector(dir.normalize(), m);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function addNuclei(st) {
  const { draw, geoOf } = st;
  // camada: 'nuc-' + a parte do encéfalo em que o núcleo fica, para aparecer só quando ela aparece
  const LAYER = { diencefalo: 'nuc-die', telencefalo: 'nuc-tel', mesencefalo: 'nuc-mes', ponte: 'nuc-pon', cerebelo: 'nuc-cb', bulbo: 'nuc-bul' };
  const cord = st.byKey['medula-espinhal|m'].geo;
  const IN = { talamo: [geoOf('talamo')], mes: [geoOf('mesencefalo'), geoOf('pedunculo')], ponte: [geoOf('ponte')], cerebelo: [geoOf('cerebelo')], bulbo: [geoOf('bulbo'), cord] };
  /** Núcleo desenhado. org: divisão a que pertence (camada e modo Origem); o.in: peça de malha em que tem de caber. */
  const ORG = { ponte: 'rombencefalo', cerebelo: 'rombencefalo', bulbo: 'rombencefalo' }; // a que divisão responde no modo de cores Origem
  const nuc = (card, geo, org, o = {}) => draw(card, o.in ? fitInside(geo, IN[o.in]) : geo, { layer: LAYER[org], pri: 5, map: { n: card, o: ORG[org] || org }, ...o });
  const FWD = V(0, 0, 1), X = V(1, 0, 0);

  /* ---------- tálamo e vizinhança ---------- */
  nuc('nucleo-ventral-posterior', blob(V(1.5, 0.42, 0.25), [0.5, 0.36, 1.0], [0, -0.12, 0]), 'diencefalo', { pair: true, in: 'talamo' });
  nuc('nucleo-ventral-lateral', blob(V(1.38, 1.12, 0.6), [0.5, 0.34, 0.85], [0, -0.1, 0]), 'diencefalo', { pair: true, in: 'talamo' });
  nuc('nucleo-pulvinar', blob(V(1.2, 0.88, -1.12), [0.82, 0.62, 0.52]), 'diencefalo', { pair: true, in: 'talamo' });
  nuc('subtalamo', blob(V(0.95, -0.14, 1.12), [0.46, 0.15, 0.4], [0, 0, -0.25]), 'diencefalo', { pair: true });
  nuc('area-septal', blob(V(0.2, 1.72, 1.55), [0.17, 0.3, 0.42]), 'telencefalo', { pair: true, pri: 6 });

  /* ---------- mesencéfalo ---------- */
  // substância cinzenta periaquedutal: um tubo em volta do aqueduto
  nuc('cinzenta-periaquedutal', ovalTube([V(0, 0.0, -0.27), V(0, -0.5, -0.47), V(0, -1.0, -0.56), V(0, -1.42, -0.6)], 0.37, 0.37, { up: FWD, segs: 16 }), 'mesencefalo', { pri: 4, in: 'mes' });
  // substância nigra: faixa achatada na base, que vai da linha média para o lado e para trás
  nuc('substancia-nigra', ovalTube([V(0.92, 0.04, 1.0), V(0.92, -0.4, 0.86), V(0.92, -0.9, 0.76), V(0.92, -1.42, 0.7)], 0.74, 0.13, { up: V(0.489, 0, 0.872), segs: 12, radial: 20 }), 'mesencefalo', { pair: true, in: 'mes' });
  nuc('nucleo-rubro', blob(V(0.44, -0.58, 0.27), [0.31, 0.33, 0.31]), 'mesencefalo', { pair: true, in: 'mes' });

  /* ---------- ponte e cerebelo ---------- */
  // núcleos pontinos: enchem a parte ventral (a base) da ponte
  nuc('nucleos-pontinos', blob(V(0, -2.75, 0.55), [1.75, 1.15, 0.72]), 'ponte', { pri: 4, in: 'ponte' });
  nuc('formacao-reticular', ovalTube([V(0.52, -1.7, -0.2), V(0.55, -2.6, -0.26), V(0.55, -3.5, -0.42)], 0.36, 0.26, { up: FWD, segs: 10 }), 'ponte', { pair: true, key: 'fr-pontina', pri: 5, in: 'ponte', name: tr('Formação reticular pontina', 'Pontine reticular formation') });
  // núcleos cerebelares profundos: três de cada lado, logo acima do teto do quarto ventrículo
  for (const [x, s, r] of [[0.42, 1.75, [0.2, 0.24, 0.22]], [0.98, 1.72, [0.24, 0.26, 0.24]], [1.72, 1.62, [0.44, 0.34, 0.38]]])
    nuc('nucleos-cerebelares', blob(on6(x, s), r), 'cerebelo', { pair: true, pri: 4, in: 'cerebelo' });

  /* ---------- bulbo ---------- */
  // pirâmides: duas colunas de secção triangular na face ventral
  const tri = (a) => 0.72 + 0.28 * Math.cos(3 * (a - Math.PI / 2));
  nuc('piramide-bulbar', ovalTube(column(-3.95, -6.75, 0.3, 0.86), 0.34, 0.3, { up: X, segs: 16, radial: 18, shape: tri }), 'bulbo', { pair: true, in: 'bulbo' });
  // decussação: cada pirâmide cruza a linha média e vai para a coluna lateral do outro lado
  {
    const a = inBulbo(-6.7, 0.3, 0.84), mid = inBulbo(-7.2, -0.05, 0.3), b = inBulbo(-7.75, -0.5, -0.05);
    nuc('decussacao-piramidal', ovalTube([a, a.clone().lerp(mid, 0.6), mid, mid.clone().lerp(b, 0.5), b], 0.2, 0.2, { up: FWD, segs: 14 }), 'bulbo', { pair: true, pri: 6, in: 'bulbo' });
  }
  // oliva inferior: contorno ondulado
  nuc('oliva-inferior', ovalTube(column(-4.25, -5.75, 0.55, 0.3, 5), 0.33, 0.27, { up: X, segs: 14, radial: 28, shape: (a) => 1 + 0.12 * Math.sin(a * 7) }), 'bulbo', { pair: true, in: 'bulbo' });
  nuc('oliva-superior', blob(inBulbo(-4.45, 0.5, -0.12), [0.2, 0.26, 0.17]), 'bulbo', { pair: true, in: 'bulbo' });
  nuc('nucleos-cocleares', blob(inBulbo(-4.5, 1.0, -0.52), [0.17, 0.3, 0.2]), 'bulbo', { pair: true, key: 'coclear-dorsal', pri: 6, in: 'bulbo', name: tr('Núcleo coclear dorsal', 'Dorsal cochlear nucleus') });
  nuc('nucleos-cocleares', blob(inBulbo(-4.5, 1.0, 0.02), [0.17, 0.3, 0.26]), 'bulbo', { pair: true, key: 'coclear-ventral', pri: 6, in: 'bulbo', name: tr('Núcleo coclear ventral', 'Ventral cochlear nucleus') });
  // núcleo da rafe: faixa estreita na linha média
  nuc('nucleo-da-rafe', ovalTube(column(-3.95, -5.6, 0, 0.06, 5), 0.46, 0.055, { up: X, segs: 12, radial: 14 }), 'bulbo', { pri: 6 });
  nuc('nucleos-vestibulares', ovalTube(column(-4.0, -5.3, 0.62, -0.62, 5), 0.2, 0.3, { up: X, segs: 10 }), 'bulbo', { pair: true, in: 'bulbo' });
  nuc('nucleo-gustatorio', ovalTube(column(-4.3, -5.5, 0.3, -0.56, 5), 0.13, 0.15, { up: X, segs: 10 }), 'bulbo', { pair: true, in: 'bulbo' });
  nuc('formacao-reticular', ovalTube(column(-4.3, -5.7, 0.42, -0.14, 5), 0.26, 0.3, { up: X, segs: 10 }), 'bulbo', { pair: true, key: 'fr-bulbar', pri: 4, in: 'bulbo', name: tr('Formação reticular bulbar', 'Medullary reticular formation') });
  // lemnisco medial: fita junto à linha média, dorsal às pirâmides
  nuc('lemnisco-medial', ovalTube(column(-4.75, -7.3, 0.13, 0.3, 7), 0.28, 0.075, { up: X, segs: 16, radial: 14 }), 'bulbo', { pair: true, in: 'bulbo' });
  nuc('nucleos-da-coluna-dorsal', ovalTube(column(-6.1, -7.45, 0.36, -0.58, 5), 0.2, 0.24, { up: X, segs: 8 }), 'bulbo', { pair: true, in: 'bulbo' });
}

/** Põe os núcleos no palco do encéfalo, uma vez só. */
export function ensureNuclei(st) {
  if (st.nuclei) return;
  st.nuclei = true;
  const t0 = performance.now();
  addNuclei(st);
  console.log('[t] núcleos', Math.round(performance.now() - t0));
}
