// Monta o índice a partir de window.CATALOGO (catalogo.js). Sem dependências.
(function () {
  const C = window.CATALOGO || { itens: [], tipos: {} };
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // busca sem diferenciar acento nem maiúscula: "neuronio" acha "Neurônio"
  const plain = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  /* ---------- idioma ----------
     Mesma regra dos itens (fontes/comum/lang.js): ?lang= no endereço, depois a última escolha guardada,
     depois o idioma do navegador (português, se estiver na lista dele; senão, inglês). */
  const KEY = 'neurohub.lang', LANGS = ['pt', 'en'];
  const store = (l) => { try { localStorage.setItem(KEY, l); } catch (e) { /* sem armazenamento: o ?lang= resolve */ } };
  let lang = (function () {
    let q = null, s = null;
    try { q = new URLSearchParams(location.search).get('lang'); } catch (e) { /* endereço sem busca */ }
    if (LANGS.includes(q)) { store(q); return q; }
    try { s = localStorage.getItem(KEY); } catch (e) { /* sem armazenamento */ }
    if (LANGS.includes(s)) return s;
    const nav = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'pt']).map((l) => String(l).toLowerCase());
    return nav.some((l) => l.startsWith('pt')) ? 'pt' : 'en';
  })();

  // textos da própria página; os dos itens vêm do catálogo
  const UI = {
    repo: { pt: 'Código no GitHub', en: 'Code on GitHub' },
    filtro: { pt: 'Filtrar por tipo', en: 'Filter by type' },
    buscar: { pt: 'Buscar', en: 'Search' },
    buscarHub: { pt: 'Buscar no hub', en: 'Search the hub' },
    itens: { pt: 'Itens', en: 'Items' },
    vazio: { pt: 'Nenhum item corresponde ao filtro.', en: 'No item matches the filter.' },
    rodape: { pt: 'Código aberto sob licença MIT. Cada item é uma página independente e funciona sem internet depois de carregada.', en: 'Open source under the MIT license. Each item is a standalone page and works offline once it has loaded.' },
    descricao: { pt: 'Modelos 3D, mapas mentais e outros materiais interativos para estudar neurociência.', en: '3D models, mind maps and other interactive materials for studying neuroscience.' },
    idioma: { pt: 'Idioma', en: 'Language' },
    tudo: { pt: 'Tudo', en: 'All' },
    abrir: { pt: 'Abrir', en: 'Open' },
  };
  // um texto do catálogo é uma string (igual nos dois idiomas) ou { pt, en }
  const tx = (v, l) => (v && typeof v === 'object' ? (v[l || lang] != null ? v[l || lang] : v.pt) : v) || '';
  const ui = (k) => tx(UI[k]);
  const tipoNome = (t) => tx(C.tipos && C.tipos[t]) || t || '';
  const conta = (n, total) => {
    const nome = lang === 'en' ? (total === 1 ? 'item' : 'items') : (total === 1 ? 'item' : 'itens');
    return n === total ? `${total} ${nome}` : `${n} ${lang === 'en' ? 'of' : 'de'} ${total} ${nome}`;
  };

  // a busca olha os dois idiomas: "neuron" acha o item mesmo com a página em português
  const all = (v) => (v && typeof v === 'object' ? Object.values(v).join(' ') : v || '');
  const itens = (C.itens || []).slice();
  itens.forEach((i) => { i._busca = plain([all(i.titulo), all(i.resumo), all(i.assunto), all(i.base), all(C.tipos && C.tipos[i.tipo])].join(' ')); });
  // itens com destaque primeiro; depois os mais recentes; no empate, ordem alfabética no idioma da página
  const ordenar = () => itens.sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0) || String(b.data || '').localeCompare(String(a.data || '')) || tx(a.titulo).localeCompare(tx(b.titulo), lang === 'en' ? 'en' : 'pt-BR'));

  const state = { tipo: '', q: '' };
  // na ordem em que aparecem em CATALOGO.tipos; um tipo não declarado ali vai para o fim
  const usados = [...new Set(itens.map((i) => i.tipo).filter(Boolean))];
  const tipos = [...Object.keys(C.tipos || {}).filter((t) => usados.includes(t)), ...usados.filter((t) => !(C.tipos && t in C.tipos))];
  // Filtros só aparecem quando ajudam: tipos, com mais de um; busca, a partir de 7 itens.
  const comTipos = tipos.length > 1, comBusca = itens.length > 6;

  // Cada parte do cabeçalho é opcional: se o index.html em cache for de outra versão e não tiver
  // o elemento, o resto da página continua sendo montado.
  const show = (id, fn) => { const el = $(id); if (el) { fn(el); el.hidden = false; } };
  const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };

  function chips() {
    const chip = (id, nome, n) => `<button type="button" class="chip" data-tipo="${esc(id)}" aria-pressed="${state.tipo === id}">${esc(nome)}<span class="n">${n}</span></button>`;
    show('chips', (el) => { el.innerHTML = chip('', ui('tudo'), itens.length) + tipos.map((t) => chip(t, tipoNome(t), itens.filter((i) => i.tipo === t).length)).join(''); });
  }
  on('chips', 'click', (e) => {
    const b = e.target.closest('button[data-tipo]'); if (!b) return;
    state.tipo = b.dataset.tipo; chips(); render();
  });
  on('q', 'input', (e) => { state.q = plain(e.target.value.trim()); render(); });
  on('lang', 'click', (e) => {
    const b = e.target.closest('button[data-lang]'); if (!b || b.dataset.lang === lang) return;
    lang = b.dataset.lang; store(lang);
    try { const u = new URL(location.href); u.searchParams.set('lang', lang); history.replaceState(null, '', u.href); } catch (err) { /* aberto como arquivo em navegador que não deixa trocar o endereço */ }
    paint();
  });

  const CHEV = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3.5 4.5 4.5L6 12.5"/></svg>';
  function card(i) {
    const titulo = tx(i.titulo), resumo = tx(i.resumo), assunto = tx(i.assunto);
    const capa = i.capa
      ? `<picture class="cover">${i.capaEscura ? `<source srcset="${esc(i.capaEscura)}" media="(prefers-color-scheme: dark)">` : ''}<img src="${esc(i.capa)}" alt="" loading="lazy" decoding="async" width="1280" height="800"></picture>`
      : `<span class="cover none" aria-hidden="true">${esc(String(titulo || '?').charAt(0))}</span>`;
    const kind = `<span>${esc(tipoNome(i.tipo))}</span>${assunto ? `<span class="dot">·</span><span class="sub">${esc(assunto)}</span>` : ''}`;
    // aberto como arquivo (sem servidor), o navegador não procura o index.html da pasta sozinho;
    // o idioma vai no endereço para o item abrir no mesmo idioma do hub
    let href = location.protocol === 'file:' && /\/$/.test(i.url) ? i.url + 'index.html' : i.url;
    if (!/^[a-z]+:\/\//i.test(href)) href += (href.includes('?') ? '&' : '?') + 'lang=' + lang;
    return `<a class="card" href="${esc(href)}">${capa}<div class="body">
      <div class="kind">${kind}</div>
      <h2>${esc(titulo)}</h2>
      ${resumo ? `<p>${esc(resumo)}</p>` : ''}
      <div class="meta"><span class="open">${esc(ui('abrir'))}${CHEV}</span></div>
    </div></a>`;
  }

  function render() {
    const termos = state.q.split(/\s+/).filter(Boolean);
    const list = itens.filter((i) => (!state.tipo || i.tipo === state.tipo) && termos.every((t) => i._busca.includes(t)));
    show('grade', (el) => { el.innerHTML = list.map(card).join(''); });
    const vazio = $('vazio'); if (vazio) vazio.hidden = list.length > 0;
    const c = $('conta'); if (c) c.textContent = conta(list.length, itens.length);
  }

  /** Escreve a página inteira no idioma atual. Chamada no começo e a cada troca da chave PT/EN. */
  function paint() {
    document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
    const titulo = tx(C.titulo);
    if (titulo) { show('titulo', (el) => { el.textContent = titulo; }); document.title = titulo; }
    if (C.autor) show('autor', (el) => { el.textContent = tx(C.autor); });
    if (C.repo) show('repo', (el) => { el.href = C.repo; });
    const meta = document.querySelector('meta[name="description"]'); if (meta) meta.content = ui('descricao');
    // textos fixos do HTML: data-t (texto), data-t-placeholder, data-t-aria-label
    document.querySelectorAll('[data-t]').forEach((el) => { if (UI[el.dataset.t]) el.textContent = ui(el.dataset.t); });
    document.querySelectorAll('[data-t-placeholder]').forEach((el) => { if (UI[el.dataset.tPlaceholder]) el.placeholder = ui(el.dataset.tPlaceholder); });
    document.querySelectorAll('[data-t-aria-label]').forEach((el) => { if (UI[el.dataset.tAriaLabel]) el.setAttribute('aria-label', ui(el.dataset.tAriaLabel)); });
    show('lang', (el) => { el.setAttribute('aria-label', ui('idioma')); el.querySelectorAll('button[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang))); });
    ordenar();
    if (comTipos) chips();
    if (comBusca) show('busca', () => {});
    const bar = $('bar'); if (bar) bar.hidden = !(comTipos || comBusca);
    render();
  }
  paint();

  /* ---------- contagem de visitas ----------
     GoatCounter, com o endereço do campo "contador" do catálogo. Mesma regra dos itens (scripts/build.mjs):
     só no site publicado (https), então abrir com dois cliques ou no npm run serve não conta. A página vai
     sem o ?lang=, para a mesma página não virar duas linhas no painel. Sem internet, o script não carrega e
     nada muda. */
  if (C.contador && location.protocol === 'https:') {
    window.goatcounter = { path: () => location.pathname };
    const s = document.createElement('script');
    s.async = true; s.src = 'https://gc.zgo.at/count.js'; s.dataset.goatcounter = C.contador;
    document.head.appendChild(s);
  }
})();
