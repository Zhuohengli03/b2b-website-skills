import { t, attr, esc } from '../html.mjs';
import { motif, icons, stepFrames } from '../svg.mjs';

/** 占位框（证据位未到）：虚线框 + 母题 + [待确认] + 拍摄要求；data-placeholder 供测试扫描。 */
export const placeholder = ({ todo, alt, caption, spec, ratio = '4/3', cls = '' }) => `<div class="placeholder ${cls}" role="img" aria-label="${attr(alt)}" data-placeholder="${attr(todo)}" style="aspect-ratio:${ratio}">
  ${motif(48)}
  <mark class="todo">${esc(todo)}</mark>
  <span>${caption ? `${t(caption)}<br>` : ''}${t(spec || '')}</span>
</div>`;

/** 工艺四步列表（首页 H3 / About P6-2）。lit=是否带点亮态。 */
export const steps = (items, { frames = true } = {}) => `<ol class="steps">
${items.map((s, i) => `  <li class="step" data-step="${i + 1}">
    <span class="num">0${i + 1}</span>
    <div>
      <div class="title">${t(s.title)}${s.badge ? ` <span class="badge badge-accent">${t(s.badge)}</span>` : ''}</div>
      <p>${t(s.text)}</p>
      ${frames ? stepFrames[i] : ''}
    </div>
  </li>`).join('\n')}
</ol>`;

/** Counter：DOM 里留真值（aria-hidden 的数字做滚动，sr-only 读终值）。 */
export const counter = (c) => `<div class="cell counter reveal">
  <div class="num${c.accent ? ' is-accent' : ''}">
    <span aria-hidden="true">${c.count ? `<span class="count" data-to="${attr(c.num)}">${t(c.num)}</span>` : t(c.num)}<span class="suffix">${t(c.suffix)}</span></span>
    <span class="sr-only">${t(c.sr)}</span>
  </div>
  <div class="label eyebrow">${t(c.label)}</div>
</div>`;

/** 证书卡（H4）：4:3 占位 + 名称 + 「PDF coming」，不放坏链接。 */
export const certCard = (c, labels) => `<div class="card cert-card">
  ${placeholder({ todo: c.todo, alt: c.alt, cls: 'thumb' })}
  <div class="name">${t(c.name)}</div>
  <div class="meta">${t(c.meta)}</div>
  <span class="dl muted">${icons.download()}${t(labels.downloadLabel)} · ${t(labels.pdfComing)}</span>
</div>`;

/** 键值属性表（型号页 Specifications / Custom 能力表 / 首屏参数卡）。 */
export const kvTable = (rows, { units = false, cls = 'spec', left = false } = {}) => `<table class="${cls}${left ? ' kv' : ''}">
  ${units ? '<thead><tr><th scope="col">Property</th><th scope="col">Value</th><th scope="col">Unit</th></tr></thead>' : ''}
  <tbody>
${rows.map((r) => `    <tr${r.highlight ? ' class="is-highlight"' : ''}><th scope="row">${t(r.k)}</th><td class="val${units ? ' left' : ''}">${t(r.v)}${r.note ? ` <span class="note">${t(r.note)}</span>` : ''}</td>${units ? `<td class="unit">${t(r.unit || '—')}</td>` : ''}</tr>`).join('\n')}
  </tbody>
</table>`;

export const tableScroll = (inner) => `<div class="table-scroll">${inner}</div>`;

/** 文字箭头链接 */
export const arrowLink = (l, cls = 'btn-link') => `<a class="${cls}" href="${attr(l.href)}">${t(l.label)} ${icons.arrow()}</a>`;

/** 问答 Accordion（details，一次展开一个）。schema=true 时用于 FAQPage。 */
export const accordion = (items, name) => `<div class="accordion">
${items.map((it, i) => `  <details class="acc" name="${attr(name)}"${i === 0 ? ' open' : ''}>
    <summary><h3 class="h3">${t(it.q)}</h3><span class="acc-icon" aria-hidden="true"></span></summary>
    <div class="acc-body"><p>${t(it.a)}</p></div>
  </details>`).join('\n')}
</div>`;

export const faqLd = (items) => ({
  '@type': 'FAQPage',
  mainEntity: items.map((it) => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.a } })),
});

/** 内页页头：H1 + 副句 + 双按钮（+ 右侧线稿 / 占位） */
export const pageHead = ({ eyebrow, h1, sub, primary, secondary, aside, h1Cls = '', extra = '' }) => `<section class="page-head${aside ? ' has-aside' : ''}">
  <div class="container">
    <div>
      ${eyebrow ? `<span class="eyebrow">${t(eyebrow)}</span>` : ''}
      <h1${h1Cls ? ` class="${h1Cls}"` : ''}>${t(h1)}</h1>
      ${sub ? `<p class="sub">${t(sub)}</p>` : ''}
      ${primary || secondary ? `<div class="actions">
        ${primary ? `<a class="btn btn-primary" href="${attr(primary.href)}">${t(primary.label)}</a>` : ''}
        ${secondary ? `<a class="btn btn-secondary" href="${attr(secondary.href)}">${t(secondary.label)}</a>` : ''}
      </div>` : ''}
      ${extra}
    </div>
    ${aside ? `<div class="aside">${aside}</div>` : ''}
  </div>
</section>`;
