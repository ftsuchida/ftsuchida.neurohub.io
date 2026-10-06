// Multiplicador de velocidade das animações, igual em todos os itens: de 0,1× a 2×, para desacelerar na aula.
// Só o tempo da animação é multiplicado; a câmera e a interface seguem em tempo real. A escolha fica guardada no navegador.
import { tr } from './lang.js';

const KEY = 'neurohub.speed', STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2]; // posições da barra
const read = () => { try { const v = +localStorage.getItem(KEY); return STEPS.includes(v) ? v : 1; } catch { return 1; } };
const label = (v) => String(v).replace('.', tr(',', '.')) + '×';

/** Cria o seletor dentro de host (antes de before, se vier). Use speed.value para multiplicar o dt da animação. */
export function initSpeed(host, before = null) {
  const speed = { value: read() };
  const el = document.createElement('label');
  el.className = 'spd';
  el.title = tr('Velocidade da animação', 'Animation speed');
  el.innerHTML = `<span>${tr('Velocidade', 'Speed')}</span><input type="range" min="0" max="${STEPS.length - 1}" step="1" value="${STEPS.indexOf(speed.value)}" aria-label="${tr('Velocidade da animação', 'Animation speed')}"><output></output>`;
  const bar = el.querySelector('input'), out = el.querySelector('output');
  const show = () => { out.textContent = label(speed.value); bar.setAttribute('aria-valuetext', out.textContent); };
  bar.addEventListener('input', () => {
    speed.value = STEPS[+bar.value];
    show();
    try { localStorage.setItem(KEY, String(speed.value)); } catch { /* sem armazenamento: vale só nesta visita */ }
  });
  show();
  host.insertBefore(el, before);
  return speed;
}
