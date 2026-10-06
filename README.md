# NeuroHub

Um índice de materiais interativos para estudar neurociência: modelos 3D, mapas mentais e o que mais couber. Cada item é uma página independente que abre direto no navegador. O hub só lista e aponta para elas.

**Abrir o hub: https://ftsuchida.github.io/neurohub/**

## O que tem hoje

| Item | Tipo | O que mostra |
|---|---|---|
| [Antidepressivo na Sinapse](https://ftsuchida.github.io/neurohub/itens/antidepressivo-sinapse/) | Modelo 3D | Como um ISRS age em uma sinapse de serotonina: bloqueia a recaptação, e o transmissor fica mais tempo na fenda. Tem passo a passo e um gráfico que compara com e sem o fármaco. |
| [Neurônio em 3D](https://ftsuchida.github.io/neurohub/itens/neuronio-3d/) | Modelo 3D | O neurônio e o tecido em volta: soma, axônio, sinapse e glia, com o gráfico do potencial de ação e os líquidos de dentro e de fora da célula. |
| [Reflexo da Tachinha](https://ftsuchida.github.io/neurohub/itens/reflexo-tachinha/) | Modelo 3D | O sinal do contato na pele até a contração do músculo, em 8 passos animados: pele, nervo, medula, encéfalo e junção neuromuscular. |

Todos seguem *Neurociências: desvendando o sistema nervoso* (Bear, Connors e Paradiso, 4ª ed.), capítulos 1 a 6. O que vem de fora desses capítulos aparece marcado como "extra" dentro de cada modelo. São material de estudo, com formas e tamanhos exagerados para ficar legível. Nenhum deles é orientação sobre tratamento.

## Como o repositório está organizado

```
index.html            o hub
catalogo.js           a lista de itens que o hub mostra
assets/               estilo e script do hub, e as capas dos itens
itens/<id>/           a página publicada de cada item (arquivo único, já montado)
fontes/<id>/src/      o código-fonte dos itens que têm etapa de montagem
fontes/comum/         o que os itens compartilham: idioma, painéis recolhíveis e o estilo comum
scripts/build.mjs     monta fontes/<id> em itens/<id>/index.html
scripts/check-i18n.mjs  confere se o inglês cobre tudo o que o português tem
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
| `titulo`, `resumo` | Texto do cartão. O título também vira o `<title>` da página montada. Como todo texto do catálogo, pode ser uma string ou `{ pt: '...', en: '...' }` |
| `tipo` | Chave de `tipos` no mesmo arquivo. Os tipos viram os filtros do topo |
| `assunto` | Aparece ao lado do tipo |
| `base` | De onde vem o conteúdo (livro, curso, artigo). Não aparece no cartão; entra na busca |
| `destaque` | `true` põe o item no começo do índice, antes da ordem por data |
| `data` | `AAAA-MM-DD`. Ordena o índice, do mais novo para o mais antigo |
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
| `data.pt.js` | Os textos em português: fichas, vistas e passos. É onde se corrige conteúdo, e é a fonte de tudo o que não é texto (ids, cores, relações) |
| `data.en.js` | Os mesmos textos em inglês, por id |
| `data.js` | Junta os dois conforme o idioma da página |
| `scene.js` | A geometria e as animações de cada vista |
| `geo.js` | Funções de apoio para tubos, esferas e formas de revolução |
| `main.js` | Interface: lista, ficha, câmera, rótulos e cliques |
| `ap.js` | Só no neurônio: o modelo de Hodgkin e Huxley e o gráfico do potencial de ação |
| `style.css`, `body.html` | Estilo e marcação da página. No `body.html`, `{{hub}}` vira o título do hub na montagem (é o texto do link de voltar) |

Depois de montar, faça commit também de `itens/<id>/index.html`: é esse arquivo que o Pages serve.

O que vale para todos os modelos fica em `fontes/comum/`:

| Arquivo | Conteúdo |
|---|---|
| `lang.js` | Escolha do idioma e a função `tr()` |
| `panes.js` | Os dois botões da barra de vistas que recolhem a lista (esquerda) e a ficha (direita). A escolha fica guardada no navegador |
| `comum.css` | Estilo comum, juntado ao fim do `style.css` de cada modelo na montagem |

## Idiomas

O site tem português e inglês, com uma chave PT/EN no hub e em cada modelo. Na primeira visita vale o idioma do navegador (português, se estiver na lista dele; senão, inglês). Depois vale a última escolha, que fica guardada no navegador e também vai no endereço (`?lang=en`), então um link já abre no idioma certo.

| Onde | Como entra o inglês |
|---|---|
| Catálogo (`catalogo.js`) | Cada texto vira `{ pt: '...', en: '...' }`. Sem `en`, aparece o português |
| Fichas, vistas e passos de um modelo | `data.en.js`, com os mesmos ids de `data.pt.js` |
| Textos escritos no código de um modelo | `tr('Abrir', 'Open')`, de `fontes/comum/lang.js` |
| Textos escritos no `body.html` de um modelo | Atributos `data-en`, `data-en-placeholder`, `data-en-aria-label` e `data-en-title` |

Nos modelos, trocar o idioma recarrega a página. No hub, a troca é na hora.

Depois de mexer em uma ficha, `npm run check` mostra o que ficou sem tradução:

```
npm run check
```

## Publicar no GitHub Pages

No repositório, em **Settings → Pages**, escolha **Deploy from a branch**, ramo `main`, pasta `/ (root)`. O arquivo `.nojekyll` na raiz faz o Pages servir os arquivos sem processá-los.

O link "Código no GitHub" do hub vem do campo `repo` em `catalogo.js`.

## Contagem de visitas

As visitas são contadas pelo [GoatCounter](https://www.goatcounter.com/), que não usa cookies nem guarda dado pessoal. O painel fica em https://neurohub.goatcounter.com e pede login.

O endereço de contagem está no campo `contador` de `catalogo.js`. O hub lê esse campo direto. Nos itens, ele entra na montagem, então quem muda o campo precisa rodar `npm run build` e fazer commit dos `itens/<id>/index.html`. Vazio desliga a contagem.

- Só conta no site publicado (`https://`). Abrir com dois cliques ou no `npm run serve` não vira visita.
- A página vai sem o `?lang=`, para cada página aparecer numa linha só no painel, nos dois idiomas.
- Sem internet, o script do contador não carrega e a página funciona igual.
- Bloqueadores de anúncio costumam barrar o contador, então o número real de visitas tende a ser maior que o do painel.

## Licença

[MIT](LICENSE). As bibliotecas embutidas nas páginas montadas estão em [LICENCAS-DE-TERCEIROS.md](LICENCAS-DE-TERCEIROS.md).
