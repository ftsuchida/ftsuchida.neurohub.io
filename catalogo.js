// O catálogo do hub. Para publicar um item novo:
//   1. ponha a página dele em itens/<id>/index.html (um arquivo único funciona melhor);
//   2. ponha a capa em assets/capas/ (1280 × 800; a versão escura é opcional);
//   3. copie um bloco de "itens" abaixo e ajuste os campos.
// Este arquivo é um .js, e não um .json, para o hub abrir também com dois cliques, sem servidor.
window.CATALOGO = {
  titulo: 'NeuroHub',
  descricao: 'Modelos 3D, mapas mentais e outros materiais interativos para estudar neurociência. Tudo abre direto no navegador.',
  // Endereço do repositório no GitHub, por exemplo 'https://github.com/usuario/repo'. Vazio esconde o link.
  repo: 'https://github.com/ftsuchida/neurohub',

  // Os tipos viram os filtros do topo. Um tipo sem nenhum item não aparece.
  tipos: {
    'modelo-3d': 'Modelo 3D',
    'mapa-mental': 'Mapa mental',
    'resumo': 'Resumo',
  },

  itens: [
    {
      id: 'reflexo-tachinha',
      titulo: 'Reflexo da Tachinha',
      tipo: 'modelo-3d',
      assunto: 'Neurociência',
      resumo: 'Você pisa numa tachinha e levanta o pé. O sinal em 8 passos animados: pele, nervo, medula, encéfalo e junção neuromuscular.',
      base: 'Bear, Connors e Paradiso, Neurociências, 4ª ed., caps. 1 a 6',
      data: '2026-10',
      url: 'itens/reflexo-tachinha/',
      capa: 'assets/capas/reflexo-tachinha.jpg',
      capaEscura: 'assets/capas/reflexo-tachinha-escura.jpg',
      codigo: 'fontes/reflexo-tachinha',
    },
    {
      id: 'neuronio-3d',
      titulo: 'Neurônio em 3D',
      tipo: 'modelo-3d',
      assunto: 'Neurociência',
      resumo: 'O neurônio e o tecido em volta dele: soma, axônio, sinapse e glia, com o gráfico do potencial de ação e os líquidos de dentro e de fora da célula.',
      base: 'Bear, Connors e Paradiso, Neurociências, 4ª ed., caps. 1 a 6',
      data: '2026-10',
      url: 'itens/neuronio-3d/',
      capa: 'assets/capas/neuronio-3d.jpg',
      capaEscura: 'assets/capas/neuronio-3d-escura.jpg',
      codigo: 'fontes/neuronio-3d',
    },
  ],
};
