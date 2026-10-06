// O catálogo do hub. Para publicar um item novo:
//   1. ponha a página dele em itens/<id>/index.html (um arquivo único funciona melhor);
//   2. ponha a capa em assets/capas/ (1280 × 800; a versão escura é opcional);
//   3. copie um bloco de "itens" abaixo e ajuste os campos.
// Um texto pode ser uma string (igual nos dois idiomas) ou { pt: '...', en: '...' }. Sem "en", vale o português.
// Este arquivo é um .js, e não um .json, para o hub abrir também com dois cliques, sem servidor.
window.CATALOGO = {
  titulo: 'NeuroHub',
  // Aparece em letra menor, embaixo do título. Vazio esconde a linha.
  autor: 'Felipe Tsuchida',
  // Endereço do repositório no GitHub, por exemplo 'https://github.com/usuario/repo'. Vazio esconde o link.
  repo: 'https://github.com/ftsuchida/neurohub',

  // Os tipos viram os filtros do topo. Um tipo sem nenhum item não aparece.
  tipos: {
    'modelo-3d': { pt: 'Modelo 3D', en: '3D model' },
    'mapa-mental': { pt: 'Mapa mental', en: 'Mind map' },
    'resumo': { pt: 'Resumo', en: 'Summary' },
  },

  itens: [
    {
      id: 'antidepressivo-sinapse',
      titulo: { pt: 'Antidepressivo na Sinapse', en: 'Antidepressant at the Synapse' },
      tipo: 'modelo-3d',
      assunto: { pt: 'Neurociência', en: 'Neuroscience' },
      resumo: {
        pt: 'Como um ISRS age em uma sinapse de serotonina: ele bloqueia a recaptação, e o transmissor fica mais tempo na fenda. Com passo a passo e um gráfico que compara com e sem o fármaco.',
        en: 'How an SSRI acts at a serotonin synapse: it blocks reuptake, and the transmitter stays in the cleft for longer. With a step-by-step and a graph comparing with and without the drug.',
      },
      base: {
        pt: 'Bear, Connors e Paradiso, Neurociências, 4ª ed., caps. 5 e 6',
        en: 'Bear, Connors & Paradiso, Neuroscience, 4th ed., chs. 5 and 6',
      },
      data: '2026-10-06',
      url: 'itens/antidepressivo-sinapse/',
      capa: 'assets/capas/antidepressivo-sinapse.jpg',
      capaEscura: 'assets/capas/antidepressivo-sinapse-escura.jpg',
      codigo: 'fontes/antidepressivo-sinapse',
    },
    {
      id: 'reflexo-tachinha',
      titulo: { pt: 'Reflexo da Tachinha', en: 'Thumbtack Reflex' },
      tipo: 'modelo-3d',
      assunto: { pt: 'Neurociência', en: 'Neuroscience' },
      resumo: {
        pt: 'Você pisa numa tachinha e levanta o pé. O sinal em 8 passos animados: pele, nervo, medula, encéfalo e junção neuromuscular.',
        en: 'You step on a thumbtack and lift your foot. The signal in 8 animated steps: skin, nerve, spinal cord, brain and neuromuscular junction.',
      },
      base: {
        pt: 'Bear, Connors e Paradiso, Neurociências, 4ª ed., caps. 1 a 6',
        en: 'Bear, Connors & Paradiso, Neuroscience, 4th ed., chs. 1 to 6',
      },
      data: '2026-10-05',
      url: 'itens/reflexo-tachinha/',
      capa: 'assets/capas/reflexo-tachinha.jpg',
      capaEscura: 'assets/capas/reflexo-tachinha-escura.jpg',
      codigo: 'fontes/reflexo-tachinha',
    },
    {
      id: 'neuronio-3d',
      titulo: { pt: 'Neurônio em 3D', en: 'Neuron in 3D' },
      tipo: 'modelo-3d',
      assunto: { pt: 'Neurociência', en: 'Neuroscience' },
      resumo: {
        pt: 'O neurônio e o tecido em volta dele: soma, axônio, sinapse e glia, com o gráfico do potencial de ação e os líquidos de dentro e de fora da célula.',
        en: 'The neuron and the tissue around it: soma, axon, synapse and glia, with the action potential graph and the fluids inside and outside the cell.',
      },
      base: {
        pt: 'Bear, Connors e Paradiso, Neurociências, 4ª ed., caps. 1 a 6',
        en: 'Bear, Connors & Paradiso, Neuroscience, 4th ed., chs. 1 to 6',
      },
      data: '2026-10-05',
      url: 'itens/neuronio-3d/',
      capa: 'assets/capas/neuronio-3d.jpg',
      capaEscura: 'assets/capas/neuronio-3d-escura.jpg',
      codigo: 'fontes/neuronio-3d',
    },
  ],
};
