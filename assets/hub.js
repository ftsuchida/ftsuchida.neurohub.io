// Monta o índice a partir de window.CATALOGO (catalogo.js). Sem dependências.
(function () {
  const C = window.CATALOGO || { itens: [], tipos: {} };
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // busca sem diferenciar acento nem maiúscula: "neuronio" acha "Neurônio"
  const plain = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const tipoNome = (t) => (C.tipos && C.tipos[t]) || t || '';

  if (C.titulo) { $('titulo').textContent = C.titulo; document.title = C.titulo; }
  if (C.autor) { $('autor').textContent = C.autor; $('autor').hidden = false; }
  if (C.repo) { $('repo').href = C.repo; $('repo').hidden = false; }

  // mais recentes primeiro; no empate, ordem alfabética
  const itens = (C.itens || []).slice().sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')) || String(a.titulo).localeCompare(String(b.titulo), 'pt-BR'));
  itens.forEach((i) => { i._busca = plain([i.titulo, i.resumo, i.assunto, i.base, tipoNome(i.tipo)].join(' ')); });

  const state = { tipo: '', q: '' };
  // na ordem em que aparecem em CATALOGO.tipos; um tipo não declarado ali vai para o fim
  const usados = [...new Set(itens.map((i) => i.tipo).filter(Boolean))];
  const tipos = [...Object.keys(C.tipos || {}).filter((t) => usados.includes(t)), ...usados.filter((t) => !(C.tipos && t in C.tipos))];

  // Filtros só aparecem quando ajudam: tipos, com mais de um; busca, a partir de 7 itens.
  const comTipos = tipos.length > 1, comBusca = itens.length > 6;
  if (comTipos) {
    const chip = (id, nome, n) => `<button type="button" class="chip" data-tipo="${esc(id)}" aria-pressed="${state.tipo === id}">${esc(nome)}<span class="n">${n}</span></button>`;
    $('chips').innerHTML = chip('', 'Tudo', itens.length) + tipos.map((t) => chip(t, tipoNome(t), itens.filter((i) => i.tipo === t).length)).join('');
    $('chips').hidden = false;
    $('chips').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-tipo]'); if (!b) return;
      state.tipo = b.dataset.tipo;
      $('chips').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      render();
    });
  }
  if (comBusca) {
    $('busca').hidden = false;
    $('q').addEventListener('input', (e) => { state.q = plain(e.target.value.trim()); render(); });
  }
  $('bar').hidden = !(comTipos || comBusca);

  const CHEV = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3.5 4.5 4.5L6 12.5"/></svg>';
  function card(i) {
    const capa = i.capa
      ? `<picture class="cover">${i.capaEscura ? `<source srcset="${esc(i.capaEscura)}" media="(prefers-color-scheme: dark)">` : ''}<img src="${esc(i.capa)}" alt="" loading="lazy" decoding="async" width="1280" height="800"></picture>`
      : `<span class="cover none" aria-hidden="true">${esc(String(i.titulo || '?').charAt(0))}</span>`;
    const kind = `<span>${esc(tipoNome(i.tipo))}</span>${i.assunto ? `<span class="dot">·</span><span class="sub">${esc(i.assunto)}</span>` : ''}`;
    return `<a class="card" href="${esc(i.url)}">${capa}<div class="body">
      <div class="kind">${kind}</div>
      <h2>${esc(i.titulo)}</h2>
      ${i.resumo ? `<p>${esc(i.resumo)}</p>` : ''}
      <div class="meta"><span>${i.base ? 'Base: ' + esc(i.base) : ''}</span><span class="open">Abrir${CHEV}</span></div>
    </div></a>`;
  }

  function render() {
    const termos = state.q.split(/\s+/).filter(Boolean);
    const list = itens.filter((i) => (!state.tipo || i.tipo === state.tipo) && termos.every((t) => i._busca.includes(t)));
    $('grade').innerHTML = list.map(card).join('');
    $('vazio').hidden = list.length > 0;
    const total = itens.length, filtrado = list.length !== total;
    $('conta').textContent = filtrado ? `${list.length} de ${total} ${total === 1 ? 'item' : 'itens'}` : `${total} ${total === 1 ? 'item' : 'itens'}`;
  }
  render();
})();
