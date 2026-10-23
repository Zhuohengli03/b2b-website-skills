import { t, attr, parseModel, slugify } from '../html.mjs';
import { drawing, icons, pitchRule } from '../svg.mjs';
import { placeholder, tableScroll, arrowLink, pageHead } from './parts.mjs';
import { ctaEnd, breadcrumbs } from './layout.mjs';

const uniq = (a) => [...new Set(a)];

/** 真实型号 + D18 占位型号（来自各型号页的「同类型号」模板，不可点、灰字）。 */
export const buildRows = (models, categories, labels) => {
  const real = models.map((m) => ({ ...m, placeholder: false, href: `/products/${m.slug}/`, cats: [m.category, ...(m.also_in || [])] }));
  const seen = new Set(models.map((m) => m.model_string));
  const ph = [];
  for (const m of models) {
    for (const rel of m.related || []) {
      if (seen.has(rel)) continue;
      seen.add(rel);
      const p = parseModel(rel);
      ph.push({ ...p, slug: slugify(rel), placeholder: true, cats: [m.category, ...(m.also_in || [])], application: m.application, salt_spray_list: '—', status: labels.placeholderRelated, parent: m.model_string });
    }
  }
  return { real, placeholders: ph };
};

const rowAttrs = (r) => ` data-category="${attr(r.cats.join(' '))}" data-standard="${attr(r.standard)}" data-thread="${attr(r.thread)}" data-length="${attr(r.length_mm)}" data-class="${attr(r.property_class)}" data-surface="${attr(r.surface)}" data-application="${attr((r.application || []).join(' '))}" data-search="${attr(`${r.model_string} ${r.standard}`.toLowerCase())}"`;

const catalogRow = (r) => (r.placeholder
  ? `<tr class="is-placeholder"${rowAttrs(r)}><td class="model"><span class="mono muted">${t(r.model_string)}</span></td><td>${t(r.standard)}</td><td class="val">${t(r.thread)} × ${r.length_mm}</td><td class="val">${t(r.property_class)}</td><td>${t(r.surface)}</td><td class="note">${t(r.status)}</td></tr>`
  : `<tr class="is-link"${rowAttrs(r)} data-href="${attr(r.href)}"><td class="model"><a href="${attr(r.href)}">${t(r.model_string)}</a></td><td>${t(r.standard)}</td><td class="val">${t(r.thread)} × ${r.length_mm}</td><td class="val">${t(r.property_class)}</td><td>${t(r.surface)}</td><td class="val">${t(r.salt_spray_list)}</td></tr>`);

/** Products 目录页（P1）：左粘性筛选栏 + 右表格；URL 参数可分享，无 JS 显示全表。 */
export const productsBody = ({ site, pg, models, categories }) => {
  const { real, placeholders } = buildRows(models, categories, pg.table);
  const all = [...real, ...placeholders];
  const values = {
    category: categories.map((c) => ({ v: c.slug, label: c.shortName })),
    standard: uniq(real.map((m) => m.standard)).map((v) => ({ v, label: v })),
    thread: uniq(real.map((m) => m.thread)).sort().map((v) => ({ v, label: v })),
    length: uniq(real.map((m) => m.length_mm)).sort((a, b) => a - b).map((v) => ({ v, label: `${v} mm` })),
    class: uniq(real.map((m) => m.property_class)).sort().map((v) => ({ v, label: v })),
    surface: uniq(real.map((m) => m.surface)).map((v) => ({ v, label: v })),
    application: pg.filters.groups.find((g) => g.key === 'application').values.map((v) => ({ v, label: v })),
  };
  const groups = pg.filters.groups.map((g) => `<fieldset class="filter-group">
        <legend>${t(g.label)}</legend>
        ${values[g.key].map((o, i) => `<label class="check"><input type="checkbox" name="${attr(g.key)}" value="${attr(o.v)}" id="f-${attr(g.key)}-${i}"> <span>${t(o.label)}</span></label>`).join('\n        ')}
        ${g.placeholder ? `<span class="filter-todo muted">${t(g.placeholder)}</span>` : ''}
      </fieldset>`).join('\n');

  const body = `
<div class="container">
  ${breadcrumbs([{ label: 'Home', href: '/' }, { label: 'Products', href: '/products/' }])}
</div>
${pageHead({ h1: pg.h1, sub: pg.intro })}
<section class="catalog container">
  <aside class="filters" id="filters">
    <button class="filters-toggle btn btn-secondary" type="button" aria-expanded="false" aria-controls="filters-body">${icons.filter()} <span>${t(pg.filters.title)}</span> <span class="count" data-filter-count></span></button>
    <form class="filters-body" id="filters-body" method="get" action="/products/" data-filter-form>
      <div class="filters-head">
        <span class="eyebrow">${t(pg.filters.title)}</span>
        <button type="reset" class="btn-link" data-clear>${t(pg.filters.clear)}</button>
      </div>
      <label class="sr-only" for="s">${t(site.search.label)}</label>
      <input class="input mono" id="s" name="s" type="search" placeholder="${attr(site.search.placeholder)}" autocomplete="off">
      ${groups}
      <noscript><button class="btn btn-primary mt-4" type="submit">Apply filters</button></noscript>
    </form>
  </aside>
  <div class="results">
    <p class="results-count muted" aria-live="polite"><span data-result-count data-one="${attr(pg.table.resultsLabelOne)}" data-many="${attr(pg.table.resultsLabel)}">${real.length}</span> ${t(real.length === 1 ? pg.table.resultsLabelOne : pg.table.resultsLabel)}</p>
    ${tableScroll(`<table class="spec catalog-table" data-catalog>
      <thead><tr>${pg.table.head.map((h, i) => `<th scope="col"${i >= 2 && i !== 4 ? ' class="num"' : ''}>${t(h)}</th>`).join('')}</tr></thead>
      <tbody>
${all.map(catalogRow).join('\n')}
        <tr class="is-placeholder is-note" data-note><td class="model"><span class="mono muted">${t(pg.table.placeholderRow)}</span></td><td>—</td><td class="val">—</td><td class="val">—</td><td>—</td><td class="val">—</td></tr>
      </tbody>
    </table>`)}
    <div class="empty" data-empty hidden>
      <p>${t(pg.table.empty)}</p>
      ${arrowLink(pg.table.emptyLink)}
    </div>
    <nav class="pager" data-pager hidden aria-label="Pagination"></nav>
    <p class="tail">${t(pg.tail.text)} ${arrowLink(pg.tail.link)}</p>
  </div>
</section>
${ctaEnd(site, { primary: pg.ctaEnd.primary })}
`;
  return body;
};

/** 分类页（P2 模板，4 页） */
export const categoryBody = ({ site, cat, pg, models, categories }) => {
  const { real, placeholders } = buildRows(models, categories, pg.table);
  const rows = [...real, ...placeholders].filter((r) => r.cats.includes(cat.slug));
  const row = (r) => (r.placeholder
    ? `<tr class="is-placeholder"><td class="model"><span class="mono muted">${t(r.model_string)}</span></td><td class="val">${t(r.thread)} × ${r.length_mm}</td><td class="val">${t(r.property_class)}</td><td>${t(r.surface)}</td><td class="note">${t(r.status)}</td></tr>`
    : `<tr class="is-link" data-href="${attr(r.href)}"><td class="model"><a href="${attr(r.href)}">${t(r.model_string)}</a></td><td class="val">${t(r.thread)} × ${r.length_mm}</td><td class="val">${t(r.property_class)}</td><td>${t(r.surface)}</td><td>${t(r.key_value)}</td></tr>`);
  const quoteHref = `/contact/?category=${cat.slug}`;
  const body = `
<div class="container">
  ${breadcrumbs([{ label: 'Home', href: '/' }, { label: 'Products', href: '/products/' }, { label: cat.crumb, href: `/products/${cat.slug}/` }])}
</div>
${pageHead({
    h1: cat.h1, sub: cat.sub,
    primary: { label: site.cta.primary, href: quoteHref },
    secondary: { label: 'Download Datasheet', href: '/quality-downloads/#datasheets' },
    aside: `<figure class="drawing-panel"><div class="head"><span class="eyebrow">${t(cat.standard)}</span></div>${drawing(cat.drawing, `t-cat-${cat.slug}`, cat.h1, cat.drawingAlt)}</figure>`,
  })}
<section class="section-sm container">
  <div class="section-head row">
    <span class="eyebrow">${t(cat.standard)}</span>
    ${arrowLink({ label: 'Filter all sizes', href: `/products/?category=${cat.slug}` })}
  </div>
  ${tableScroll(`<table class="spec">
    <thead><tr><th scope="col">Model</th><th scope="col" class="num">Thread × length</th><th scope="col" class="num">Class</th><th scope="col">Surface</th><th scope="col">Key value</th></tr></thead>
    <tbody>
${rows.map(row).join('\n')}
      <tr class="is-placeholder is-note"><td class="model"><span class="mono muted">${t(cat.tablePlaceholder)}</span></td><td class="val">—</td><td class="val">—</td><td>—</td><td>—</td></tr>
    </tbody>
  </table>`)}
</section>
<section class="section-sm section-alt">
  <div class="container prose-2">
    <div>
      <h2 class="h2">${t(cat.standardsTitle)}</h2>
      <p class="mt-4">${t(cat.standardsBody)}</p>
    </div>
    <div>
      <h2 class="h2">${t(cat.processTitle)}</h2>
      <p class="mt-4">${t(cat.processBody)}</p>
      ${placeholder({ todo: cat.photoTodo, alt: cat.photoAlt, spec: cat.photoSpec, cls: 'mt-5' })}
    </div>
  </div>
</section>
${ctaEnd(site, { title: cat.ctaTitle, sub: null, primary: { label: site.cta.primary, href: quoteHref } })}
`;
  return { body, ctaHref: quoteHref };
};
