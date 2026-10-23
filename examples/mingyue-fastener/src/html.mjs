// 模板小工具：转义、[待确认：X] 占位标注、常用片段。

export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const TODO_RE = /\[待确认[：:][^\]]*\]|\[待确认\]/g;

/** 文案 → HTML：转义后把 [待确认：X] 原样包进 <mark class="todo">。 */
export const t = (s) => esc(s).replace(TODO_RE, (m) => `<mark class="todo">${m}</mark>`);

/** 纯文本（title / alt / JSON-LD）里保留占位原文，不加标签。 */
export const plain = (s) => String(s ?? '');

export const hasTodo = (s) => TODO_RE.test(String(s ?? ''));

export const attr = (s) => esc(s);

export const join = (arr, fn) => arr.map(fn).join('\n');

export const cls = (...names) => names.filter(Boolean).join(' ');

/** 型号串 → URL slug：DIN912-M6x20-12.9-BO → din912-m6x20-12-9-bo */
export const slugify = (model) => model.toLowerCase().replace(/\./g, '-');

/** 解析型号串四段：DIN912-M6x20-12.9-BO */
export const parseModel = (model) => {
  const [std, size, cls, surf] = model.split('-');
  const m = /^M(\d+(?:\.\d+)?)x(\d+)$/i.exec(size || '');
  const STD = { DIN912: 'ISO 4762 / DIN 912', DIN6921: 'DIN 6921' };
  const SURF = { BO: 'Black oxide', ZF: 'Zinc flake', ZP: 'Zinc plating' };
  return {
    model_string: model,
    standard: STD[std] || std,
    thread: m ? `M${m[1]}` : size,
    length_mm: m ? Number(m[2]) : null,
    property_class: cls,
    surface: SURF[surf] || surf,
  };
};
