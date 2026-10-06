// provisório: palco vazio, até o palco de verdade ser escrito
import { Stage, V } from './palco.js';
export function emptyStage(name) {
  const st = new Stage(name, { box: { c: V(0, 0, 0), hw: 5, hh: 5 }, dir: V(0.3, 0.2, 1), dist: [2, 80] });
  const view = { box: st.box, dir: st.dir };
  st.subs = { x: { states: () => 'solid', view } }; st.fallback = 'x';
  st.enter = (id, o) => { st.opts = o; return view; };
  return st;
}
