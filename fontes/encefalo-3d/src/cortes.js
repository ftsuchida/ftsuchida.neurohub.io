// Módulo Cortes: as nove secções do apêndice e o plano livre, no palco do encéfalo.
// A face do corte sai das próprias peças (palco.js). Aqui fica o que cada secção mostra: onde passa o plano, de onde
// a câmera olha, quais peças aparecem e quais rótulos entram. Os rótulos de cada secção são os das figuras do livro.
import { V } from './palco.js';
import { LINHAS } from './linhas.dados.js';
import { ensureNuclei, P6, R6 } from './nucleos.js';
import { tr } from '../../comum/lang.js';

/* Plano de cada secção: p = ponto por onde passa; r = sentido rostral do neuroeixo ali (a câmera fica desse lado, e some
   o que está desse lado). As coronais 1 a 3 cortam o prosencéfalo; da 4 em diante o plano inclina com o neuroeixo. */
const R45 = V(0, 0.99, 0.139), R79 = V(0, 0.923, 0.385);
const SEC = {
  c1: { p: V(0, 0, 1.6), r: V(0, 0, 1), kind: 'pros', box: { c: V(0, 2.3, 1.6), hw: 7.3, hh: 6.5 } },
  c2: { p: V(0, -0.36, 1.31), r: V(0, 0.342, 0.94), kind: 'pros', box: { c: V(0, 2.3, 0.3), hw: 7.3, hh: 6.6 } },
  c3: { p: V(0, -0.43, -0.4), r: V(0, 0.485, 0.875), kind: 'pros', box: { c: V(0, 2.3, -1.9), hw: 7.3, hh: 6.8 } },
  c4: { p: V(0, -0.41, -0.2), r: R45, kind: 'mes', rad: 2.5 },
  c5: { p: V(0, -1.13, -0.2), r: R45, kind: 'mes', rad: 2.5 },
  c6: { p: P6, r: R6, kind: 'pon', rad: 5.2, at: V(0, -2.3, -2.0) },
  c7: { p: V(0, -4.5, -0.85), r: R79, kind: 'bul', rad: 2.1 },
  c8: { p: V(0, -5.0, -1.1), r: R79, kind: 'bul', rad: 1.9 },
  c9: { p: V(0, -6.5, -1.8), r: R79, kind: 'bul', rad: 1.6 },
};
/* Rótulos de cada secção, como nas figuras do livro. Nas secções 1 a 3: a = características gerais; b = células e fibras. */
const ONLY = {
  c1a: ['lobo-frontal', 'ventriculo-lateral', 'talamo', 'insula', 'terceiro-ventriculo', 'lobo-temporal', 'telencefalo-basal', 'hipotalamo'],
  c1b: ['cortex-cerebral', 'corpo-caloso', 'area-septal', 'nucleo-caudado', 'fornice', 'substancia-branca', 'putame', 'capsula-interna', 'globo-palido'],
  c2a: ['lobo-frontal', 'lobo-parietal', 'ventriculo-lateral', 'talamo', 'insula', 'terceiro-ventriculo', 'lobo-temporal', 'telencefalo-basal', 'hipotalamo'],
  c2b: ['fornice', 'corpo-caloso', 'cortex-cerebral', 'nucleo-ventral-lateral', 'nucleo-caudado', 'nucleo-ventral-posterior', 'putame', 'capsula-interna', 'globo-palido', 'substancia-branca', 'amigdala', 'substancia-nigra', 'subtalamo', 'corpo-mamilar'],
  c3a: ['lobo-parietal', 'terceiro-ventriculo', 'ventriculo-lateral', 'talamo', 'lobo-temporal', 'mesencefalo', 'aqueduto'],
  c3b: ['cortex-cerebral', 'corpo-caloso', 'nucleo-pulvinar', 'nucleo-geniculado-lateral', 'substancia-branca', 'hipocampo', 'nucleo-geniculado-medial'],
  c4: ['coliculo-superior', 'aqueduto', 'cinzenta-periaquedutal', 'substancia-nigra', 'nucleo-rubro'],
  c5: ['coliculo-inferior', 'aqueduto', 'cinzenta-periaquedutal', 'substancia-nigra'],
  c6: ['quarto-ventriculo', 'cerebelo', 'nucleos-cerebelares', 'formacao-reticular', 'nucleos-pontinos'],
  c7: ['quarto-ventriculo', 'nucleos-cocleares', 'nucleo-da-rafe', 'oliva-superior', 'oliva-inferior', 'piramide-bulbar'],
  c8: ['quarto-ventriculo', 'nucleos-vestibulares', 'nucleo-gustatorio', 'formacao-reticular', 'oliva-inferior', 'lemnisco-medial', 'piramide-bulbar'],
  c9: ['canal-central', 'nucleos-da-coluna-dorsal', 'lemnisco-medial', 'piramide-bulbar'],
};
/* Quais camadas de peças aparecem em cada tipo de secção. */
const SHOW = {
  pros: new Set(['cx', 'wm', 'deep', 'die', 'opt', 'mes', 'ven', 'plexo']),
  mes: new Set(['mes', 'nuc-mes']),
  pon: new Set(['pon', 'cb', 'nuc-pon', 'nuc-cb']),
  bul: new Set(['bul', 'cord', 'nuc-bul']),
};
const VEN = { pros: ['vent-lateral', 'forame', 'vent-terceiro', 'aqueduto'], mes: ['aqueduto'], pon: ['vent-quarto'], bul: ['vent-quarto', 'canal-central'] };
const PLANES = { // plano livre: normal do lado que fica, de onde a câmera olha, e por onde o plano corre (de 0 a 1)
  coronal: { n: V(0, 0, -1), dir: V(0.28, 0.16, 1), at: (t) => V(0, 0, 8.3 - 16.6 * t) },
  horizontal: { n: V(0, -1, 0), dir: V(0.06, 1, -0.3), at: (t) => V(0, 7.9 - 14.6 * t, 0) },
  sagital: { n: V(-1, 0, 0), dir: V(1, 0.14, 0.3), at: (t) => V(6.6 - 13.2 * t, 0, 0) },
};

/* No tronco encefálico o neuroeixo é quase vertical: dorsal fica para trás e rostral, para cima. */
const AX_TRONCO = { x: [tr('esq.', 'left'), tr('dir.', 'right')], y: ['rostral', 'caudal'], z: ['ventral', 'dorsal'] };

export function addSections(st) {
  ensureNuclei(st);
  /* Ficha que mora em um dos cortes 1 a 3: abre na camada de rótulos em que ela aparece. */
  const homeOf = st.homeOf;
  st.homeOf = (id, sub, ids, mode) => {
    if (ONLY[sub + 'a']) return { variant: ONLY[sub + 'b'].some((c) => ids.includes(c)) && !ONLY[sub + 'a'].includes(id) ? 'b' : 'a' };
    return homeOf(id, sub, ids, mode);
  };
  /* Onde a fissura lateral cruza o plano de uma secção: o ponto do traçado mais perto do plano. */
  const sylvius = (sec) => {
    const n = sec.r, pts = LINHAS['fissura-lateral'].map((q) => V(q[0], q[1], q[2]));
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i].clone().sub(sec.p).dot(n), b = pts[i + 1].clone().sub(sec.p).dot(n); if (a * b <= 0 && a !== b) return pts[i].clone().lerp(pts[i + 1], a / (a - b)); }
    return null;
  };
  for (const [id, sec] of Object.entries(SEC)) {
    const pros = sec.kind === 'pros', keep = sec.r.clone().negate(), syl = pros ? sylvius(sec) : null;
    st.subs[id] = {
      mode: (o) => (pros ? (o.variant === 'b' ? 'c' : 'g') : 'n'),
      states: (it, o) => {
        if (it.layer === 'ven') return VEN[sec.kind].includes(it.key) ? 'solid' : 'hide';
        if (id === 'c1' && (it.layer === 'mes' || it.layer === 'nuc-mes')) return 'hide'; // a secção 1 do livro não chega ao tronco
        if (pros && o.variant === 'b' && (it.layer === 'nuc-die' || it.layer === 'nuc-tel' || it.layer === 'nuc-mes')) return 'solid';
        return SHOW[sec.kind].has(it.layer) ? 'solid' : 'hide';
      },
      clip: [keep, sec.p],
      view: pros ? { box: sec.box, dir: sec.r.clone().add(V(0, 0.02, 0)), margin: true } : { t: (sec.at || sec.p).clone(), r: sec.rad, dir: sec.r, margin: true },
      margin: 1, // +x (esquerda da pessoa) aparece à direita na tela
      axes: pros ? null : AX_TRONCO,
      capOnly: true, minArea: 6,
      only: (o) => new Set(ONLY[pros ? id + (o.variant === 'b' ? 'b' : 'a') : id]),
      names: id === 'c6' ? { cerebelo: tr('Córtex cerebelar', 'Cerebellar cortex') } : null,
      // a fissura lateral não é uma peça: o rótulo vai onde o traçado dela cruza o plano
      extra: (o) => (syl && o.variant !== 'b' ? [{ id: 'fissura-lateral', pair: true, pos: syl.clone().addScaledVector(sec.r, 0.02), n: sec.r.clone(), rank: 50 }] : []),
    };
  }
  /* Plano livre: fatia o encéfalo inteiro onde a pessoa quiser. */
  const free = (o) => { const P = PLANES[o.plane] || PLANES.coronal; return [P.n, P.at(o.cut ?? 0.5)]; };
  st.subs.livre = {
    mode: 'n',
    states: (it) => (it.layer.startsWith('nuc') ? 'solid' : ['ped', 'osso', 'men', 'art', 'nc', 'gust', 'via', 'vil'].includes(it.layer) ? 'hide' : 'solid'),
    clip: free,
    view: (o) => ({ box: { c: V(0, 0.3, 0), hw: 9.3, hh: 8.4 }, dir: (PLANES[o.plane] || PLANES.coronal).dir }),
    cut: (o) => { const [n, p] = free(o); st.setClip(n, p); },
    max: 16,
  };
}
