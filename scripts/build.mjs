// Monta cada item de fontes/<id>/ em um único arquivo: itens/<id>/index.html.
// Uso: npm run build            (todos os itens)
//      npm run build -- <id>    (só um)
//      npm run build -- --dev   (sem minificar)
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dev = args.includes('--dev'), only = args.filter((a) => !a.startsWith('--'));

// o título de cada página vem do catálogo, para existir em um lugar só
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'catalogo.js'), 'utf8'), ctx);
const titles = Object.fromEntries(ctx.window.CATALOGO.itens.map((i) => [i.id, i.titulo]));

// mesmo ícone do hub, embutido para a página não depender de mais nenhum arquivo
const ICON = `<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23007AFF'/%3E%3Cg fill='%23fff'%3E%3Crect x='7' y='7' width='8' height='8' rx='2'/%3E%3Crect x='17' y='7' width='8' height='8' rx='2' opacity='.6'/%3E%3Crect x='7' y='17' width='8' height='8' rx='2' opacity='.6'/%3E%3Crect x='17' y='17' width='8' height='8' rx='2' opacity='.35'/%3E%3C/g%3E%3C/svg%3E">`;

const ids = fs.readdirSync(path.join(root, 'fontes')).filter((id) => fs.existsSync(path.join(root, 'fontes', id, 'src', 'main.js')));
for (const id of ids) {
  if (only.length && !only.includes(id)) continue;
  const src = path.join(root, 'fontes', id, 'src');
  const r = await build({ entryPoints: [path.join(src, 'main.js')], bundle: true, minify: !dev, format: 'iife', target: 'es2020', write: false, legalComments: 'eof', logLevel: 'warning' });
  const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const css = fs.readFileSync(path.join(src, 'style.css'), 'utf8');
  const body = fs.readFileSync(path.join(src, 'body.html'), 'utf8');
  const title = titles[id] || id;
  const out = path.join(root, 'itens', id, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="color-scheme" content="light dark">\n<title>${title}</title>\n${ICON}\n<style>\n${css}</style>\n</head>\n<body>\n${body}\n<script>\n${js}</script>\n</body>\n</html>\n`);
  console.log(path.relative(root, out), (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
}
