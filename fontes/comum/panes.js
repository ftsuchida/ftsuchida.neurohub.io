// Painéis laterais recolhíveis: a lista (esquerda) e a ficha (direita). Os botões ficam na barra de vistas
// (#tgL e #tgR) e só aparecem no layout com painéis laterais; em tela estreita, lista e ficha já são a folha de baixo.
// A escolha fica guardada no navegador e vale para todos os itens do hub.
const KEY = 'neurohub.panes', SIDES = ['left', 'right'];

export function initPanes(app, onChange) {
  let st = { left: true, right: true };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) st = { left: s.left !== false, right: s.right !== false }; } catch { /* sem armazenamento: começa com os dois abertos */ }
  const btn = { left: document.getElementById('tgL'), right: document.getElementById('tgR') };
  const paint = () => { for (const k of SIDES) { app.dataset[k] = st[k] ? 'on' : 'off'; if (btn[k]) btn[k].setAttribute('aria-pressed', String(st[k])); } };
  const set = (k, on) => {
    if (st[k] === on) return;
    st[k] = on;
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* a escolha vale só para esta visita */ }
    paint();
    if (onChange) onChange();
  };
  for (const k of SIDES) if (btn[k]) btn[k].addEventListener('click', () => set(k, !st[k]));
  paint();
  return { set, get: (k) => st[k] };
}
