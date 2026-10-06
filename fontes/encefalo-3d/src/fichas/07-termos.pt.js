// Fichas: vocabulário (Tabelas 7.1 e 7.2) e referenciais anatômicos. Fonte: cap. 7 (ver 01-geral.pt.js).
// "ex" é a ficha que serve de exemplo: ela acende quando o termo é escolhido.
const C = 'conceito; o exemplo acende no modelo', S = 'conceito, sem exemplo no modelo';
const t = (o) => ({ g: 'voc', kind: 'termo', color: '#9AA7B8', ...o });
const r = (o) => ({ g: 'ref', kind: 'termo', color: '#8FA3B0', ...o });

export default [
  /* ===================== grupos de neurônios (Tabela 7.1) ===================== */
  t({
    id: 'voc-substancia-cinzenta', name: 'Substância cinzenta', sub: 'c1', ex: 'cortex-cerebral', rows: [['No modelo', C]],
    morf: 'Termo genérico para um agrupamento de corpos de neurônios no sistema nervoso central. Em um cérebro fresco cortado, os neurônios aparecem em cinza.',
    func: 'No telencéfalo há dois tipos: o córtex cerebral e o telencéfalo basal. Na medula, é a borboleta do centro.',
    where: 'Nos Cortes: tudo o que não é a região clara da substância branca nem os ventrículos.',
    rel: ['voc-substancia-branca', 'voc-cortex', 'voc-nucleo', 'cinzenta-medular'],
  }),
  t({
    id: 'voc-cortex', name: 'Córtex', sub: 'lateral', ex: 'cortex-cerebral', rows: [['No modelo', C]],
    morf: 'Qualquer agrupamento de neurônios que forma uma camada fina, em geral na superfície do encéfalo. Vem do latim para "casca".',
    func: 'Exemplo do livro: o córtex cerebral, a camada de neurônios logo abaixo da superfície do cérebro.',
    where: 'Atlas: a casca do cérebro. O cerebelo também tem córtex, apontado no Corte 6.',
    rel: ['cortex-cerebral', 'voc-substancia-cinzenta', 'voc-nucleo'],
  }),
  t({
    id: 'voc-nucleo', name: 'Núcleo', sub: 'dentro', ex: 'nucleo-geniculado-lateral', rows: [['No modelo', C]],
    morf: 'Massa de neurônios bem distinguível, em geral na profundidade do encéfalo. Vem do latim para "noz". Não confundir com o núcleo da célula.',
    func: 'Exemplo do livro: o núcleo geniculado lateral, grupo de células do tálamo que retransmite a informação do olho para o córtex cerebral.',
    where: 'Atlas, vista Por dentro: o núcleo geniculado lateral acende.',
    rel: ['nucleo-geniculado-lateral', 'voc-substancia', 'voc-locus', 'voc-ganglio'],
  }),
  t({
    id: 'voc-substancia', name: 'Substância', sub: 'c4', ex: 'substancia-nigra', rows: [['No modelo', C]],
    morf: 'Grupo de neurônios relacionados, na profundidade do encéfalo, em geral com limites menos precisos que os de um núcleo.',
    func: 'Exemplo do livro: a substância nigra, grupo de células do tronco encefálico envolvido no controle do movimento voluntário.',
    where: 'Corte 4: a substância nigra acende.',
    rel: ['substancia-nigra', 'voc-nucleo', 'voc-locus'],
  }),
  t({
    id: 'voc-locus', name: 'Locus', aka: 'plural: loci', sub: 'c6', rows: [['No modelo', S]],
    morf: 'Um grupo de neurônios pequeno e bem definido.',
    func: 'Exemplo do livro: o locus ceruleus, "mancha azul" em latim, grupo de células do tronco encefálico envolvido no controle da vigília e do comportamento de alerta.',
    where: 'O locus ceruleus não está desenhado neste modelo.',
    rel: ['voc-nucleo', 'voc-substancia', 'formacao-reticular'],
  }),
  t({
    id: 'voc-ganglio', name: 'Gânglio', sub: 'segmento', ex: 'ganglio-da-raiz-dorsal', rows: [['No modelo', C]],
    morf: 'Agrupamento de neurônios no sistema nervoso periférico. Vem do grego para "nó".',
    func: 'Exemplo do livro: os gânglios da raiz dorsal, que guardam os corpos celulares dos axônios sensoriais que entram na medula pelas raízes dorsais.',
    where: 'Medula › Segmento: o gânglio da raiz dorsal acende.',
    rel: ['ganglio-da-raiz-dorsal', 'voc-nucleo', 'snp'],
  }),

  /* ===================== grupos de axônios (Tabela 7.2) ===================== */
  t({
    id: 'voc-nervo', name: 'Nervo', sub: 'nervos', ex: 'nervo-optico', rows: [['No modelo', C]],
    morf: 'Um feixe de axônios no sistema nervoso periférico.',
    func: 'Só um grupo de axônios do sistema nervoso central leva o nome de nervo: o nervo óptico.',
    where: 'Em volta › Nervos: o nervo óptico acende.',
    rel: ['nervo-optico', 'nervo-espinhal', 'nervos-cranianos', 'voc-tracto'],
  }),
  t({
    id: 'voc-substancia-branca', name: 'Substância branca', sub: 'c1', ex: 'substancia-branca', rows: [['No modelo', C]],
    morf: 'Termo genérico para um grupo de axônios no sistema nervoso central. Em um encéfalo fresco cortado, os feixes de axônios aparecem em branco.',
    func: 'No prosencéfalo há três grandes sistemas: a substância branca cortical, o corpo caloso e a cápsula interna.',
    where: 'Corte 1: a substância branca cortical acende.',
    rel: ['substancia-branca', 'voc-substancia-cinzenta', 'branca-medular'],
  }),
  t({
    id: 'voc-tracto', name: 'Tracto', sub: 'v-movimento', ex: 'tracto-corticospinal', rows: [['No modelo', C]],
    morf: 'Um agrupamento de axônios do sistema nervoso central com origem e destino em comum.',
    func: 'Exemplo do livro: o tracto corticospinal, cujos axônios nascem no córtex cerebral e terminam na medula espinhal. O nome de um tracto costuma dizer de onde ele sai e aonde chega.',
    where: 'Vias › Movimento: o tracto corticospinal inteiro.',
    rel: ['tracto-corticospinal', 'tracto-optico', 'voc-feixe', 'voc-lemnisco'],
  }),
  t({
    id: 'voc-feixe', name: 'Feixe', sub: 'lateral', rows: [['No modelo', S]],
    morf: 'Um agrupamento de axônios que correm juntos, mas que não têm necessariamente a mesma origem e o mesmo destino.',
    func: 'Exemplo do livro: o feixe prosencefálico medial, que conecta células espalhadas no cérebro e no tronco encefálico.',
    where: 'O feixe prosencefálico medial não está desenhado neste modelo.',
    rel: ['voc-tracto', 'voc-capsula'],
  }),
  t({
    id: 'voc-capsula', name: 'Cápsula', sub: 'c1', ex: 'capsula-interna', rows: [['No modelo', C]],
    morf: 'Um agrupamento de axônios que conecta o cérebro com o tronco encefálico.',
    func: 'Exemplo do livro: a cápsula interna, que conecta o tronco encefálico com o córtex cerebral.',
    where: 'Corte 1: a cápsula interna acende.',
    rel: ['capsula-interna', 'voc-tracto', 'voc-comissura'],
  }),
  t({
    id: 'voc-comissura', name: 'Comissura', sub: 'medial', ex: 'corpo-caloso', rows: [['No modelo', C]],
    morf: 'Qualquer agrupamento de axônios que conecta um lado do encéfalo com o outro.',
    func: 'O corpo caloso é uma enorme comissura: liga o córtex dos dois hemisférios.',
    where: 'Atlas, vista Medial: o corpo caloso acende.',
    rel: ['corpo-caloso', 'voc-capsula', 'ipsi-contra'],
  }),
  t({
    id: 'voc-lemnisco', name: 'Lemnisco', sub: 'c8', ex: 'lemnisco-medial', rows: [['No modelo', C]],
    morf: 'Um tracto que atravessa o encéfalo com o formato de uma fita.',
    func: 'Exemplo do livro: o lemnisco medial, que leva a informação do tato, vinda da medula espinhal, através do tronco encefálico.',
    where: 'Corte 8: o lemnisco medial acende.',
    rel: ['lemnisco-medial', 'voc-tracto'],
  }),
  t({
    id: 'aferente-eferente', name: 'Aferente e eferente', sub: 'segmento', ex: 'raiz-dorsal', rows: [['No modelo', C]],
    morf: 'Dois termos de origem latina para dizer em que sentido um axônio leva a informação em relação a um ponto. Aferente é o que chega; eferente é o que sai.',
    func: 'Tomando o sistema nervoso central como referência: os axônios sensoriais, somáticos ou viscerais, que trazem informação para ele são aferentes. Os que saem dele para inervar músculos e glândulas são eferentes.',
    where: 'Medula › Segmento: a raiz dorsal é aferente; a raiz ventral é eferente.',
    rel: ['raiz-dorsal', 'raiz-ventral', 'snp'],
  }),

  /* ===================== referenciais anatômicos ===================== */
  r({
    id: 'anterior-posterior', name: 'Anterior e posterior', aka: 'rostral e caudal', sub: 'lateral', rows: [['No modelo', 'indicador de direção, no canto da cena']],
    morf: 'Anterior, ou rostral ("bico", em latim), é a direção do focinho. Posterior, ou caudal ("cauda"), é a direção oposta.',
    func: 'No encéfalo humano, o lobo frontal é anterior e o lobo occipital é posterior.',
    where: 'O indicador no canto da cena mostra as direções e gira junto com o modelo.',
    rel: ['dorsal-ventral', 'linha-media', 'plano-coronal', 'neuroeixo'],
  }),
  r({
    id: 'dorsal-ventral', name: 'Dorsal e ventral', sub: 'lateral', rows: [['No modelo', 'indicador de direção, no canto da cena']],
    morf: 'Dorsal ("costas", em latim) é a direção que aponta para cima no animal de quatro patas. Ventral ("ventre") é a que aponta para baixo.',
    func: 'Na medula espinhal, o lado de trás é o dorsal e o da frente é o ventral: daí raiz dorsal e raiz ventral. No encéfalo humano, a vista de cima é a dorsal e a de baixo é a ventral.',
    where: 'O indicador no canto da cena mostra as direções. No Atlas, as vistas Dorsal e Ventral.',
    rel: ['anterior-posterior', 'plano-horizontal', 'raiz-dorsal', 'raiz-ventral', 'neuroeixo'],
  }),
  r({
    id: 'linha-media', name: 'Linha média, medial e lateral', sub: 'dorsal', ex: 'fissura-longitudinal', rows: [['No modelo', C]],
    morf: 'A linha média é a linha imaginária que divide o sistema nervoso em duas metades iguais. O que está mais perto dela é medial. O que está mais longe é lateral.',
    func: 'O nariz é medial aos olhos; os olhos são mediais aos ouvidos. Quase todas as estruturas do sistema nervoso são pares, uma de cada lado da linha média.',
    where: 'Atlas, vista Dorsal: a fissura cerebral longitudinal marca a linha média.',
    rel: ['ipsi-contra', 'plano-mediano', 'fissura-longitudinal'],
  }),
  r({
    id: 'ipsi-contra', name: 'Ipsilateral e contralateral', sub: 'v-movimento', ex: 'decussacao-piramidal', rows: [['No modelo', C]],
    morf: 'Duas estruturas do mesmo lado da linha média são ipsilaterais uma à outra. Em lados opostos, são contralaterais.',
    func: 'O ouvido direito é ipsilateral ao olho direito e contralateral ao ouvido esquerdo. O córtex de um lado controla o lado contralateral do corpo; o cerebelo, o ipsilateral.',
    where: 'Vias › Movimento: na decussação piramidal, o sinal passa para o lado contralateral.',
    rel: ['linha-media', 'decussacao-piramidal', 'nucleos-da-coluna-dorsal', 'cerebelo'],
  }),
  r({
    id: 'plano-mediano', name: 'Plano mediano e plano sagital', sub: 'medial', rows: [['No modelo', 'o corte da vista Medial e o plano livre']],
    morf: 'O plano mediano é o corte que divide o encéfalo em metades direita e esquerda iguais. Os cortes paralelos a ele estão no plano sagital.',
    func: 'É o corte que melhor mostra o tronco encefálico e as partes ímpares do sistema ventricular.',
    where: 'Atlas, vista Medial: o encéfalo cortado no plano mediano. Em Cortes › Plano livre, escolha Sagital e mova o plano.',
    rel: ['plano-horizontal', 'plano-coronal', 'linha-media'],
  }),
  r({
    id: 'plano-horizontal', name: 'Plano horizontal', sub: 'livre', rows: [['No modelo', 'o plano livre']],
    morf: 'Plano paralelo ao solo. Um único corte nesse plano pode passar pelos dois olhos e pelos dois ouvidos.',
    func: 'Os cortes horizontais dividem o encéfalo em parte dorsal e parte ventral.',
    where: 'Cortes › Plano livre: escolha Horizontal e mova o plano.',
    rel: ['plano-mediano', 'plano-coronal', 'dorsal-ventral'],
  }),
  r({
    id: 'plano-coronal', name: 'Plano coronal', sub: 'livre', rows: [['No modelo', 'os Cortes 1 a 3 e o plano livre']],
    morf: 'Plano perpendicular ao solo e ao plano sagital. Um único corte nesse plano passa pelos dois olhos ou pelos dois ouvidos, mas não pelos quatro.',
    func: 'Os cortes coronais dividem o encéfalo em parte anterior e parte posterior.',
    where: 'Cortes 1 a 3 são coronais. Em Plano livre, escolha Coronal e mova o plano.',
    rel: ['plano-mediano', 'plano-horizontal', 'anterior-posterior', 'neuroeixo'],
  }),
  r({
    id: 'neuroeixo', name: 'Neuroeixo', sub: 'c1', rows: [['No modelo', 'os Cortes 1 a 9 são perpendiculares a ele']],
    morf: 'O eixo definido pelo tubo neural do embrião. No ser humano ele se curva com o crescimento do feto, principalmente na junção do mesencéfalo com o tálamo.',
    func: 'Para aprender a organização interna do encéfalo, o melhor é cortar perpendicularmente ao neuroeixo. Como ele se curva, o melhor plano de corte muda de inclinação conforme o nível: é por isso que os cortes do tronco encefálico têm outro ângulo que os do prosencéfalo.',
    where: 'Cortes: repare como o plano se inclina do corte 1 ao 9.',
    rel: ['tubo-neural', 'plano-coronal', 'anterior-posterior'],
  }),
];
