// Idioma da página, igual em todos os itens e no hub.
// Ordem de escolha: ?lang= no endereço, depois a última escolha guardada no navegador,
// depois o idioma do navegador (português, se estiver na lista dele; senão, inglês).
const KEY = 'neurohub.lang', LANGS = ['pt', 'en'];
const stored = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const store = (l) => { try { localStorage.setItem(KEY, l); } catch { /* sem armazenamento: o ?lang= do endereço resolve */ } };

function pick() {
  let q = null;
  try { q = new URLSearchParams(location.search).get('lang'); } catch { /* endereço sem busca */ }
  if (LANGS.includes(q)) { store(q); return q; }
  const s = stored();
  if (LANGS.includes(s)) return s;
  const nav = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'pt']).map((l) => String(l).toLowerCase());
  return nav.some((l) => l.startsWith('pt')) ? 'pt' : 'en';
}

export const LANG = pick();
export const EN = LANG === 'en';

/** Os dois idiomas lado a lado no código: tr('Abrir', 'Open'). Sem inglês, fica o português. */
export const tr = (pt, en) => (EN && en != null ? en : pt);

/** Troca o idioma: guarda a escolha e recarrega a página com ?lang= no endereço. */
export function setLang(l) {
  if (!LANGS.includes(l) || l === LANG) return;
  store(l);
  const u = new URL(location.href); u.searchParams.set('lang', l);
  location.replace(u.href);
}

/**
 * Aplica o inglês ao que já está escrito no HTML. O português é o texto do próprio HTML; o inglês vem de
 * atributos: data-en (texto do elemento), data-en-placeholder, data-en-aria-label e data-en-title.
 * Também liga a chave PT/EN (um grupo com botões data-lang) e leva o idioma nos links de volta ao hub.
 */
export function applyLang(root = document) {
  document.documentElement.lang = EN ? 'en' : 'pt-BR';
  if (EN) {
    const t = document.documentElement.dataset.titleEn; if (t) document.title = t;
    for (const el of root.querySelectorAll('[data-en]')) el.textContent = el.dataset.en;
    for (const [attr, key] of [['placeholder', 'enPlaceholder'], ['aria-label', 'enAriaLabel'], ['title', 'enTitle']])
      for (const el of root.querySelectorAll(`[data-en-${attr}]`)) el.setAttribute(attr, el.dataset[key]);
  }
  for (const b of root.querySelectorAll('[data-lang]')) {
    b.setAttribute('aria-pressed', String(b.dataset.lang === LANG));
    b.addEventListener('click', () => setLang(b.dataset.lang));
  }
  for (const a of root.querySelectorAll('a[data-hub]')) {
    try { const u = new URL(a.getAttribute('href'), location.href); u.searchParams.set('lang', LANG); a.href = u.href; } catch { /* link relativo fica como está */ }
  }
}
