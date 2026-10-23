#!/usr/bin/env node
/**
 * b2b-website-skills · 旧站抓取器（旧站体检 / 迁移台账 / 品牌资产取回的输入）
 *
 * 用法：
 *   node scripts/crawl-old-site.mjs <起始URL> [--out _内部/抓取] [--max 500] [--delay 500]
 *                                   [--wayback 2024-06] [--alias www.old-host.com]
 *                                   [--ignore-robots] [--render] [--ua "..."] [--timeout 30000]
 *
 * 做什么：
 *   1. 从起始 URL 出发，BFS 抓同一站点的 href / src / srcset / action / poster / meta og:image /
 *      CSS url() 与 @import，原始字节原样落到 <out>/site/<路径>（目录型 URL 存为 index.html）。
 *   2. fetch 用 redirect:'manual'，每个重定向单独记 redirects.tsv（from → to → status），
 *      目标同站则继续抓——上线时的 301 映射表就从这里来（b2b-backend-dev「老站的排名不能丢」）。
 *   3. 每个文件记 sha256 到 manifest.json（url / path / status / content-type / bytes / sha256 / fetched_at …）。
 *   4. 外链逐条记 external.txt（url ⇥ 首次出现的页面）；失败记 errors.tsv（url ⇥ 状态或原因 ⇥ 来源页）。
 *   5. 结束时输出 urls.csv（url / 类型 / 标题 / 是否有正文 / 图片数 / 字数 / H1 / description / canonical / 文件），
 *      这就是 _内部/03-方案/旧站迁移台账.csv 的输入，以及 summary.json。
 *
 * --wayback <YYYY-MM>（站已死 / 域名过期 / 被前服务商扣着时用）：
 *   不再访问旧站本身，而是走 Wayback Machine：先用 CDX 列出该域名的所有存档 URL，
 *   再以该月 15 日为锚点，用 https://web.archive.org/web/<锚点>id_/<url> 取「最接近锚点」的那次快照的原始字节，
 *   保证整站是同一时代的版本。拿不到的 URL（没存档 / 存档是 4xx / 快照离锚点超过 180 天）记 holes.txt。
 *
 * 礼貌：
 *   遵守 robots.txt 的 Disallow / Allow（支持 * 与 $，长匹配优先）与 Crawl-delay；默认请求间隔 500ms；
 *   UA 标明身份。只有自己的站（例如本地 dist 的 robots 是写给正式域名的）才用 --ignore-robots。
 *
 * 可选：
 *   --alias <host[,host]>  把这些主机名视为同一站（sitemap 里写的是正式域名、而你在抓镜像 / 临时域名时用）
 *   --render               有 Playwright（env PLAYWRIGHT_MODULE 指向 playwright/index.mjs）时，对每个页面
 *                          再用无头 Chrome 渲染一次：补抓 JS 生成的链接，并存整页截图到 <out>/screenshots/。
 *                          原始字节仍来自 fetch，截图只给旧站体检看版式用。
 *
 * 零依赖，Node ≥ 22。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// ---------- 参数 ----------
const argv = process.argv.slice(2);
if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
  console.log(`用法：node scripts/crawl-old-site.mjs <起始URL> [选项]

选项：
  --out <目录>        输出目录，默认 _内部/抓取
  --max <n>           最多抓多少个同站 URL（页面 + 资源），默认 500
  --delay <ms>        两次请求之间的间隔，默认 500；robots.txt 的 Crawl-delay 更大时以它为准
  --wayback <YYYY-MM> 站已死时走 Wayback Machine，取该月附近的同一时代快照
  --alias <host,...>  视为同一站的其它主机名（正式域名 / 镜像 / 临时域名）
  --ignore-robots     不遵守 robots.txt（只对自己的站用）
  --render            有 Playwright 时渲染页面补抓 JS 链接并截图
  --ua <字符串>       自定义 User-Agent
  --timeout <ms>      单个请求超时，默认 30000
  --help              显示本说明

输出（都在 --out 目录下）：
  site/              原始文件镜像          manifest.json   每个文件的 url/path/status/type/bytes/sha256/fetched_at
  redirects.tsv      from ⇥ to ⇥ status     external.txt    外链 ⇥ 首次出现页面
  errors.tsv         url ⇥ 状态/原因 ⇥ 来源页  holes.txt     --wayback 时拿不到的 URL
  urls.csv           迁移台账输入           summary.json    计数汇总
  unfetched.txt      到 --max 上限时还没抓的队列`);
  process.exit(0);
}
const opt = (name, def) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : def; };
const has = name => argv.includes(name);
const VALUE_OPTS = ['--out', '--max', '--delay', '--wayback', '--alias', '--ua', '--timeout'];
const startArg = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && VALUE_OPTS.includes(argv[i - 1])));
if (!startArg) { console.error('缺少起始 URL。--help 看用法。'); process.exit(2); }
const OUT = path.resolve(opt('--out', '_内部/抓取'));
const MAX = Math.max(1, parseInt(opt('--max', '500'), 10) || 500);
let DELAY = Math.max(0, parseInt(opt('--delay', '500'), 10) || 0);
const WAYBACK = opt('--wayback', null);
const IGNORE_ROBOTS = has('--ignore-robots');
const RENDER = has('--render');
const TIMEOUT = Math.max(1000, parseInt(opt('--timeout', '30000'), 10) || 30000);
const UA = opt('--ua', 'b2b-website-skills-crawler/1.0 (old-site rescue for a rebuild; polite BFS, obeys robots.txt; +https://github.com/b2b-website-skills)');
// Wayback 的两个入口；测试时可用环境变量指到本地的模拟服务
const WB_BASE = process.env.WAYBACK_BASE || 'https://web.archive.org';
const CDX_BASE = process.env.WAYBACK_CDX_BASE || 'http://web.archive.org';

let START;
try { START = new URL(/^https?:\/\//i.test(startArg) ? startArg : 'https://' + startArg); } catch { console.error('起始 URL 不合法：' + startArg); process.exit(2); }
START.hash = '';
const ORIGIN = START.origin;
const stripWww = h => h.toLowerCase().replace(/^www\./, '');
const SITE_HOSTS = new Set([stripWww(START.hostname), ...opt('--alias', '').split(',').map(s => s.trim()).filter(Boolean).map(stripWww)]);

if (WAYBACK && !/^\d{4}-\d{2}$/.test(WAYBACK)) { console.error('--wayback 的格式是 YYYY-MM，例如 2024-06'); process.exit(2); }
const WB_ANCHOR = WAYBACK ? WAYBACK.replace('-', '') + '15120000' : null;   // 取该月 15 日正午为锚点
const WB_ANCHOR_MS = WAYBACK ? Date.UTC(+WAYBACK.slice(0, 4), +WAYBACK.slice(5, 7) - 1, 15, 12) : 0;
if (WAYBACK && DELAY < 1000) { DELAY = 1000; console.error('[提示] Wayback 有限流，间隔已提到 1000ms'); }

// ---------- 输出目录与记录 ----------
fs.mkdirSync(path.join(OUT, 'site'), { recursive: true });
const manifest = [];           // 文件清单
const redirects = [];          // {from,to,status,source}
const externals = new Map();   // url -> 首次出现页面
const errors = [];             // {url,reason,referrer}
const holes = [];              // wayback 缺口 {url,reason,referrer}
const pageInfo = [];           // urls.csv 行
const seen = new Set();        // 已入队的同站 URL
const queue = [];              // {url, referrer, depth}
let fetched = 0;
const pageHashes = new Map(); // sha256 -> 第一个 URL，用来识别查询串变体等重复页

const log = (...a) => console.error(...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');
const tsv = (...cells) => cells.map(c => String(c ?? '').replace(/[\t\r\n]+/g, ' ')).join('\t');
const csvCell = v => { const s = String(v ?? ''); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

// ---------- URL 归一化与同站判断 ----------
function normalize(raw, base) {
  let u;
  try { u = new URL(raw.trim(), base); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  u.hash = '';
  // 常见追踪参数不算不同页面
  for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid|mc_cid|mc_eid)/i.test(k)) u.searchParams.delete(k);
  if (u.pathname === '') u.pathname = '/';
  return u;
}
const isSite = u => SITE_HOSTS.has(stripWww(u.hostname));
// 别名主机（正式域名等）映射到起始 origin，保证真的去抓的是起始站
function toSiteOrigin(u) {
  if (stripWww(u.hostname) === stripWww(START.hostname) && u.origin === ORIGIN) return u;
  const m = new URL(u.href); m.protocol = START.protocol; m.host = START.host; return m;
}
const key = u => u.href;

// ---------- URL → 本地路径（镜像约定）----------
const EXT_BY_TYPE = { 'text/html': '.html', 'text/css': '.css', 'text/javascript': '.js', 'application/javascript': '.js', 'application/json': '.json', 'image/svg+xml': '.svg', 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif', 'image/avif': '.avif', 'application/pdf': '.pdf', 'text/xml': '.xml', 'application/xml': '.xml', 'font/woff2': '.woff2', 'font/woff': '.woff', 'text/plain': '.txt' };
const usedPaths = new Set();
function localPath(u, ctype) {
  let p;
  try { p = decodeURIComponent(u.pathname); } catch { p = u.pathname; }
  const segs = p.split('/').filter(s => s && s !== '.' && s !== '..').map(s => s.replace(/[<>:"|?*\\\x00-\x1f]/g, '_').slice(0, 180));
  let file = segs.join('/');
  const trailingSlash = p.endsWith('/');
  const hasExt = /\.[a-z0-9]{1,6}$/i.test(segs[segs.length - 1] || '');
  if (trailingSlash || !segs.length) file = (file ? file + '/' : '') + 'index.html';
  else if (!hasExt) file += ctype.startsWith('text/html') ? '/index.html' : (EXT_BY_TYPE[ctype] || '');
  if (u.search) { // 带查询串：文件名后加 __q<hash8>，和不带查询串的页面并存
    const h = crypto.createHash('sha1').update(u.search).digest('hex').slice(0, 8);
    file = file.replace(/(\.[a-z0-9]+)?$/i, `__q${h}$1`);
  }
  let out = file, n = 2;
  while (usedPaths.has(out)) out = file.replace(/(\.[a-z0-9]+)?$/i, `__${n++}$1`); // 大小写等冲突时避让
  usedPaths.add(out);
  return out;
}

// ---------- robots.txt ----------
const robots = { groups: [], crawlDelay: null, sitemaps: [] };
function parseRobots(text) {
  let cur = null;
  for (let line of text.split(/\r?\n/)) {
    line = line.replace(/#.*$/, '').trim(); if (!line) continue;
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i); if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === 'user-agent') { if (!cur || cur.rules.length || cur.delay !== null) { cur = { agents: [], rules: [], delay: null }; robots.groups.push(cur); } cur.agents.push(v.toLowerCase()); }
    else if (k === 'sitemap') robots.sitemaps.push(v);
    else if (cur && (k === 'disallow' || k === 'allow')) { if (v) cur.rules.push({ allow: k === 'allow', pat: v }); }
    else if (cur && k === 'crawl-delay') cur.delay = parseFloat(v) * 1000;
  }
}
const myToken = 'b2b-website-skills-crawler';
function robotsGroup() {
  const specific = robots.groups.find(g => g.agents.some(a => a !== '*' && myToken.includes(a)));
  return specific || robots.groups.find(g => g.agents.includes('*')) || null;
}
function patToRe(pat) {
  const esc = pat.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp('^' + (esc.endsWith('\\$') ? esc.slice(0, -2) + '$' : esc));
}
function robotsAllows(u) {
  if (IGNORE_ROBOTS) return true;
  const g = robotsGroup(); if (!g) return true;
  const target = u.pathname + u.search;
  let best = null;
  for (const r of g.rules) {
    if (patToRe(r.pat).test(target)) { if (!best || r.pat.length > best.pat.length || (r.pat.length === best.pat.length && r.allow)) best = r; }
  }
  return !best || best.allow;
}

// ---------- 抓取（live / wayback 两种来源）----------
async function fetchRaw(url, redirectMode = 'manual') {
  const res = await fetch(url, { redirect: redirectMode, headers: { 'user-agent': UA, accept: '*/*' }, signal: AbortSignal.timeout(TIMEOUT) });
  const buf = Buffer.from(await res.arrayBuffer());
  return { status: res.status, headers: res.headers, buf, finalUrl: res.url || url };
}
// 返回 {status, ctype, buf, location, waybackTs}
async function fetchLive(u) {
  const r = await fetchRaw(u.href);
  return { status: r.status, ctype: (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase(), buf: r.buf, location: r.headers.get('location'), waybackTs: null };
}
async function fetchWayback(u) {
  // id_ 模式返回未改写的原始字节；锚点时间不存在时 Wayback 会 302 到最近快照（仍在 web.archive.org 上），这种跳转照跟；
  // 跳到其它域名的 Location 则是存档里本来就有的重定向，交给调用方记进 redirects.tsv
  let cur = `${WB_BASE}/web/${WB_ANCHOR}id_/${u.href}`;
  for (let hop = 0; hop < 6; hop++) {
    const r = await fetchRaw(cur);
    const loc = r.headers.get('location');
    const tsm = cur.match(/\/web\/(\d{14})id_\//) || (r.finalUrl || '').match(/\/web\/(\d{14})id_\//);
    if (r.status >= 300 && r.status < 400 && loc) {
      const abs = new URL(loc, cur).href;
      const stripWb = s => s.replace(/^https?:\/\/[^/]+\/web\/\d{14}(?:[a-z]{2}_)?\//, '');
      // 同一原始 URL、只换时间戳 → 这是 Wayback 的「最近快照」跳转，照跟；原始 URL 变了 → 存档里本来就有的重定向
      if (abs.startsWith(WB_BASE + '/web/') && stripWb(abs) === u.href) { cur = abs.replace(/\/web\/(\d{14})(?:[a-z]{2}_)?\//, '/web/$1id_/'); continue; }
      return { status: r.status, ctype: '', buf: r.buf, location: stripWb(abs), waybackTs: tsm?.[1] || null };
    }
    const archTs = r.headers.get('x-archive-src')?.match(/(\d{14})/)?.[1];
    return { status: r.status, ctype: (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase(), buf: r.buf, location: null, waybackTs: tsm?.[1] || archTs || null };
  }
  throw new Error('Wayback 跳转超过 6 次');
}
async function cdxList(host) {
  const url = `${CDX_BASE}/cdx/search/cdx?url=${encodeURIComponent(host + '/*')}&matchType=prefix&collapse=urlkey&output=json&filter=statuscode:200&limit=${MAX * 4}`;
  log(`[wayback] CDX 列表：${url}`);
  const r = await fetchRaw(url, 'follow');
  if (r.status !== 200) throw new Error(`CDX 返回 ${r.status}`);
  const rows = JSON.parse(r.buf.toString('utf8') || '[]');
  if (!rows.length) return [];
  const head = rows[0], iOrig = head.indexOf('original'), iMime = head.indexOf('mimetype');
  return rows.slice(1).map(r => ({ original: r[iOrig], mime: r[iMime] }));
}

// ---------- 链接提取 ----------
const stripCssComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
function cssUrls(css) {
  const out = [];
  css = stripCssComments(css);
  for (const m of css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)) out.push(m[2]);
  for (const m of css.matchAll(/@import\s+(?:url\()?\s*['"]([^'"]+)['"]/gi)) out.push(m[1]);
  return out.filter(u => !u.startsWith('#') && !u.startsWith('data:'));
}
const decodeEntities = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
function htmlLinks(html) {
  const out = [];
  const base = html.match(/<base[^>]+href\s*=\s*["']([^"']+)["']/i)?.[1] || null;
  const noComments = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const m of noComments.matchAll(/\s(?:href|src|action|poster|data-src|data-href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) out.push(decodeEntities(m[1] ?? m[2] ?? m[3]));
  for (const m of noComments.matchAll(/\s(?:srcset|data-srcset)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) for (const part of (m[1] ?? m[2]).split(',')) { const u = part.trim().split(/\s+/)[0]; if (u) out.push(decodeEntities(u)); }
  for (const m of noComments.matchAll(/<meta[^>]+(?:property|name)\s*=\s*["'](?:og:image|og:image:url|twitter:image|msapplication-TileImage)["'][^>]*content\s*=\s*["']([^"']+)["']/gi)) out.push(decodeEntities(m[1]));
  for (const m of noComments.matchAll(/<meta[^>]+http-equiv\s*=\s*["']refresh["'][^>]*content\s*=\s*["'][^"']*url=([^"'\s]+)/gi)) out.push(decodeEntities(m[1]));
  for (const m of noComments.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) out.push(...cssUrls(m[1]));
  for (const m of noComments.matchAll(/\sstyle\s*=\s*"([^"]*)"/gi)) out.push(...cssUrls(decodeEntities(m[1])));
  return { links: out.filter(u => u && !/^(mailto|tel|javascript|data|sms|whatsapp):/i.test(u) && !u.startsWith('#')), base };
}

// ---------- 页面信息（给 urls.csv）----------
const textOf = s => decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
function pageMeta(html) {
  const title = textOf(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  const h1 = textOf(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');
  const desc = decodeEntities(html.match(/<meta[^>]+name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']*)["']/i)?.[1] || html.match(/<meta[^>]+content\s*=\s*["']([^"']*)["'][^>]*name\s*=\s*["']description["']/i)?.[1] || '');
  const canonical = html.match(/<link[^>]+rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']+)["']/i)?.[1] || '';
  const lang = html.match(/<html[^>]+lang\s*=\s*["']([^"']+)["']/i)?.[1] || '';
  const images = (html.match(/<img\b/gi) || []).length;
  // 正文：去掉 script/style/nav/header/footer/aside 后剩下的可见文字
  let body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || html;
  body = body.replace(/<(script|style|noscript|svg|nav|header|footer|aside|form)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  const text = textOf(body);
  const words = text ? text.split(/\s+/).length : 0;
  const cjk = (text.match(/[一-鿿]/g) || []).length;
  return { title, h1, desc, canonical, lang, images, words, hasBody: words >= 60 || cjk >= 120 ? 'yes' : 'no' };
}
function classify(ctype, u) {
  const ext = (u.pathname.match(/\.([a-z0-9]{1,6})$/i)?.[1] || '').toLowerCase();
  if (ctype.includes('text/html') || ctype.includes('xhtml')) return 'page';
  if (ctype.includes('css') || ext === 'css') return 'css';
  if (ctype.includes('javascript') || ext === 'js' || ext === 'mjs') return 'js';
  if (ctype.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'avif', 'ico'].includes(ext)) return 'image';
  if (ctype.startsWith('font/') || ['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(ext)) return 'font';
  if (ctype.includes('pdf') || ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip'].includes(ext)) return 'document';
  if (ctype.includes('xml') || ext === 'xml') return 'xml';
  if (ctype.startsWith('video/') || ctype.startsWith('audio/')) return 'media';
  return 'other';
}

// ---------- 队列 ----------
function enqueue(raw, base, referrer, depth) {
  const u0 = normalize(raw, base); if (!u0) return;
  if (!isSite(u0)) { if (!externals.has(u0.href)) externals.set(u0.href, referrer || ''); return; }
  const u = toSiteOrigin(u0);
  const k = key(u); if (seen.has(k)) return;
  seen.add(k);
  queue.push({ url: u, referrer, depth });
}

// ---------- Playwright 渲染（可选）----------
let browser = null, pwCtx = null;
async function initRender() {
  if (!RENDER) return;
  try {
    const pw = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
    try { browser = await pw.chromium.launch({ channel: 'chrome' }); } catch { browser = await pw.chromium.launch(); }
    pwCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA });
    fs.mkdirSync(path.join(OUT, 'screenshots'), { recursive: true });
    log('[render] Playwright 已就绪，页面会再渲染一次补抓 JS 链接并截图');
  } catch (e) { log('[render] Playwright 不可用，跳过渲染：' + e.message.split('\n')[0]); }
}
async function renderPage(u, localFile) {
  if (!pwCtx) return [];
  const pg = await pwCtx.newPage();
  try {
    // 直接导航到抓取目标（wayback 模式下用带时间戳的存档页，Wayback 会改写链接，这里只补发现、不存字节）
    const target = WAYBACK ? `${WB_BASE}/web/${WB_ANCHOR}/${u.href}` : u.href;
    await pg.goto(target, { waitUntil: 'networkidle', timeout: TIMEOUT }).catch(() => {});
    await pg.waitForTimeout(500);
    const links = await pg.evaluate(() => [...document.querySelectorAll('a[href],img[src],source[src],link[href],script[src],iframe[src]')].map(e => e.href || e.src || e.getAttribute('href') || e.getAttribute('src')).filter(Boolean));
    const shot = path.join(OUT, 'screenshots', localFile.replace(/[\/\\]/g, '__').replace(/\.html$/, '') + '.png');
    await pg.screenshot({ path: shot, fullPage: true }).catch(() => {});
    return links.map(l => WAYBACK ? l.replace(/^https?:\/\/web\.archive\.org\/web\/\d{14}(?:[a-z_]+)?\//, '') : l);
  } catch (e) { log('[render] ' + u.href + '：' + e.message.split('\n')[0]); return []; }
  finally { await pg.close().catch(() => {}); }
}

// ---------- 主流程 ----------
async function main() {
  log(`[开始] ${START.href}  模式=${WAYBACK ? 'wayback@' + WAYBACK : 'live'}  上限=${MAX}  间隔=${DELAY}ms  输出=${OUT}`);
  const fetchOne = WAYBACK ? fetchWayback : fetchLive;

  // robots.txt（live 抓旧站本身的；wayback 模式抓存档里的 robots，仍然尊重）
  const robotsUrl = new URL('/robots.txt', ORIGIN);
  try {
    const r = await fetchOne(robotsUrl);
    if (r.status === 200) {
      parseRobots(r.buf.toString('utf8'));
      const g = robotsGroup();
      if (g?.delay && g.delay > DELAY) { DELAY = Math.min(g.delay, 10000); log(`[robots] Crawl-delay=${g.delay / 1000}s，间隔改为 ${DELAY}ms`); }
      log(`[robots] 规则 ${g ? g.rules.length : 0} 条${IGNORE_ROBOTS ? '（--ignore-robots：仅记录不执行）' : ''}，sitemap ${robots.sitemaps.length} 个`);
    } else log(`[robots] 无 robots.txt（${r.status}）`);
  } catch (e) { log('[robots] 取不到：' + e.message.split('\n')[0]); }
  await sleep(DELAY);

  // 种子：起始页、sitemap、几个约定路径（存在才算），wayback 模式再加 CDX 列表
  enqueue(START.href, undefined, '', 0);
  for (const p of ['/sitemap.xml', '/sitemap_index.xml', '/robots.txt', '/favicon.ico', '/404.html']) enqueue(p, ORIGIN, '(probe)', 0);
  for (const s of robots.sitemaps) enqueue(s, ORIGIN, '/robots.txt', 0);
  if (WAYBACK) {
    try {
      const rows = await cdxList(stripWww(START.hostname));
      let n = 0;
      for (const row of rows) { const u = normalize(row.original); if (u && isSite(u)) { enqueue(u.href, undefined, '(cdx)', 0); n++; } }
      log(`[wayback] CDX 给出 ${rows.length} 行，同站 ${n} 个 URL 入队`);
    } catch (e) { log('[wayback] CDX 失败：' + e.message.split('\n')[0]); errors.push({ url: '(cdx)', reason: e.message.split('\n')[0], referrer: '' }); }
    await sleep(DELAY);
  }
  await initRender();

  // 软 404 探测：旧站常常对任何路径都返回 200，知道了这一点才能解释「怎么抓了一堆空页」
  let soft404 = null;
  if (!WAYBACK) {
    try {
      const probe = new URL('/__b2b_probe_' + crypto.randomBytes(4).toString('hex'), ORIGIN);
      const r = await fetchLive(probe); soft404 = r.status === 200 ? 'yes' : 'no'; log(`[探测] 随机路径返回 ${r.status} → 软 404：${soft404}`);
    } catch { /* 探测失败不算错误 */ }
    await sleep(DELAY);
  }

  while (queue.length && fetched < MAX) {
    const { url: u, referrer, depth } = queue.shift();
    const isProbe = referrer === '(probe)';
    if (!robotsAllows(u)) {
      log(`[robots] 跳过 ${u.pathname}`);
      pageInfo.push({ url: u.href, type: 'blocked-by-robots', status: '', title: '', hasBody: '', images: '', words: '', h1: '', desc: '', canonical: '', file: '' });
      continue;
    }
    fetched++;
    let r;
    try { r = await fetchOne(u); }
    catch (e) {
      const reason = e.name === 'TimeoutError' ? `超时 ${TIMEOUT}ms` : (e.cause?.code || e.message.split('\n')[0]);
      if (!isProbe) { errors.push({ url: u.href, reason, referrer }); log(`[失败] ${u.href}：${reason}`); if (WAYBACK) holes.push({ url: u.href, reason, referrer }); }
      await sleep(DELAY); continue;
    }
    // 重定向
    if (r.status >= 300 && r.status < 400 && r.location) {
      const to = normalize(r.location, u.href);
      redirects.push({ from: u.href, to: to ? to.href : r.location, status: r.status, referrer });
      log(`[${r.status}] ${u.href} → ${to ? to.href : r.location}`);
      if (to) enqueue(to.href, undefined, referrer, depth);
      await sleep(DELAY); continue;
    }
    if (r.status >= 400) {
      if (!isProbe) {
        errors.push({ url: u.href, reason: 'HTTP ' + r.status, referrer });
        if (WAYBACK) holes.push({ url: u.href, reason: '存档返回 ' + r.status, referrer });
        log(`[${r.status}] ${u.href}（来自 ${referrer || '起点'}）`);
      }
      await sleep(DELAY); continue;
    }
    // 保存
    const ctype = r.ctype || '';
    const type = classify(ctype, u);
    const rel = localPath(u, ctype);
    const abs = path.join(OUT, 'site', rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, r.buf);
    const rec = { url: u.href, path: 'site/' + rel, status: r.status, content_type: ctype, bytes: r.buf.length, sha256: sha256(r.buf), fetched_at: new Date().toISOString(), type, referrer, depth, source: WAYBACK ? 'wayback' : 'live' };
    if (WAYBACK) {
      rec.wayback_ts = r.waybackTs;
      if (r.waybackTs) {
        const t = r.waybackTs, ms = Date.UTC(+t.slice(0, 4), +t.slice(4, 6) - 1, +t.slice(6, 8), +t.slice(8, 10), +t.slice(10, 12), +t.slice(12, 14));
        rec.wayback_drift_days = Math.round((ms - WB_ANCHOR_MS) / 864e5);
        if (Math.abs(rec.wayback_drift_days) > 180) holes.push({ url: u.href, reason: `最近快照离锚点 ${rec.wayback_drift_days} 天（${t}），不是同一时代`, referrer });
      }
    }
    // 同样的字节已经以另一个 URL 抓到过（常见：?utm / ?topic 这类查询串被服务器忽略）→ 记为重复，不算页数
    const dupOf = type === 'page' ? pageHashes.get(rec.sha256) : null;
    if (dupOf) rec.duplicate_of = dupOf; else if (type === 'page') pageHashes.set(rec.sha256, u.href);
    manifest.push(rec);
    log(`[${r.status}] ${type.padEnd(8)} ${u.href} (${r.buf.length} B)${rec.wayback_ts ? ' @' + rec.wayback_ts : ''}${dupOf ? ' = ' + dupOf : ''}`);

    // 提取链接
    if (dupOf) {
      pageInfo.push({ url: u.href, type: 'duplicate', status: r.status, title: '', hasBody: '', images: '', words: '', h1: '', desc: '', canonical: '', file: rec.path, dup: dupOf });
    } else if (type === 'page') {
      const html = r.buf.toString('utf8');
      const { links, base } = htmlLinks(html);
      const resolveBase = base ? (normalize(base, u.href)?.href || u.href) : u.href;
      for (const l of links) enqueue(l, resolveBase, u.href, depth + 1);
      const m = pageMeta(html);
      pageInfo.push({ url: u.href, type, status: r.status, ...m, file: rec.path });
      if (pwCtx) for (const l of await renderPage(u, rel)) enqueue(l, u.href, u.href + ' (rendered)', depth + 1);
    } else if (type === 'css') {
      for (const l of cssUrls(r.buf.toString('utf8'))) enqueue(l, u.href, u.href, depth + 1);
      pageInfo.push({ url: u.href, type, status: r.status, title: '', hasBody: '', images: '', words: '', h1: '', desc: '', canonical: '', file: rec.path });
    } else if (type === 'xml' && /<(urlset|sitemapindex)/i.test(r.buf.toString('utf8', 0, 2048))) {
      const xml = r.buf.toString('utf8');
      let n = 0;
      for (const mm of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) { enqueue(decodeEntities(mm[1]), u.href, u.href, depth + 1); n++; }
      log(`[sitemap] ${u.pathname} 列出 ${n} 个 URL`);
      pageInfo.push({ url: u.href, type: 'sitemap', status: r.status, title: '', hasBody: '', images: '', words: '', h1: '', desc: '', canonical: '', file: rec.path });
    } else {
      pageInfo.push({ url: u.href, type, status: r.status, title: '', hasBody: '', images: '', words: '', h1: '', desc: '', canonical: '', file: rec.path });
    }
    await sleep(DELAY);
  }
  if (browser) await browser.close().catch(() => {});

  // ---------- 落盘 ----------
  const w = (name, content) => fs.writeFileSync(path.join(OUT, name), content);
  w('manifest.json', JSON.stringify(manifest, null, 2));
  w('redirects.tsv', [tsv('from', 'to', 'status', 'found_on'), ...redirects.map(r => tsv(r.from, r.to, r.status, r.referrer))].join('\n') + '\n');
  w('external.txt', [...externals.entries()].sort().map(([u, ref]) => tsv(u, ref)).join('\n') + (externals.size ? '\n' : ''));
  w('errors.tsv', [tsv('url', 'reason', 'found_on'), ...errors.map(e => tsv(e.url, e.reason, e.referrer))].join('\n') + '\n');
  if (WAYBACK) w('holes.txt', holes.map(h => tsv(h.url, h.reason, h.referrer)).join('\n') + (holes.length ? '\n' : ''));
  if (queue.length) w('unfetched.txt', queue.map(q => tsv(q.url.href, q.referrer)).join('\n') + '\n');
  const order = { page: 0, duplicate: 1, sitemap: 2, 'blocked-by-robots': 3 };
  pageInfo.sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9) || a.url.localeCompare(b.url));
  const head = ['url', '类型', '标题', '是否有正文', '图片数', '字数', 'H1', 'description', 'canonical', 'lang', '状态', '本地文件', '重复于', '新站URL(待填)', '处理(保留/合并/301/删除)(待填)'];
  w('urls.csv', '﻿' + [head, ...pageInfo.map(p => [p.url, p.type, p.title, p.hasBody, p.images, p.words, p.h1, p.desc, p.canonical, p.lang ?? '', p.status, p.file, p.dup ?? '', '', ''])].map(r => r.map(csvCell).join(',')).join('\n') + '\n');

  const dups = manifest.filter(m => m.duplicate_of).length;
  const pages = manifest.filter(m => m.type === 'page').length - dups;
  const assets = manifest.length - pages - dups;
  const summary = { start: START.href, mode: WAYBACK ? 'wayback' : 'live', wayback_anchor: WB_ANCHOR, pages, duplicate_pages: dups, assets, redirects: redirects.length, externals: externals.size, errors: errors.length, holes: holes.length, blocked_by_robots: pageInfo.filter(p => p.type === 'blocked-by-robots').length, unfetched: queue.length, soft_404: soft404, hit_max: fetched >= MAX && queue.length > 0, out: OUT, finished_at: new Date().toISOString() };
  w('summary.json', JSON.stringify(summary, null, 2));
  console.log(`\n抓取完成：页面 ${pages}${dups ? '（另有 ' + dups + ' 个内容相同的查询串变体）' : ''}，资源 ${assets}，重定向 ${redirects.length}，外链 ${externals.size}，失败 ${errors.length}${WAYBACK ? '，缺口 ' + holes.length : ''}${summary.blocked_by_robots ? '，robots 跳过 ' + summary.blocked_by_robots : ''}${summary.hit_max ? '，已到 --max 上限，剩余 ' + queue.length + ' 见 unfetched.txt' : ''}${soft404 === 'yes' ? '，注意：站点是软 404（任意路径返回 200）' : ''}`);
  console.log(`台账输入：${path.join(OUT, 'urls.csv')}（复制为 _内部/03-方案/旧站迁移台账.csv 后填「新站URL」「处理」两列）`);
}

main().catch(e => { console.error('致命错误：' + (e.stack || e)); process.exit(1); });
