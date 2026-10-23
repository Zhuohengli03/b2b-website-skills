#!/usr/bin/env node
/**
 * b2b-website-skills · 发布前检查器（v2）
 *
 * 用法：node scripts/check.mjs <dist目录> [选项]
 *   --perf              用 Playwright 实测首页体积与 LCP
 *   --shots             用 Playwright 逐页截图（1440 / 390 / 390+reduced-motion 拼成一张 contact sheet）
 *                       并实测溢出、点击区、对比度、动效、emoji
 *   --shots-dir <目录>   截图存放目录，默认 <dist>/../_内部/08-测试/截图/
 *   --online            对外链做 HEAD/GET 状态检查（需要网络）
 *   --json <路径>        输出 JSON 报告（含 id / cat / docs / 截图路径 / diff）
 *   --diff <上次json>    与上一次报告对比，输出 新增 / 已修复 / 仍在（本次没跑的规则或页面记「未复查」）
 *   -m <n>              最多检查 n 个页面（首页永远排第一）
 *
 * 环境变量：PLAYWRIGHT_MODULE 指向 playwright 的 index.mjs（默认 import 'playwright'）。
 * 零依赖（Node ≥ 22）；只有 --perf / --shots 需要 Playwright。
 *
 * 输出：每行 `P1  SEO-TITLE-LEN  /page  detail`，末尾按规则 id 汇总，最后一行 `BLOCKING: true|false`（P0 > 0 即 true）。
 * 退出码：有 P0 → 1；否则 0；参数错误 → 2。
 *
 * ┌──────────────────┬────┬──────────┬──────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────┐
 * │ id               │ 级 │ cat      │ 检查什么                                                   │ docs（规则出处）                                           │
 * ├──────────────────┼────┼──────────┼──────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
 * │ SEO-H1           │ P0 │ seo      │ 页面 H1 数量 ≠ 1                                           │ skills/b2b-seo-specialist/SKILL.md › 1. 上线前技术 SEO 检查表 │
 * │ LINK-DEAD        │ P0 │ links    │ 站内 a/link/script/img/source/use 指向不存在的文件            │ skills/b2b-qa-tester/SKILL.md › 测试清单 B                  │
 * │ FORM-MISSING     │ P0 │ form     │ Contact 页没有询盘表单（data-inquiry 或 method=post）          │ skills/b2b-qa-tester/SKILL.md › 测试清单 A                  │
 * │ FORM-FIELD       │ P0 │ form     │ 询盘表单缺 email / company / country / message 字段           │ skills/b2b-qa-tester/SKILL.md › 测试清单 A                  │
 * │ FORM-ENDPOINT    │ P0 │ form     │ 表单接收端为空，或 action 只指向 thank-you                     │ skills/b2b-backend-dev/SKILL.md › 1. 询盘链路               │
 * │ SEC-SECRET       │ P0 │ security │ HTML/JS/CSS/sourcemap 里出现 API key / 私钥 / 带 token 的 URL │ skills/b2b-backend-dev/SKILL.md › 5. 安全                   │
 * │ SEO-TITLE        │ P1 │ seo      │ 缺 <title>                                                 │ skills/b2b-seo-specialist/SKILL.md › 1. 上线前技术 SEO 检查表 │
 * │ SEO-TITLE-LEN    │ P1 │ seo      │ title > 60 字符                                             │ skills/b2b-seo-specialist/SKILL.md › 1. 上线前技术 SEO 检查表 │
 * │ SEO-DESC         │ P1 │ seo      │ 缺 meta description（404 页除外）                             │ skills/b2b-seo-specialist/SKILL.md › 1. 上线前技术 SEO 检查表 │
 * │ SEO-DESC-LEN     │ P1 │ seo      │ description > 155 字符                                      │ skills/b2b-seo-specialist/SKILL.md › 1. 上线前技术 SEO 检查表 │
 * │ SEO-CANONICAL    │ P1 │ seo      │ 缺 canonical（404 页除外）                                   │ skills/b2b-seo-specialist/SKILL.md › 1. 上线前技术 SEO 检查表 │
 * │ SEO-LANG         │ P1 │ seo      │ <html> 缺 lang                                             │ skills/b2b-seo-specialist/SKILL.md › 1. 上线前技术 SEO 检查表 │
 * │ CTA-STACK        │ P1 │ cta      │ 同一区块 ≥2 个主 CTA，或相邻两个区块都以主 CTA 收尾              │ skills/b2b-site-diagnosis/SKILL.md › CTA 节律规则            │
 * │ CONTENT-TODO     │ P1 │ content  │ [待确认] 占位仍在页面上                                       │ README-流水线总览.md › 特殊情况的共同原则 1                    │
 * │ A11Y-ALT         │ P1 │ a11y     │ <img> 缺 alt 属性                                           │ skills/b2b-qa-tester/references/可用性与可访问性检查项.md › 可访问性 │
 * │ PERF-EXT-RESOURCE│ P1 │ perf     │ 外链脚本 / 样式 / 字体 CDN                                   │ skills/b2b-frontend-dev/SKILL.md › 5. 性能与可抓取性检查       │
 * │ RENDER-OVERFLOW  │ P1 │ render   │ --shots：scrollWidth > innerWidth（横向滚动）                 │ skills/b2b-qa-tester/SKILL.md › 测试清单 C                  │
 * │ A11Y-TARGET      │ P1 │ a11y     │ --shots：a/button/input/select 任一边 < 24px（行内文字链接除外）│ skills/b2b-qa-tester/references/可用性与可访问性检查项.md › 可访问性 · 最小点击区 │
 * │ A11Y-CONTRAST    │ P1 │ a11y     │ --shots：p/li/td 文字与背景对比度 < 4.5（大字 < 3）             │ skills/b2b-qa-tester/references/可用性与可访问性检查项.md › 可访问性 · 对比度 │
 * │ FORM-HONEYPOT    │ P2 │ form     │ 询盘表单没有蜜罐字段                                          │ skills/b2b-frontend-dev/SKILL.md › 5. 性能与可抓取性检查       │
 * │ SEO-SITEMAP      │ P2 │ seo      │ 缺 sitemap.xml，或 sitemap 指向不存在的页面                    │ skills/b2b-seo-specialist/SKILL.md › 1. 上线前技术 SEO 检查表 │
 * │ SEO-ROBOTS       │ P2 │ seo      │ 缺 robots.txt                                              │ skills/b2b-seo-specialist/SKILL.md › 1. 上线前技术 SEO 检查表 │
 * │ SEO-URL-LEN      │ P2 │ seo      │ 页面 URL > 100 字符                                         │ skills/b2b-seo-specialist/SKILL.md › 1. 上线前技术 SEO 检查表 · URL │
 * │ SEO-ORPHAN       │ P2 │ seo      │ 站内没有任何入链的页面（404 / thank-you 除外）                  │ skills/b2b-seo-specialist/SKILL.md › 1. 上线前技术 SEO 检查表 · 内链 │
 * │ META-OG          │ P2 │ seo      │ 缺 og:title 或 og:image                                     │ skills/b2b-seo-specialist/SKILL.md › 1. 上线前技术 SEO 检查表 │
 * │ SCHEMA-PARSE     │ P2 │ schema   │ JSON-LD 解析失败                                            │ skills/b2b-seo-specialist/SKILL.md › 1. 上线前技术 SEO 检查表 · Schema │
 * │ SCHEMA-REQUIRED  │ P2 │ schema   │ Organization 缺 name/url；Product 缺 name/description；       │ skills/b2b-seo-specialist/SKILL.md › 1. 上线前技术 SEO 检查表 · Schema │
 * │                  │    │          │ BreadcrumbList 缺 itemListElement；Article 缺 headline/       │                                                          │
 * │                  │    │          │ datePublished/author；h1 与 Article.headline / Product.name 矛盾 │                                                          │
 * │ LINK-EXT-STATUS  │ P2 │ links    │ --online：外链 HEAD/GET 不是 2xx/3xx                         │ skills/b2b-qa-tester/SKILL.md › 测试清单 B                  │
 * │ PERF-HOME-BYTES  │ P2 │ perf     │ --perf：首页体积 > 500 KB                                    │ skills/b2b-qa-tester/SKILL.md › 测试清单 D                  │
 * │ PERF-LCP         │ P2 │ perf     │ --perf：LCP > 2.5 s                                         │ skills/b2b-qa-tester/SKILL.md › 测试清单 D                  │
 * │ RENDER-MOTION    │ P2 │ render   │ --shots：reduced-motion 下仍有可见元素 animation（时长>50ms）    │ skills/b2b-qa-tester/references/可用性与可访问性检查项.md › 可访问性 · 动效敏感 │
 * │                  │    │          │ 或 transition-duration > 50ms                               │                                                          │
 * │ STYLE-EMOJI      │ P2 │ style    │ --shots：文本节点含 emoji 码点                                │ skills/b2b-site-diagnosis/references/公司分型速查与自查.md › AI 建站的惯性毛病自查 · emoji 当图标 │
 * │ TOOL-RUN         │ P2 │ perf     │ --perf / --shots / --online 未能运行（Playwright 缺失等）       │ scripts/check.mjs 文件头                                   │
 * └──────────────────┴────┴──────────┴──────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────┘
 *
 * JSON 里每条 finding 同时保留 `rule`（旧版中文规则名）以兼容旧报告；--diff 读旧版 JSON 时按 rule 名映射到 id。
 */
import fs from 'node:fs';
import path from 'node:path';

// ---------- 参数 ----------
const argv = process.argv.slice(2);
const opt = { perf: false, shots: false, online: false, json: null, diff: null, max: Infinity, shotsDir: null };
let dist = null;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--perf') opt.perf = true;
  else if (a === '--shots') opt.shots = true;
  else if (a === '--online') opt.online = true;
  else if (a === '--json') opt.json = argv[++i];
  else if (a === '--diff') opt.diff = argv[++i];
  else if (a === '--shots-dir') opt.shotsDir = argv[++i];
  else if (a === '-m') opt.max = parseInt(argv[++i], 10);
  else if (a.startsWith('-')) { console.error(`未知参数：${a}`); process.exit(2); }
  else dist = a;
}
if (!dist || !fs.existsSync(dist)) { console.error('用法：node scripts/check.mjs <dist目录> [--perf] [--shots] [--shots-dir 目录] [--online] [--json 报告.json] [--diff 上次.json] [-m n]'); process.exit(2); }
if (!(opt.max > 0)) { console.error('-m 需要正整数'); process.exit(2); }
const ROOT = path.resolve(dist);

// ---------- 规则表 ----------
const D = {
  seo: 'skills/b2b-seo-specialist/SKILL.md › 1. 上线前技术 SEO 检查表',
  qaA: 'skills/b2b-qa-tester/SKILL.md › 测试清单 A',
  qaB: 'skills/b2b-qa-tester/SKILL.md › 测试清单 B',
  qaC: 'skills/b2b-qa-tester/SKILL.md › 测试清单 C',
  qaD: 'skills/b2b-qa-tester/SKILL.md › 测试清单 D',
  a11y: 'skills/b2b-qa-tester/references/可用性与可访问性检查项.md › 可访问性',
  fe5: 'skills/b2b-frontend-dev/SKILL.md › 5. 性能与可抓取性检查',
};
const RULES = {
  'SEO-H1':            { level: 'P0', cat: 'seo',      rule: 'H1',      docs: D.seo },
  'LINK-DEAD':         { level: 'P0', cat: 'links',    rule: '死链',     docs: D.qaB },
  'FORM-MISSING':      { level: 'P0', cat: 'form',     rule: '表单',     docs: D.qaA },
  'FORM-FIELD':        { level: 'P0', cat: 'form',     rule: '表单',     docs: D.qaA },
  'FORM-ENDPOINT':     { level: 'P0', cat: 'form',     rule: '表单',     docs: 'skills/b2b-backend-dev/SKILL.md › 1. 询盘链路' },
  'SEC-SECRET':        { level: 'P0', cat: 'security', rule: '密钥',     docs: 'skills/b2b-backend-dev/SKILL.md › 5. 安全' },
  'SEO-TITLE':         { level: 'P1', cat: 'seo',      rule: 'title',   docs: D.seo },
  'SEO-TITLE-LEN':     { level: 'P1', cat: 'seo',      rule: 'title',   docs: D.seo },
  'SEO-DESC':          { level: 'P1', cat: 'seo',      rule: 'description', docs: D.seo },
  'SEO-DESC-LEN':      { level: 'P1', cat: 'seo',      rule: 'description', docs: D.seo },
  'SEO-CANONICAL':     { level: 'P1', cat: 'seo',      rule: 'canonical', docs: D.seo },
  'SEO-LANG':          { level: 'P1', cat: 'seo',      rule: 'lang',    docs: D.seo },
  'CTA-STACK':         { level: 'P1', cat: 'cta',      rule: 'CTA堆叠',  docs: 'skills/b2b-site-diagnosis/SKILL.md › CTA 节律规则' },
  'CONTENT-TODO':      { level: 'P1', cat: 'content',  rule: '占位',     docs: 'README-流水线总览.md › 特殊情况的共同原则 1' },
  'A11Y-ALT':          { level: 'P1', cat: 'a11y',     rule: 'alt',     docs: D.a11y },
  'PERF-EXT-RESOURCE': { level: 'P1', cat: 'perf',     rule: '外部资源', docs: D.fe5 },
  'RENDER-OVERFLOW':   { level: 'P1', cat: 'render',   rule: '横向溢出', docs: D.qaC },
  'A11Y-TARGET':       { level: 'P1', cat: 'a11y',     rule: '点击区',   docs: D.a11y + ' · 最小点击区' },
  'A11Y-CONTRAST':     { level: 'P1', cat: 'a11y',     rule: '对比度',   docs: D.a11y + ' · 对比度' },
  'FORM-HONEYPOT':     { level: 'P2', cat: 'form',     rule: '表单',     docs: D.fe5 },
  'SEO-SITEMAP':       { level: 'P2', cat: 'seo',      rule: 'sitemap', docs: D.seo },
  'SEO-ROBOTS':        { level: 'P2', cat: 'seo',      rule: 'robots',  docs: D.seo },
  'SEO-URL-LEN':       { level: 'P2', cat: 'seo',      rule: 'URL',     docs: D.seo + ' · URL' },
  'SEO-ORPHAN':        { level: 'P2', cat: 'seo',      rule: '孤页',     docs: D.seo + ' · 内链' },
  'META-OG':           { level: 'P2', cat: 'seo',      rule: 'og',      docs: D.seo },
  'SCHEMA-PARSE':      { level: 'P2', cat: 'schema',   rule: 'JSON-LD', docs: D.seo + ' · Schema' },
  'SCHEMA-REQUIRED':   { level: 'P2', cat: 'schema',   rule: 'JSON-LD', docs: D.seo + ' · Schema' },
  'LINK-EXT-STATUS':   { level: 'P2', cat: 'links',    rule: '外链状态', docs: D.qaB },
  'PERF-HOME-BYTES':   { level: 'P2', cat: 'perf',     rule: '体积',     docs: D.qaD },
  'PERF-LCP':          { level: 'P2', cat: 'perf',     rule: 'LCP',     docs: D.qaD },
  'RENDER-MOTION':     { level: 'P2', cat: 'render',   rule: '动效',     docs: D.a11y + ' · 动效敏感' },
  'STYLE-EMOJI':       { level: 'P2', cat: 'style',    rule: 'emoji',   docs: 'skills/b2b-site-diagnosis/references/公司分型速查与自查.md › AI 建站的惯性毛病自查 · emoji 当图标' },
  'TOOL-RUN':          { level: 'P2', cat: 'perf',     rule: '性能',     docs: 'scripts/check.mjs 文件头' },
};
const LEGACY_RULE_TO_ID = { ...Object.fromEntries(Object.entries(RULES).map(([id, r]) => [r.rule, id]).reverse()), '死链': 'LINK-DEAD', 'H1': 'SEO-H1', '表单': 'FORM-ENDPOINT', 'title': 'SEO-TITLE-LEN', 'description': 'SEO-DESC-LEN', 'canonical': 'SEO-CANONICAL', 'lang': 'SEO-LANG', 'CTA堆叠': 'CTA-STACK', '占位': 'CONTENT-TODO', 'alt': 'A11Y-ALT', '外部资源': 'PERF-EXT-RESOURCE', 'sitemap': 'SEO-SITEMAP', 'robots': 'SEO-ROBOTS', 'JSON-LD': 'SCHEMA-PARSE', '体积': 'PERF-HOME-BYTES', 'LCP': 'PERF-LCP', '性能': 'TOOL-RUN' };

const findings = []; // {level, id, cat, docs, page, rule, detail}
const add = (id, page, detail) => { const r = RULES[id]; if (!r) throw new Error(`未知规则 ${id}`); findings.push({ level: r.level, id, cat: r.cat, docs: r.docs, page, rule: r.rule, detail }); };

// ---------- 收集页面 ----------
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = walk(ROOT);
const rel = f => '/' + path.relative(ROOT, f).split(path.sep).join('/');
const allPages = files.filter(f => f.endsWith('.html')).sort((a, b) => (rel(a) === '/index.html' ? -1 : rel(b) === '/index.html' ? 1 : rel(a).localeCompare(rel(b))));
const pages = allPages.slice(0, opt.max);
const exists = u => {
  const clean = u.split('#')[0].split('?')[0];
  if (!clean || !clean.startsWith('/')) return true; // 外链不查
  const cands = [clean, clean + 'index.html', clean + '/index.html', clean + '.html', clean.replace(/\/$/, '') + '.html'];
  return cands.some(c => fs.existsSync(path.join(ROOT, c)) && !fs.statSync(path.join(ROOT, c)).isDirectory());
};
// 把站内 URL 归一到页面文件的 rel 路径（/about/ → /about/index.html），找不到返回 null
const resolvePage = u => {
  const clean = u.split('#')[0].split('?')[0];
  if (!clean.startsWith('/')) return null;
  for (const c of [clean, clean + 'index.html', clean + '/index.html', clean + '.html', clean.replace(/\/$/, '') + '.html']) {
    const f = path.join(ROOT, c);
    if (fs.existsSync(f) && !fs.statSync(f).isDirectory()) return rel(f);
  }
  return null;
};
const strip = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ');
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}=("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')); return m ? (m[2] ?? m[3] ?? m[4]) : null; };
const pageUrl = p => p.replace(/index\.html$/, '');
const is404or = p => /404/.test(p);
const isThankYou = p => /thank[-_]?you/i.test(p);

const inbound = {}; // 页面 → Set(来源页面)
const extLinks = new Map(); // 外链 URL → Set(页面)

// ---------- 逐页检查 ----------
for (const f of pages) {
  const p = rel(f); const html = fs.readFileSync(f, 'utf8');
  const body = (html.match(/<body[\s\S]*<\/body>/i) || [html])[0];
  const is404 = is404or(p);

  // H1
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  if ((html.match(/<h1\b/gi) || []).length !== 1) add('SEO-H1', p, `H1 数量为 ${(html.match(/<h1\b/gi) || []).length}（应为 1）`);
  const h1Text = h1s[0] ? decode(strip(h1s[0][1])) : '';

  // title / description / canonical / lang
  const title = strip((html.match(/<title>([\s\S]*?)<\/title>/i) || ['', ''])[1]);
  if (!title) add('SEO-TITLE', p, '缺 <title>');
  else if (title.length > 60) add('SEO-TITLE-LEN', p, `title ${title.length} 字符 > 60：${title}`);
  const descTag = (html.match(/<meta[^>]+name=["']?description["']?[^>]*>/i) || [])[0];
  const desc = descTag ? attr(descTag, 'content') : null;
  if (!is404) {
    if (!desc) add('SEO-DESC', p, '缺 meta description');
    else if (desc.length > 155) add('SEO-DESC-LEN', p, `description ${desc.length} 字符 > 155`);
    if (!/<link[^>]+rel=["']?canonical["']?/i.test(html)) add('SEO-CANONICAL', p, '缺 canonical');
    // og:title / og:image
    const og = n => new RegExp(`<meta[^>]+property=["']?og:${n}["']?[^>]*>`, 'i').test(html);
    const missOg = ['title', 'image'].filter(n => !og(n));
    if (missOg.length) add('META-OG', p, `缺 ${missOg.map(n => 'og:' + n).join('、')}（社媒 / IM 分享预览会是空白）`);
  }
  if (!/<html[^>]+lang=/i.test(html)) add('SEO-LANG', p, '<html> 缺 lang');

  // URL 长度
  const url = pageUrl(p);
  if (url.length > 100) add('SEO-URL-LEN', p, `URL ${url.length} 字符 > 100`);

  // 死链 + 资源 + 入链图 + 外链收集
  for (const m of html.matchAll(/<(a|link|script|img|source|use)\b[^>]*>/gi)) {
    const tag = m[0];
    const u = attr(tag, 'href') ?? attr(tag, 'src') ?? attr(tag, 'xlink:href');
    if (!u) continue;
    if (/^(mailto:|tel:|https?:|\/\/|data:|javascript:)/i.test(u)) {
      if (/^(https?:)?\/\//i.test(u) && /<(script|link)\b/i.test(tag) && !/rel=["']canonical/i.test(tag) && !/rel=["']alternate/i.test(tag)) {
        add('PERF-EXT-RESOURCE', p, `外链脚本/样式：${u}（skill 要求字体自托管、不引 CDN）`);
      }
      if (/^(https?:)?\/\//i.test(u) && /<(a|img|script|link)\b/i.test(tag) && !/rel=["']canonical/i.test(tag)) {
        const full = u.startsWith('//') ? 'https:' + u : u;
        if (!extLinks.has(full)) extLinks.set(full, new Set());
        extLinks.get(full).add(p);
      }
      continue;
    }
    if (u.startsWith('#')) continue;
    const abs = u.startsWith('/') ? u : path.posix.join(path.posix.dirname(p), u);
    if (!exists(abs)) add('LINK-DEAD', p, `${tag.match(/^<\w+/)[0].slice(1)} → ${u}`);
    else if (/^<a\b/i.test(tag)) { const target = resolvePage(abs); if (target && target !== p) (inbound[target] ||= new Set()).add(p); }
  }

  // img alt
  for (const m of body.matchAll(/<img\b[^>]*>/gi)) { if (attr(m[0], 'alt') === null) add('A11Y-ALT', p, `<img> 缺 alt：${m[0].slice(0, 80)}`); }

  // [待确认] 占位
  const todos = (body.match(/\[待确认[:：][^\]]*\]/g) || []).length;
  if (todos) add('CONTENT-TODO', p, `${todos} 处 [待确认] 占位仍在页面上（上线前须清零）`);

  // CTA 堆叠
  const sections = [...body.matchAll(/<(section|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi)].map(m => m[0]);
  const primaryIn = s => (s.match(/class=["'][^"']*btn-primary[^"']*["']/gi) || []).length;
  const endsWithCta = s => { const tail = s.slice(-1200); return /btn-primary/.test(tail) && /class=["'][^"']*cta/.test(s.slice(0, 200)); };
  sections.forEach((s, i) => {
    const n = primaryIn(s);
    if (n >= 2) add('CTA-STACK', p, `同一区块内 ${n} 个主 CTA（区块 ${i + 1}）`);
    if (i > 0 && endsWithCta(s) && endsWithCta(sections[i - 1])) add('CTA-STACK', p, `相邻两个 CTA 区块（区块 ${i}、${i + 1}）`);
  });

  // 询盘表单（contact 页）
  if (/\/contact\/(index\.html)?$/.test(p)) {
    const form = (body.match(/<form\b[^>]*data-inquiry[^>]*>[\s\S]*?<\/form>/i) || body.match(/<form\b[^>]*method=["']post["'][^>]*>[\s\S]*?<\/form>/i) || [])[0];
    if (!form) add('FORM-MISSING', p, 'Contact 页没有询盘表单');
    else {
      const names = [...form.matchAll(/\sname=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/g)].map(m => m[1] ?? m[2] ?? m[3]);
      for (const need of ['email', 'company', 'country', 'message']) if (!names.includes(need)) add('FORM-FIELD', p, `缺字段 ${need}`);
      const open = form.match(/<form\b[^>]*>/i)[0];
      const endpoint = attr(open, 'data-endpoint') ?? attr(open, 'action');
      if (!endpoint) add('FORM-ENDPOINT', p, '表单接收端为空（data-endpoint / action）——提交后邮件到不了');
      else if (/thank/i.test(endpoint) && !attr(open, 'data-endpoint')) add('FORM-ENDPOINT', p, `action 指向 ${endpoint}，没有真正的接收端`);
      if (!/honeypot|website/i.test(form)) add('FORM-HONEYPOT', p, '没有蜜罐字段（反垃圾）');
    }
  }

  // JSON-LD：解析 + 必填字段 + 与 h1 不矛盾
  const REQ = { Organization: ['name', 'url'], Product: ['name', 'description'], BreadcrumbList: ['itemListElement'], Article: ['headline', 'datePublished', 'author'] };
  const norm = s => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const nodes = [];
  const collect = n => { if (Array.isArray(n)) n.forEach(collect); else if (n && typeof n === 'object') { if (n['@type']) nodes.push(n); if (n['@graph']) collect(n['@graph']); } };
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { collect(JSON.parse(m[1])); } catch (e) { add('SCHEMA-PARSE', p, `解析失败：${e.message}`); }
  }
  for (const n of nodes) {
    const types = [].concat(n['@type']);
    for (const t of types) {
      if (!REQ[t]) continue;
      const miss = REQ[t].filter(k => n[k] === undefined || n[k] === null || n[k] === '' || (Array.isArray(n[k]) && !n[k].length));
      if (miss.length) add('SCHEMA-REQUIRED', p, `${t} 缺 ${miss.join('、')}`);
      const key = t === 'Article' ? 'headline' : t === 'Product' ? 'name' : null;
      if (key && n[key] && h1Text) {
        const a = norm(h1Text), b = norm(n[key]);
        if (a && b && !a.includes(b) && !b.includes(a)) add('SCHEMA-REQUIRED', p, `${t}.${key}「${n[key]}」与页面 h1「${h1Text}」矛盾`);
      }
    }
  }
}

// ---------- 孤页（站内无任何入链）----------
// 入链图要看全站，所以 -m 之外的页面也扫一遍 <a href>
for (const f of allPages.slice(pages.length)) {
  const p = rel(f); const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
    const u = attr(m[0], 'href'); if (!u || /^(mailto:|tel:|https?:|\/\/|data:|javascript:|#)/i.test(u)) continue;
    const abs = u.startsWith('/') ? u : path.posix.join(path.posix.dirname(p), u);
    const target = resolvePage(abs); if (target && target !== p) (inbound[target] ||= new Set()).add(p);
  }
}
for (const f of pages) {
  const p = rel(f);
  if (p === '/index.html' || is404or(p) || isThankYou(p)) continue;
  if (!inbound[p] || !inbound[p].size) add('SEO-ORPHAN', p, '站内没有任何页面链到它（搜索引擎与采购都到不了）');
}

// ---------- 密钥扫描（HTML / JS / CSS / sourcemap）----------
const SECRET_PATTERNS = [
  [/sk_live_[0-9A-Za-z]{8,}/g, 'Stripe live key'],
  [/\bre_[A-Za-z0-9]{20,}/g, 'Resend API key'],
  [/AIza[0-9A-Za-z_-]{30,}/g, 'Google API key'],
  [/ghp_[A-Za-z0-9]{20,}/g, 'GitHub token'],
  [/xox[bp]-[A-Za-z0-9-]{10,}/g, 'Slack token'],
  [/AKIA[0-9A-Z]{16}/g, 'AWS access key'],
  [/-----BEGIN [A-Z ]*(PRIVATE KEY|CERTIFICATE)-----/g, '私钥 / 证书块'],
];
const TOKEN_URL = /https?:\/\/[^\s"'<>()]+[?&](?:key|apikey|api_key|token|access_token|auth|secret|sig|signature)=[^&\s"'<>()]{8,}/gi;
const mask = s => s.length > 14 ? s.slice(0, 10) + '…' + s.slice(-3) : s;
for (const f of files.filter(x => /\.(html?|m?js|css|map)$/i.test(x))) {
  const p = rel(f); const text = fs.readFileSync(f, 'utf8');
  const lineOf = i => text.slice(0, i).split('\n').length;
  for (const [re, label] of SECRET_PATTERNS) {
    const hits = [...text.matchAll(re)];
    if (hits.length) add('SEC-SECRET', p, `${label} ×${hits.length}，第 ${lineOf(hits[0].index)} 行：${mask(hits[0][0])}`);
  }
  const urls = [...text.matchAll(TOKEN_URL)].filter(m => !/^https:\/\/formspree\.io\/f\//i.test(m[0]));
  if (urls.length) add('SEC-SECRET', p, `带 token 的 URL ×${urls.length}，第 ${lineOf(urls[0].index)} 行：${urls[0][0].replace(/=([^&]{4})[^&]*/g, '=$1…')}`);
}

// ---------- 站级 ----------
const sm = path.join(ROOT, 'sitemap.xml');
if (!fs.existsSync(sm)) add('SEO-SITEMAP', '/', '缺 sitemap.xml');
else {
  const locs = [...fs.readFileSync(sm, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(/^https?:\/\/[^/]+/, ''));
  for (const l of locs) if (!exists(l)) add('SEO-SITEMAP', '/sitemap.xml', `指向不存在的页面：${l}`);
}
if (!fs.existsSync(path.join(ROOT, 'robots.txt'))) add('SEO-ROBOTS', '/', '缺 robots.txt');

// ---------- 外链状态（--online）----------
if (opt.online) {
  const list = [...extLinks.entries()];
  const probe = async u => {
    const tryReq = async method => { const c = new AbortController(); const t = setTimeout(() => c.abort(), 10000); try { const r = await fetch(u, { method, redirect: 'manual', signal: c.signal, headers: { 'user-agent': 'Mozilla/5.0 (compatible; b2b-check/2)' } }); return r.status; } finally { clearTimeout(t); } };
    try { let s = await tryReq('HEAD'); if (s === 405 || s === 403 || s === 404 || s >= 500) s = await tryReq('GET'); return s; } catch (e) { return `ERR ${e.name === 'AbortError' ? 'timeout' : (e.cause?.code || e.message)}`; }
  };
  let i = 0;
  await Promise.all(Array.from({ length: 6 }, async () => { while (i < list.length) { const [u, ps] = list[i++]; const s = await probe(u); if (!(typeof s === 'number' && s >= 200 && s < 400)) for (const p of ps) add('LINK-EXT-STATUS', p, `${u} → ${s}`); } }));
}

// ---------- Playwright：静态服务器 + 浏览器 ----------
const needPw = opt.perf || opt.shots;
let perf = null, shots = null, pw = null, browser = null, srv = null, port = 0;
const startServer = async () => {
  const http = await import('node:http');
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.xml': 'text/xml', '.txt': 'text/plain', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json' };
  srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html'; let f = path.join(ROOT, u); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); port = srv.address().port;
};
if (needPw) {
  try {
    pw = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
    await startServer();
    browser = await pw.chromium.launch();
  } catch (e) { add('TOOL-RUN', '/', `Playwright 未能启动：${e.message}`); pw = null; }
}

// ---------- 性能（--perf）----------
if (opt.perf && pw) {
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const pg = await ctx.newPage();
    let bytes = 0; pg.on('response', async r => { try { bytes += (await r.body()).length; } catch {} });
    await pg.addInitScript(() => { window.__lcp = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); });
    await pg.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' }); await pg.waitForTimeout(1500);
    const lcp = await pg.evaluate(() => window.__lcp);
    perf = { homeBytes: bytes, lcpMs: Math.round(lcp) };
    if (bytes > 500 * 1024) add('PERF-HOME-BYTES', '/', `首页 ${(bytes / 1024).toFixed(0)} KB > 500 KB`);
    if (lcp > 2500) add('PERF-LCP', '/', `LCP ${Math.round(lcp)} ms > 2500 ms`);
    await ctx.close();
  } catch (e) { add('TOOL-RUN', '/', `--perf 未能运行：${e.message}`); }
}

// ---------- 截图 + 实测（--shots）----------
// 浏览器里跑的检查函数：溢出 / 点击区 / 对比度 / emoji（在普通上下文跑）
const AUDIT_FN = () => {
  // 可见：不是 display:none / visibility:hidden / opacity:0，有尺寸，且没被 overflow:hidden 的祖先整个裁掉（收起的下拉、折叠面板）
  const vis = el => {
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const ac = getComputedStyle(a); if (ac.overflow === 'visible' && ac.overflowX === 'visible' && ac.overflowY === 'visible' && ac.clipPath === 'none') continue; const ar = a.getBoundingClientRect(); if (ac.clipPath !== 'none' && ar.width > 0 && ar.height > 0 && /inset\(\s*(100%|50%)/.test(ac.clipPath)) return false; if (r.right <= ar.left || r.left >= ar.right || r.bottom <= ar.top || r.top >= ar.bottom) return false; }
    return true;
  };
  const label = el => { const t = (el.getAttribute('aria-label') || el.value || el.textContent || el.getAttribute('name') || '').trim().replace(/\s+/g, ' ').slice(0, 30); const idc = el.id ? '#' + el.id : el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''; return `${el.tagName.toLowerCase()}${idc}${t ? `「${t}」` : ''}`; };
  // 溢出
  // 手机模拟下 innerWidth 会被缩放撑大，取布局视口宽（clientWidth）与 innerWidth 的较小者
  const vw = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
  const overflow = document.documentElement.scrollWidth > vw ? { scrollWidth: document.documentElement.scrollWidth, innerWidth: vw } : null;
  // 点击区（WCAG 2.2 Target Size Minimum：24×24，带「行内」与「等效间距」两条例外）
  const all = [];
  for (const el of document.querySelectorAll('a, button, input, select')) {
    if (!vis(el)) continue;
    if (el.closest('[aria-hidden="true"]') || el.type === 'hidden' || el.tabIndex < 0) continue;
    const cs = getComputedStyle(el);
    const inline = cs.display === 'inline' && !!el.closest('p, td, th, dd, dt, figcaption, blockquote, h1, h2, h3, h4, h5, h6, small');
    let r = el.getBoundingClientRect();
    // checkbox / radio 带 label 时，label 整块都可点
    if ((el.type === 'checkbox' || el.type === 'radio') && el.labels && el.labels.length) { const lr = el.labels[0].getBoundingClientRect(); r = { left: Math.min(r.left, lr.left), top: Math.min(r.top, lr.top), right: Math.max(r.right, lr.right), bottom: Math.max(r.bottom, lr.bottom) }; r.width = r.right - r.left; r.height = r.bottom - r.top; }
    all.push({ el, r, inline, small: r.width < 24 || r.height < 24, cx: r.left + r.width / 2, cy: r.top + r.height / 2 });
  }
  const targets = [];
  for (const t of all) {
    if (!t.small || t.inline) continue;
    // 等效间距例外：以自身中心画直径 24 的圆，不碰到任何别的目标（别的小目标也取圆）
    const clash = all.some(o => { if (o === t) return false; if (o.small) return Math.hypot(o.cx - t.cx, o.cy - t.cy) < 24; const dx = Math.max(o.r.left - t.cx, 0, t.cx - o.r.right), dy = Math.max(o.r.top - t.cy, 0, t.cy - o.r.bottom); return Math.hypot(dx, dy) < 12; });
    if (!clash) continue;
    // 命中测试：滚到视口里，中心点真的能点到它（排除被别的层盖住 / 被裁掉的）
    t.el.scrollIntoView({ block: 'center', inline: 'nearest' });
    const r = t.el.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (hit && (t.el.contains(hit) || hit.contains(t.el))) targets.push(`${label(t.el)} ${Math.round(t.r.width)}×${Math.round(t.r.height)}`);
  }
  window.scrollTo(0, 0);
  // 对比度
  const parse = c => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 && !isNaN(v[3]) ? v[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const bgOf = el => { let bg = null; for (let n = el; n; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; const c = parse(cs.backgroundColor); if (!c || c.a === 0) continue; if (c.a === 1) return bg ? blend(bg, c) : c; bg = bg ? blend(bg, c) : c; } const white = { r: 255, g: 255, b: 255, a: 1 }; return bg ? blend(bg, white) : white; };
  const contrast = [];
  for (const el of document.querySelectorAll('p, li, td')) {
    if (!vis(el) || el.closest('[aria-hidden="true"]')) continue;
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el); let fg = parse(cs.color); const bg = bgOf(el); if (!fg || !bg) continue;
    if (fg.a < 1) fg = blend(fg, bg);
    const l1 = lum(fg), l2 = lum(bg); const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700; const large = size >= 24 || (size >= 18.66 && bold);
    if (ratio < (large ? 3 : 4.5)) contrast.push(`${label(el)} ${ratio.toFixed(2)}:1（${cs.color} on rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})）`);
  }
  // emoji
  const emoji = []; const re = /\p{Extended_Pictographic}/u; const skip = /[©®™‼⁉]/;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) { if (n.parentElement.closest('script, style, noscript, template')) continue; const t = n.textContent; const chars = [...t].filter(ch => re.test(ch) && !skip.test(ch)); if (chars.length) emoji.push(`${label(n.parentElement)} ${chars.slice(0, 5).join(' ')}`); }
  return { overflow, targets, contrast, emoji };
};
// reduced-motion 上下文里跑：仍在动的可见元素
const MOTION_FN = () => {
  const vis = el => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const sec = v => Math.max(...String(v).split(',').map(s => { s = s.trim(); return s.endsWith('ms') ? parseFloat(s) / 1000 : parseFloat(s) || 0; }));
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue; const cs = getComputedStyle(el);
    const anim = cs.animationName !== 'none' && sec(cs.animationDuration) > 0.05;
    const trans = sec(cs.transitionDuration) > 0.05 && cs.transitionProperty !== 'none';
    if (anim || trans) { const idc = el.id ? '#' + el.id : el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''; out.push(`${el.tagName.toLowerCase()}${idc} ${anim ? `animation ${cs.animationName} ${cs.animationDuration}` : `transition ${cs.transitionProperty.split(',')[0]} ${cs.transitionDuration.split(',')[0]}`}`); }
  }
  return out;
};
const pageSlug = p => { const s = p.replace(/^\//, '').replace(/\/index\.html$/, '').replace(/\.html$/, '').replace(/\//g, '__'); return s || 'index'; };
const fmtList = (arr, n = 3) => arr.slice(0, n).join('；') + (arr.length > n ? ` …共 ${arr.length} 处` : '');

if (opt.shots && pw) {
  const dir = path.resolve(opt.shotsDir || path.join(ROOT, '..', '_内部', '08-测试', '截图'));
  fs.mkdirSync(dir, { recursive: true });
  shots = { dir, files: {} };
  const VIEWS = [
    { key: '1440', viewport: { width: 1440, height: 900 } },
    { key: '390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
    { key: '390-rm', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce' },
  ];
  for (const f of pages) {
    const p = rel(f); const url = `http://127.0.0.1:${port}${pageUrl(p)}`;
    const imgs = [];
    try {
      for (const v of VIEWS) {
        const { key, ...ctxOpt } = v;
        const ctx = await browser.newContext(ctxOpt); const pg = await ctx.newPage();
        await pg.goto(url, { waitUntil: 'load' }); await pg.waitForTimeout(600);
        // 把懒加载 / 滚动显现的内容触发出来再截全页
        await pg.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } window.scrollTo(0, 0); });
        await pg.waitForTimeout(400);
        if (key === '390-rm') {
          const moving = await pg.evaluate(MOTION_FN);
          if (moving.length) add('RENDER-MOTION', p, `reduced-motion 下仍有 ${moving.length} 个可见元素带动效：${fmtList(moving)}`);
        } else {
          const r = await pg.evaluate(AUDIT_FN);
          if (r.overflow) add('RENDER-OVERFLOW', p, `@${key}：scrollWidth ${r.overflow.scrollWidth} > innerWidth ${r.overflow.innerWidth}（横向滚动）`);
          if (r.targets.length) add('A11Y-TARGET', p, `@${key}：${r.targets.length} 个点击区小于 24px：${fmtList(r.targets)}`);
          if (r.contrast.length) add('A11Y-CONTRAST', p, `@${key}：${r.contrast.length} 处正文对比度不足：${fmtList(r.contrast)}`);
          if (key === '1440' && r.emoji.length) add('STYLE-EMOJI', p, `${r.emoji.length} 个文本节点含 emoji：${fmtList(r.emoji)}`);
        }
        imgs.push({ key, buf: await pg.screenshot({ fullPage: true }) });
        await ctx.close();
      }
      // 在浏览器里把三张拼成一张 contact sheet（纯 Node 不解码 PNG）
      const ctx = await browser.newContext({ viewport: { width: 1440 + 390 * 2 + 80, height: 900 } }); const pg = await ctx.newPage();
      const cells = imgs.map(i => `<figure><figcaption>${i.key === '390-rm' ? '390 · prefers-reduced-motion' : i.key}</figcaption><img src="data:image/png;base64,${i.buf.toString('base64')}"></figure>`).join('');
      await pg.setContent(`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#e5e7eb;font:12px/1.4 system-ui,sans-serif}#sheet{display:flex;gap:20px;padding:20px;align-items:flex-start;width:max-content}figure{margin:0}figcaption{color:#374151;margin-bottom:6px;font-weight:600}img{display:block;outline:1px solid #9ca3af;max-height:12000px}</style><div id="sheet"><h1 style="position:absolute;left:-9999px">${pageUrl(p)}</h1>${cells}</div>`);
      await pg.waitForTimeout(100);
      const out = path.join(dir, `${pageSlug(p)}.png`);
      await pg.locator('#sheet').screenshot({ path: out });
      await ctx.close();
      shots.files[p] = out;
    } catch (e) { add('TOOL-RUN', p, `--shots 截图失败：${e.message}`); }
  }
}
if (browser) await browser.close();
if (srv) srv.close();

// ---------- diff ----------
let diff = null;
const normDetail = s => String(s).replace(/\d+/g, '#');
const keyOf = f => `${f.id || LEGACY_RULE_TO_ID[f.rule] || f.rule}|${f.page}|${normDetail(f.detail)}`;
if (opt.diff) {
  try {
    const old = JSON.parse(fs.readFileSync(opt.diff, 'utf8')).findings || [];
    const oldKeys = new Map(old.map(f => [keyOf(f), f])), newKeys = new Map(findings.map(f => [keyOf(f), f]));
    // 本次没跑的规则（没开 --perf / --shots / --online）或没查的页面（-m 之外），旧条目算「未复查」而不是「已修复」
    const NEEDS = { 'LINK-EXT-STATUS': opt.online, 'PERF-HOME-BYTES': opt.perf, 'PERF-LCP': opt.perf, 'RENDER-OVERFLOW': opt.shots, 'RENDER-MOTION': opt.shots, 'A11Y-TARGET': opt.shots, 'A11Y-CONTRAST': opt.shots, 'STYLE-EMOJI': opt.shots };
    const checkedPages = new Set(pages.map(rel));
    const ran = f => { const id = f.id || LEGACY_RULE_TO_ID[f.rule] || f.rule; if (NEEDS[id] === false) return false; return !f.page.endsWith('.html') || checkedPages.has(f.page); };
    diff = { added: findings.filter(f => !oldKeys.has(keyOf(f))), fixed: old.filter(f => !newKeys.has(keyOf(f)) && ran(f)), skipped: old.filter(f => !newKeys.has(keyOf(f)) && !ran(f)), remaining: findings.filter(f => oldKeys.has(keyOf(f))) };
  } catch (e) { console.error(`--diff 读取失败：${e.message}`); }
}

// ---------- 输出 ----------
const count = l => findings.filter(f => f.level === l).length;
const byId = {};
const order = ['P0', 'P1', 'P2'];
findings.sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level) || a.id.localeCompare(b.id) || a.page.localeCompare(b.page));
for (const f of findings) byId[f.id] = (byId[f.id] || 0) + 1;
const line = f => `${f.level}  ${f.id}  ${f.page}  ${f.detail}`;
console.log(`检查 ${pages.length}${allPages.length > pages.length ? `/${allPages.length}` : ''} 个页面 · P0 ${count('P0')} · P1 ${count('P1')} · P2 ${count('P2')}`);
if (perf) console.log(`首页：${(perf.homeBytes / 1024).toFixed(0)} KB · LCP ${perf.lcpMs} ms`);
if (shots) console.log(`截图：${Object.keys(shots.files).length} 张 contact sheet → ${shots.dir}`);
for (const f of findings) console.log(line(f));
console.log('按规则汇总：' + (Object.entries(byId).map(([k, v]) => `${k} ${v}`).join(' · ') || '无'));
if (diff) {
  console.log(`\n对比 ${opt.diff}：新增 ${diff.added.length} · 已修复 ${diff.fixed.length} · 仍在 ${diff.remaining.length}${diff.skipped.length ? ` · 未复查 ${diff.skipped.length}（本次没开对应选项或页面不在 -m 范围内）` : ''}`);
  for (const [name, arr] of [['新增', diff.added], ['已修复', diff.fixed], ['仍在', diff.remaining], ['未复查', diff.skipped]]) for (const f of arr) console.log(`  ${name.padEnd(3, '　')} ${f.level}  ${f.id || LEGACY_RULE_TO_ID[f.rule] || f.rule}  ${f.page}  ${f.detail}`);
}
const blocking = count('P0') > 0;
console.log(`BLOCKING: ${blocking}`);
if (opt.json) fs.writeFileSync(opt.json, JSON.stringify({
  generatedAt: new Date().toISOString(), dist: ROOT, pages: pages.length, totalPages: allPages.length, options: { perf: opt.perf, shots: opt.shots, online: opt.online, max: Number.isFinite(opt.max) ? opt.max : null },
  summary: { P0: count('P0'), P1: count('P1'), P2: count('P2') }, byId, blocking, perf, shots,
  rules: Object.fromEntries(Object.entries(RULES).map(([id, r]) => [id, { level: r.level, cat: r.cat, docs: r.docs }])),
  findings, diff: diff && { added: diff.added.length, fixed: diff.fixed.length, remaining: diff.remaining.length, skipped: diff.skipped.length, addedList: diff.added, fixedList: diff.fixed, remainingList: diff.remaining, skippedList: diff.skipped },
}, null, 2));
process.exit(blocking ? 1 : 0);
