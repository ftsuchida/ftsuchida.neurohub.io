# NeuroHub

Um índice de materiais interativos para estudar neurociência: modelos 3D, mapas mentais e o que mais couber. Cada item é uma página independente que abre direto no navegador. O hub só lista e aponta para elas.

**Abrir o hub: https://ftsuchida.github.io/neurohub/**

## O que tem hoje

| Item | Tipo | O que mostra |
|---|---|---|
| [Neurônio em 3D](https://ftsuchida.github.io/neurohub/itens/neuronio-3d/) | Modelo 3D | O neurônio e o tecido em volta: soma, axônio, sinapse e glia, com o gráfico do potencial de ação e os líquidos de dentro e de fora da célula. |
| [Reflexo da Tachinha](https://ftsuchida.github.io/neurohub/itens/reflexo-tachinha/) | Modelo 3D | O sinal do contato na pele até a contração do músculo, em 8 passos animados: pele, nervo, medula, encéfalo e junção neuromuscular. |

Os dois seguem *Neurociências: desvendando o sistema nervoso* (Bear, Connors e Paradiso, 4ª ed.), capítulos 1 a 6. O que vem de fora desses capítulos aparece marcado como "extra" dentro de cada modelo. São material de estudo, com formas e tamanhos exagerados para ficar legível.

## Como o repositório está organizado

```
index.html            o hub
catalogo.js           a lista de itens que o hub mostra
assets/               estilo e script do hub, e as capas dos itens
itens/<id>/           a página publicada de cada item (arquivo único, já montado)
fontes/<id>/src/      o código-fonte dos itens que têm etapa de montagem
scripts/build.mjs     monta fontes/<id> em itens/<id>/index.html
scripts/serve.mjs     servidor local para testar
```

O site é estático e não tem etapa de publicação: o GitHub Pages serve os arquivos como estão. Por isso as páginas montadas em `itens/` ficam versionadas junto com o código.

## Ver no computador

O hub e os itens abrem com dois cliques em `index.html`, sem instalar nada.

Para ver como fica no Pages, com servidor:

```
npm run serve
```

Depois abra `http://localhost:4173/`.

## Incluir um item

1. Ponha a página em `itens/<id>/index.html`. Um arquivo único, com estilo e script embutidos, é o que funciona melhor: abre offline e não depende de caminho.
2. Ponha uma capa de 1280 × 800 em `assets/capas/`. A versão para o tema escuro é opcional.
3. Copie um bloco de `itens` em `catalogo.js` e ajuste os campos.
4. Ponha na página um link de volta para o hub, apontando para `../../index.html`. O hub não envolve os itens em moldura nenhuma, então sem esse link só resta o voltar do navegador.

| Campo | Para que serve |
|---|---|
| `id` | Nome da pasta em `itens/` (e em `fontes/`, se houver) |
| `titulo`, `resumo` | Texto do cartão. O título também vira o `<title>` da página montada |
| `tipo` | Chave de `tipos` no mesmo arquivo. Os tipos viram os filtros do topo |
| `assunto` | Aparece ao lado do tipo |
| `base` | De onde vem o conteúdo (livro, curso, artigo) |
| `data` | `AAAA-MM`. Ordena o índice, do mais novo para o mais antigo |
| `url` | Caminho da página, relativo à raiz |
| `capa`, `capaEscura` | Imagens do cartão |
| `codigo` | Pasta do código-fonte, se houver |

Um tipo novo (por exemplo `mapa-mental`) passa a aparecer nos filtros assim que tiver um item. Os filtros por tipo aparecem quando há mais de um tipo; a busca, a partir de 7 itens.

## Alterar um modelo 3D

Os modelos são escritos em JavaScript com [three.js](https://threejs.org/) e montados com [esbuild](https://esbuild.github.io/) em um único HTML.

```
npm install
npm run build                      # monta todos
npm run build -- reflexo-tachinha  # monta só um
npm run build -- --dev             # sem minificar
```

Em cada `fontes/<id>/src/`:

| Arquivo | Conteúdo |
|---|---|
| `data.js` | Os textos: fichas, vistas e passos. É onde se corrige conteúdo |
| `scene.js` | A geometria e as animações de cada vista |
| `geo.js` | Funções de apoio para tubos, esferas e formas de revolução |
| `main.js` | Interface: lista, ficha, câmera, rótulos e cliques |
| `ap.js` | Só no neurônio: o modelo de Hodgkin e Huxley e o gráfico do potencial de ação |
| `style.css`, `body.html` | Estilo e marcação da página. No `body.html`, `{{hub}}` vira o título do hub na montagem (é o texto do link de voltar) |

Depois de montar, faça commit também de `itens/<id>/index.html`: é esse arquivo que o Pages serve.

## Publicar no GitHub Pages

No repositório, em **Settings → Pages**, escolha **Deploy from a branch**, ramo `main`, pasta `/ (root)`. O arquivo `.nojekyll` na raiz faz o Pages servir os arquivos sem processá-los.

O link "Código no GitHub" do hub vem do campo `repo` em `catalogo.js`.

## Licença

[MIT](LICENSE). As bibliotecas embutidas nas páginas montadas estão em [LICENCAS-DE-TERCEIROS.md](LICENCAS-DE-TERCEIROS.md).
