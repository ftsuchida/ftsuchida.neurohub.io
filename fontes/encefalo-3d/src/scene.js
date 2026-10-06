// Junta os palcos do item e responde ao que a interface (main.js) pede: qual palco serve a cada subvista, o que
// aparece nela, onde vão os rótulos, onde mora cada ficha e o que acende junto.
//   enc      o encéfalo em malha anatômica: Atlas, Cortes, Em volta (menos "Camadas"), Vias e Teste
//   camadas  o bloco ampliado das meninges
//   origem   o desenvolvimento, do tubo ao encéfalo
//   coluna   a medula dentro da coluna vertebral
//   seg      um segmento da medula e o mapa dos tractos
// Só o encéfalo é montado na abertura; os outros palcos e os acréscimos do encéfalo são montados quando pedidos.
import { BY_ID, SUB, STEPS } from './data.js';
import { tr } from '../../comum/lang.js';
import { buildBrain, REVEAL } from './encefalo.js';
import { CHILDREN } from './partes.js';
import { addSections } from './cortes.js';
import { addAround } from './volta.js';
import { addPathways } from './vias.js';
import { ensureNerves } from './nervos.js';
import { buildLayers } from './camadas.js';
import { buildOrigin } from './origem.js';
import { buildSpine, buildSegment } from './medula.js';

/* Nome no rótulo quando difere do nome da ficha (que, nos nervos cranianos, começa pelo número). */
const LABEL = { 'nervo-optico': tr('Nervo óptico', 'Optic nerve') };
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
    if (name[0] === '+') { const k = name.slice(1); if (!added.has(k)) { added.add(k); ADDON[k](stages.enc); stages.enc.refresh(); } return; }
    if (!stages[name]) { stages[name] = BUILD[name](); if (theme) stages[name].setTheme(theme); }
  }
  const pending = () => [...Object.keys(ADDON).filter((k) => !added.has(k)).map((k) => '+' + k), ...Object.keys(BUILD).filter((k) => !stages[k])];
  const subOf = (st, sub) => (st.subs && (st.subs[sub] || st.subs[st.fallback])) || null;

  /** Aplica uma subvista e devolve o enquadramento dela. */
  function enter(sub, o = {}) {
    const a = addonOf(sub); if (a) ensure('+' + a);
    if (sub === 'ventral') ensureNerves(stages.enc); // a vista ventral do Atlas mostra os nervos cranianos
    ensure(stageOf(sub));
    return stages[stageOf(sub)].enter(sub, o);
  }

  /** Rótulos da subvista, vistos pela câmera cam (já na pose final e cobrindo só a área livre da tela). */
  function labels(renderer, scene, sub, cam) {
    const st = stages[stageOf(sub)], s = st && subOf(st, sub);
    if (!s) return [];
    const o = st.opts || {}, out = [];
    const only = typeof s.only === 'function' ? s.only(o) : s.only, boost = (typeof s.boost === 'function' ? s.boost(o) : s.boost) || {};
    const toCam = (p) => cam.position.clone().sub(p).normalize(), alias = typeof s.alias === 'function' ? s.alias(o) : s.alias;
    if (s.auto !== false) {
      for (const l of st.scan(renderer, scene, cam, s.skip, s.minArea)) {
        if (s.capOnly && !l.cap) continue;
        const id = (alias && alias[l.id]) || l.id; // a vista pode rotular a peça pelo nome do conjunto (ponte → tronco encefálico)
        if (only && !only.has(id)) continue;
        const text = (s.names && s.names[id]) || l.name || LABEL[id] || undefined, rank = Math.min(30, l.area / 60) + (l.cap ? 40 : 0) + (boost[id] || 0);
        const same = out.find((x) => x.id === id && x.text === text);
        if (same) { if (rank > same.rank) Object.assign(same, { pos: l.pos, pair: l.pair, n: toCam(l.pos), rank }); continue; }
        out.push({ id, text, pos: l.pos, pair: l.pair, n: toCam(l.pos), rank });
      }
    }
    for (const m of st.marks || []) if (!m.twin && m.subs.includes(sub)) out.push({ id: m.id, pos: m.pos, n: m.n, rank: 18 });
    if (s.extra) out.push(...s.extra(o, cam));
    if (s.max && out.length > s.max) { out.sort((a, b) => b.rank - a.rank); out.length = s.max; }
    if (s.margin) out.margin = true; // rótulos em colunas, fora do desenho
    if (typeof s.margin === 'number') { // secções: reparte entre os dois lados, aproveitando que as peças são pares
      const h = (l) => l.pos.clone().project(cam).y, n = [0, 0];
      out.sort((a, b) => h(b) - h(a));
      for (const l of out) {
        const side = n[0] === n[1] ? (l.pos.x >= 0 ? 1 : 0) : n[0] < n[1] ? 0 : 1; // 0 = x negativo, 1 = x positivo
        if (l.pair && (l.pos.x >= 0 ? 1 : 0) !== side) l.pos.x = -l.pos.x; // peça par: o ponto espelhado cai na gêmea
        l.col = (l.pair ? side : l.pos.x >= 0 ? 1 : 0) ? s.margin : -s.margin;
        n[l.col * s.margin > 0 ? 1 : 0]++;
      }
    }
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
  function home(id, mode) {
    const it = BY_ID[id], h = { sub: (it && it.sub) || 'lateral' };
    if (REVEAL[id]) h.reveal = REVEAL[id];
    const st = stages[stageOf(h.sub)];
    if (st && st.homeOf) Object.assign(h, st.homeOf(id, h.sub, expand(id), mode) || {});
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
  const axesOf = (sub) => { const st = stages[stageOf(sub)], s = st && subOf(st, sub); return (s && s.axes) || (st && st.axes) || null; };
  const live = (sub) => { const st = stages[stageOf(sub)], s = st && subOf(st, sub); return !!(s && s.live); };
  function cut(sub, o) { const st = stages[stageOf(sub)], s = st && subOf(st, sub); if (s && s.cut) s.cut(o); }
  function setTheme(t) { theme = t; for (const s of Object.values(stages)) s.setTheme(t); }

  return { stages, ensure, pending, stageOf, enter, labels, expand, home, frame, stepView, animate, live, cut, setTheme, axesOf };
}
