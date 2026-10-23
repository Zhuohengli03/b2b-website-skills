import { t, attr, parseModel } from '../html.mjs';
import { drawing, icons, pitchRule } from '../svg.mjs';
import { kvTable, tableScroll, arrowLink } from './parts.mjs';
import { ctaEnd, breadcrumbs } from './layout.mjs';

/** 型号页（P3 模板）。Tabs 用 radio + label（纯 CSS，键盘方向键可切换）。 */
export const modelBody = ({ site, m, cat, labels, drawingSize }) => {
  const quote = `/contact/?model=${encodeURIComponent(m.model_string)}`;
  const cert = `${quote}&topic=3.1`;
  const specRows = [
    { k: 'Standard', v: m.standard },
    { k: 'Thread', v: m.thread_text },
    { k: 'Length', v: String(m.length_mm), unit: 'mm' },
    { k: 'Property class', v: m.property_class_text, highlight: true },
    { k: 'Material', v: m.material },
    { k: 'Surface', v: m.surface_text || m.surface },
    { k: 'Tolerance', v: m.tolerance },
    { k: 'Tensile strength', v: m.tensile, unit: m.tensile_unit },
    { k: 'Salt spray', v: m.salt_spray, note: m.salt_spray_note, unit: 'h' },
    { k: 'Inch reference', v: m.inch_reference, unit: 'in' },
  ];
  const related = (m.related || []).map((r) => parseModel(r));
  const drawId = 't-draw';

  const body = `
<div class="container">
  ${breadcrumbs([
    { label: 'Home', href: '/' }, { label: 'Products', href: '/products/' },
    { label: cat.crumb, href: `/products/${cat.slug}/` }, { label: m.model_string, href: `/products/${m.slug}/`, mono: true },
  ])}
  <header class="product-head">
    <span class="eyebrow">${t(m.eyebrow)}</span>
    <h1 class="mt-2">${t(m.h1)}</h1>
    <span class="model">${t(m.model_string)}</span>
  </header>

  <div class="product">
    <figure class="drawing-panel">
      <div class="head">
        <span class="eyebrow">${t(m.drawing_label)}</span>
        <span class="mono muted">${t(m.drawing_scale)}</span>
      </div>
      ${drawing(m.drawing, drawId, m.model_string, m.drawing_alt)}
      <div class="dims" aria-label="Nominal dimensions">
        ${m.drawing_dims.map((d) => `<div><span class="k">${t(d.k)}</span><span class="v">${t(d.v)}</span></div>`).join('')}
      </div>
      <figcaption class="foot">${t(m.drawing_foot)}</figcaption>
    </figure>

    <div>
      <div class="quote-strip">
        <dl>
          ${m.quote_strip.map((q) => `<div><dt>${t(q.k)}</dt><dd>${t(q.v)}</dd></div>`).join('')}
        </dl>
        <div class="actions">
          <a class="btn btn-primary" href="${attr(quote)}">${t(site.cta.primary)}</a>
          <a class="btn btn-secondary" href="${attr(cert)}">Request 3.1 Certificate</a>
        </div>
      </div>

      <div class="tabs">
        <input type="radio" name="tabs" id="tab-spec" checked>
        <input type="radio" name="tabs" id="tab-dl">
        <input type="radio" name="tabs" id="tab-alt">
        <div class="tablist">
          <label for="tab-spec">Specifications</label>
          <label for="tab-dl">Downloads</label>
          <label for="tab-alt">Alternatives</label>
        </div>
        <div class="panels">
          <div class="panel panel-spec" id="specifications">
            ${tableScroll(kvTable(specRows, { units: true }))}
            <p class="dl-note">${t(m.moq_line)}</p>
          </div>

          <div class="panel panel-dl" id="downloads">
            <div class="dl-grid">
              <div class="dl-col">
                <div class="h3">${icons.file()}Datasheet</div>
                <ul>
                  <li><span>Datasheet (PDF)</span><span class="meta">${t(labels.pdfComing)}</span></li>
                  <li><span>${t(m.downloads_datasheet_todo)}</span></li>
                </ul>
              </div>
              <div class="dl-col">
                <div class="h3">${icons.drawing()}Drawing</div>
                <ul>
                  <li><a href="/products/${attr(m.slug)}/drawing.svg" download="${attr(m.model_string)}.svg">Drawing (SVG)</a><span class="meta">SVG · ${drawingSize}</span></li>
                  <li><span class="muted">${t(m.drawing_dims_text)}</span></li>
                </ul>
              </div>
              <div class="dl-col">
                <div class="h3">${icons.cert()}Certificates</div>
                <ul>
                  <li><span>ISO 9001:2015 (PDF)</span><span class="meta">${t(labels.pdfComing)}</span></li>
                  <li><span>IATF 16949 (PDF)</span><span class="meta">${t(labels.pdfComing)}</span></li>
                  <li><span>${t(m.downloads_cert_todo)}</span></li>
                </ul>
              </div>
            </div>
            <p class="dl-note">${t(m.downloads_note)}</p>
          </div>

          <div class="panel panel-alt" id="alternatives">
            <p class="prose">${t(m.alternatives_text)}</p>
            ${tableScroll(`<table class="spec mt-4">
              <thead><tr><th scope="col">Model</th><th scope="col">Surface</th><th scope="col" class="num">Class</th><th scope="col">Status</th></tr></thead>
              <tbody>
                ${m.alternatives.map((a) => `<tr><td class="model"><span class="mono">${t(a.model_string)}</span></td><td>${t(a.surface)}</td><td class="val">${t(a.property_class)}</td><td class="note">${t(a.status)}</td></tr>`).join('\n                ')}
              </tbody>
            </table>`)}
          </div>
        </div>
      </div>
    </div>
  </div>

  ${pitchRule()}

  <section class="related" id="related">
    <div class="section-head row">
      <h2 class="h2">${t(m.related_title)}</h2>
      ${arrowLink({ label: 'Browse all sizes', href: `/products/?category=${cat.slug}` })}
    </div>
    ${tableScroll(`<table class="spec">
      <thead><tr><th scope="col">Model</th><th scope="col" class="num">Thread × length</th><th scope="col" class="num">Class</th><th scope="col">Surface</th><th scope="col">Availability</th></tr></thead>
      <tbody>
        ${related.map((r) => `<tr class="is-placeholder"><td class="model"><span class="mono muted">${t(r.model_string)}</span></td><td class="val">${t(r.thread)} × ${r.length_mm}</td><td class="val">${t(r.property_class)}</td><td>${t(r.surface)}</td><td class="note">${t(labels.placeholderRelated)}</td></tr>`).join('\n        ')}
      </tbody>
    </table>`)}
  </section>
</div>

${ctaEnd(site, { primary: { label: site.cta.primary, href: quote } })}
`;
  return { body, ctaHref: quote };
};

/** Product JSON-LD；没有价格（B2B 报价制），offers 不写，缺字段在注释里标出。 */
export const productLd = (site, m, cat, meta) => ({
  '@type': 'Product',
  name: m.h1,
  sku: m.model_string,
  mpn: m.model_string,
  url: `${site.baseUrl}/products/${m.slug}/`,
  image: `${site.baseUrl}/products/${m.slug}/drawing.svg`,
  description: meta.meta_description,
  category: cat.h1,
  material: m.material,
  brand: { '@type': 'Brand', name: site.name },
  manufacturer: { '@type': 'Organization', name: site.name },
  additionalProperty: [
    { '@type': 'PropertyValue', name: 'Standard', value: m.standard },
    { '@type': 'PropertyValue', name: 'Thread', value: m.thread },
    { '@type': 'PropertyValue', name: 'Length', value: `${m.length_mm} mm` },
    { '@type': 'PropertyValue', name: 'Property class', value: m.property_class },
    { '@type': 'PropertyValue', name: 'Surface', value: m.surface_text || m.surface },
    { '@type': 'PropertyValue', name: 'Tolerance', value: m.tolerance },
    { '@type': 'PropertyValue', name: 'Tensile strength', value: `${m.tensile} ${m.tensile_unit}` },
    { '@type': 'PropertyValue', name: 'Salt spray', value: m.salt_spray === '—' ? '—' : `${m.salt_spray} h` },
  ],
});
