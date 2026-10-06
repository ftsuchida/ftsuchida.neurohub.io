// Artérias da base do encéfalo, desenhadas por código sobre a malha: cada trajeto é uma lista de pontos presos à
// superfície (por raios lançados de fora) e um pouco afastados dela. Posição aproximada, guiada pelas figuras do
// apêndice ("Aporte vascular ao encéfalo"). O conjunto de malhas não traz artérias.
import * as THREE from 'three';
import { V } from './palco.js';
import { tube, curveOf } from './geo.js';
import { PARTS } from './partes.js';
import { LINHAS } from './linhas.dados.js';
import { inBulbo } from './nucleos.js';

const axisZ = (y) => (y >= -1.4 ? 0.2 : y >= -3.9 ? 0.2 + ((y + 1.4) / -2.5) * -0.78 : inBulbo(y, 0, 0).z);

export function ensureArteries(st) {
  if (st.arteries) return;
  st.arteries = true;
  const ray = new THREE.Ray();
  const CORTEX = Object.keys(PARTS).filter((k) => PARTS[k].L === 'cx').map((k) => st.geoOf(k));
  const STEM = ['mesencefalo', 'pedunculo', 'ponte', 'bulbo'].map((k) => st.geoOf(k)).concat([st.byKey['medula-espinhal|m'].geo]);
  const BASE = [...CORTEX, ...STEM, ...['quiasma', 'tracto-optico', 'hipotalamo', 'tuber', 'mamilar', 'cerebelo'].map((k) => st.geoOf(k))];
  const cast = (geos, o, d) => { let best = null; ray.origin.copy(o); ray.direction.copy(d).normalize(); for (const g of geos) { const h = g.boundsTree.raycastFirst(ray, THREE.DoubleSide); if (h && (!best || h.distance < best.distance)) best = h; } return best && best.point.clone(); };
  /* Pontos presos à superfície; off = afastamento para fora. */
  const around = (y, deg, off = 0.1) => { const a = (deg * Math.PI) / 180, d = V(Math.sin(a), 0, Math.cos(a)), p = cast(STEM, V(0, y, axisZ(y)).addScaledVector(d, 6), d.clone().negate()); return p ? p.addScaledVector(d, off) : V(0, y, axisZ(y)).addScaledVector(d, 1.6); };
  const below = (x, z, off = 0.1) => { const p = cast(BASE, V(x, -12, z), V(0, 1, 0)); return p ? p.add(V(0, -off, 0)) : V(x, -1, z); };
  const above = (x, z, off = 0.08) => { const p = cast([st.geoOf('cerebelo')], V(x, 6, z), V(0, -1, 0)); return p ? p.add(V(0, off, 0)) : V(x, -1.5, z); };
  const HEMI = V(3.2, 1.5, -0.5); // centro do hemisfério esquerdo: os ramos da face lateral são presos por raios que apontam para ele
  const lateral = (y, z, off = 0.07) => { const o = V(11, y, z), d = HEMI.clone().sub(o).normalize(), p = cast(CORTEX, o, d); return p ? p.addScaledVector(d, -off) : V(6, y, z); };
  const medial = (y, z, off = 0.1) => { const p = cast([...CORTEX, st.geoOf('caloso')], V(0.02, y, z), V(1, 0, 0)); return p ? V(Math.max(0.1, p.x - off), y, z) : V(0.3, y, z); };
  const art = (card, pts, r, o = {}) => st.draw(card, tube(curveOf(pts), typeof r === 'number' ? r : (t) => r[0] + (r[1] - r[0]) * t, { radial: 10, segs: Math.max(10, pts.length * 5), capStart: true, capEnd: true }), { layer: 'art', pri: 3, cap: false, pair: o.pair !== false, ...o });

  /* ---------- por trás: vertebrais, basilar e os ramos dela ---------- */
  art('art-vertebral', [around(-8.6, 24, 0.14), around(-7.4, 26, 0.14), around(-6.2, 22, 0.13), around(-5.1, 14, 0.13), around(-4.25, 3, 0.14)], 0.13);
  art('art-basilar', [-4.3, -3.7, -3.0, -2.3, -1.7, -1.32].map((y) => around(y, 0, 0.15)), 0.15, { pair: false });
  art('art-cerebelar-superior', [around(-1.72, 2, 0.14), around(-1.74, 28, 0.1), around(-1.8, 58, 0.1), around(-1.85, 88, 0.1), above(2.5, -1.9), above(3.3, -2.7), above(3.9, -3.6)], [0.085, 0.05]);
  const pcaStart = around(-1.3, 2, 0.14);
  art('art-cerebral-posterior', [pcaStart, around(-1.12, 26, 0.12), around(-1.05, 54, 0.12), around(-1.05, 84, 0.12), below(2.55, -1.3), below(2.6, -2.7), below(2.3, -4.2), below(1.8, -5.6), below(1.4, -6.9)], [0.11, 0.06]);
  /* ---------- pela frente: carótidas internas e os ramos delas ---------- */
  const top = V(1.3, -0.72, 2.62); // onde a carótida interna se divide, ao lado do quiasma óptico
  art('art-carotida-interna', [V(1.38, -2.3, 2.3), V(1.36, -1.6, 2.45), V(1.32, -1.0, 2.58), top], 0.17);
  art('art-comunicante-posterior', [around(-1.1, 30, 0.12), V(1.12, -0.95, 1.9), V(1.24, -0.82, 2.3), top], 0.065);
  // cerebral anterior: vai para a frente e para a linha média, entra na fissura longitudinal e contorna o corpo caloso
  const acaJoin = V(0.36, -0.28, 3.55);
  art('art-cerebral-anterior', [top, V(0.95, -0.5, 3.05), acaJoin, medial(0.3, 4.4), medial(1.2, 5.5), medial(2.6, 5.75), medial(3.9, 4.9), medial(4.5, 3.1), medial(4.65, 1.0), medial(4.5, -1.1), medial(4.0, -3.0)], [0.1, 0.06]);
  art('art-cerebral-anterior', [medial(2.6, 5.75), medial(3.9, 6.6), medial(5.4, 6.3)], [0.06, 0.04], { key: 'aca-r1' });
  art('art-cerebral-anterior', [medial(4.65, 1.0), medial(5.9, 1.3), medial(7.0, 0.6)], [0.06, 0.04], { key: 'aca-r2' });
  art('art-comunicante-anterior', [acaJoin, V(0, -0.26, 3.6), acaJoin.clone().setX(-acaJoin.x)], 0.06, { pair: false });
  // cerebral média: vai para o lado, entra na fissura lateral e se abre em leque sobre a face lateral
  const syl = LINHAS['fissura-lateral'].map((q) => V(q[0], q[1], q[2])), inFissure = (i) => syl[i].clone().lerp(HEMI, 0.1);
  art('art-cerebral-media', [top, V(2.0, -0.7, 2.95), V(2.9, -0.75, 3.5), inFissure(1), inFissure(3), inFissure(6), inFissure(9), inFissure(12), inFissure(15)], [0.13, 0.07]);
  const branch = (i, ends, key) => art('art-cerebral-media', [inFissure(i), ...ends.map(([y, z]) => lateral(y, z))], [0.065, 0.04], { key });
  branch(3, [[2.4, 4.3], [3.6, 4.6], [5.0, 4.4]], 'mca-r1');
  branch(7, [[3.2, 2.6], [4.4, 2.2], [5.9, 1.6]], 'mca-r2');
  branch(11, [[3.4, 0.4], [4.8, -0.3], [6.2, -1.0]], 'mca-r3');
  branch(15, [[3.0, -2.2], [4.2, -3.2], [5.0, -4.4]], 'mca-r4');
  branch(18, [[1.6, -3.6], [1.4, -4.9], [1.2, -6.0]], 'mca-r5');
  branch(5, [[0.9, 3.4], [-0.1, 3.0], [-1.0, 2.2]], 'mca-r6');
  branch(10, [[1.2, 1.0], [0.3, 0.0], [-0.6, -1.4]], 'mca-r7');
  branch(14, [[1.2, -1.2], [0.4, -2.6], [-0.2, -4.0]], 'mca-r8');
}
