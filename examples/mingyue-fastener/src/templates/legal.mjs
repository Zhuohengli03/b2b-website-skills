import { t, attr } from '../html.mjs';
import { pageHead } from './parts.mjs';
import { breadcrumbs } from './layout.mjs';

export const privacyBody = ({ pg }) => `
<div class="container">${breadcrumbs([{ label: 'Home', href: '/' }, { label: 'Privacy Policy', href: '/privacy/' }])}</div>
${pageHead({ h1: pg.h1 })}
<section class="section-sm container prose-max legal">
  ${pg.sections.map((s) => `<h2 class="h3">${t(s.h2)}</h2><p>${t(s.p)}</p>`).join('\n  ')}
</section>
`;

export const imprintBody = ({ pg }) => `
<div class="container">${breadcrumbs([{ label: 'Home', href: '/' }, { label: 'Imprint', href: '/imprint/' }])}</div>
${pageHead({ h1: pg.h1 })}
<section class="section-sm container prose-max legal">
  <dl class="imprint">
    ${pg.rows.map((r) => `<div><dt>${t(r.k)}</dt><dd>${r.mailto ? `<a href="mailto:${attr(r.v)}">${t(r.v)}</a>` : t(r.v)}</dd></div>`).join('\n    ')}
  </dl>
</section>
`;

export const notFoundBody = ({ pg }) => `
<section class="section container thanks">
  <h1>${t(pg.h1)}</h1>
  <p class="lead mt-4">${t(pg.text)}</p>
  <div class="actions mt-6">
    <a class="btn btn-primary" href="${attr(pg.primary.href)}">${t(pg.primary.label)}</a>
    <a class="btn btn-secondary" href="${attr(pg.secondary.href)}">${t(pg.secondary.label)}</a>
  </div>
</section>
`;
