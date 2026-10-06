// Nervos cranianos III a XII: tocos desenhados por código na base do encéfalo, no lugar aproximado em que cada um
// sai do tronco encefálico na figura do apêndice. O conjunto de malhas só traz o nervo óptico (II); o olfatório (I)
// é o tracto com o bulbo, desenhado em encefalo.js.
import * as THREE from 'three';
import { V } from './palco.js';
import { tube, curveOf } from './geo.js';
import { inBulbo } from './nucleos.js';

/* [ficha, altura Y no tronco, ângulo em torno do eixo do tronco (0° = frente, 90° = lado esquerdo), raio, comprimento,
   direção que o toco toma depois de sair] */
const NC = [
  ['nc-oculomotor', -1.2, 13, 0.085, 1.5, [0.3, -0.12, 1]],
  ['nc-troclear', -1.4, 62, 0.055, 1.7, [0.5, -0.55, 0.8]],
  ['nc-trigemeo', -2.55, 68, 0.2, 1.1, [0.85, -0.05, 0.65]],
  ['nc-abducente', -3.96, 13, 0.06, 1.5, [0.14, -0.18, 1]],
  ['nc-facial', -3.95, 50, 0.09, 1.3, [0.8, -0.15, 0.7]],
  ['nc-vestibulococlear', -4.1, 63, 0.11, 1.3, [0.9, -0.1, 0.55]],
  ['nc-glossofaringeo', -4.65, 70, 0.06, 1.3, [0.92, -0.2, 0.42]],
  ['nc-vago', -5.1, 72, 0.085, 1.45, [0.92, -0.3, 0.38]],
  ['nc-acessorio', -5.6, 76, 0.06, 1.4, [0.9, -0.45, 0.3]],
  ['nc-hipoglosso', -5.3, 30, 0.06, 1.3, [0.5, -0.3, 0.9]],
];
/* Centro do tronco encefálico (Z) em cada altura: mesencéfalo, ponte e bulbo. */
const axisZ = (y) => (y >= -1.4 ? 0.2 : y >= -3.9 ? 0.2 + ((y + 1.4) / -2.5) * -0.78 : inBulbo(y, 0, 0).z);

/** Põe os tocos dos nervos no palco do encéfalo (uma vez só). */
export function ensureNerves(st) {
  if (st.nerves) return;
  st.nerves = true;
  const ray = new THREE.Ray(), stem = ['mesencefalo', 'pedunculo', 'ponte', 'bulbo'].map((k) => st.geoOf(k));
  /** Ponto na superfície do tronco, na altura y e no ângulo deg em torno do eixo, afastado de off. */
  const on = (y, deg, off) => {
    const a = (deg * Math.PI) / 180, d = V(Math.sin(a), 0, Math.cos(a)); ray.origin.set(0, y, axisZ(y)).addScaledVector(d, 6); ray.direction.copy(d).negate();
    let best = null; for (const g of stem) { const h = g.boundsTree.raycastFirst(ray, THREE.DoubleSide); if (h && (!best || h.distance < best.distance)) best = h; }
    return (best ? best.point.clone() : V(0, y, axisZ(y)).addScaledVector(d, 1.5)).addScaledVector(d, off);
  };
  for (const [card, y, deg, r, len, out] of NC) {
    const a = (deg * Math.PI) / 180, d = V(Math.sin(a), 0, Math.cos(a)), c = V(0, y, axisZ(y));
    ray.origin.copy(c).addScaledVector(d, 6); ray.direction.copy(d).negate();
    let best = null; for (const g of stem) { const h = g.boundsTree.raycastFirst(ray, THREE.DoubleSide); if (h && (!best || h.distance < best.distance)) best = h; }
    if (!best) continue;
    const p = best.point.clone(), o = V(out[0], out[1], out[2]).normalize();
    let pts = [p.clone().addScaledVector(d, -0.08), p.clone().addScaledVector(d, 0.16), p.clone().addScaledVector(d, 0.2).addScaledVector(o, len * 0.45), p.clone().addScaledVector(d, 0.2).addScaledVector(o, len).add(V(0, -0.1 * len, 0))];
    // o troclear sai por trás do mesencéfalo e o contorna: aqui aparece o trecho que dá a volta pelo lado e vem para a frente
    if (card === 'nc-troclear') { const q = on(-1.38, 36, 0.12); pts = [on(-1.26, 92, 0.03), on(-1.3, 64, 0.07), q, q.clone().add(V(0.22, -0.4, 0.5)), q.clone().add(V(0.5, -0.85, 1.0))]; }
    st.draw(card, tube(curveOf(pts), (t) => r * (1 - 0.12 * t), { radial: 10, segs: 14, capStart: true, capEnd: true }), { pair: true, layer: 'nc', pri: 3, cap: false });
  }
}
