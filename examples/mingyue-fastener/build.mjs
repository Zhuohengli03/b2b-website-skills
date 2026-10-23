#!/usr/bin/env node
// Mingyue Fastener · 静态站构建（Node ≥ 18，零依赖）
//   node build.mjs          → 生成 dist/ 并校验；校验不过退出码 1
//   node build.mjs --serve  → 构建后在 http://localhost:8080 预览
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

import { page } from './src/templates/layout.mjs';
import { homeBody } from './src/templates/home.mjs';
import { productsBody, categoryBody } from './src/templates/catalog.mjs';
import { modelBody, productLd } from './src/templates/model.mjs';
import { customBody, qualityBody, aboutBody, newsBody, faqBody, faqLd } from './src/templates/content.mjs';
import { contactBody, thankYouBody } from './src/templates/contact.mjs';
import { privacyBody, imprintBody, notFoundBody } from './src/templates/legal.mjs';
import { standaloneDrawing } from './src/svg.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, 'content', p), 'utf8'));

// ---------- 读内容 ----------
const site = readJson('site.json');
const categories = readJson('categories.json');
const models = readJson('models.json');
const countries = readJson('countries.json');
const P = Object.fromEntries(['home', 'products', 'custom', 'quality', 'about', 'news', 'faq', 'contact', 'legal'].map((n) => [n, readJson(`pages/${n}.json`)]));

// meta.csv（title / description / robots / h1，按 url 查）
const parseCsv = (text) => {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
};
const META = Object.fromEntries(parseCsv(readFileSync(join(ROOT, 'content', 'meta.csv'), 'utf8')).map((r) => [r.url, r]));
const meta = (url) => { const m = META[url]; if (!m) throw new Error(`meta.csv 缺少 ${url}`); return m; };

// ---------- 页面表 ----------
const catOf = (slug) => categories.find((c) => c.slug === slug);
const pages = [];
const add = (path, o) => pages.push({ path, ...o });

add('/', { meta: meta('/'), body: homeBody({ site, home: P.home, categories }), jsonld: [{
  '@type': 'Organization', name: site.name, url: site.baseUrl, email: site.email, foundingDate: site.founded,
  address: { '@type': 'PostalAddress', streetAddress: site.address.street, addressLocality: site.address.city, addressRegion: site.address.region, addressCountry: site.address.countryCode },
  contactPoint: { '@type': 'ContactPoint', contactType: 'sales', email: site.email, availableLanguage: ['en'] },
}], ldNotes: 'Organization.logo [待确认：logo 源文件]；Organization.telephone [待确认：固定电话，D17]；sameAs 无社媒（D9）' });

add('/products/', { meta: meta('/products/'), body: productsBody({ site, pg: P.products, models, categories }), crumbs: [{ label: 'Home', href: '/' }, { label: 'Products', href: '/products/' }] });

for (const cat of categories) {
  const { body, ctaHref } = categoryBody({ site, cat, pg: P.products, models, categories });
  add(`/products/${cat.slug}/`, { meta: meta(`/products/${cat.slug}/`), body, ctaHref, crumbs: [{ label: 'Home', href: '/' }, { label: 'Products', href: '/products/' }, { label: cat.crumb, href: `/products/${cat.slug}/` }] });
}

const extraFiles = []; // [path, content]
for (const m of models) {
  const cat = catOf(m.category);
  const svg = standaloneDrawing(m.drawing, m.model_string, m.drawing_alt);
  extraFiles.push([`/products/${m.slug}/drawing.svg`, svg]);
  const drawingSize = `${Math.max(1, Math.round(Buffer.byteLength(svg) / 1024))} KB`;
  const mt = meta(`/products/${m.slug}/`);
  const { body, ctaHref } = modelBody({ site, m, cat, labels: { pdfComing: P.home.quality.pdfComing, placeholderRelated: P.products.table.placeholderRelated }, drawingSize });
  add(`/products/${m.slug}/`, { meta: mt, body, ctaHref, crumbs: [{ label: 'Home', href: '/' }, { label: 'Products', href: '/products/' }, { label: cat.crumb, href: `/products/${cat.slug}/` }, { label: m.model_string, href: `/products/${m.slug}/` }],
    jsonld: [productLd(site, m, cat, mt)], ldNotes: 'Product.offers 不写（B2B 报价制，无公开价）；Product.gtin 无；image 为线稿示意（D12）' });
}

add('/custom-cold-formed-parts/', { meta: meta('/custom-cold-formed-parts/'), body: customBody({ site, pg: P.custom }), ctaHref: '/contact/?topic=custom', crumbs: [{ label: 'Home', href: '/' }, { label: 'Custom Cold-Formed Parts', href: '/custom-cold-formed-parts/' }], jsonld: [faqLd(P.custom.faq.items)] });
add('/quality-downloads/', { meta: meta('/quality-downloads/'), body: qualityBody({ site, pg: P.quality }), crumbs: [{ label: 'Home', href: '/' }, { label: 'Quality & Downloads', href: '/quality-downloads/' }] });
add('/about/', { meta: meta('/about/'), body: aboutBody({ site, pg: P.about }), crumbs: [{ label: 'Home', href: '/' }, { label: 'About Us', href: '/about/' }] });
add('/about/news/', { meta: meta('/about/news/'), body: newsBody({ site, pg: P.news }), crumbs: [{ label: 'Home', href: '/' }, { label: 'About Us', href: '/about/' }, { label: 'News & Trade Fairs', href: '/about/news/' }] });
add('/faq/', { meta: meta('/faq/'), body: faqBody({ site, pg: P.faq }), crumbs: [{ label: 'Home', href: '/' }, { label: 'FAQ', href: '/faq/' }], jsonld: [faqLd(P.faq.groups.flatMap((g) => g.items))] });
add('/contact/', { meta: meta('/contact/'), body: contactBody({ site, pg: P.contact, countries }), crumbs: [{ label: 'Home', href: '/' }, { label: 'Contact', href: '/contact/' }] });
add('/contact/thank-you/', { meta: meta('/contact/thank-you/'), body: thankYouBody({ pg: P.contact }) });
add('/privacy/', { meta: meta('/privacy/'), body: privacyBody({ pg: P.legal.privacy }), crumbs: [{ label: 'Home', href: '/' }, { label: 'Privacy Policy', href: '/privacy/' }] });
add('/imprint/', { meta: meta('/imprint/'), body: imprintBody({ pg: P.legal.imprint }), crumbs: [{ label: 'Home', href: '/' }, { label: 'Imprint', href: '/imprint/' }] });
add('/404.html', { meta: { title: 'Page Not Found | Mingyue Fastener', meta_description: 'The page you requested does not exist.', robots: 'noindex' }, body: notFoundBody({ pg: P.legal.notFound }), file: '404.html' });

// ---------- 写 dist ----------
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
const out = new Map(); // dist 相对路径 → html
for (const p of pages) {
  const html = page({ site, meta: p.meta, path: p.path, body: p.body, ctaHref: p.ctaHref, crumbs: p.crumbs, jsonld: p.jsonld, ldNotes: p.ldNotes });
  const rel = p.file || `${p.path.replace(/^\//, '')}index.html`;
  out.set(rel, html);
}
for (const [rel, html] of out) { const f = join(DIST, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, html); }
for (const [p, c] of extraFiles) { const f = join(DIST, p.replace(/^\//, '')); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, c); }
cpSync(join(ROOT, 'src', 'assets'), join(DIST, 'assets'), { recursive: true });

const indexable = pages.filter((p) => !p.file && String(p.meta.robots || 'index') !== 'noindex');
writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable.map((p) => `  <url><loc>${site.baseUrl}${p.path}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(DIST, 'robots.txt'), `# 测试站期间改为 "Disallow: /"（上线检查表）；上线时恢复本文件\nUser-agent: *\nAllow: /\nDisallow: /contact/thank-you/\n\nSitemap: ${site.baseUrl}/sitemap.xml\n`);

// ---------- 校验（任一失败 → 退出码 1） ----------
const errors = [], warns = [];
const stripComments = (h) => h.replace(/<!--[\s\S]*?-->/g, '');
const stripScripts = (h) => h.replace(/<script[\s\S]*?<\/script>/g, '');
const exists = (urlPath) => {
  const rel = urlPath.replace(/^\//, '');
  const candidates = [join(DIST, rel), join(DIST, rel, 'index.html')];
  return candidates.some((c) => existsSync(c) && statSync(c).isFile());
};
const idsOf = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const pageIds = new Map([...out].map(([rel, html]) => ['/' + rel.replace(/index\.html$/, ''), idsOf(html)]));

for (const [rel, raw] of out) {
  const url = '/' + rel.replace(/index\.html$/, '');
  const html = stripComments(raw);
  const noScript = stripScripts(html);
  // 1 每页唯一 H1
  const h1s = noScript.match(/<h1[\s>]/g) || [];
  if (h1s.length !== 1) errors.push(`${url}: H1 数量 ${h1s.length}（应为 1）`);
  // 2 title
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  if (!title) errors.push(`${url}: 无 <title>`);
  else if (title.length > 60) errors.push(`${url}: title ${title.length} 字符 > 60：${title}`);
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  if (desc.length > 160) warns.push(`${url}: description ${desc.length} 字符 > 160`);
  // 3 站内链接
  const ids = pageIds.get(url) || new Set();
  for (const m of noScript.matchAll(/\s(?:href|src|action)="([^"]*)"/g)) {
    const v = m[1];
    if (!v || v.startsWith('mailto:') || v.startsWith('http') || v.startsWith('tel:')) continue;
    if (v.startsWith('#')) { if (v.length > 1 && !ids.has(v.slice(1))) errors.push(`${url}: 页内锚点不存在 ${v}`); continue; }
    if (!v.startsWith('/')) continue;
    const [pathPart, hash] = v.split('#');
    const clean = pathPart.split('?')[0];
    if (!exists(clean)) errors.push(`${url}: 死链 ${v}`);
    else if (hash) { const tid = pageIds.get(clean.endsWith('/') ? clean : clean + '/'); if (tid && !tid.has(hash)) errors.push(`${url}: 跨页锚点不存在 ${v}`); }
  }
  // 4 SVG 引用 id
  for (const m of noScript.matchAll(/(?:<use href="#|url\(#|aria-labelledby=")([^")\s]+)/g)) {
    if (!ids.has(m[1])) errors.push(`${url}: SVG 引用 id 不存在 #${m[1]}`);
  }
  // 5 重复 id
  const all = [...noScript.matchAll(/\sid="([^"]+)"/g)].map((x) => x[1]);
  const dup = all.filter((x, i) => all.indexOf(x) !== i);
  if (dup.length) errors.push(`${url}: 重复 id ${[...new Set(dup)].join(', ')}`);
  // 6 [待确认] 必须包在 <mark class="todo"> 里（属性值里的除外）
  const re = /\[待确认/g; let mm;
  while ((mm = re.exec(noScript))) {
    const before = noScript.slice(0, mm.index);
    const inTag = before.lastIndexOf('<') > before.lastIndexOf('>');
    if (inTag) continue;
    if (/<(title|desc)(\s[^>]*)?>[^<]*$/.test(before)) continue; // SVG <title>/<desc> 与页面 <title>：纯文本，不渲染
    if (!before.endsWith('<mark class="todo">')) errors.push(`${url}: 未标注的占位 …${noScript.slice(mm.index - 30, mm.index + 20).replace(/\s+/g, ' ')}`);
  }
  // 7 viewport / canonical
  if (!/<meta name="viewport" content="width=device-width, initial-scale=1">/.test(html)) errors.push(`${url}: 缺 viewport`);
  if (!/<link rel="canonical"/.test(html)) errors.push(`${url}: 缺 canonical`);
}
// 8 CSS：:root 之外不出现裸 hex
const css = readFileSync(join(ROOT, 'src', 'assets', 'site.css'), 'utf8');
const rootEnd = css.indexOf('\n}', css.indexOf(':root{'));
const outsideRoot = css.slice(rootEnd).replace(/\/\*[\s\S]*?\*\//g, '');
const hexes = outsideRoot.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
if (hexes.length) errors.push(`site.css :root 之外出现裸 hex：${hexes.join(' ')}`);

// 统计
const todoMarks = [...out.values()].reduce((n, h) => n + (h.match(/<mark class="todo">/g) || []).length, 0);
const todoAll = [...out.values()].reduce((n, h) => n + (h.match(/\[待确认/g) || []).length, 0);
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const total = walk(DIST).reduce((n, f) => n + statSync(f).size, 0);

console.log(`构建完成：${out.size} 个页面，${extraFiles.length} 个 SVG 图纸，dist 共 ${(total / 1024).toFixed(0)} KB`);
console.log(`[待确认] 占位：可见标注 ${todoMarks} 处，含属性值共 ${todoAll} 处`);
for (const w of warns) console.log(`警告：${w}`);
if (errors.length) { for (const e of errors) console.error(`错误：${e}`); console.error(`校验失败：${errors.length} 项`); process.exit(1); }
console.log('校验通过：死链 0 · 缺 SVG id 0 · H1 唯一 · title ≤ 60 · 占位全部标注 · CSS 无裸 hex');

// ---------- 可选：本地预览 ----------
if (process.argv.includes('--serve')) {
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain' };
  const port = Number(process.env.PORT || 8080);
  createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    let f = join(DIST, p);
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    if (!existsSync(f)) { f = join(DIST, '404.html'); res.statusCode = 404; }
    res.setHeader('Content-Type', types[extname(f)] || 'application/octet-stream');
    res.end(readFileSync(f));
  }).listen(port, () => console.log(`预览：http://localhost:${port}/`));
}
