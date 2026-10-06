// Escolhe o idioma dos textos. O português (data.pt.js) é a fonte: tem os textos e tudo o que não é texto
// (ids, cores, relações, duração dos passos). O inglês (data.en.js) só traz os textos, por id, e entra por cima.
import * as PT from './data.pt.js';
import { T } from './data.en.js';
import { EN } from '../../comum/lang.js';

const over = (o, t) => (EN && t ? { ...o, ...t } : o);
export const GROUPS = PT.GROUPS.map((g) => over(g, T.groups[g.id] && { name: T.groups[g.id] }));
export const ITEMS = PT.ITEMS.map((i) => over(i, T.items[i.id]));
export const BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const VIEWS = PT.VIEWS.map((v) => over(v, T.views[v.id] && { name: T.views[v.id] }));
export const STEPS = PT.STEPS.map((s) => over(s, T.steps[s.id]));
