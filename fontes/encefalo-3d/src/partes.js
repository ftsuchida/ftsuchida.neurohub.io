// As peças de malha do encéfalo: a que ficha cada uma responde em cada modo de cor, em que camada fica
// e com que prioridade aparece na face de corte. As chaves são as do pacote (scripts/malhas-encefalo.mjs).
//   c: ficha no modo natural (uma por região da peça, quando há regiões)
//   l, a, o: ficha nos modos lobos, áreas e origem (sem o campo, vale c)
//   L: camada; pri: prioridade na face de corte (o maior fica por cima)
const cx = (c, o = {}) => ({ c, L: 'cx', pri: 1, o: 'telencefalo', ...o });
const tel = (c, o = {}) => ({ c, L: 'deep', pri: 3, o: 'telencefalo', ...o });
const die = (c, o = {}) => ({ c, L: 'die', pri: 3, o: 'diencefalo', ...o });
const ven = (c, o = {}) => ({ c, L: 'ven', pri: 7, ...o });

export const PARTS = {
  // córtex
  'frontal-sup': cx('lobo-frontal', { a: ['cortex-pre-frontal', 'area-motora-suplementar'] }),
  'frontal-med': cx('lobo-frontal', { a: ['cortex-pre-frontal', 'area-pre-motora'] }),
  'frontal-inf': cx('lobo-frontal', { a: ['cortex-pre-frontal', 'area-pre-motora'] }),
  orbital: cx('lobo-frontal', { a: 'cortex-pre-frontal' }),
  'pre-central': cx('giro-pre-central', { l: 'lobo-frontal', a: 'cortex-motor-primario' }),
  'pos-central': cx('giro-pos-central', { l: 'lobo-parietal', a: 'cortex-somatossensorial' }),
  supramarginal: cx('lobo-parietal', { a: 'cortex-cerebral' }),
  angular: cx('lobo-parietal', { a: 'cortex-cerebral' }),
  'parietal-sup': cx('lobo-parietal', { a: 'cortex-parietal-posterior' }),
  'temporal-sup-a': cx('giro-temporal-superior', { l: 'lobo-temporal', a: 'cortex-cerebral' }),
  'temporal-sup-p': cx('giro-temporal-superior', { l: 'lobo-temporal', a: 'cortex-auditivo' }),
  'temporal-med': cx('lobo-temporal', { a: 'cortex-temporal-inferior' }),
  'temporal-inf': cx('lobo-temporal', { a: 'cortex-temporal-inferior' }),
  fusiforme: cx('lobo-temporal', { a: 'cortex-temporal-inferior' }),
  'para-hipocampal': cx('lobo-temporal', { a: 'cortex-cerebral' }),
  cingulo: cx('giro-do-cingulo', { l: 'cortex-cerebral', a: 'cortex-cerebral' }),
  occipital: cx('lobo-occipital', { a: 'cortex-visual' }),
  insula: cx('insula', { a: 'cortex-cerebral' }),
  // telencéfalo profundo
  branca: tel('substancia-branca', { L: 'wm', pri: 2 }),
  caloso: tel('corpo-caloso', { pri: 4 }),
  septo: tel('septo-pelucido', { pri: 4 }),
  fornice: tel('fornice', { pri: 5 }),
  'fornice-c': tel('fornice', { pri: 5 }),
  caudado: tel('nucleo-caudado', { pri: 4, g: 'telencefalo-basal' }),
  putame: tel('putame', { pri: 4, g: 'telencefalo-basal' }),
  palido: tel('globo-palido', { pri: 4, g: 'telencefalo-basal' }),
  amigdala: tel('amigdala', { pri: 4, g: 'telencefalo-basal' }),
  hipocampo: tel('hipocampo', { pri: 4, g: 'lobo-temporal' }),
  capsula: tel('capsula-interna', { pri: 3 }),
  // diencéfalo e via óptica
  talamo: die('talamo'),
  hipotalamo: die('hipotalamo'),
  tuber: die('hipotalamo'),
  mamilar: die('corpo-mamilar', { pri: 5, g: 'hipotalamo' }),
  hipofise: die('hipofise'),
  pineal: die('pineal'),
  'gen-lat': die('nucleo-geniculado-lateral', { pri: 5, g: 'talamo' }),
  'gen-med': die('nucleo-geniculado-medial', { pri: 5, g: 'talamo' }),
  'nervo-optico': { c: 'nervo-optico', L: 'opt', pri: 4, o: 'vesicula-optica' },
  quiasma: { c: 'quiasma-optico', L: 'opt', pri: 5, o: 'vesicula-optica' },
  'tracto-optico': { c: 'tracto-optico', L: 'opt', pri: 5, o: 'vesicula-optica' },
  olho: { c: 'olho', L: 'olho', pri: 3, o: 'vesicula-optica' },
  // mesencéfalo, ponte, bulbo e cerebelo
  mesencefalo: { c: ['tegmento', 'coliculo-superior', 'coliculo-inferior'], L: 'mes', pri: 2, o: 'mesencefalo' },
  pedunculo: { c: 'tegmento', L: 'mes', pri: 2, o: 'mesencefalo' },
  'coliculo-sup': { c: 'coliculo-superior', L: 'mes', pri: 3, o: 'mesencefalo' },
  'coliculo-inf': { c: 'coliculo-inferior', L: 'mes', pri: 3, o: 'mesencefalo' },
  ponte: { c: 'ponte', L: 'pon', pri: 2, o: 'rombencefalo' },
  bulbo: { c: 'bulbo', L: 'bul', pri: 2, o: 'rombencefalo' },
  cerebelo: { c: ['hemisferio-cerebelar', 'verme'], L: 'cb', pri: 2, o: ['rombencefalo', 'rombencefalo'], capCard: 'cerebelo' },
  // ventrículos
  'vent-lateral': ven('ventriculo-lateral'),
  forame: ven('ventriculo-lateral'),
  'vent-terceiro': ven('terceiro-ventriculo'),
  aqueduto: ven('aqueduto'),
  'vent-quarto': ven('quarto-ventriculo'),
  'canal-central': ven('canal-central'),
  plexo: ven('plexo-corioideo', { L: 'plexo', pri: 8 }),
  // crânio
  'osso-frontal': { c: 'cranio', L: 'osso', pri: 0 },
  'osso-parietal': { c: 'cranio', L: 'osso', pri: 0 },
  'osso-temporal': { c: 'cranio', L: 'osso', pri: 0 },
  'osso-occipital': { c: 'cranio', L: 'osso', pri: 0 },
  'osso-esfenoide': { c: 'cranio', L: 'osso', pri: 0 },
};

/** Fichas por modo de cor para uma peça: { n, l, a, o, g, c }, cada uma com uma ficha por região.
    g e c são as duas camadas dos cortes 1 a 3: "características gerais" e "células e fibras". */
export function mapOf(p) {
  const arr = (v) => (Array.isArray(v) ? v : [v]), n = arr(p.c);
  const fill = (v) => (v ? (arr(v).length === n.length ? arr(v) : n.map(() => arr(v)[0])) : n);
  const cx = p.L === 'cx';
  return { n, l: fill(p.l), a: fill(p.a), o: fill(p.o), g: fill(p.g || (cx ? p.l : p.L === 'mes' ? 'mesencefalo' : null)), c: fill(cx ? 'cortex-cerebral' : null) };
}

/* Cor "natural": o que aparece na superfície quando a ficha não está escolhida nem é o assunto do modo de cor. */
const CORTEX = '#E3B4A5', CREME = '#F2E9DA';
export const NAT = {
  'lobo-frontal': CORTEX, 'lobo-parietal': CORTEX, 'lobo-temporal': CORTEX, 'lobo-occipital': CORTEX, insula: CORTEX,
  'giro-pre-central': CORTEX, 'giro-pos-central': CORTEX, 'giro-temporal-superior': CORTEX, 'giro-do-cingulo': CORTEX, 'cortex-cerebral': CORTEX,
  'cortex-motor-primario': CORTEX, 'area-motora-suplementar': CORTEX, 'area-pre-motora': CORTEX, 'cortex-somatossensorial': CORTEX, 'cortex-parietal-posterior': CORTEX,
  'cortex-visual': CORTEX, 'cortex-auditivo': CORTEX, 'cortex-pre-frontal': CORTEX, 'cortex-temporal-inferior': CORTEX, telencefalo: CORTEX, cerebro: CORTEX,
  'hemisferio-cerebelar': '#D8A296', verme: '#D29A8F', cerebelo: '#D8A296',
  tegmento: '#EAD8C5', ponte: '#ECDCC8', bulbo: '#E9D6C0', mesencefalo: '#EAD8C5',
  'substancia-branca': '#F4EDE0', 'corpo-caloso': CREME, fornice: '#EFE2C9', 'septo-pelucido': '#ECE0CC', 'capsula-interna': '#EEE6D6',
  cranio: '#E9E2D0', 'medula-espinhal': '#EBDAC2', 'bulbo-olfatorio': '#EFE3C4', 'pedunculo-cerebelar': '#EFE4CC',
};
/* Cor natural na face de corte, quando difere da de cima: a faixa do córtex fica mais escura que a substância branca. */
const FAIXA = '#CC9C90';
export const CAP_NAT = {
  'lobo-frontal': FAIXA, 'lobo-parietal': FAIXA, 'lobo-temporal': FAIXA, 'lobo-occipital': FAIXA, insula: FAIXA,
  'giro-pre-central': FAIXA, 'giro-pos-central': FAIXA, 'giro-temporal-superior': FAIXA, 'giro-do-cingulo': FAIXA, 'cortex-cerebral': FAIXA,
  'substancia-branca': '#F8F3EA', 'corpo-caloso': '#F5EEDF', cerebelo: '#D3A094', 'hemisferio-cerebelar': '#D3A094', verme: '#D3A094',
  tegmento: '#E6D0BC', ponte: '#EAD7C2', bulbo: '#E7D3BD',
};
/* Fichas que ficam com a cor própria em cada modo de cor (as outras ficam na cor natural). */
export const VIVID = {
  n: [],
  l: ['lobo-frontal', 'lobo-parietal', 'lobo-temporal', 'lobo-occipital', 'insula'],
  a: ['cortex-motor-primario', 'area-motora-suplementar', 'area-pre-motora', 'cortex-somatossensorial', 'cortex-parietal-posterior', 'cortex-visual', 'cortex-auditivo', 'cortex-gustatorio', 'cortex-pre-frontal', 'cortex-temporal-inferior'],
  // código de cores do capítulo: prosencéfalo em azul (telencéfalo mais claro), mesencéfalo em vermelho, rombencéfalo em verde, medula em amarelo
  o: ['telencefalo', 'diencefalo', 'mesencefalo', 'rombencefalo', 'medula-espinhal', 'vesicula-optica'],
  g: ['lobo-frontal', 'lobo-parietal', 'lobo-temporal', 'lobo-occipital', 'insula', 'mesencefalo'],
  c: [],
};

/* Quem acende junto: escolher a ficha da esquerda acende também as da direita. */
export const CHILDREN = {
  cerebro: ['lobo-frontal', 'lobo-parietal', 'lobo-temporal', 'lobo-occipital', 'insula', 'giro-do-cingulo', 'cortex-cerebral'],
  'cortex-cerebral': ['lobo-frontal', 'lobo-parietal', 'lobo-temporal', 'lobo-occipital', 'insula', 'giro-do-cingulo'],
  telencefalo: ['cerebro', 'substancia-branca', 'corpo-caloso', 'fornice', 'septo-pelucido', 'capsula-interna', 'telencefalo-basal', 'hipocampo', 'bulbo-olfatorio', 'area-septal'],
  'lobo-frontal': ['giro-pre-central'], 'lobo-parietal': ['giro-pos-central'], 'lobo-temporal': ['giro-temporal-superior'],
  'telencefalo-basal': ['nucleos-da-base', 'amigdala'],
  'nucleos-da-base': ['nucleo-caudado', 'putame', 'globo-palido'],
  diencefalo: ['talamo', 'hipotalamo', 'corpo-mamilar', 'pineal', 'hipofise', 'subtalamo'],
  talamo: ['nucleo-ventral-posterior', 'nucleo-ventral-lateral', 'nucleo-pulvinar', 'nucleo-geniculado-lateral', 'nucleo-geniculado-medial'],
  hipotalamo: ['corpo-mamilar'],
  prosencefalo: ['telencefalo', 'diencefalo', 'vesicula-optica'],
  'vesicula-optica': ['nervo-optico', 'olho'],
  mesencefalo: ['teto', 'tegmento'],
  teto: ['coliculo-superior', 'coliculo-inferior'],
  tegmento: ['substancia-nigra', 'nucleo-rubro', 'cinzenta-periaquedutal'],
  'tronco-encefalico': ['diencefalo', 'mesencefalo', 'ponte', 'bulbo'],
  rombencefalo: ['cerebelo', 'ponte', 'bulbo'],
  ponte: ['nucleos-pontinos'],
  cerebelo: ['hemisferio-cerebelar', 'verme', 'nucleos-cerebelares'],
  bulbo: ['piramide-bulbar', 'decussacao-piramidal', 'oliva-inferior', 'oliva-superior', 'nucleos-cocleares', 'nucleo-da-rafe', 'nucleos-vestibulares', 'nucleo-gustatorio', 'lemnisco-medial', 'nucleos-da-coluna-dorsal'],
  encefalo: ['cerebro', 'telencefalo', 'cerebelo', 'tronco-encefalico'],
  snc: ['encefalo', 'medula-espinhal'],
  'sistema-ventricular': ['ventriculo-lateral', 'terceiro-ventriculo', 'aqueduto', 'quarto-ventriculo', 'canal-central'],
  meninges: ['dura-mater', 'aracnoide', 'pia-mater'],
  'nervos-cranianos': ['nc-olfatorio', 'nervo-optico', 'nc-oculomotor', 'nc-troclear', 'nc-trigemeo', 'nc-abducente', 'nc-facial', 'nc-vestibulococlear', 'nc-glossofaringeo', 'nc-vago', 'nc-acessorio', 'nc-hipoglosso'],
  'nc-olfatorio': ['bulbo-olfatorio'],
  'circulo-arterial': ['art-cerebral-posterior', 'art-comunicante-posterior', 'art-carotida-interna', 'art-cerebral-anterior', 'art-comunicante-anterior'],
  'cinzenta-medular': ['corno-dorsal', 'corno-ventral', 'corno-lateral', 'zona-intermediaria'],
  'branca-medular': ['coluna-dorsal', 'tracto-espinotalamico', 'tracto-corticospinal', 'tracto-rubrospinal', 'tracto-reticulospinal-bulbar', 'tracto-reticulospinal-pontino', 'tracto-tectospinal', 'tracto-vestibulospinal'],
  'medula-espinhal': ['cinzenta-medular', 'branca-medular'],
  snp: ['nervo-espinhal', 'raiz-dorsal', 'raiz-ventral', 'ganglio-da-raiz-dorsal'],
  'cortex-gustatorio': [],
};
