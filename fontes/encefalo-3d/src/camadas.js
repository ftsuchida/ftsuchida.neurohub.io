// Palco "Camadas": um bloco ampliado, do osso ao encéfalo, com as três meninges em degraus. É um desenho esquemático,
// fora de escala, como a figura do livro (as meninges em secção). X = largura, Y = altura, Z = para quem olha.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Stage, V } from './palco.js';
import { tube, curveOf, rng } from './geo.js';
import { tr } from '../../comum/lang.js';

const X0 = -3, X1 = 3, Z0 = -2.2, Z1 = 2.2, FLOOR = -2.5;
/* A superfície do encéfalo no bloco: dois giros com um sulco no meio. */
const surf = (x) => 1.55 + 0.16 * Math.cos((x - 0.5) * 1.05) - 1.55 * Math.exp(-(((x - 0.5) / 0.4) ** 2));
const PIA = 0.07, ARAC = [2.62, 2.84], DURA = [2.84, 3.22], BONE = [3.22, 4.25];

/** Sólido de perfil constante: o contorno (x, y) é esticado de Z0 a Z1. */
function slab(outline) {
  const sh = new THREE.Shape(outline.map((p) => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(sh, { depth: Z1 - Z0, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, Z0);
  return g;
}
const line = (f, a, b, n = 60) => { const o = []; for (let i = 0; i <= n; i++) { const x = a + ((b - a) * i) / n; o.push([x, f(x)]); } return o; };
const box = (a, b, y0, y1) => slab([[a, y0], [b, y0], [b, y1], [a, y1]]);

export function buildLayers() {
  const st = new Stage('camadas', { box: { c: V(0, 0.9, 0), hw: 4.6, hh: 4.3 }, dir: V(0.52, 0.4, 1), dist: [3, 60] });
  const flat = { cap: false };
  // encéfalo e pia-máter: seguem o relevo, e a pia entra no sulco
  st.add('encefalo', slab([...line(surf, X0, X1), [X1, FLOOR], [X0, FLOOR]]), { ...flat, name: tr('Encéfalo', 'Brain') });
  st.add('pia-mater', slab([...line((x) => surf(x) + PIA, X0, X1), ...line(surf, X0, X1).reverse()]), { ...flat, mat: { clear: 0.7, rough: 0.3 } });
  // espaço subaracnóideo: o líquido enche tudo entre a pia e a aracnoide, inclusive o sulco. O clique atravessa o líquido
  // e pega o que se vê dentro dele (a artéria, os fios, a pia); o espaço em si abre pelo rótulo ou pela lista.
  st.add('espaco-subaracnoideo', slab([...line((x) => surf(x) + PIA, X0, X1), [X1, ARAC[0]], [X0, ARAC[0]]]), { ...flat, layer: 'sas', see: true, label: false, mat: { glass: 0.34, rough: 0.2 } });
  // as três camadas de cima, em degraus: cada uma deixa ver um trecho da de baixo
  const EDGE = { arac: 1.05, dura: -0.25, bone: -1.5 };
  st.add('aracnoide', box(X0, EDGE.arac, ARAC[0], ARAC[1]), { ...flat, mat: { rough: 0.5 } });
  st.add('dura-mater', box(X0, EDGE.dura, DURA[0], DURA[1]), { ...flat, mat: { rough: 0.85 } });
  st.add('cranio', box(X0, EDGE.bone, BONE[0], BONE[1]), { ...flat, mat: { rough: 0.9 } });
  // trabéculas: os fios da aracnoide que atravessam o espaço subaracnóideo até a pia ("teia de aranha")
  {
    const rnd = rng(5), gs = [];
    for (let i = 0; i < 46; i++) {
      const x = X0 + 0.2 + rnd() * (EDGE.arac - X0 - 0.35), z = Z0 + 0.15 + rnd() * (Z1 - Z0 - 0.3), x2 = x + (rnd() - 0.5) * 0.5;
      const a = V(x, ARAC[0] + 0.02, z), b = V(x2, surf(x2) + PIA - 0.02, z + (rnd() - 0.5) * 0.4);
      gs.push(tube([a, a.clone().lerp(b, 0.5).add(V((rnd() - 0.5) * 0.12, 0, (rnd() - 0.5) * 0.12)), b], (t) => 0.02 + 0.03 * (2 * t - 1) ** 2, { radial: 6, segs: 6 }));
    }
    // na face da frente, alguns fios bem à vista
    for (const x of [-2.6, -2.0, -1.3, -0.7, -0.15, 0.75]) { const a = V(x, ARAC[0] + 0.02, Z1 - 0.03), x2 = x + 0.12, b = V(x2, surf(x2) + PIA - 0.02, Z1 - 0.03); gs.push(tube([a, a.clone().lerp(b, 0.5), b], (t) => 0.022 + 0.03 * (2 * t - 1) ** 2, { radial: 6, segs: 6 })); }
    st.add('aracnoide', mergeGeometries(gs.map((g) => { g.deleteAttribute('uv'); return g; })), { ...flat, key: 'trabeculas', label: false });
  }
  // artéria: corre sobre a pia, manda um ramo para dentro do sulco e ramos finos que entram no tecido
  {
    const RED = { color: '#D8474B', shade: 'art', rough: 0.35, clear: 0.5 }, on = (x, z, up = 0.2) => V(x, surf(x) + PIA + up, z);
    const art = (pts, r, segs = 28) => st.add('pia-mater', tube(curveOf(pts), typeof r === 'number' ? r : (t) => r[0] + (r[1] - r[0]) * t, { radial: 12, segs, capStart: true, capEnd: true }), { ...flat, key: 'arteria', name: tr('Artéria', 'Artery'), mat: RED });
    art([on(-2.85, 1.2), on(-2.0, 0.9), on(-1.1, 1.25), on(-0.3, 0.9, 0.24), V(0.5, 1.72, 0.55), on(1.3, 0.3, 0.24), on(2.1, 0.55), on(2.9, 0.2)], [0.2, 0.15], 60);
    art([on(-1.1, 1.25, 0.18), on(-1.5, 0.2, 0.14), on(-2.2, -0.9, 0.13), on(-2.85, -1.4, 0.13)], [0.11, 0.08]);
    art([on(1.3, 0.3, 0.2), on(1.9, -0.6, 0.14), on(2.5, -1.5, 0.13), on(2.9, -1.9, 0.13)], [0.11, 0.08]);
    art([V(0.5, 1.72, 0.55), V(0.5, 1.2, 0.8), V(0.52, 0.6, 1.2), V(0.5, 0.22, 1.7)], [0.1, 0.07]); // desce pelo sulco
    // ramos que penetram: descem pela face da frente, para ficarem à vista
    const F = Z1 + 0.012, front = (pts, r = [0.055, 0.025]) => art(pts.map(([x, y]) => V(x, y, F)), r, 22);
    art([on(-1.1, 1.25, 0.16), on(-1.45, 1.8, 0.14), V(-1.62, surf(-1.62) + PIA + 0.1, Z1 - 0.05), V(-1.66, surf(-1.66) - 0.1, F)], [0.09, 0.055]);
    front([[-1.66, surf(-1.66) - 0.1], [-1.7, 0.75], [-1.56, 0.0], [-1.72, -0.85], [-1.6, -1.6]]);
    front([[-1.7, 0.75], [-2.05, 0.3], [-2.3, -0.4]], [0.035, 0.018]); front([[-1.56, 0.0], [-1.2, -0.5], [-1.0, -1.2]], [0.035, 0.018]);
    art([on(1.3, 0.3, 0.16), on(1.55, 1.3, 0.14), V(1.7, surf(1.7) + PIA + 0.1, Z1 - 0.05), V(1.72, surf(1.72) - 0.1, F)], [0.09, 0.055]);
    front([[1.72, surf(1.72) - 0.1], [1.8, 0.6], [1.66, -0.2], [1.82, -1.1]]);
    front([[1.8, 0.6], [2.15, 0.1], [2.4, -0.7]], [0.035, 0.018]); front([[1.66, -0.2], [1.3, -0.7], [1.15, -1.4]], [0.035, 0.018]);
  }
  const P = (x, y) => V(x, y, Z1 + 0.01), toFront = V(0, 0, 1);
  st.fallback = 'camadas';
  st.subs.camadas = {
    states: (it) => (it.layer === 'sas' ? 'glass' : 'solid'),
    view: { box: st.box, dir: st.dir, margin: true }, margin: true, minArea: 12,
    extra: () => [
      { id: 'espaco-subaracnoideo', pos: P(-2.3, 2.15), n: toFront, rank: 30 },
      // normalmente não há espaço entre a dura e a aracnoide: o rótulo aponta a junção das duas
      { id: 'dura-mater', text: tr('Espaço subdural', 'Subdural space'), pos: P(-1.2, DURA[0]), n: toFront, rank: 18 },
    ],
  };
  return st;
}
