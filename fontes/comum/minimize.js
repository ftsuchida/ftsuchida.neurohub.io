// Botão de minimizar os cartões que ficam por cima da cena (gráfico, passo a passo), para ver a animação acontecendo.
// Minimizado, o cartão ganha a classe .min; cada item diz no próprio CSS o que some. Os controles continuam à mão.
import { tr } from './lang.js';

const chev = (d) => `<svg class="ic" viewBox="0 0 16 16"><path d="${d}"/></svg>`;
const DOWN = chev('M3.5 6 8 10.5 12.5 6'), UP = chev('M3.5 10 8 5.5l4.5 4.5');

/**
 * Põe o botão em host (antes de before, se vier). down = o cartão fica embaixo e encolhe para baixo;
 * senão, fica em cima e encolhe para cima. onChange roda depois de cada troca (para reenquadrar a cena).
 */
export function initMinimize(card, { host = card, before = null, down = true, onChange } = {}) {
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'close min-tg';
  const show = () => {
    const min = card.classList.contains('min');
    btn.innerHTML = min === down ? UP : DOWN;
    btn.setAttribute('aria-expanded', String(!min));
    btn.title = min ? tr('Expandir', 'Expand') : tr('Minimizar para ver a cena', 'Minimize to see the scene');
    btn.setAttribute('aria-label', btn.title);
  };
  btn.addEventListener('click', () => { card.classList.toggle('min'); show(); if (onChange) onChange(); });
  show();
  host.insertBefore(btn, before);
  return btn;
}
