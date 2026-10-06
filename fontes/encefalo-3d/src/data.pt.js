// Encéfalo em 3D. Conteúdo conforme Bear, Connors e Paradiso, Neurociências: desvendando o sistema nervoso, 4ª ed.,
// capítulo 7 e o apêndice "Um Guia Ilustrado da Neuroanatomia Humana". As fichas ficam em fichas/*.pt.js.
// Em "more", um item { x: '...' } é detalhe de fora do capítulo e aparece marcado como "extra".
import geral from './fichas/01-geral.pt.js';
import prosencefalo from './fichas/02-prosencefalo.pt.js';
import tronco from './fichas/03-tronco.pt.js';
import envolta from './fichas/04-envolta.pt.js';
import medula from './fichas/05-medula.pt.js';
import origem from './fichas/06-origem.pt.js';
import termos from './fichas/07-termos.pt.js';

export const GROUPS = [
  { id: 'div', name: 'Organização geral' },
  { id: 'sup', name: 'Superfície do cérebro' },
  { id: 'areas', name: 'Áreas do córtex' },
  { id: 'tel', name: 'Dentro do telencéfalo' },
  { id: 'die', name: 'Diencéfalo e via óptica' },
  { id: 'mes', name: 'Mesencéfalo' },
  { id: 'rom', name: 'Ponte, cerebelo e bulbo' },
  { id: 'vent', name: 'Ventrículos e LCS' },
  { id: 'men', name: 'Meninges e crânio' },
  { id: 'nc', name: 'Nervos cranianos' },
  { id: 'art', name: 'Artérias' },
  { id: 'med', name: 'Medula espinhal' },
  { id: 'dev', name: 'Do tubo ao encéfalo' },
  { id: 'voc', name: 'Vocabulário' },
  { id: 'ref', name: 'Referenciais anatômicos' },
];

export const ITEMS = [...geral, ...prosencefalo, ...tronco, ...envolta, ...medula, ...origem, ...termos];
export const BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

/* Módulos: a barra de baixo. */
export const VIEWS = [
  { id: 'atlas', name: 'Atlas' },
  { id: 'cortes', name: 'Cortes' },
  { id: 'volta', name: 'Em volta' },
  { id: 'vias', name: 'Vias' },
  { id: 'origem', name: 'Origem' },
  { id: 'medula', name: 'Medula' },
  { id: 'teste', name: 'Teste' },
];

/* Subvistas de cada módulo: name vai no botão; title e hint, no cartão sobre a cena. */
export const SUBS = [
  { id: 'lateral', mod: 'atlas', name: 'Lateral', title: 'Superfície lateral', hint: 'Três partes principais: o cérebro, grande; o tronco encefálico, que forma o talo; e o cerebelo, enrugado. O sulco central separa o lobo frontal do parietal. A fissura lateral fica acima do lobo temporal.' },
  { id: 'medial', mod: 'atlas', name: 'Medial', title: 'Superfície medial', hint: 'O encéfalo cortado no plano mediano. É a melhor vista do tronco encefálico: diencéfalo, mesencéfalo, ponte e bulbo. No centro, o corpo caloso e o fórnice. Em azul, as partes ímpares do sistema ventricular.' },
  { id: 'ventral', mod: 'atlas', name: 'Ventral', title: 'Superfície ventral', hint: 'O lado de baixo, que repousa sobre o assoalho do crânio. Na linha média, de frente para trás: bulbos olfatórios, quiasma óptico, corpos mamilares, mesencéfalo, ponte e bulbo. Os nervos cranianos saem do tronco.' },
  { id: 'dorsal', mod: 'atlas', name: 'Dorsal', title: 'Superfície dorsal', hint: 'A vista de cima é dominada pelo cérebro. Os dois hemisférios são separados pela fissura cerebral longitudinal e ligados, lá no fundo, pelo corpo caloso.' },
  { id: 'cerebelo', mod: 'atlas', name: 'Cerebelo', title: 'Cérebro removido', hint: 'Sem o cérebro, é o cerebelo que domina a vista dorsal. Ele tem dois hemisférios e uma região mediana, o verme.' },
  { id: 'tronco', mod: 'atlas', name: 'Tronco', title: 'Cérebro e cerebelo removidos', hint: 'A face dorsal do tronco encefálico. De cima para baixo: tálamo, glândula pineal, colículos superiores e inferiores, e o assoalho do quarto ventrículo entre os pedúnculos cerebelares cortados.' },
  { id: 'dentro', mod: 'atlas', name: 'Por dentro', title: 'Visão de raio X', hint: 'O córtex e a substância branca viram contorno. Aparecem as estruturas que ficam sob o córtex e não se veem da superfície: amígdala, hipocampo, núcleos da base, tálamo e ventrículos.' },

  { id: 'c1', mod: 'cortes', name: '1', title: 'Secção coronal 1: junção entre o tálamo e o telencéfalo', hint: 'O telencéfalo circunda os ventrículos laterais; o tálamo envolve o terceiro ventrículo, em forma de fenda. A ínsula fica na base da fissura lateral e separa o lobo frontal do temporal.' },
  { id: 'c2', mod: 'cortes', name: '2', title: 'Secção coronal 2: nível do tálamo medial', hint: 'Um pouco mais caudal. O tálamo, em formato de coração, envolve o pequeno terceiro ventrículo. Abaixo dele, o hipotálamo. Aqui a fissura lateral separa o lobo parietal do temporal.' },
  { id: 'c3', mod: 'cortes', name: '3', title: 'Secção coronal 3: junção entre o mesencéfalo e o tálamo', hint: 'O neuroeixo se inclina de repente aqui. O terceiro ventrículo, em forma de lágrima, comunica-se com o aqueduto. O ventrículo lateral de cada hemisfério aparece duas vezes.' },
  { id: 'c4', mod: 'cortes', name: '4', title: 'Secção transversal 4: mesencéfalo rostral', hint: 'O plano mudou de ângulo para continuar perpendicular ao neuroeixo. No centro, o pequeno aqueduto. No topo, o teto, formado aqui pelos colículos superiores.' },
  { id: 'c5', mod: 'cortes', name: '5', title: 'Secção transversal 5: mesencéfalo caudal', hint: 'Parecido com o mesencéfalo rostral, mas aqui o teto é formado pelos colículos inferiores, do sistema auditivo.' },
  { id: 'c6', mod: 'cortes', name: '6', title: 'Secção transversal 6: ponte e cerebelo', hint: 'As partes do rombencéfalo rostral que limitam o quarto ventrículo. As entradas do córtex cerebelar vêm dos núcleos pontinos; as saídas do cerebelo partem dos núcleos cerebelares profundos.' },
  { id: 'c7', mod: 'cortes', name: '7', title: 'Secção transversal 7: bulbo rostral', hint: 'O que envolve o quarto ventrículo agora é o bulbo. No assoalho, as pirâmides bulbares, com os tractos corticospinais. Na borda, os núcleos cocleares.' },
  { id: 'c8', mod: 'cortes', name: '8', title: 'Secção transversal 8: bulbo médio', hint: 'Aparece o lemnisco medial, junto à linha média: leva a informação do tato ao tálamo. Na parte dorsal, o núcleo gustatório e os núcleos vestibulares.' },
  { id: 'c9', mod: 'cortes', name: '9', title: 'Secção transversal 9: junção entre o bulbo e a medula', hint: 'O quarto ventrículo acaba e o canal central começa a aparecer. Na parte dorsal, os núcleos da coluna dorsal, de onde saem os axônios que cruzam e formam o lemnisco medial.' },
  { id: 'livre', mod: 'cortes', name: 'Plano livre', title: 'Planos anatômicos de secção', hint: 'Escolha o plano e arraste a barra para fatiar o encéfalo. Coronal divide em anterior e posterior; horizontal, em dorsal e ventral; sagital corre paralelo ao plano mediano.' },

  { id: 'meninges', mod: 'volta', name: 'Meninges', title: 'Crânio e meninges', hint: 'O sistema nervoso central não encosta no osso. Entre o crânio e o encéfalo há três membranas: a dura-máter, a aracnoide e a pia-máter, aqui abertas em degraus.' },
  { id: 'camadas', mod: 'volta', name: 'Camadas', title: 'As meninges de perto', hint: 'Um bloco ampliado, do osso ao córtex. Entre a aracnoide e a pia fica o espaço subaracnóideo, cheio de líquido cerebrospinal. Ao longo da pia correm os vasos que entram no tecido.' },
  { id: 'lcs', mod: 'volta', name: 'LCS', title: 'O caminho do líquido cerebrospinal', hint: '' },
  { id: 'arterias', mod: 'volta', name: 'Artérias', title: 'Aporte vascular ao encéfalo', hint: 'Dois pares de artérias trazem o sangue: as vertebrais, por trás, e as carótidas internas, pela frente. Na base do encéfalo elas se ligam em um anel, o círculo arterial do cérebro.' },
  { id: 'nervos', mod: 'volta', name: 'Nervos', title: 'Os doze nervos cranianos', hint: 'Numerados de I a XII, de anterior para posterior. Os dois primeiros são partes do sistema nervoso central. Clique em um nervo para ver os tipos de axônios e as funções.' },

  { id: 'v-movimento', mod: 'vias', name: 'Movimento', title: 'Tracto corticospinal', hint: '' },
  { id: 'v-cerebelo', mod: 'vias', name: 'Cerebelo', title: 'Do córtex ao cerebelo, pela ponte', hint: '' },
  { id: 'v-tato', mod: 'vias', name: 'Tato', title: 'A via do tato', hint: '' },
  { id: 'v-visao', mod: 'vias', name: 'Visão', title: 'A via da visão', hint: '' },
  { id: 'v-audicao', mod: 'vias', name: 'Audição', title: 'A via da audição', hint: '' },
  { id: 'v-gosto', mod: 'vias', name: 'Gosto', title: 'A via do gosto', hint: '' },
  { id: 'v-memoria', mod: 'vias', name: 'Fórnice', title: 'Do hipocampo ao hipotálamo', hint: '' },
  { id: 'v-talamo', mod: 'vias', name: 'Tálamo', title: 'O portal para o córtex', hint: '' },

  { id: 'origem', mod: 'origem', name: 'Do tubo ao encéfalo', title: 'Do tubo ao encéfalo', hint: '' },

  { id: 'coluna', mod: 'medula', name: 'Coluna', title: 'A medula dentro da coluna vertebral', hint: 'Vista por trás. Os nervos espinhais saem entre as vértebras e levam o nome delas. A medula do adulto acaba, segundo o livro, na terceira vértebra lombar; dali para baixo descem só nervos, a cauda equina.' },
  { id: 'segmento', mod: 'medula', name: 'Segmento', title: 'Um segmento da medula', hint: 'Cada nervo espinhal se prende à medula por duas raízes. A dorsal traz os axônios sensoriais, com os corpos celulares no gânglio. A ventral leva os axônios motores. Em volta, as três meninges.' },
  { id: 'tractos', mod: 'medula', name: 'Tractos', title: 'Tractos da substância branca', hint: 'Como na figura do livro, as vias sensoriais que sobem estão marcadas de um lado e as vias motoras que descem, do outro. Na medula real, todos os tractos existem dos dois lados.' },

  { id: 'teste', mod: 'teste', name: 'Teste', title: 'Teste', hint: '' },
];

/* Passos. seq é a subvista a que o passo pertence; ids são as fichas que acendem. */
export const STEPS = [
  /* ---------- líquido cerebrospinal ---------- */
  { id: 'lcs-plexo', seq: 'lcs', dur: 5200, title: 'Onde o líquido nasce', ids: ['plexo-corioideo', 'ventriculo-lateral', 'lcs'],
    text: 'O líquido cerebrospinal é produzido pelo plexo corióideo, um tecido especial que fica dentro dos ventrículos dos hemisférios cerebrais.' },
  { id: 'lcs-terceiro', seq: 'lcs', dur: 5200, title: 'Dos ventrículos pares ao terceiro', ids: ['ventriculo-lateral', 'terceiro-ventriculo', 'lcs'],
    text: 'Dos dois ventrículos laterais, o líquido passa para as cavidades ímpares, dispostas em série. A primeira é o terceiro ventrículo, entre os dois tálamos.' },
  { id: 'lcs-aqueduto', seq: 'lcs', dur: 4800, title: 'Pelo aqueduto', ids: ['aqueduto', 'lcs'],
    text: 'Do terceiro ventrículo ele desce pelo aqueduto do mesencéfalo, um canal estreito no centro do mesencéfalo.' },
  { id: 'lcs-quarto', seq: 'lcs', dur: 4800, title: 'O quarto ventrículo', ids: ['quarto-ventriculo', 'canal-central', 'lcs'],
    text: 'O aqueduto se abre no quarto ventrículo, entre o cerebelo, de um lado, e a ponte e o bulbo, do outro. Mais abaixo a cavidade continua, bem fina, como o canal central da medula.' },
  { id: 'lcs-saida', seq: 'lcs', dur: 5400, title: 'A saída', ids: ['quarto-ventriculo', 'espaco-subaracnoideo', 'lcs'],
    text: 'O líquido sai do sistema ventricular por pequenas aberturas, perto de onde o cerebelo se liga ao tronco encefálico, e entra no espaço subaracnóideo.' },
  { id: 'lcs-volta', seq: 'lcs', dur: 6400, title: 'De volta ao sangue', ids: ['espaco-subaracnoideo', 'vilosidades-aracnoides', 'lcs'],
    text: 'No espaço subaracnóideo o líquido envolve o encéfalo, que flutua nele. Ali é absorvido pelos vasos sanguíneos, por estruturas especiais chamadas vilosidades aracnoides.' },

  /* ---------- movimento: tracto corticospinal ---------- */
  { id: 'vm-cortex', seq: 'v-movimento', dur: 4600, title: 'O comando sai do córtex motor', ids: ['cortex-motor-primario', 'giro-pre-central'],
    text: 'Os neurônios da área 4, no giro pré-central, mandam axônios para baixo. São eles que vão comandar o movimento voluntário.' },
  { id: 'vm-capsula', seq: 'v-movimento', dur: 5000, title: 'Pela cápsula interna e pelo mesencéfalo', ids: ['capsula-interna', 'tegmento', 'tracto-corticospinal'],
    text: 'Os axônios descem pela cápsula interna e atravessam o mesencéfalo. Uma lesão do tracto no mesencéfalo de um lado tira o controle voluntário dos movimentos do lado oposto do corpo.' },
  { id: 'vm-ponte', seq: 'v-movimento', dur: 4400, title: 'Através da ponte', ids: ['ponte', 'tracto-corticospinal'],
    text: 'A maior parte dos axônios que descem do córtex termina na ponte. Os do tracto corticospinal passam direto e seguem para baixo.' },
  { id: 'vm-piramide', seq: 'v-movimento', dur: 4400, title: 'Na pirâmide do bulbo', ids: ['piramide-bulbar', 'tracto-corticospinal'],
    text: 'No bulbo, esses axônios formam a pirâmide bulbar, na superfície ventral. Por isso o tracto corticospinal também é chamado de tracto piramidal.' },
  { id: 'vm-decussacao', seq: 'v-movimento', dur: 5200, title: 'A decussação piramidal', ids: ['decussacao-piramidal', 'tracto-corticospinal'],
    text: 'Perto de onde o bulbo se une à medula, cada tracto cruza a linha média para o outro lado. É por isso que o córtex de um lado controla os movimentos do lado oposto do corpo.' },
  { id: 'vm-medula', seq: 'v-movimento', dur: 5200, title: 'Na medula, até o neurônio motor', ids: ['tracto-corticospinal', 'corno-ventral', 'medula-espinhal'],
    text: 'Já do lado oposto, os axônios descem pela coluna lateral da medula e terminam na zona intermediária e no corno ventral, onde estão os neurônios motores que fazem os músculos contrair.' },

  /* ---------- córtex, ponte e cerebelo ---------- */
  { id: 'vc-cortex', seq: 'v-cerebelo', dur: 4800, title: 'Do córtex para baixo', ids: ['cortex-cerebral', 'capsula-interna'],
    text: 'Axônios do córtex cerebral descem pela cápsula interna e pelo mesencéfalo. Eles levam as metas dos movimentos intencionais.' },
  { id: 'vc-ponte', seq: 'v-cerebelo', dur: 4800, title: 'Sinapse na ponte', ids: ['ponte', 'nucleos-pontinos'],
    text: 'Mais de 90% dos axônios que descem pelo mesencéfalo, cerca de 20 milhões no ser humano, fazem sinapse nos neurônios da ponte.' },
  { id: 'vc-cruza', seq: 'v-cerebelo', dur: 5000, title: 'Para o cerebelo do lado oposto', ids: ['nucleos-pontinos', 'cerebelo'],
    text: 'Os neurônios pontinos mandam toda essa informação ao cerebelo do lado oposto. A ponte funciona como um painel de distribuição entre o córtex e o cerebelo.' },
  { id: 'vc-cerebelo', seq: 'v-cerebelo', dur: 5600, title: 'O cerebelo compara e calcula', ids: ['cerebelo', 'medula-espinhal'],
    text: 'O cerebelo recebe também, da medula espinhal, a posição do corpo no espaço. Ele compara os dois conjuntos de informação e calcula a sequência de contrações musculares necessária para atingir a meta.' },
  { id: 'vc-saida', seq: 'v-cerebelo', dur: 5200, title: 'A saída', ids: ['nucleos-cerebelares', 'talamo', 'giro-pre-central'],
    text: 'As saídas do cerebelo partem dos núcleos cerebelares profundos. Núcleos do tálamo retransmitem informação do cerebelo às áreas motoras do córtex.' },

  /* ---------- tato ---------- */
  { id: 'vt-entrada', seq: 'v-tato', dur: 4600, title: 'A entrada pela raiz dorsal', ids: ['raiz-dorsal', 'ganglio-da-raiz-dorsal', 'medula-espinhal'],
    text: 'O axônio sensorial que vem da pele entra na medula pela raiz dorsal. O corpo celular dele fica no gânglio da raiz dorsal.' },
  { id: 'vt-coluna', seq: 'v-tato', dur: 5000, title: 'Sobe pela coluna dorsal', ids: ['coluna-dorsal', 'medula-espinhal'],
    text: 'Dentro da medula, o axônio sobe pela coluna dorsal do mesmo lado do corpo. É uma via expressa até o bulbo.' },
  { id: 'vt-nucleos', seq: 'v-tato', dur: 4600, title: 'Primeira parada: o bulbo', ids: ['nucleos-da-coluna-dorsal', 'bulbo'],
    text: 'No bulbo, o axônio faz sinapse nos núcleos da coluna dorsal. Se esses neurônios são destruídos, perde-se a sensibilidade.' },
  { id: 'vt-cruza', seq: 'v-tato', dur: 4800, title: 'O cruzamento', ids: ['nucleos-da-coluna-dorsal', 'lemnisco-medial'],
    text: 'Os axônios que saem dos núcleos da coluna dorsal cruzam para o lado oposto do encéfalo. Por isso o tato do lado esquerdo do corpo é sentido pelo lado direito do cérebro.' },
  { id: 'vt-lemnisco', seq: 'v-tato', dur: 5000, title: 'Sobe pelo lemnisco medial', ids: ['lemnisco-medial', 'talamo'],
    text: 'Já do outro lado, os axônios sobem pelo tronco encefálico em uma fita, o lemnisco medial, até o tálamo.' },
  { id: 'vt-cortex', seq: 'v-tato', dur: 5200, title: 'Do tálamo ao giro pós-central', ids: ['nucleo-ventral-posterior', 'capsula-interna', 'giro-pos-central'],
    text: 'O núcleo ventral posterior do tálamo, parte do sistema somatossensorial, projeta pela cápsula interna para o giro pós-central do córtex.' },

  /* ---------- visão ---------- */
  { id: 'vv-retina', seq: 'v-visao', dur: 4600, title: 'Da retina ao nervo óptico', ids: ['olho', 'nervo-optico'],
    text: 'Os axônios saem da retina, no fundo do olho, e formam o nervo óptico. Retina e nervo óptico são partes do encéfalo.' },
  { id: 'vv-quiasma', seq: 'v-visao', dur: 5000, title: 'O quiasma óptico', ids: ['quiasma-optico'],
    text: 'No quiasma, em forma de X, muitos dos axônios que vêm dos olhos decussam: cruzam de um lado para o outro.' },
  { id: 'vv-tracto', seq: 'v-visao', dur: 4800, title: 'Pelo tracto óptico', ids: ['tracto-optico'],
    text: 'Depois do quiasma, os feixes passam a se chamar tractos ópticos. Eles seguem para trás e entram no tálamo.' },
  { id: 'vv-geniculado', seq: 'v-visao', dur: 4600, title: 'No tálamo: o geniculado lateral', ids: ['nucleo-geniculado-lateral', 'talamo'],
    text: 'O núcleo geniculado lateral do tálamo retransmite a informação do olho para o córtex cerebral.' },
  { id: 'vv-cortex', seq: 'v-visao', dur: 5200, title: 'Até o córtex visual', ids: ['cortex-visual', 'lobo-occipital'],
    text: 'Do tálamo, a informação chega à área 17, no extremo posterior do lobo occipital. É o córtex visual primário. Sem ele, o ser humano fica cego.' },
  { id: 'vv-coliculo', seq: 'v-visao', dur: 5200, title: 'Um desvio para o colículo superior', ids: ['coliculo-superior', 'nc-oculomotor', 'nc-troclear'],
    text: 'O colículo superior também recebe aferência direta do olho. Ele ajuda a controlar os movimentos dos olhos, por conexões com os neurônios motores da musculatura ocular.' },

  /* ---------- audição ---------- */
  { id: 'va-nervo', seq: 'v-audicao', dur: 4800, title: 'Do ouvido ao bulbo', ids: ['nc-vestibulococlear', 'nucleos-cocleares'],
    text: 'Os axônios dos nervos auditivos trazem a informação do ouvido interno e fazem sinapse nos núcleos cocleares do bulbo. Uma lesão nesses núcleos causa surdez.' },
  { id: 'va-coliculo', seq: 'v-audicao', dur: 5000, title: 'Sobe ao colículo inferior', ids: ['nucleos-cocleares', 'oliva-superior', 'coliculo-inferior'],
    text: 'Os núcleos cocleares projetam para uma série de estruturas, entre elas o colículo inferior, no teto do mesencéfalo. A oliva superior é outro núcleo auditivo do bulbo.' },
  { id: 'va-geniculado', seq: 'v-audicao', dur: 4600, title: 'No tálamo: o geniculado medial', ids: ['coliculo-inferior', 'nucleo-geniculado-medial'],
    text: 'O colículo inferior retransmite a informação auditiva ao tálamo. Lá, o núcleo geniculado medial a transmite ao córtex auditivo.' },
  { id: 'va-cortex', seq: 'v-audicao', dur: 5000, title: 'Até o córtex auditivo', ids: ['cortex-auditivo', 'giro-temporal-superior'],
    text: 'As áreas auditivas, 41 e 42, ficam no lobo temporal. Os neurônios do giro temporal superior estão envolvidos na audição.' },

  /* ---------- gosto ---------- */
  { id: 'vg-lingua', seq: 'v-gosto', dur: 4800, title: 'Da língua ao bulbo', ids: ['nc-facial', 'nc-glossofaringeo'],
    text: 'O nervo facial traz a gustação dos dois terços anteriores da língua. O glossofaríngeo traz a do terço posterior.' },
  { id: 'vg-nucleo', seq: 'v-gosto', dur: 4600, title: 'O núcleo gustatório', ids: ['nucleo-gustatorio', 'bulbo'],
    text: 'No bulbo, o núcleo gustatório, que é uma parte do núcleo do tracto solitário, transmite as sensações gustatórias.' },
  { id: 'vg-talamo', seq: 'v-gosto', dur: 4600, title: 'Do bulbo ao tálamo', ids: ['nucleo-gustatorio', 'talamo'],
    text: 'Neurônios do bulbo retransmitem a informação gustatória da língua ao tálamo.' },
  { id: 'vg-cortex', seq: 'v-gosto', dur: 5000, title: 'O córtex gustatório', ids: ['cortex-gustatorio', 'insula'],
    text: 'O córtex dedicado à gustação, a área 43, fica na superfície inferior do lobo parietal, o opérculo, e na ínsula, escondida no fundo da fissura lateral.' },

  /* ---------- fórnice ---------- */
  { id: 'vf-hipocampo', seq: 'v-memoria', dur: 4800, title: 'O hipocampo', ids: ['hipocampo'],
    text: 'O hipocampo fica no lobo temporal, em volta do ventrículo lateral. Tem um papel importante no aprendizado e na memória.' },
  { id: 'vf-fornice', seq: 'v-memoria', dur: 5400, title: 'O arco do fórnice', ids: ['fornice', 'area-septal'],
    text: 'O fórnice sai do hipocampo de cada lado e faz um arco sob o corpo caloso. Os neurônios da área septal também mandam axônios a ele.' },
  { id: 'vf-mamilar', seq: 'v-memoria', dur: 5000, title: 'Até o hipotálamo', ids: ['corpo-mamilar', 'hipotalamo', 'fornice'],
    text: 'O fórnice liga o hipocampo ao hipotálamo. Os corpos mamilares são um alvo importante dele e fazem parte da circuitaria da formação da memória.' },

  /* ---------- tálamo ---------- */
  { id: 'vp-entradas', seq: 'v-talamo', dur: 5400, title: 'Três entradas', ids: ['tracto-optico', 'coliculo-inferior', 'lemnisco-medial', 'talamo'],
    text: 'As vias da visão, da audição e das sensações somáticas fazem sinapse no tálamo antes de chegar ao córtex. Por isso ele é chamado de portal para o córtex cerebral.' },
  { id: 'vp-capsula', seq: 'v-talamo', dur: 5000, title: 'Sobem pela cápsula interna', ids: ['talamo', 'capsula-interna'],
    text: 'Os neurônios do tálamo mandam axônios ao córtex pela cápsula interna. Como regra geral, cada cápsula interna leva ao córtex informação do lado oposto do corpo.' },
  { id: 'vp-areas', seq: 'v-talamo', dur: 6400, title: 'Cada núcleo, uma área', ids: ['nucleo-geniculado-lateral', 'nucleo-geniculado-medial', 'nucleo-ventral-posterior', 'nucleo-ventral-lateral', 'nucleo-pulvinar'],
    text: 'Núcleos diferentes projetam para áreas diferentes: o geniculado lateral, para o córtex visual; o geniculado medial, para o auditivo; o ventral posterior, para o giro pós-central; o ventral lateral, para o córtex motor; o pulvinar, para grande parte do córtex de associação.' },

  /* ---------- do tubo ao encéfalo ---------- */
  { id: 'o-placa', seq: 'origem', dur: 5200, title: 'A placa neural', ids: ['folhetos', 'placa-neural'],
    text: 'No início o embrião é um disco plano de três camadas. O sistema nervoso vem todo do ectoderma. Por volta de 17 dias após a fecundação, o futuro encéfalo é só uma camada achatada de células: a placa neural.' },
  { id: 'o-sulco', seq: 'origem', dur: 5600, title: 'O sulco e as pregas', ids: ['sulco-neural', 'placa-neural'],
    text: 'Forma-se um sulco na placa neural, de rostral a caudal. As paredes do sulco, as pregas neurais, sobem e se aproximam.' },
  { id: 'o-tubo', seq: 'origem', dur: 6000, title: 'O tubo neural', ids: ['tubo-neural', 'crista-neural', 'somitos'],
    text: 'As pregas se fundem dorsalmente e formam o tubo neural, por volta de 22 dias. Todo o sistema nervoso central vem das paredes desse tubo. O que se desprende ao lado é a crista neural, origem do sistema nervoso periférico. Os somitos darão as vértebras e os músculos.' },
  { id: 'o-vesiculas', seq: 'origem', dur: 5600, title: 'Três vesículas primárias', ids: ['prosencefalo', 'mesencefalo', 'rombencefalo'],
    text: 'Na ponta rostral do tubo surgem três dilatações: prosencéfalo, mesencéfalo e rombencéfalo. O encéfalo inteiro vem delas. O resto do tubo, caudal, dá a medula espinhal. As vesículas estão cortadas no plano horizontal para deixar ver o interior.' },
  { id: 'o-secundarias', seq: 'origem', dur: 6000, title: 'O prosencéfalo brota', ids: ['vesicula-optica', 'telencefalo', 'diencefalo'],
    text: 'De cada lado do prosencéfalo brotam uma vesícula óptica e uma vesícula telencefálica. O que fica no meio, ímpar, é o diencéfalo. As vesículas ópticas darão os nervos ópticos e as retinas.' },
  { id: 'o-telencefalo', seq: 'origem', dur: 6400, title: 'O telencéfalo cresce', ids: ['telencefalo', 'diencefalo', 'bulbo-olfatorio'],
    text: 'As vesículas telencefálicas crescem para trás e passam a cobrir o diencéfalo por cima e pelos lados. Da face ventral delas brota outro par de vesículas, os bulbos olfatórios.' },
  { id: 'o-prosencefalo', seq: 'origem', dur: 7000, title: 'O prosencéfalo por dentro', ids: ['ventriculo-lateral', 'terceiro-ventriculo', 'cortex-cerebral', 'telencefalo-basal', 'talamo', 'hipotalamo', 'corpo-caloso', 'capsula-interna', 'substancia-branca'],
    text: 'Em corte coronal: os espaços dentro dos hemisférios são os ventrículos laterais; o do centro do diencéfalo, o terceiro ventrículo. A parede do telencéfalo vira córtex cerebral e telencéfalo basal; a do diencéfalo, tálamo e hipotálamo. Os axônios formam a substância branca cortical, o corpo caloso e a cápsula interna.' },
  { id: 'o-mesencefalo', seq: 'origem', dur: 5600, title: 'O mesencéfalo', ids: ['teto', 'tegmento', 'aqueduto'],
    text: 'O mesencéfalo muda pouco. A parte dorsal vira o teto; o assoalho, o tegmento. O espaço entre os dois é apertado até virar um canal estreito, o aqueduto.' },
  { id: 'o-rombo-rostral', seq: 'origem', dur: 6400, title: 'Cerebelo e ponte', ids: ['labios-rombicos', 'cerebelo', 'ponte', 'quarto-ventriculo'],
    text: 'No rombencéfalo rostral, os lábios rômbicos crescem até se fundirem: a aba que resulta vira o cerebelo. A parede ventral se dilata e forma a ponte. O espaço no centro é o quarto ventrículo.' },
  { id: 'o-rombo-caudal', seq: 'origem', dur: 5600, title: 'O bulbo', ids: ['bulbo', 'piramide-bulbar', 'quarto-ventriculo'],
    text: 'No rombencéfalo caudal as paredes ventral e lateral se dilatam e formam o bulbo; o teto fica coberto só por uma camada fina de células. Na face ventral correm as pirâmides bulbares.' },
  { id: 'o-medula', seq: 'origem', dur: 5600, title: 'A medula espinhal', ids: ['cinzenta-medular', 'branca-medular', 'canal-central'],
    text: 'O tubo neural caudal muda menos. As paredes engrossam e a cavidade encolhe até virar o canal central. No centro fica a substância cinzenta, em borboleta; em volta, as colunas de substância branca.' },
  { id: 'o-plano', seq: 'origem', dur: 7000, title: 'Juntando as peças', ids: ['telencefalo', 'diencefalo', 'mesencefalo', 'cerebelo', 'ponte', 'bulbo', 'medula-espinhal'],
    text: 'É este o plano comum a todos os mamíferos. No ser humano o telencéfalo cresceu tanto que cobre quase todo o resto, mas as relações são as mesmas. Abra o Atlas no modo de cores Origem para ver o encéfalo adulto com este mesmo código.' },
];
