import { esc, t, join, attr } from '../html.mjs';
import { defs, icons, pitchRule } from '../svg.mjs';

const YEAR = new Date().getFullYear();

/** 导航（G-1）：桌面横条 + Products 多列文字下拉；手机汉堡 + 全屏面板。 */
const nav = (site, path, ctaHref) => {
  const isCurrent = (href) => (href === '/' ? path === '/' : path.startsWith(href));
  const items = site.nav.map((item) => {
    const cur = isCurrent(item.href) ? ' aria-current="page"' : '';
    if (!item.dropdown) return `<li><a href="${attr(item.href)}"${cur}>${t(item.label)}</a></li>`;
    const cols = item.dropdown.map((col) => `<div>
            <div class="eyebrow">${t(col.title)}</div>
            <ul>${col.items.map((l) => `<li><a href="${attr(l.href)}"${isCurrent(l.href) && l.href !== '/products/' ? ' aria-current="page"' : ''}>${t(l.label)}${l.sub ? `<span class="mono">${t(l.sub)}</span>` : ''}</a></li>`).join('')}</ul>
          </div>`).join('');
    return `<li class="has-dropdown">
        <a href="${attr(item.href)}" aria-haspopup="true"${cur}>${t(item.label)} ${icons.chevron()}</a>
        <div class="dropdown">${cols}</div>
      </li>`;
  });
  const panelLinks = site.nav.map((item) => {
    const sub = item.dropdown ? `<ul class="panel-sub">${item.dropdown.flatMap((c) => c.items).map((l) => `<li><a href="${attr(l.href)}">${t(l.label)}${l.sub ? ` <span class="mono muted">${t(l.sub)}</span>` : ''}</a></li>`).join('')}</ul>` : '';
    return `<li><a href="${attr(item.href)}"${isCurrent(item.href) ? ' aria-current="page"' : ''}>${t(item.label)}</a>${sub}</li>`;
  });
  return `<header class="nav">
  <div class="container">
    <a class="logo" href="/" aria-label="${attr(site.name)}">
      <span class="wordmark">${t(site.wordmark)}</span>
      <span class="tagline">${t(site.tagline)}</span>
      <span class="logo-todo">${t(site.logoTodo)}</span>
    </a>
    <ul class="nav-menu">${items.join('')}</ul>
    <form class="nav-tools" action="${attr(site.search.action)}" role="search">
      <label class="sr-only" for="q">${t(site.search.label)}</label>
      <input class="input mono" id="q" name="s" type="search" placeholder="${attr(site.search.placeholder)}" autocomplete="off">
      <a class="btn btn-primary" href="${attr(ctaHref)}">${t(site.cta.primary)}</a>
    </form>
    <button class="nav-burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="nav-panel">
      <span class="ic-open">${icons.burger()}</span><span class="ic-close">${icons.close()}</span>
    </button>
  </div>
  <div class="nav-panel" id="nav-panel">
    <div class="container">
      <form action="${attr(site.search.action)}" role="search" class="panel-search">
        <label class="sr-only" for="q-m">${t(site.search.label)}</label>
        <input class="input mono" id="q-m" name="s" type="search" placeholder="${attr(site.search.placeholder)}" autocomplete="off">
      </form>
      <ul class="panel-menu">${panelLinks.join('')}</ul>
    </div>
  </div>
</header>`;
};

/** 页尾 CTA（H7 结构；文案按页，缺则沿用首页 H7）。 */
export const ctaEnd = (site, { title, titleMono, titleRest, sub, primary } = {}) => {
  const heading = title
    ? t(title)
    : `<span class="mono">${t(titleMono ?? site.ctaEnd.titleMono)}</span>${t(titleRest ?? site.ctaEnd.titleRest)}`;
  const subText = sub === null ? '' : `<p>${t(sub ?? site.ctaEnd.sub)}</p>`;
  const btn = primary ?? { label: site.cta.primary, href: site.cta.primaryHref };
  return `<section class="cta-end" id="cta-end">
  <div class="container">
    <h2 class="h2">${heading}</h2>
    ${subText}
    <div class="actions">
      <a class="btn btn-inverse" href="${attr(btn.href)}">${t(btn.label)}</a>
      <small>${t(site.ctaEnd.orEmail)} <a href="mailto:${attr(site.email)}">${t(site.email)}</a></small>
    </div>
  </div>
</section>`;
};

const footer = (site) => {
  const col = (c) => `<div>
        <div class="eyebrow">${t(c.title)}</div>
        <ul>${c.links.map((l) => `<li><a href="${attr(l.href)}">${t(l.label)}</a></li>`).join('')}</ul>
      </div>`;
  return `<footer class="footer">
  <div class="container">
    <div class="cols">
      <div>
        <a class="logo logo-footer" href="/" aria-label="${attr(site.name)}">
          <span class="wordmark">${t(site.wordmark)}</span>
          <span class="tagline">${t(site.tagline)}</span>
          <span class="logo-todo">${t(site.logoTodo)}</span>
        </a>
        <div class="eyebrow">${t(site.footer.contactTitle)}</div>
        <address>
          ${t(site.name)}<br>
          ${t(site.address.street)},<br>${t(site.address.city)}, ${t(site.address.region)}, ${t(site.address.country)}<br>
          <a href="mailto:${attr(site.email)}">${t(site.email)}</a><br>
          Tel. ${t(site.phone)}
        </address>
      </div>
      ${col(site.footer.products)}
      ${col(site.footer.company)}
      ${col(site.footer.legal)}
    </div>
    <div class="bottom">
      <span>${t(site.footer.certLine)}</span>
      <span>© <span data-year>${YEAR}</span> ${t(site.name)} · ${t(site.taglineCaps)}</span>
    </div>
  </div>
</footer>`;
};

const breadcrumbLd = (site, crumbs) => ({
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, item: site.baseUrl + c.href })),
});

export const breadcrumbs = (crumbs) => `<nav class="crumbs" aria-label="Breadcrumb">
    ${crumbs.map((c, i) => (i === crumbs.length - 1
    ? `<span class="current"${c.mono ? ' data-mono' : ''}>${t(c.label)}</span>`
    : `<a href="${attr(c.href)}">${t(c.label)}</a><span aria-hidden="true">›</span>`)).join('')}
  </nav>`;

/**
 * 页面骨架。
 * @param {object} o
 * @param {object} o.site      site.json
 * @param {object} o.meta      {title, meta_description, robots, h1}
 * @param {string} o.path      '/products/'
 * @param {string} o.body      <main> 内容
 * @param {string} [o.ctaHref] 粘性条 / 导航按钮链接（型号页 / 分类页预填）
 * @param {Array}  [o.crumbs]  面包屑 → BreadcrumbList
 * @param {Array}  [o.jsonld]  额外 JSON-LD 对象
 * @param {string} [o.ldNotes] JSON-LD 缺字段说明（HTML 注释）
 * @param {string} [o.bodyClass]
 */
export const page = ({ site, meta, path, body, ctaHref, crumbs, jsonld = [], ldNotes = '', bodyClass = '' }) => {
  const cta = ctaHref || site.cta.primaryHref;
  const noindex = String(meta.robots || 'index').toLowerCase() === 'noindex';
  const canonical = site.baseUrl + path;
  const ld = [...(crumbs && crumbs.length > 1 ? [breadcrumbLd(site, crumbs)] : []), ...jsonld];
  const ldScripts = ld.map((o) => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...o }).replace(/</g, '\\u003c')}</script>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.title)}</title>
<meta name="description" content="${attr(meta.meta_description)}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow">'}
<link rel="canonical" href="${attr(canonical)}">
<link rel="stylesheet" href="/assets/site.css">
<script>document.documentElement.classList.replace('no-js','js')</script>
<script src="/assets/site.js" defer></script>
${ldNotes ? `<!-- JSON-LD 缺字段（上线前补）：${esc(ldNotes)} -->` : ''}
${ldScripts}
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
${defs()}
<a class="skip" href="#main">Skip to content</a>
${nav(site, path, cta)}
<main id="main">
${body}
</main>
${footer(site)}
<div class="sticky-bar">
  <a class="btn btn-primary" href="${attr(cta)}">${t(site.cta.primary)}</a>
</div>
</body>
</html>
`;
};

export { pitchRule, icons, join };
