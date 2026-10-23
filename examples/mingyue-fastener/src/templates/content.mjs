import { t, attr } from '../html.mjs';
import { customBolt, carrier, icons, pitchRule } from '../svg.mjs';
import { placeholder, steps, counter, kvTable, tableScroll, arrowLink, accordion, faqLd, pageHead } from './parts.mjs';
import { ctaEnd, breadcrumbs } from './layout.mjs';

const crumbs = (label, href) => `<div class="container">${breadcrumbs([{ label: 'Home', href: '/' }, { label, href }])}</div>`;

/** P4 Custom Cold-Formed Parts */
export const customBody = ({ site, pg }) => `
${crumbs('Custom Cold-Formed Parts', '/custom-cold-formed-parts/')}
${pageHead({
  h1: pg.h1, sub: pg.sub, primary: pg.primary, secondary: pg.secondary,
  aside: `<figure class="figure">${customBolt('t-custom', pg.figureTitle, pg.figureAlt)}<figcaption>${t(pg.figcaption)}</figcaption></figure>`,
})}
<section class="section-sm container" id="process">
  <h2 class="h2">${t(pg.process.h2)}</h2>
  <ol class="process-steps">
${pg.process.steps.map((s, i) => `    <li class="reveal" style="--i:${i}">
      <span class="num">0${i + 1}</span>
      <div><h3 class="h3">${t(s.title)}</h3><p>${t(s.text)}</p></div>
    </li>`).join('\n')}
  </ol>
</section>
<section class="section-sm section-alt">
  <div class="container two-col">
    <div>
      <h2 class="h2">${t(pg.capability.h2)}</h2>
      ${tableScroll(kvTable(pg.capability.rows, { cls: 'spec mt-5', left: true }))}
    </div>
    <div>
      <h2 class="h2">${t(pg.case.h2)}</h2>
      <article class="card case-card mt-5">
        ${customBolt('t-case', pg.case.title, pg.case.figureAlt)}
        <h3 class="h3 mt-4">${t(pg.case.title)}</h3>
        <p class="mt-2">${t(pg.case.text)}</p>
      </article>
    </div>
  </div>
</section>
<section class="section-sm container prose-max">
  <h2 class="h2">${t(pg.faq.h2)}</h2>
  <div class="mt-5">${accordion(pg.faq.items, 'custom-faq')}</div>
</section>
${ctaEnd(site, { title: pg.ctaEnd.title, sub: null, primary: pg.ctaEnd.primary })}
`;

/** P5 Quality & Downloads */
export const qualityBody = ({ site, pg }) => `
${crumbs('Quality & Downloads', '/quality-downloads/')}
${pageHead({ h1: pg.h1, sub: pg.sub, primary: pg.primary, secondary: pg.secondary })}
<section class="section-sm container" id="inspection">
  <h2 class="h2">${t(pg.inspection.h2)}</h2>
  ${tableScroll(`<table class="spec mt-5">
    <thead><tr>${pg.inspection.head.map((h, i) => `<th scope="col"${i === 1 ? ' class="num"' : ''}>${t(h)}</th>`).join('')}</tr></thead>
    <tbody>${pg.inspection.rows.map((r) => `<tr><th scope="row">${t(r.equipment)}</th><td class="val">${t(r.qty)}</td><td>${t(r.purpose)}</td></tr>`).join('')}</tbody>
  </table>`)}
  <div class="photo-grid mt-5">
    ${pg.inspection.photos.map((p) => placeholder({ todo: p.todo, alt: p.alt, spec: p.spec })).join('\n    ')}
  </div>
</section>
<section class="section-sm section-alt" id="downloads">
  <div class="container">
    <h2 class="h2">${t(pg.downloads.h2)}</h2>
    <div class="dl-grid mt-5">
${pg.downloads.columns.map((c) => `      <div class="dl-col" id="${attr(c.id)}">
        <h3 class="h3">${icons[c.icon === 'ic-cert' ? 'cert' : 'file']()}${t(c.title)}</h3>
        <ul>
          ${c.items.map((it) => `<li><span>${t(it.label)}</span><span class="meta">${t(pg.downloads.pdfComing)}</span></li><li><span>${t(it.todo)}</span></li>`).join('\n          ')}
        </ul>
        ${c.link ? `<p class="mt-3">${arrowLink(c.link)}</p>` : ''}
      </div>`).join('\n')}
    </div>
  </div>
</section>
<section class="section-sm container prose-max" id="compliance">
  <h2 class="h2">${t(pg.compliance.h2)}</h2>
  <div class="mt-5">${accordion(pg.compliance.items, 'compliance')}</div>
</section>
${ctaEnd(site, { title: pg.ctaEnd.title, sub: null, primary: pg.ctaEnd.primary })}
`;

/** P6 About Us */
export const aboutBody = ({ site, pg }) => `
${crumbs('About Us', '/about/')}
${pageHead({
  h1: pg.h1, sub: pg.body, primary: pg.primary, secondary: pg.secondary,
  aside: placeholder({ todo: pg.photo.todo, alt: pg.photo.alt, spec: pg.photo.spec, ratio: '16/9' }),
  extra: `<p class="muted small mt-5">${t(pg.founderNote)}</p>`,
})}
<section class="section-sm section-alt" id="process">
  <div class="container">
    <h2 class="h2">${t(pg.process.h2)}</h2>
    <div class="bento mt-5" data-frame="4">
      <div class="cell cell-carrier">
        ${carrier('t-carrier', 'DIN912-M6x20-12.9-BO — process carrier', pg.process.carrierAlt)}
      </div>
      <div class="cell cell-steps">${steps(pg.process.steps, { frames: false })}</div>
${pg.process.counters.map((c, i) => counter(c).replace('class="cell counter reveal"', `class="cell counter reveal" style="--i:${i}"`)).join('\n')}
    </div>
  </div>
</section>
<section class="section-sm container" id="equipment">
  <h2 class="h2">${t(pg.equipment.h2)}</h2>
  ${tableScroll(`<table class="spec mt-5">
    <thead><tr>${pg.equipment.head.map((h, i) => `<th scope="col"${i === 1 ? ' class="num"' : ''}>${t(h)}</th>`).join('')}</tr></thead>
    <tbody>${pg.equipment.rows.map((r) => `<tr><th scope="row">${t(r.equipment)}</th><td class="val">${t(r.qty)}</td><td>${t(r.note)}</td></tr>`).join('')}</tbody>
  </table>`)}
  <div class="photo-grid mt-5">
    ${pg.equipment.photos.map((p) => placeholder({ todo: p.todo, alt: p.alt, spec: p.spec })).join('\n    ')}
  </div>
</section>
<section class="section-sm section-alt">
  <div class="container two-col">
    <div id="milestones">
      <h2 class="h2">${t(pg.milestones.h2)}</h2>
      <ol class="timeline mt-5">
        ${pg.milestones.items.map((m) => `<li><span class="year mono">${t(m.year)}</span><span>${t(m.text)}</span></li>`).join('\n        ')}
      </ol>
    </div>
    <div id="customers">
      <h2 class="h2">${t(pg.customers.h2)}</h2>
      <p class="mt-5 prose">${t(pg.customers.text)}</p>
    </div>
  </div>
</section>
${ctaEnd(site, { title: pg.ctaEnd.title, sub: null, primary: pg.ctaEnd.primary })}
`;

/** P7 News & Trade Fairs */
export const newsBody = ({ site, pg }) => `
<div class="container">${breadcrumbs([{ label: 'Home', href: '/' }, { label: 'About Us', href: '/about/' }, { label: 'News & Trade Fairs', href: '/about/news/' }])}</div>
${pageHead({ h1: pg.h1 })}
<section class="section-sm container prose-max">
  ${pg.items.map((n) => `<article class="news-item"><h2 class="h3">${t(n.h2)}</h2><p class="mt-2">${t(n.text)}</p></article>`).join('\n  ')}
</section>
${ctaEnd(site, { primary: pg.ctaEnd.primary })}
`;

/** P8 FAQ：三组 H2 + Accordion；FAQPage JSON-LD */
export const faqBody = ({ site, pg }) => `
${crumbs('FAQ', '/faq/')}
${pageHead({ h1: pg.h1 })}
<section class="section-sm container prose-max">
${pg.groups.map((g) => `  <div class="faq-group" id="${attr(g.id)}">
    <h2 class="h2">${t(g.h2)}</h2>
    <div class="mt-4">${accordion(g.items, `faq-${g.id}`)}</div>
  </div>`).join('\n')}
</section>
${ctaEnd(site, { title: pg.ctaEnd.title, sub: null, primary: pg.ctaEnd.primary })}
`;

export { faqLd };
