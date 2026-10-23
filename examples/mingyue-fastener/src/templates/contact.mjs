import { t, attr, esc } from '../html.mjs';
import { icons } from '../svg.mjs';
import { pageHead, arrowLink } from './parts.mjs';
import { breadcrumbs } from './layout.mjs';

const field = (f, countries) => {
  const id = `f-${f.name}`;
  const req = f.required ? ' required aria-required="true"' : '';
  const star = f.required ? ' <span class="req" aria-hidden="true">*</span>' : '';
  const errId = `${id}-err`;
  const help = f.help ? `<span class="help" id="${id}-help">${t(f.help)}</span>` : '';
  const describedBy = [f.help ? `${id}-help` : '', f.required ? errId : ''].filter(Boolean).join(' ');
  const aria = describedBy ? ` aria-describedby="${describedBy}"` : '';
  let control;
  if (f.type === 'textarea') {
    control = `<textarea class="input" id="${id}" name="${attr(f.name)}" rows="5" placeholder="${attr(f.placeholder)}"${req}${aria}></textarea>`;
  } else if (f.type === 'select') {
    const first = f.first || [];
    const rest = countries.filter((c) => !first.includes(c));
    control = `<select class="input" id="${id}" name="${attr(f.name)}" autocomplete="${attr(f.autocomplete || 'off')}"${aria}>
        <option value=""></option>
        ${first.map((c) => `<option>${esc(c)}</option>`).join('')}
        <option disabled>──────</option>
        ${rest.map((c) => `<option>${esc(c)}</option>`).join('')}
      </select>`;
  } else if (f.type === 'file') {
    control = `<input class="input input-file" id="${id}" name="${attr(f.name)}" type="file" accept="${attr(f.accept)}"${aria}>`;
  } else {
    control = `<input class="input${f.mono ? ' mono' : ''}" id="${id}" name="${attr(f.name)}" type="${attr(f.type)}" placeholder="${attr(f.placeholder || '')}"${f.autocomplete ? ` autocomplete="${attr(f.autocomplete)}"` : ''}${f.inputmode ? ` inputmode="${attr(f.inputmode)}"` : ''}${req}${aria}>`;
  }
  return `<div class="field" data-field="${attr(f.name)}">
      <label for="${id}">${t(f.label)}${star}</label>
      ${control}
      ${help}
      ${f.required ? `<span class="error" id="${errId}" role="status" data-error="${attr(f.error)}"></span>` : ''}
    </div>`;
};

/** P9 Contact：表单（蜜罐、校验、加载态）+ 右栏联系信息。action 为占位，接收端由后端配置。 */
export const contactBody = ({ site, pg, countries }) => {
  const f = pg.form;
  return `
<div class="container">${breadcrumbs([{ label: 'Home', href: '/' }, { label: 'Contact', href: '/contact/' }])}</div>
${pageHead({ h1: pg.h1, sub: pg.intro })}
<section class="section-sm container contact">
  <form class="inquiry" method="post" action="/contact/thank-you/" data-inquiry data-endpoint="${attr(f.endpoint || '')}" data-thanks="/contact/thank-you/" novalidate>
    <div class="form-alert" role="alert" data-alert hidden>${t(f.errorBanner)}</div>
    <fieldset>
      <legend class="sr-only">Inquiry</legend>
      <input type="hidden" name="topic" value="quote" data-topic>
      <!-- 蜜罐：机器人会填，人看不见；提交时非空即丢 -->
      <div class="hp" aria-hidden="true"><label for="website">Website</label><input id="website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
      ${f.fields.map((x) => field(x, countries)).join('\n      ')}
      <p class="small muted">${t(f.requiredNote)}</p>
      <div class="submit-row">
        <button class="btn btn-primary" type="submit" data-submit data-sending="${attr(f.sending)}"><span class="btn-spinner">${icons.spinner()}</span><span class="btn-label">${t(f.submit)}</span></button>
        <span class="small muted">${t(f.consent).replace(esc(f.consentLink.label), `<a href="${attr(f.consentLink.href)}">${esc(f.consentLink.label)}</a>`)}</span>
      </div>
      <p class="small muted endpoint-note">${t(f.endpointNote)}: ${t(f.endpointTodo)}</p>
    </fieldset>
  </form>
  <aside class="contact-aside">
    <div class="card">
      <h2 class="h3">${t(pg.aside.title)}</h2>
      <address class="mt-3">
        ${t(site.address.street)},<br>${t(site.address.city)}, ${t(site.address.region)}, ${t(site.address.country)}<br>
        <a href="mailto:${attr(site.email)}"><strong>${t(site.email)}</strong></a><br>
        ${t(pg.aside.phoneLabel)} ${t(site.phone)}<br>
        ${t(pg.aside.hoursLabel)} ${t(site.officeHours)}, ${t(site.timezone)}
      </address>
    </div>
  </aside>
</section>
`;
};

/** Thank You（noindex） */
export const thankYouBody = ({ pg }) => `
<section class="section container thanks">
  <h1>${t(pg.thankYou.h1)}</h1>
  <p class="lead mt-4">${t(pg.thankYou.text)}</p>
  <div class="actions mt-6">
    <a class="btn btn-secondary" href="${attr(pg.thankYou.secondary.href)}">${t(pg.thankYou.secondary.label)}</a>
    ${arrowLink(pg.thankYou.link)}
  </div>
</section>
`;
