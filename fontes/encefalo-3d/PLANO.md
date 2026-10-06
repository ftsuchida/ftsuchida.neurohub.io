# Encéfalo em 3D: plano e notas de construção

Item `encefalo-3d` do NeuroHub. Base: *Neurociências: desvendando o sistema nervoso* (Bear, Connors e Paradiso, 4ª ed.), capítulo 7 e o apêndice "Um Guia Ilustrado da Neuroanatomia Humana" (pp. 179–249 da edição brasileira).

Este arquivo registra o que o item tem de ter e as decisões técnicas, para quem continuar o trabalho.

## Módulos (barra de baixo)

| Módulo | Subvistas | Base no livro |
|---|---|---|
| Atlas | Lateral, Medial, Ventral, Dorsal, Cerebelo (cérebro removido), Tronco (cérebro e cerebelo removidos), Por dentro (raio X). Cores: natural, lobos, áreas, origem | pp. 221–230; Figs. 7.23–7.25, 7.28 |
| Cortes | Secções 1 a 9 (1–3 com camadas a e b) e plano livre (coronal, horizontal, sagital) | pp. 231–240; Fig. 7.3 |
| Em volta | Meninges e crânio, LCS (passo a passo), Artérias, Nervos cranianos | pp. 185–187, 246–249 |
| Vias | Corticospinal, córtex-ponte-cerebelo, tato, visão, audição, gustação, fórnice, tálamo como portal (um passo a passo por via) | pp. 198–204 e textos dos cortes |
| Origem | Do tubo ao encéfalo: placa, sulco, tubo e crista; vesículas; diferenciação; "nave Enterprise"; encéfalo por origem | pp. 192–205 |
| Medula | Coluna e nervos, segmento com raízes e meninges, mapa dos tractos | pp. 203–204, 240–243 |
| Teste | Nomear e achar estruturas | (o apêndice termina em exercício de nomear) |

Entram ainda o vocabulário das Tabelas 7.1 e 7.2 e os referenciais anatômicos (pp. 180–182).

## Regras de conteúdo deste item

- Tronco encefálico: vale a p. 225 (diencéfalo, mesencéfalo, ponte e bulbo), com a ressalva do livro sobre a outra definição.
- Área septal não é o septo pelúcido. O septo pelúcido existe na malha, mas o livro não o nomeia: fica de fora.
- Áreas corticais: não há malha por área de Brodmann. As 10 regiões da p. 224 são aproximadas por giros inteiros ou por faixas deles, e a interface diz que são aproximadas.
- Cores por origem seguem o código das Figs. 7.11–7.23: prosencéfalo azul (telencéfalo claro, diencéfalo escuro), mesencéfalo rosa, rombencéfalo verde (cerebelo escuro, ponte e bulbo claros), medula amarelo.
- "Volta no capítulo": o apêndice aponta o capítulo de cada estrutura; a ficha traz isso sem número de página.
- A medula do adulto termina "no nível da terceira vértebra lombar" (p. 240). O modelo segue o livro; a ficha registra como extra que outros textos dão L1–L2.
- Sistema nervoso visceral (pp. 244–245): só ficha, ligada ao nervo vago e ao hipotálamo. A figura é do tronco do corpo.
- Tudo o que é desenhado por código (sem malha anatômica) aparece como esquemático.

## Malhas

- Fonte: BodyParts3D 3.0 (2011-09-15), © The Database Center for Life Science, CC BY-SA 2.1 Japão, pelo espelho `Kevin-Mattheus-Moerman/BodyParts3D` (commit `f0eeb6e`).
- `scripts/malhas-encefalo.mjs` baixa os STL necessários, solda, simplifica (meshoptimizer), calcula a oclusão de ambiente dos sulcos e grava `src/malhas.dados.js` como texto (posições em diferenças, 88 caracteres seguros dentro de `<script>`). Sem WebAssembly na página.
- O lado direito é espelho do esquerdo (no conjunto original a diferença mediana entre os lados é de 0,3 mm, em torno de x = −0,65 mm). O pacote só guarda o esquerdo.
- Não há malha para: medula espinal (só o canal central), artérias, nervos cranianos III–XII, bulbo olfatório, meninges, substância nigra, núcleo rubro, subtálamo, núcleos do tálamo, núcleos do tronco e do cerebelo, ramo posterior da cápsula interna. Esses são desenhados por código, com posição guiada pelas figuras do livro.
- Coordenadas da cena: 1 unidade = 1 cm. X = esquerda da pessoa, Y = cima, Z = frente. Origem em (x = −0,65; y = −90; z = 1552) mm do conjunto.

## Técnica

- Face de corte sem estêncil: cada sólido fechado ganha uma segunda malha só com as faces de trás, em cor chapada, cujo fragmento grava a profundidade do plano de corte (`gl_FragDepth`) e não a própria. Assim o interior de qualquer sólido cortado aparece como região plana, e sólidos aninhados se resolvem por um pequeno viés de prioridade.
- Um plano de corte fica sempre ligado em todos os materiais do encéfalo; "sem corte" é o plano afastado. Evita recompilar shaders.
- Fantasma (raio X): material de contorno (Fresnel), sem escrita de profundidade.
- Cores por ficha: cada material pertence a uma ficha. O modo de cor (natural, lobos, áreas, origem) decide a que ficha cada peça responde, então também decide o que abre no clique.
- Rótulos: um quadro de identificação (cada ficha em uma cor) é desenhado fora da tela a partir da câmera padrão da subvista; o rótulo de cada ficha vai para o centro da área que ela ocupa. Vale também para as faces de corte.
- Regiões dentro de uma peça (verme no cerebelo, faixa da área 6 nos giros frontais) são faixas de triângulos separadas no pacote.

## Estado

Ver o histórico de commits do ramo `encefalo-3d`.
