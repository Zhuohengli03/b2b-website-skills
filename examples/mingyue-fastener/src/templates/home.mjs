import { t, attr } from '../html.mjs';
import { heroDrawing, carrier, catIcons, customBolt, icons, pitchRule } from '../svg.mjs';
import { placeholder, steps, counter, certCard, kvTable, arrowLink } from './parts.mjs';
import { ctaEnd } from './layout.mjs';

export const homeBody = ({ site, home, categories }) => {
  const h = home.hero;
  const sc = h.specCard;
  const cards = [
    ...categories.map((c) => ({ name: c.name, std: c.standardCard || c.standard, params: c.cardParams, href: `/products/${c.slug}/`, icon: c.icon, iconAlt: c.cardIconAlt })),
    home.categories.customCard,
  ];
  const p = home.process;

  return `
<!-- H1 首屏（静态，无轮播）：左 H1 + 副句 + 双按钮；右代表型号参数卡 -->
<section class="hero">
  <div class="container">
    <div>
      <h1>${t(h.h1)}</h1>
      <div class="rule" aria-hidden="true"></div>
      <p class="sub">${t(h.sub)}</p>
      <div class="actions">
        <a class="btn btn-primary" href="${attr(h.primary.href)}">${t(h.primary.label)}</a>
        <a class="btn btn-secondary" href="${attr(h.secondary.href)}">${t(h.secondary.label)}</a>
      </div>
    </div>
    <aside class="spec-card" aria-label="Representative model ${attr(sc.model)}">
      <div class="head">
        <span class="model">${t(sc.model)}</span>
        <span class="badge">${t(sc.badge)}</span>
      </div>
      ${heroDrawing('t-hero-draw', sc.model, sc.drawingAlt)}
      ${kvTable(sc.rows)}
      <div class="foot">
        <span class="muted">${t(sc.footText)}</span>
        ${arrowLink(sc.footLink)}
      </div>
    </aside>
  </div>
</section>

<div class="container">${pitchRule()}</div>

<!-- H2 产品分类：5 张信息卡 -->
<section class="section" id="products">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow">${t(home.categories.eyebrow)}</span>
      <h2 class="h2">${t(home.categories.h2)}</h2>
    </div>
    <div class="cat-grid">
${cards.map((c, i) => `      <a class="card cat-card reveal" style="--i:${i}" href="${attr(c.href)}">
        ${catIcons[c.icon](attr(c.iconAlt))}
        <div>
          <div class="name">${t(c.name)}</div>
          <div class="std">${t(c.std)}</div>
          <div class="params">${t(c.params)}</div>
        </div>
      </a>`).join('\n')}
    </div>
  </div>
</section>

<!-- H3 工艺链 + 数字（Bento；全站唯一一段载体场景段，data-frame 1–4 由滚动位置驱动，默认第 4 帧） -->
<section class="section section-alt" id="process">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow">${t(p.eyebrow)}</span>
      <h2 class="h2">${t(p.h2)}</h2>
    </div>
    <div class="bento" data-carrier data-frame="4">
      <div class="cell cell-carrier reveal" style="--i:0">
        ${carrier('t-carrier', `${p.carrierModel} — process carrier`, p.carrierAlt)}
        <div class="progress">
          <span>${t(p.carrierModel)}</span>
          <span><span data-progress>04</span> / 04</span>
        </div>
      </div>
      <div class="cell cell-steps reveal" style="--i:1">
        ${steps(p.steps)}
      </div>
      <div class="cell cell-photo reveal" style="--i:2">
        ${placeholder({ todo: p.photo.todo, alt: p.photo.alt, caption: p.photo.caption, spec: p.photo.spec, cls: 'fill' })}
      </div>
${p.counters.map((c, i) => counter(c).replace('class="cell counter reveal"', `class="cell counter reveal" style="--i:${i + 3}"`)).join('\n')}
    </div>
  </div>
</section>

<!-- H4 质量与下载（证据区） -->
<section class="section" id="quality">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow">${t(home.quality.eyebrow)}</span>
      <h2 class="h2">${t(home.quality.h2)}</h2>
      <p class="lead">${t(home.quality.lead)}</p>
    </div>
    <div class="cert-grid">
${home.quality.certs.map((c) => certCard(c, home.quality)).join('\n')}
    </div>
    <p class="mt-5">${arrowLink(home.quality.link)}</p>
  </div>
</section>

<!-- H5 中段 CTA（证据后；白底边框条） -->
<section class="cta-mid" id="cta-mid">
  <div class="container">
    <div class="bar">
      <div>
        <h2 class="h2">${t(home.ctaMid.h2)}</h2>
        <p>${t(home.ctaMid.sub)}</p>
      </div>
      <div class="actions">
        <a class="btn btn-primary" href="${attr(home.ctaMid.primary.href)}">${t(home.ctaMid.primary.label)}</a>
        ${arrowLink(home.ctaMid.link)}
      </div>
    </div>
  </div>
</section>

<div class="container">${pitchRule()}</div>

<!-- H6 非标按图定制：左右图文 -->
<section class="section custom" id="custom">
  <div class="container">
    <figure class="figure">
      ${customBolt('t-custom', home.custom.figureTitle, home.custom.figureAlt)}
      <figcaption>${t(home.custom.figcaption)}</figcaption>
    </figure>
    <div class="body">
      <span class="eyebrow">${t(home.custom.eyebrow)}</span>
      <h2 class="h2 mt-2">${t(home.custom.h2)}</h2>
      <p>${t(home.custom.body)}</p>
      <ol class="flow">
${home.custom.flow.map((s, i) => `        <li class="reveal" style="--i:${i}">${t(s)}</li>`).join('\n')}
      </ol>
      ${arrowLink(home.custom.link)}
    </div>
  </div>
</section>

${ctaEnd(site)}
`;
};
