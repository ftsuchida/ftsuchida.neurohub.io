// Antidepressivo na sinapse: como um ISRS (inibidor seletivo da recaptação de serotonina) age.
// Conteúdo conforme Bear, Connors & Paradiso, Neurociências, 4ª ed., capítulos 5 e 6.
// Em "more", um item { x: '...' } é um detalhe de fora dos capítulos 1 a 6 e aparece marcado como "extra".

export const GROUPS = [
  { id: 'pre', name: 'Terminal pré-sináptico' },
  { id: 'fenda', name: 'Fenda' },
  { id: 'pos', name: 'Neurônio pós-sináptico' },
  { id: 'fim', name: 'Fim do sinal' },
  { id: 'farm', name: 'Fármaco' },
];

export const ITEMS = [
  {
    id: 'terminal', g: 'pre', name: 'Terminal serotoninérgico', aka: 'Terminal axonal pré-sináptico', color: '#A3B2F0',
    morf: 'Ponta do axônio de um neurônio que usa serotonina. Por dentro tem vesículas, mitocôndrias e as enzimas que fabricam o transmissor.',
    func: 'Fabrica, guarda e libera a serotonina. Depois a recolhe da fenda, pelos transportadores da própria membrana.',
    clueTitle: 'Por que importa',
    clue: 'Só o transmissor pequeno é montado no terminal. As enzimas vêm do soma, porque o axônio não fabrica proteínas.',
    more: [
      'Os neurônios que usam serotonina são poucos, mas têm papel no humor, no comportamento emocional e no sono.',
      { x: 'Os corpos celulares desses neurônios ficam nos núcleos da rafe, no tronco encefálico, e os axônios se espalham por grande parte do encéfalo. É assunto do capítulo 15.' },
    ],
    where: 'O bulbo azul de cima, aberto em corte, e o axônio que chega nele.',
    rel: ['vesicula', 'zona-ativa', 'transportador', 'mitocondria'],
  },
  {
    id: 'vesicula', g: 'pre', name: 'Vesícula sináptica', color: '#F3E3B0',
    rows: [['Tamanho', 'cerca de 50 nm']],
    morf: 'Esfera de membrana cheia de neurotransmissor.',
    func: 'Guarda a serotonina e a solta na fenda por exocitose, quando o Ca²⁺ entra no terminal.',
    clueTitle: 'Como ela se enche',
    clue: 'Um transportador da membrana da vesícula troca um H⁺ que sai por uma molécula de transmissor que entra. Uma bomba de H⁺ movida a ATP mantém a vesícula ácida.',
    more: [
      'Esse transportador concentra o transmissor até 100 mil vezes.',
      'As vesículas atracadas na zona ativa saem primeiro. Depois da exocitose, a membrana é recuperada por endocitose e a vesícula é recarregada.',
      'As proteínas SNARE prendem a vesícula à membrana, e a sinaptotagmina é o sensor de Ca²⁺ que dispara a fusão.',
    ],
    where: 'As esferas amarelo-claras dentro do terminal. As de baixo estão atracadas nas zonas ativas.',
    rel: ['serotonina', 'zona-ativa', 'calcio'],
  },
  {
    id: 'zona-ativa', g: 'pre', name: 'Zona ativa', color: '#5F6FCB',
    morf: 'Trecho da membrana pré-sináptica onde as vesículas ficam atracadas, de frente para a fenda.',
    func: 'É o lugar da liberação. Os canais de Ca²⁺ ficam junto das vesículas atracadas, e por isso a exocitose é tão rápida.',
    where: 'As barras escuras no piso do terminal.',
    rel: ['vesicula', 'canal-ca'],
  },
  {
    id: 'canal-ca', g: 'pre', name: 'Canal de Ca²⁺ dependente de voltagem', color: '#A77BE0',
    morf: 'Proteína da membrana do terminal, parente dos canais de Na⁺ do potencial de ação, mas que deixa passar Ca²⁺.',
    func: 'Abre quando o potencial de ação despolariza o terminal. O Ca²⁺ que entra é o sinal para liberar o transmissor.',
    where: 'Os anéis lilás no piso do terminal, entre as zonas ativas.',
    rel: ['calcio', 'zona-ativa'],
  },
  {
    id: 'calcio', g: 'pre', name: 'Cálcio (Ca²⁺)', color: '#C39BF2',
    rows: [['Fora', '2 mM'], ['Dentro', '0,0002 mM']],
    morf: 'Íon dez mil vezes mais concentrado fora do neurônio.',
    func: 'Entra pelos canais abertos e faz as vesículas atracadas se fundirem com a membrana.',
    more: ['Perto da zona ativa, a concentração passa de 0,01 mM quando os canais abrem.'],
    where: 'Os pontos lilás que entram no terminal quando o potencial de ação chega.',
    rel: ['canal-ca', 'vesicula'],
  },
  {
    id: 'mitocondria', g: 'pre', name: 'Mitocôndria', color: '#EC8A7A',
    rows: [['Tamanho', 'cerca de 1 µm']],
    morf: 'Organela alongada, com a membrana interna dobrada.',
    func: 'Produz o ATP do terminal. A membrana externa dela carrega a MAO.',
    more: ['O terminal axonal tem muitas mitocôndrias: sinal de gasto alto de energia.'],
    where: 'As duas organelas avermelhadas dentro do terminal.',
    rel: ['mao', 'terminal'],
  },

  {
    id: 'serotonina', g: 'fenda', name: 'Serotonina', aka: '5-HT', color: '#FFD21F',
    rows: [['Família', 'Amina'], ['Feita de', 'Triptofano']],
    morf: 'Molécula pequena, da família das aminas. É feita no citosol do terminal, a partir do aminoácido triptofano.',
    func: 'É o neurotransmissor desta sinapse. Liberada na fenda, liga-se aos receptores do neurônio seguinte.',
    clueTitle: 'A rota de síntese',
    clue: 'Triptofano → 5-HTP → serotonina. O que limita a produção é o triptofano disponível, que vem do sangue e, antes, da dieta.',
    more: [
      'A ação dela termina por recaptação: um transportador específico a leva de volta ao terminal.',
      'Dentro do terminal, ela volta para uma vesícula ou é destruída pela MAO.',
    ],
    where: 'As esferas amarelas vivas, soltas na fenda depois do disparo. Antes disso, ficam guardadas dentro das vesículas.',
    rel: ['vesicula', 'receptor', 'transportador', 'mao'],
  },
  {
    id: 'fenda', g: 'fenda', name: 'Fenda sináptica', color: '#C9A6E0',
    rows: [['Largura', '20 a 50 nm']],
    morf: 'Espaço entre a membrana pré-sináptica e a pós-sináptica.',
    func: 'É por onde o transmissor atravessa. Enquanto ele está ali, os receptores continuam sendo ativados.',
    clueTitle: 'Três jeitos de limpar a fenda',
    clue: 'Difusão para longe, recaptação por transportadores e degradação por enzimas. Nesta sinapse, quem encerra a ação é a recaptação.',
    where: 'O vão entre o terminal e o neurônio de baixo. No modelo ele está muito exagerado.',
    rel: ['serotonina', 'transportador', 'receptor'],
  },

  {
    id: 'pos', g: 'pos', name: 'Neurônio pós-sináptico', color: '#E9B095',
    morf: 'O neurônio que recebe o sinal. A membrana dele, de frente para o terminal, tem os receptores.',
    func: 'Lê a serotonina pelos receptores. Os receptores acoplados a proteína G abrem ou fecham canais de forma indireta e alteram o metabolismo da célula.',
    where: 'O bulbo cor de pêssego de baixo, aberto em corte, e o dendrito de onde ele sai.',
    rel: ['receptor', 'proteina-g'],
  },
  {
    id: 'receptor', g: 'pos', name: 'Receptor de serotonina', color: '#3F7FE0',
    morf: 'Proteína da membrana pós-sináptica. Vários receptores de serotonina são acoplados a proteína G: um único polipeptídeo que atravessa a membrana sete vezes.',
    func: 'Quando a serotonina se liga, o receptor muda de forma e ativa proteínas G do lado de dentro da membrana.',
    clueTitle: 'Por que importa',
    clue: 'O efeito depende do receptor, e não só do transmissor. Um mesmo transmissor ativa vários subtipos de receptor.',
    more: [
      'É uma via mais lenta que a de um canal iônico, mas amplifica o sinal e dura mais.',
      { x: 'Existe também um receptor de serotonina que é canal iônico, o 5-HT3.' },
    ],
    where: 'Os cilindros azuis na membrana de baixo. Eles se acendem enquanto há serotonina ligada.',
    rel: ['serotonina', 'proteina-g', 'pos'],
  },
  {
    id: 'proteina-g', g: 'pos', name: 'Proteína G', color: '#63B76C',
    morf: 'Proteína de três subunidades (α, β e γ), presa à face interna da membrana. Em repouso, a α segura um GDP.',
    func: 'Ativada pelo receptor, troca o GDP por GTP e se divide em duas partes, que agem sobre proteínas efetoras: um canal ou uma enzima.',
    clueTitle: 'Como ela desliga',
    clue: 'A própria subunidade α quebra o GTP em GDP. Com isso ela se desliga sozinha, e o ciclo recomeça.',
    more: [
      'Pela via de atalho, a proteína G abre um canal direto. Pela cascata, liga uma enzima que produz segundos mensageiros.',
      'Um receptor ativado aciona de 10 a 20 proteínas G: o sinal é amplificado.',
    ],
    where: 'Os três grãos verdes embaixo de cada receptor, do lado de dentro.',
    rel: ['receptor', 'pos'],
  },

  {
    id: 'transportador', g: 'fim', name: 'Transportador de recaptação', aka: 'Transportador de serotonina', color: '#1FA39A',
    morf: 'Proteína da membrana do terminal, específica para a serotonina.',
    func: 'Traz a serotonina da fenda de volta para o citosol do terminal. É assim que a ação dela termina.',
    clueTitle: 'De onde vem a energia',
    clue: 'Ele não quebra ATP. Funciona por cotransporte: dois Na⁺ entram junto com cada molécula de transmissor, a favor do gradiente de Na⁺ que as bombas criaram.',
    more: [
      'Consegue concentrar o transmissor até 10 mil vezes.',
      'É nos transportadores que agem a cocaína, as anfetaminas e alguns medicamentos psiquiátricos.',
      { x: 'O nome técnico deste transportador é SERT.' },
    ],
    where: 'As proteínas verde-azuladas na borda do piso do terminal, com a boca virada para a fenda.',
    rel: ['serotonina', 'sodio', 'isrs', 'mao'],
  },
  {
    id: 'sodio', g: 'fim', name: 'Sódio (Na⁺)', color: '#E9772B',
    rows: [['Fora', '150 mM'], ['Dentro', '15 mM']],
    morf: 'Cátion dez vezes mais concentrado fora do neurônio.',
    func: 'Paga a recaptação: ao entrar a favor do gradiente, leva a serotonina junto pelo transportador.',
    where: 'Os pontos alaranjados, menores que a serotonina. Dois entram com cada molécula recaptada.',
    rel: ['transportador'],
  },
  {
    id: 'mao', g: 'fim', name: 'MAO', aka: 'Monoaminoxidase', color: '#D4504C',
    morf: 'Enzima presa à membrana externa das mitocôndrias.',
    func: 'Destrói a serotonina que voltou ao terminal e não foi recarregada em vesícula.',
    more: [{ x: 'Há antidepressivos que agem aqui, e não no transportador: os inibidores da MAO.' }],
    where: 'Os grãos vermelhos na superfície das mitocôndrias.',
    rel: ['mitocondria', 'serotonina', 'transportador'],
  },

  {
    id: 'isrs', g: 'farm', name: 'ISRS', aka: 'Inibidor seletivo da recaptação de serotonina', color: '#DB3F98',
    rows: [['Exemplo do livro', 'Fluoxetina (Prozac)']],
    morf: 'Fármaco que se liga ao transportador de serotonina.',
    func: 'Ocupa o transportador e bloqueia a recaptação. A serotonina liberada fica mais tempo na fenda e ativa os receptores por mais tempo.',
    clueTitle: 'Em termos de farmacologia',
    clue: 'É um inibidor: bloqueia a função de uma proteína da transmissão sináptica. Não imita o transmissor (isso seria um agonista) nem ocupa o receptor (isso seria um antagonista).',
    more: [
      { x: '"Seletivo" quer dizer que ele age no transportador de serotonina bem mais do que nos de outras aminas.' },
      { x: 'Outros ISRS: sertralina, escitalopram, paroxetina e citalopram.' },
      { x: 'Estudos de imagem indicam que, nas doses usuais, cerca de 80% dos transportadores ficam ocupados. No modelo, são 5 de 6.' },
      { x: 'O bloqueio do transportador acontece em horas, mas a melhora do humor costuma levar semanas. Mais serotonina na fenda é só o primeiro passo, e este modelo mostra apenas ele.' },
    ],
    where: 'As cápsulas magenta na boca dos transportadores, com a chave ISRS ligada. No modelo, 5 dos 6 transportadores ficam ocupados.',
    rel: ['transportador', 'serotonina', 'fenda'],
  },
];

export const BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// As vistas são enquadramentos da mesma cena.
export const VIEWS = [
  { id: 'syn', name: 'Sinapse' },
  { id: 'cleft', name: 'Fenda' },
  { id: 'sert', name: 'Transportador' },
];

// O passo a passo. "view" é o enquadramento do passo; "dur" é a duração da animação em ms.
export const STEPS = [
  {
    id: 'chegada', stage: 'syn', view: 'syn', dur: 4200, title: 'O potencial de ação chega',
    text: 'O potencial de ação desce pelo axônio e despolariza o terminal. Os canais de Ca²⁺ dependentes de voltagem abrem, e o Ca²⁺ entra.',
    ids: ['terminal', 'canal-ca', 'calcio'],
  },
  {
    id: 'liberacao', stage: 'syn', view: 'cleft', dur: 5200, title: 'A serotonina sai na fenda',
    text: 'O Ca²⁺ faz as vesículas atracadas se fundirem com a membrana: é a exocitose. A serotonina cai na fenda e se espalha.',
    ids: ['vesicula', 'zona-ativa', 'serotonina', 'fenda'],
  },
  {
    id: 'receptor', stage: 'syn', view: 'cleft', dur: 5600, title: 'O receptor aciona a proteína G',
    text: 'A serotonina se liga aos receptores do neurônio seguinte. Cada receptor ocupado ativa proteínas G, que agem sobre canais e enzimas. É uma via lenta, que amplifica e dura.',
    ids: ['receptor', 'proteina-g', 'pos'],
  },
  {
    id: 'recaptacao', stage: 'syn', view: 'sert', dur: 7600, title: 'A recaptação limpa a fenda',
    text: 'O transportador leva a serotonina de volta ao terminal, com dois Na⁺ por molécula. A fenda esvazia, os receptores se soltam e o sinal termina.',
    ids: ['transportador', 'sodio', 'serotonina'],
  },
  {
    id: 'destino', stage: 'syn', view: 'syn', dur: 6400, title: 'De volta ao terminal',
    text: 'A serotonina recaptada tem dois destinos: é recarregada em uma vesícula ou é destruída pela MAO, na superfície das mitocôndrias.',
    ids: ['vesicula', 'mao', 'mitocondria'],
  },
  {
    id: 'isrs', stage: 'syn', view: 'sert', dur: 5600, title: 'Entra o ISRS',
    text: 'O fármaco se liga ao transportador de serotonina. Com o transportador ocupado, a recaptação fica bloqueada.',
    ids: ['isrs', 'transportador'],
  },
  {
    id: 'efeito', stage: 'syn', view: 'cleft', dur: 11000, title: 'O mesmo disparo, com o ISRS',
    text: 'No modelo, o potencial de ação libera a mesma quantidade de serotonina. Mas ela demora a sair da fenda, e os receptores ficam ocupados por mais tempo. Compare as duas curvas do gráfico.',
    ids: ['isrs', 'serotonina', 'receptor', 'fenda'],
  },
  {
    id: 'limites', stage: 'syn', view: 'syn', dur: 2600, title: 'O que o modelo não mostra',
    text: 'Extra, de fora dos capítulos 1 a 6: o bloqueio do transportador acontece em horas, mas a melhora do humor costuma levar semanas. Mais serotonina na fenda é só o primeiro passo.',
    ids: ['isrs'],
  },
];
