// Junta os palcos do item e responde ao que a interface (main.js) pede: qual palco serve a cada subvista, o que
// aparece nela, onde vão os rótulos, onde mora cada ficha e o que acende junto.
//   enc      o encéfalo em malha anatômica: Atlas, Cortes, Em volta (menos "Camadas"), Vias e Teste
//   camadas  o bloco ampliado das meninges
//   origem   o desenvolvimento, do tubo ao encéfalo
//   coluna   a medula dentro da coluna vertebral
//   seg      um segmento da medula e o mapa dos tractos
// Só o encéfalo é montado na abertura; os outros palcos e os acréscimos do encéfalo são montados quando pedidos.
import { BY_ID, SUB, STEPS } from './data.js';
import { buildBrain, REVEAL } from './encefalo.js';
import { CHILDREN } from './partes.js';
import { addSections } from './cortes.js';
import { addAround } from './volta.js';
import { addPathways } from './vias.js';
import { buildLayers } from './camadas.js';
import { buildOrigin } from './origem.js';
import { buildSpine, buildSegment } from './medula.js';

const STAGE_OF = { camadas: 'camadas', origem: 'origem', coluna: 'coluna', segmento: 'seg', tractos: 'seg' };
const BUILD = { camadas: buildLayers, origem: buildOrigin, coluna: buildSpine, seg: buildSegment };
// acréscimos do palco do encéfalo, por módulo: entram na primeira vez que o módulo abre
const ADDON = { cortes: addSections, volta: addAround, vias: addPathways };

export function buildScene() {
  const stages = { enc: buildBrain() };
  const added = new Set();
  let theme = null;
  const stageOf = (sub) => STAGE_OF[sub] || 'enc';
  const addonOf = (sub) => { const m = SUB[sub] && SUB[sub].mod; return ADDON[m] ? m : null; };
  /** Monta um palco ('camadas') ou um acréscimo do encéfalo ('+volta'), se ainda não existe. */
  function ensure(name) {
    if (name[0] === '+') { const k = name.slice(1); if (!added.has(k)) { added.add(k); ADDON[k](stages.enc); } return; }
    if (!stages[name]) { stages[name] = BUILD[name](); if (theme) stages[name].setTheme(theme); }
  }
  const pending = () => [...Object.keys(ADDON).filter((k) => !added.has(k)).map((k) => '+' + k), ...Object.keys(BUILD).filter((k) => !stages[k])];
  const subOf = (st, sub) => (st.subs && (st.subs[sub] || st.subs[st.fallback])) || null;

  /** Aplica uma subvista e devolve o enquadramento dela. */
  function enter(sub, o = {}) {
    const a = addonOf(sub); if (a) ensure('+' + a);
    ensure(stageOf(sub));
    return stages[stageOf(sub)].enter(sub, o);
  }

  /** Rótulos da subvista, vistos pela câmera cam (já na pose final e cobrindo só a área livre da tela). */
  function labels(renderer, scene, sub, cam) {
    const st = stages[stageOf(sub)], s = st && subOf(st, sub);
    if (!s) return [];
    const o = st.opts || {}, out = [];
    const only = typeof s.only === 'function' ? s.only(o) : s.only, boost = (typeof s.boost === 'function' ? s.boost(o) : s.boost) || {};
    const toCam = (p) => cam.position.clone().sub(p).normalize();
    if (s.auto !== false) {
      for (const l of st.scan(renderer, scene, cam, s.skip)) {
        if (only && !only.has(l.id)) continue;
        if (s.capOnly && !l.cap) continue;
        out.push({ id: l.id, pos: l.pos, n: toCam(l.pos), rank: Math.min(30, l.area / 60) + (l.cap ? 40 : 0) + (boost[l.id] || 0) });
      }
    }
    for (const m of st.marks || []) if (!m.twin && m.subs.includes(sub)) out.push({ id: m.id, pos: m.pos, n: m.n, rank: 18 });
    if (s.extra) out.push(...s.extra(o, cam));
    return out;
  }

  /* ---------- quem acende junto ---------- */
  const memo = new Map();
  function expand(id) {
    if (memo.has(id)) return memo.get(id);
    const out = new Set(), walk = (x) => { if (out.has(x)) return; out.add(x); for (const c of CHILDREN[x] || []) walk(c); };
    walk(id);
    const it = BY_ID[id]; if (it && it.ex) walk(it.ex); // ficha de vocabulário: acende o exemplo
    const list = [...out]; memo.set(id, list);
    return list;
  }

  /** Onde a ficha mora: subvista e, se preciso, modo de cor, camada do corte e peças que viram contorno. */
  function home(id) {
    const it = BY_ID[id], h = { sub: (it && it.sub) || 'lateral' };
    if (REVEAL[id]) h.reveal = REVEAL[id];
    const st = stages[stageOf(h.sub)];
    if (st && st.homeOf) Object.assign(h, st.homeOf(id, h.sub, expand(id)) || {});
    return h;
  }
  function frame(id, sub) {
    const st = stages[stageOf(sub)]; if (!st) return null;
    const ids = expand(id);
    return (st.frameOf && st.frameOf(ids, sub)) || st.frame(ids);
  }
  function stepView(stepId) {
    const s = STEPS.find((x) => x.id === stepId); if (!s) return null;
    const st = stages[stageOf(s.at || s.seq)];
    return (st && st.stepViews && st.stepViews[stepId]) || null;
  }
  function animate(sub, stepId, p, clock, sel) {
    const st = stages[stageOf(sub)]; if (!st) return [];
    st.hidePulses();
    for (const m of st.marks || []) m.mesh.visible = sel.includes(m.id) && (m.twin || true);
    const s = subOf(st, sub);
    const flash = s && s.animate ? s.animate(stepId, p, clock, sel) : null;
    if (flash) return flash;
    const step = stepId && STEPS.find((x) => x.id === stepId);
    return step ? step.ids : [];
  }
  const live = (sub) => { const st = stages[stageOf(sub)], s = st && subOf(st, sub); return !!(s && s.live); };
  function cut(sub, o) { const st = stages[stageOf(sub)], s = st && subOf(st, sub); if (s && s.cut) s.cut(o); }
  function setTheme(t) { theme = t; for (const s of Object.values(stages)) s.setTheme(t); }

  return { stages, ensure, pending, stageOf, enter, labels, expand, home, frame, stepView, animate, live, cut, setTheme };
}
