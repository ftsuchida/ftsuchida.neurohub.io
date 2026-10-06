// Confere se o inglês (data.en.js) cobre tudo o que o português (data.pt.js) tem, item por item.
// Uso: npm run check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEXT = ['name', 'aka', 'size', 'rows', 'morf', 'func', 'clueTitle', 'clue', 'more', 'where'];
const OPTIONAL = ['size']; // medidas que são iguais nos dois idiomas podem ficar só no português
const PTISH = /[ãõçáàâéêíóôú]/i;
let errors = 0, warns = 0;
const err = (m) => { errors++; console.log('  ERRO   ' + m); };
const warn = (m) => { warns++; console.log('  aviso  ' + m); };
const isText = (s) => typeof s === 'string' && s.trim().length > 0;

for (const id of fs.readdirSync(path.join(root, 'fontes'))) {
  const src = path.join(root, 'fontes', id, 'src'), pt = path.join(src, 'data.pt.js'), en = path.join(src, 'data.en.js');
  if (!fs.existsSync(pt) || !fs.existsSync(en)) continue;
  console.log(id);
  const PT = await import(pathToFileURL(pt).href), { T } = await import(pathToFileURL(en).href);
  for (const [key, list] of [['groups', PT.GROUPS], ['views', PT.VIEWS]]) for (const o of list || []) if (!isText(T[key]?.[o.id])) err(`${key}.${o.id}: falta o nome em inglês`);
  for (const [pid] of PT.PATH || []) if (!isText(T.path?.[pid])) err(`path.${pid}: falta o texto em inglês`);
  for (const s of PT.STEPS || []) for (const f of ['title', 'text']) if (!isText(T.steps?.[s.id]?.[f])) err(`steps.${s.id}.${f}: falta em inglês`);
  const ids = new Set(PT.ITEMS.map((i) => i.id));
  for (const k of Object.keys(T.items || {})) if (!ids.has(k)) warn(`items.${k}: existe no inglês, mas não no português`);
  for (const it of PT.ITEMS) {
    const t = T.items?.[it.id];
    if (!t) { err(`items.${it.id}: falta o item inteiro`); continue; }
    for (const k of Object.keys(t)) if (!TEXT.includes(k)) err(`items.${it.id}.${k}: o inglês só pode trazer textos (${TEXT.join(', ')})`);
    for (const f of TEXT) {
      if (!(f in it)) { if (f in t) warn(`items.${it.id}.${f}: existe no inglês, mas não no português`); continue; }
      if (!(f in t)) { if (!OPTIONAL.includes(f)) err(`items.${it.id}.${f}: falta em inglês`); continue; }
      if (f === 'more') {
        if (!Array.isArray(t.more) || t.more.length !== it.more.length) { err(`items.${it.id}.more: ${it.more.length} linhas no português, ${Array.isArray(t.more) ? t.more.length : 0} no inglês`); continue; }
        it.more.forEach((m, k) => { const a = typeof m === 'string' ? 'texto' : 'extra', b = typeof t.more[k] === 'string' ? 'texto' : 'extra'; if (a !== b) err(`items.${it.id}.more[${k}]: é "${a}" no português e "${b}" no inglês`); });
      } else if (f === 'rows') {
        if (!Array.isArray(t.rows) || t.rows.length !== it.rows.length) err(`items.${it.id}.rows: número de linhas diferente`);
      } else if (!isText(t[f])) err(`items.${it.id}.${f}: vazio em inglês`);
    }
    const flat = JSON.stringify(t);
    if (PTISH.test(flat)) warn(`items.${it.id}: o inglês tem letra acentuada (${flat.match(new RegExp('.{0,18}' + PTISH.source + '.{0,18}', 'i'))[0].trim()})`);
  }
}
console.log(errors ? `\n${errors} erro(s), ${warns} aviso(s)` : `\nTudo coberto. ${warns} aviso(s).`);
process.exit(errors ? 1 : 0);
