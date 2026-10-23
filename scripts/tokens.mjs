#!/usr/bin/env node
/**
 * b2b-website-skills · 设计令牌生成器（给 b2b-ui-designer 的「视觉系统」三层表 + :root CSS + 对比度表）
 *
 * 用法：
 *   node scripts/tokens.mjs --primary "#143A6E" [--accent "#C98A1E"] [--neutral "#1B1D21"] [--out _内部/05-设计/tokens.json]
 *   node scripts/tokens.mjs --logo logo.png [--accent ...] [--out ...]        从 logo 吸主色（PNG 纯 Node 解码；
 *                                                                             其它格式需要 Playwright：env PLAYWRIGHT_MODULE）
 *
 * 生成：
 *   主色 50–900、强调色 50–900、中性灰 50–950 色阶（OKLCH 等明度阶梯推算，基准色原样落在最接近的一级，不凭感觉给九个蓝）；
 *   状态色 success / warning / danger / info 各三级（浅底 / 主色 / 深字）；
 *   每个底色配 on-<name> 文字色，WCAG 2.x 对比度**实算**：< 4.5 标 fail 并给最近的可用替代（同色阶里最近的能过的一级，或换一个文字色）；
 *   深色模式的第二层重新指向并同样实算。
 * 输出（三个文件放在 --out 同目录）：
 *   tokens.json   三层：primitive（原始值）→ semantic（语义，含 dark）→ component（组件 + 六个状态），附 contrast 表
 *   tokens.css    :root 变量块；深色用 @media (prefers-color-scheme: dark) + :root:not([data-theme="light"]) 与 :root[data-theme="dark"]
 *   对比度表.md    每一行的比值都是算出来的——规则「不写没算过的数字」
 *
 * 零依赖，Node ≥ 22。
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// ---------- 参数 ----------
const argv = process.argv.slice(2);
if (!argv.length || argv.includes('--help') || argv.includes('-h')) {
  console.log(`用法：node scripts/tokens.mjs --primary "#143A6E" [--accent "#C98A1E"] [--neutral "#1B1D21"] [--out _内部/05-设计/tokens.json]
      node scripts/tokens.mjs --logo logo.png [...]

选项：
  --primary <hex>   主色（和 --logo 二选一；同时给时以 --primary 为准）
  --logo <文件>     从 logo 吸主色：出现最多的非白非黑、有饱和度的颜色。PNG 零依赖解码；jpg/svg/webp 需要 Playwright
  --accent <hex>    强调色，缺省按主色的互补色相推一个（会在输出里标明是推算的）
  --neutral <hex>   中性灰的基准（最深一级），缺省取主色色相、极低饱和度的深灰
  --out <路径>      tokens.json 的路径，默认 _内部/05-设计/tokens.json；tokens.css 与 对比度表.md 放同目录
  --help            显示本说明`);
  process.exit(0);
}
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const OUT = path.resolve(opt('--out', '_内部/05-设计/tokens.json'));
const OUT_DIR = path.dirname(OUT);

// ---------- 颜色数学 ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
function hexToRgb(hex) {
  const m = String(hex).trim().replace(/^#/, '');
  const h = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error('不是合法的 hex 颜色：' + hex);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const rgbToHex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase();
const srgbToLin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const linToSrgb = c => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
// WCAG 2.x 相对亮度与对比度
const luminance = hex => { const [r, g, b] = hexToRgb(hex).map(srgbToLin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
function contrast(a, b) { const la = luminance(a), lb = luminance(b); const r = (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); return Math.round(r * 100) / 100; }
// OKLab / OKLCH（Björn Ottosson 的公开矩阵），用来按等感知明度推色阶
function rgbToOklab([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map(srgbToLin);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
function oklabToRgbLin([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
}
const hexToOklch = hex => { const [L, a, b] = rgbToOklab(hexToRgb(hex)); return { L, C: Math.hypot(a, b), h: (Math.atan2(b, a) * 180 / Math.PI + 360) % 360 }; };
function oklchToHex({ L, C, h }) {
  // 超出 sRGB 色域时降低饱和度直到进入色域（保住明度与色相，这两样决定对比度与"像不像品牌色"）
  for (let c = C; c >= 0; c -= 0.002) {
    const lin = oklabToRgbLin([L, c * Math.cos(h * Math.PI / 180), c * Math.sin(h * Math.PI / 180)]);
    if (lin.every(v => v >= -0.0005 && v <= 1.0005)) return rgbToHex(lin.map(v => linToSrgb(clamp(v))));
  }
  return rgbToHex(oklabToRgbLin([L, 0, 0]).map(v => linToSrgb(clamp(v))));
}

// ---------- 色阶 ----------
// 每一级的目标明度（OKLab L）。50 是几乎白、900 是很深、950 给深色模式的底。
const STEP_L = { 50: 0.975, 100: 0.94, 200: 0.885, 300: 0.81, 400: 0.72, 500: 0.63, 600: 0.54, 700: 0.46, 800: 0.38, 900: 0.30, 950: 0.22 };
function makeScale(baseHex, steps, { chromaCap = Infinity } = {}) {
  const base = hexToOklch(baseHex);
  const C0 = Math.min(base.C, chromaCap);
  // 基准色落在明度最接近的一级，原样保留；其余按目标明度推，饱和度在两端收一点（否则 50 级会发脏、900 级会发黑）
  let baseStep = steps[0], d = Infinity;
  for (const s of steps) { const dd = Math.abs(STEP_L[s] - base.L); if (dd < d) { d = dd; baseStep = s; } }
  const scale = {};
  for (const s of steps) {
    if (s === baseStep) { scale[s] = rgbToHex(hexToRgb(baseHex)); continue; }
    const L = STEP_L[s];
    const falloff = Math.min(1, (L * (1 - L)) / Math.max(0.05, base.L * (1 - base.L)));
    scale[s] = oklchToHex({ L, C: C0 * Math.pow(falloff, 0.55), h: base.h });
  }
  return { scale, baseStep, oklch: { L: +base.L.toFixed(3), C: +base.C.toFixed(3), h: +base.h.toFixed(1) } };
}

// ---------- PNG 解码（零依赖）：取 logo 主色 ----------
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('不是 PNG 文件');
  let pos = 8, w = 0, h = 0, depth = 8, ctype = 0, interlace = 0, palette = null, trns = null; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; interlace = data[12]; }
    else if (type === 'PLTE') palette = data; else if (type === 'tRNS') trns = data; else if (type === 'IDAT') idat.push(data); else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (interlace) throw new Error('暂不支持隔行扫描（Adam7）的 PNG，请用普通导出');
  if (depth !== 8 && !(ctype === 3 && depth <= 8)) throw new Error(`暂不支持 ${depth} 位深的 PNG，请导出为 8 位`);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
  const bpp = Math.max(1, Math.ceil(channels * depth / 8)), stride = Math.ceil(w * channels * depth / 8);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(stride * h); let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), cur = out.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0, x = line[i];
      let v;
      if (f === 0) v = x; else if (f === 1) v = x + a; else if (f === 2) v = x + b; else if (f === 3) v = x + ((a + b) >> 1);
      else { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      cur[i] = v & 255;
    }
    prev = cur;
  }
  // 统一成 RGBA 像素访问器
  const px = (x, y) => {
    const row = y * stride;
    if (ctype === 2) return [out[row + x * 3], out[row + x * 3 + 1], out[row + x * 3 + 2], 255];
    if (ctype === 6) return [out[row + x * 4], out[row + x * 4 + 1], out[row + x * 4 + 2], out[row + x * 4 + 3]];
    if (ctype === 0) { const g = out[row + x]; return [g, g, g, 255]; }
    if (ctype === 4) { const g = out[row + x * 2]; return [g, g, g, out[row + x * 2 + 1]]; }
    // 索引色
    let idx; if (depth === 8) idx = out[row + x]; else { const bit = x * depth, byte = out[row + (bit >> 3)]; idx = (byte >> (8 - depth - (bit & 7))) & ((1 << depth) - 1); }
    return [palette[idx * 3], palette[idx * 3 + 1], palette[idx * 3 + 2], trns && idx < trns.length ? trns[idx] : 255];
  };
  return { w, h, px };
}
function dominantColor(pixels /* 迭代器：[r,g,b,a] */) {
  // 量化到 16 级/通道的桶，去掉透明、近白、近黑、无饱和度的像素；按「像素数 × 饱和度」排，再用桶内像素均值得到最终 hex
  const bins = new Map();
  let total = 0, kept = 0;
  for (const [r, g, b, a] of pixels) {
    total++;
    if (a < 128) continue;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx > 235 && mn > 225) continue;   // 近白
    if (mx < 28) continue;                // 近黑
    if (mx - mn < 24) continue;           // 灰（没有色相，不当主色）
    kept++;
    const k = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const e = bins.get(k) || { n: 0, r: 0, g: 0, b: 0, sat: 0 }; e.n++; e.r += r; e.g += g; e.b += b; e.sat += (mx - mn) / mx; bins.set(k, e);
  }
  if (!bins.size) throw new Error('logo 里没有找到非白非黑、有饱和度的颜色（可能是纯黑白 logo），请直接给 --primary');
  const ranked = [...bins.values()].map(e => ({ hex: rgbToHex([e.r / e.n, e.g / e.n, e.b / e.n]), pixels: e.n, share: +(e.n / kept).toFixed(3), score: e.n * (1 + e.sat / e.n) })).sort((a, b) => b.score - a.score);
  return { primary: ranked[0].hex, candidates: ranked.slice(0, 5).map(({ hex, pixels, share }) => ({ hex, pixels, share })), total, kept };
}
async function colorFromLogo(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32BE(0) === 0x89504e47) {
    const { w, h, px } = decodePng(buf);
    const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 250000))); // 大图抽样，最多看约 25 万像素
    function* it() { for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) yield px(x, y); }
    return { ...dominantColor(it()), decoder: 'png' };
  }
  // 其它格式：用 Playwright 在无头 Chrome 里画到 canvas 读像素
  let pw;
  try { pw = await import(process.env.PLAYWRIGHT_MODULE || 'playwright'); } catch { throw new Error('非 PNG 的 logo 需要 Playwright（设置 PLAYWRIGHT_MODULE），或先把 logo 导出为 PNG'); }
  let browser; try { browser = await pw.chromium.launch({ channel: 'chrome' }); } catch { browser = await pw.chromium.launch(); }
  try {
    const pg = await browser.newPage();
    const mime = { '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif' }[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const data = await pg.evaluate(async src => {
      const img = new Image(); img.src = src; await img.decode();
      const W = Math.min(img.naturalWidth || 512, 512), H = Math.round(W * ((img.naturalHeight || 512) / (img.naturalWidth || 512))) || 512;
      const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, W, H);
      return Array.from(ctx.getImageData(0, 0, W, H).data);
    }, `data:${mime};base64,${buf.toString('base64')}`);
    function* it() { for (let i = 0; i < data.length; i += 4) yield [data[i], data[i + 1], data[i + 2], data[i + 3]]; }
    return { ...dominantColor(it()), decoder: 'playwright' };
  } finally { await browser.close(); }
}

// ---------- 对比度检查器 ----------
const AA = 4.5, AA_LARGE = 3;
const checks = [];   // 每一行都是算出来的
const nearestStep = (scaleObj, scaleName, step, otherHex, threshold) => {
  // 同色阶里离当前级最近、且与另一侧颜色对比 ≥ 阈值的一级
  const steps = Object.keys(scaleObj).map(Number).sort((a, b) => a - b), i = steps.indexOf(+step);
  let best = null;
  for (const s of steps) { if (contrast(scaleObj[s], otherHex) >= threshold) { const d = Math.abs(steps.indexOf(s) - i); if (!best || d < best.d) best = { d, s }; } }
  return best ? { token: `${scaleName}-${best.s}`, hex: scaleObj[best.s], ratio: contrast(scaleObj[best.s], otherHex) } : null;
};
// role: 'text' 按 4.5 判；'ui'（输入框边框、图标等非文字界面元素）按 3:1 判
// alt: { scale, name, step, side: 'bg'|'text' } —— 失败时在这条色阶里找最近的能过的一级
function check({ where, bgToken, bgHex, textToken, textHex, textCandidates = [], alt = null, role = 'text' }) {
  const ratio = contrast(bgHex, textHex), threshold = role === 'ui' ? AA_LARGE : AA;
  const row = { where, bg: bgToken, bgHex, text: textToken, textHex, ratio, aa_normal: ratio >= AA ? 'pass' : 'fail', aa_large: ratio >= AA_LARGE ? 'pass' : 'fail', role, threshold, result: ratio >= threshold ? 'pass' : 'fail', fix: null };
  if (row.result === 'fail') {
    const fixes = [];
    if (alt) {
      const n = nearestStep(alt.scale, alt.name, alt.step, alt.side === 'bg' ? textHex : bgHex, threshold);
      if (n && n.token !== (alt.side === 'bg' ? bgToken : textToken)) fixes.push(`换${alt.side === 'bg' ? '底色' : role === 'ui' ? '颜色' : '文字色'} ${n.token} ${n.hex}（${n.ratio}:1）`);
    }
    for (const c of textCandidates) { const r = contrast(bgHex, c.hex); if (r >= threshold && c.hex !== textHex) fixes.push(`换文字色 ${c.token} ${c.hex}（${r}:1）`); }
    row.fix = fixes.length ? fixes.slice(0, 2).join('；') : '无可用替代：换一组颜色';
  }
  checks.push(row);
  return row;
}
// 在候选文字色里选对比度最高的
const bestText = (bgHex, cands) => cands.map(c => ({ ...c, ratio: contrast(bgHex, c.hex) })).sort((a, b) => b.ratio - a.ratio)[0];

// ---------- 主流程 ----------
async function main() {
  const meta = { generated_at: new Date().toISOString(), inputs: {}, notes: [] };
  let primaryHex = opt('--primary', null);
  if (opt('--logo', null)) {
    const r = await colorFromLogo(path.resolve(opt('--logo')));
    meta.inputs.logo = { file: opt('--logo'), decoder: r.decoder, pixels_seen: r.total, pixels_kept: r.kept, candidates: r.candidates };
    if (!primaryHex) { primaryHex = r.primary; meta.notes.push(`主色 ${primaryHex} 从 logo 吸出（出现最多的非白非黑有饱和度颜色），备选见 inputs.logo.candidates`); }
    else meta.notes.push(`同时给了 --logo 和 --primary，以 --primary 为准；logo 吸出的是 ${r.primary}`);
  }
  if (!primaryHex) { console.error('需要 --primary <hex> 或 --logo <文件>。--help 看用法。'); process.exit(2); }
  primaryHex = rgbToHex(hexToRgb(primaryHex));
  const pBase = hexToOklch(primaryHex);
  let accentHex = opt('--accent', null), neutralHex = opt('--neutral', null);
  if (accentHex) accentHex = rgbToHex(hexToRgb(accentHex)); else { accentHex = oklchToHex({ L: 0.72, C: Math.max(0.12, Math.min(0.16, pBase.C)), h: (pBase.h + 180) % 360 }); meta.notes.push(`强调色 ${accentHex} 是按主色互补色相推算的，不是你给的——设计确认后用 --accent 覆盖`); }
  if (neutralHex) neutralHex = rgbToHex(hexToRgb(neutralHex)); else { neutralHex = oklchToHex({ L: 0.22, C: 0.012, h: pBase.h }); meta.notes.push(`中性灰 ${neutralHex} 是取主色色相、极低饱和度推算的`); }
  meta.inputs.primary = primaryHex; meta.inputs.accent = accentHex; meta.inputs.neutral = neutralHex;

  const P = makeScale(primaryHex, [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]);
  const A = makeScale(accentHex, [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]);
  const N = makeScale(neutralHex, [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950], { chromaCap: 0.02 });
  // 状态色：固定色相（成功绿 / 警告琥珀 / 危险红 / 信息蓝），饱和度取主色的量级，三级：浅底 100 / 主色 600 / 深字 800
  const stateHue = { success: 150, warning: 75, danger: 27, info: 245 };
  const states = {};
  for (const [name, h] of Object.entries(stateHue)) {
    const C = Math.max(0.10, Math.min(0.16, pBase.C)); // 别比主色更闹
    states[name] = { 100: oklchToHex({ L: STEP_L[100], C: C * 0.35, h }), 600: oklchToHex({ L: STEP_L[600], C, h }), 800: oklchToHex({ L: STEP_L[800], C: C * 0.85, h }) };
  }
  const white = '#FFFFFF';
  const textCands = [{ token: 'white', hex: white }, { token: 'neutral-950', hex: N.scale[950] }, { token: 'neutral-900', hex: N.scale[900] }, { token: 'neutral-50', hex: N.scale[50] }];

  // ---- 第一层：原始值 ----
  const primitive = {
    color: { primary: P.scale, accent: A.scale, neutral: N.scale, white, ...Object.fromEntries(Object.entries(states).map(([k, v]) => [k, v])) },
    space: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 6: '24px', 8: '32px', 12: '48px', 16: '64px', 24: '96px', 32: '128px' },
    'font-size': { xs: ['13px', '1.5'], sm: ['14px', '1.55'], base: ['16px', '1.6'], lg: ['18px', '1.55'], xl: ['22px', '1.4'], '2xl': ['28px', '1.25'], '3xl': ['36px', '1.15'], '4xl': ['48px', '1.08'] },
    radius: { sm: '2px', md: '4px', lg: '8px' },
    shadow: { 1: '0 1px 2px rgba(0,0,0,.06)', 2: '0 2px 8px rgba(0,0,0,.08)', 3: '0 8px 24px rgba(0,0,0,.12)' },
    duration: { fast: '120ms', base: '200ms', slow: '320ms' },
    z: { base: 0, sticky: 10, dropdown: 20, overlay: 30, modal: 40 },
  };

  // ---- 第二层：语义（浅色）----
  const pStep = P.baseStep, aStep = A.baseStep;
  // 主色当文字用（链接、次按钮文字）时必须在白底上 ≥ 4.5：从基准级往深找第一个过的
  const textSafeStep = [pStep, pStep + 100, pStep + 200, pStep + 300, pStep + 400, pStep + 500].find(s => s <= 900 && contrast(P.scale[s], '#FFFFFF') >= AA) ?? 900;
  const strongLight = [300, 400, 500, 600].find(s => contrast(N.scale[s], '#FFFFFF') >= AA_LARGE) ?? 600; // 输入框边框按 WCAG 1.4.11 要和表面 3:1
  const onPrimary = bestText(P.scale[pStep], textCands), onAccent = bestText(A.scale[aStep], textCands);
  const sem = {
    bg: ['neutral-50', N.scale[50]], 'on-bg': ['neutral-900', N.scale[900]],
    surface: ['white', white], 'on-surface': ['neutral-900', N.scale[900]],
    primary: [`primary-${pStep}`, P.scale[pStep]], 'on-primary': [onPrimary.token, onPrimary.hex],
    'primary-hover': [`primary-${Math.min(900, pStep + 100)}`, P.scale[Math.min(900, pStep + 100)]],
    accent: [`accent-${aStep}`, A.scale[aStep]], 'on-accent': [onAccent.token, onAccent.hex],
    muted: ['neutral-100', N.scale[100]], 'on-muted': ['neutral-700', N.scale[700]],
    'text-secondary': ['neutral-600', N.scale[600]],
    border: ['neutral-200', N.scale[200]], 'border-strong': [`neutral-${strongLight}`, N.scale[strongLight]],
    ring: [`primary-${Math.max(50, pStep - 300)}`, P.scale[Math.max(50, pStep - 300)]],
    'primary-text': [`primary-${textSafeStep}`, P.scale[textSafeStep]],
    'primary-soft': ['primary-100', P.scale[100]], 'on-primary-soft': ['primary-800', P.scale[800]],
    link: [`primary-${textSafeStep}`, P.scale[textSafeStep]],
  };
  if (textSafeStep !== pStep) meta.notes.push(`主色当文字用（链接、次按钮）时从 primary-${pStep} 加深到 primary-${textSafeStep}，因为 ${P.scale[pStep]} 在白底上只有 ${contrast(P.scale[pStep], white)}:1`);
  for (const s of Object.keys(states)) { sem[`${s}-bg`] = [`${s}-100`, states[s][100]]; sem[`on-${s}-bg`] = [`${s}-800`, states[s][800]]; sem[s] = [`${s}-600`, states[s][600]]; sem[`on-${s}`] = [bestText(states[s][600], textCands).token, bestText(states[s][600], textCands).hex]; }
  // 深色模式：第一层不动，只重新指向；主色在深底上要提亮——取离基准最近、且在 neutral-950 上 ≥ 4.5 的一级
  const darkBg = N.scale[950];
  const darkSurface = N.scale[900];
  const liftedStep = [pStep, pStep - 100, pStep - 200, pStep - 300, pStep - 400, pStep - 500].find(s => s >= 50 && contrast(P.scale[s], darkBg) >= AA && contrast(P.scale[s], darkSurface) >= AA) ?? 300;
  const onPrimaryDark = bestText(P.scale[liftedStep], textCands);
  const aLifted = [aStep, aStep - 100, aStep - 200, aStep - 300].find(s => s >= 50 && contrast(A.scale[s], darkBg) >= AA && contrast(A.scale[s], darkSurface) >= AA) ?? 300;
  // 输入框边框（border-strong）按 WCAG 1.4.11 要和表面 3:1：从 300 往深找第一个过的；深色从 700 往浅找
  const strongDark = [700, 600, 500, 400].find(s => contrast(N.scale[s], darkSurface) >= AA_LARGE) ?? 400;
  const dark = {
    bg: ['neutral-950', darkBg], 'on-bg': ['neutral-100', N.scale[100]],
    surface: ['neutral-900', N.scale[900]], 'on-surface': ['neutral-100', N.scale[100]],
    primary: [`primary-${liftedStep}`, P.scale[liftedStep]], 'on-primary': [onPrimaryDark.token, onPrimaryDark.hex],
    'primary-hover': [`primary-${Math.max(50, liftedStep - 100)}`, P.scale[Math.max(50, liftedStep - 100)]],
    accent: [`accent-${aLifted}`, A.scale[aLifted]], 'on-accent': [bestText(A.scale[aLifted], textCands).token, bestText(A.scale[aLifted], textCands).hex],
    muted: ['neutral-800', N.scale[800]], 'on-muted': ['neutral-300', N.scale[300]],
    'text-secondary': ['neutral-400', N.scale[400]],
    border: ['neutral-800', N.scale[800]], 'border-strong': [`neutral-${strongDark}`, N.scale[strongDark]],
    ring: [`primary-${Math.max(50, liftedStep - 100)}`, P.scale[Math.max(50, liftedStep - 100)]],
    'primary-text': [`primary-${liftedStep}`, P.scale[liftedStep]],
    'primary-soft': ['primary-900', P.scale[900]], 'on-primary-soft': ['primary-200', P.scale[200]],
    link: [`primary-${liftedStep}`, P.scale[liftedStep]],
  };
  for (const s of Object.keys(states)) { dark[`${s}-bg`] = [`${s}-800`, states[s][800]]; dark[`on-${s}-bg`] = [`${s}-100`, states[s][100]]; dark[s] = [`${s}-600`, states[s][600]]; dark[`on-${s}`] = sem[`on-${s}`]; }
  if (liftedStep !== pStep) meta.notes.push(`深色模式主色从 primary-${pStep} 提亮到 primary-${liftedStep}，因为 ${P.scale[pStep]} 在 ${darkBg} 上只有 ${contrast(P.scale[pStep], darkBg)}:1、在 ${darkSurface} 上 ${contrast(P.scale[pStep], darkSurface)}:1`);
  if (strongLight !== 300) meta.notes.push(`输入框边框 border-strong 取 neutral-${strongLight}（neutral-300 ${N.scale[300]} 对白底只有 ${contrast(N.scale[300], white)}:1，不到 3:1）`);

  // ---- 对比度实算 ----
  // 1) 三条色阶的每一级 × 白字 / 深字：设计挑底色时直接查这张
  for (const [name, S] of [['primary', P.scale], ['accent', A.scale], ['neutral', N.scale]]) for (const [step, hex] of Object.entries(S)) {
    const t = bestText(hex, [{ token: 'white', hex: white }, { token: 'neutral-950', hex: N.scale[950] }]);
    check({ where: '色阶', bgToken: `${name}-${step}`, bgHex: hex, textToken: t.token, textHex: t.hex, textCandidates: textCands, alt: { scale: S, name, step: +step, side: 'bg' } });
  }
  // 2) 语义层成对的 x / on-x（浅色 + 深色）
  const pairs = (obj, label) => {
    for (const k of Object.keys(obj)) if (obj['on-' + k]) check({ where: label, bgToken: `color-${k} = ${obj[k][0]}`, bgHex: obj[k][1], textToken: `color-on-${k} = ${obj['on-' + k][0]}`, textHex: obj['on-' + k][1], textCandidates: textCands });
    const stepOf = ref => +ref.split('-').pop();
    check({ where: label, bgToken: `color-bg = ${obj.bg[0]}`, bgHex: obj.bg[1], textToken: `color-text-secondary = ${obj['text-secondary'][0]}`, textHex: obj['text-secondary'][1], textCandidates: textCands, alt: { scale: N.scale, name: 'neutral', step: stepOf(obj['text-secondary'][0]), side: 'text' } });
    check({ where: label, bgToken: `color-surface = ${obj.surface[0]}`, bgHex: obj.surface[1], textToken: `color-link = ${obj.link[0]}`, textHex: obj.link[1], textCandidates: textCands, alt: { scale: P.scale, name: 'primary', step: stepOf(obj.link[0]), side: 'text' } });
    check({ where: label, bgToken: `color-surface = ${obj.surface[0]}`, bgHex: obj.surface[1], textToken: `color-border-strong = ${obj['border-strong'][0]}（输入框边框，WCAG 1.4.11 要 3:1）`, textHex: obj['border-strong'][1], role: 'ui', alt: { scale: N.scale, name: 'neutral', step: stepOf(obj['border-strong'][0]), side: 'text' } });
  };
  pairs(sem, '语义·浅色'); pairs(dark, '语义·深色');

  // ---- 第三层：组件（只给会复用的七个，状态写全）----
  const v = k => `var(--color-${k})`;
  const component = {
    'btn-primary': { bg: v('primary'), text: v('on-primary'), border: 'transparent', radius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-6)', hover: { bg: v('primary-hover') }, active: { bg: v('primary-hover'), transform: 'translateY(1px)' }, 'focus-visible': { outline: `2px solid ${v('ring')}`, 'outline-offset': '2px' }, disabled: { opacity: '.5', cursor: 'not-allowed' }, loading: { text: '"Sending…"', 'pointer-events': 'none', opacity: '.8' } },
    'btn-secondary': { bg: 'transparent', text: v('primary-text'), border: `1px solid ${v('primary')}`, radius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-6)', hover: { bg: v('muted') }, active: { bg: v('muted'), transform: 'translateY(1px)' }, 'focus-visible': { outline: `2px solid ${v('ring')}`, 'outline-offset': '2px' }, disabled: { opacity: '.5', cursor: 'not-allowed' }, loading: { 'pointer-events': 'none', opacity: '.8' } },
    input: { bg: v('surface'), text: v('on-surface'), placeholder: v('text-secondary'), border: `1px solid ${v('border-strong')}`, radius: 'var(--radius-sm)', padding: 'var(--space-3) var(--space-4)', hover: { border: `1px solid ${v('on-muted')}` }, 'focus-visible': { border: `1px solid ${v('primary')}`, outline: `2px solid ${v('ring')}`, 'outline-offset': '1px' }, invalid: { border: `1px solid ${v('danger')}`, message: v('danger') }, disabled: { bg: v('muted'), opacity: '.7', cursor: 'not-allowed' } },
    card: { bg: v('surface'), text: v('on-surface'), border: `1px solid ${v('border')}`, radius: 'var(--radius-lg)', padding: 'var(--space-6)', shadow: 'var(--shadow-1)', hover: { shadow: 'var(--shadow-2)', border: `1px solid ${v('border-strong')}` }, 'focus-visible': { outline: `2px solid ${v('ring')}` } },
    badge: { bg: v('primary-soft'), text: v('on-primary-soft'), radius: 'var(--radius-sm)', padding: '2px var(--space-2)', 'font-size': 'var(--font-size-xs)', variants: { success: { bg: v('success-bg'), text: v('on-success-bg') }, warning: { bg: v('warning-bg'), text: v('on-warning-bg') }, danger: { bg: v('danger-bg'), text: v('on-danger-bg') }, info: { bg: v('info-bg'), text: v('on-info-bg') } } },
    table: { 'header-bg': v('muted'), 'header-text': v('on-muted'), 'row-bg': v('surface'), 'row-alt-bg': v('bg'), text: v('on-surface'), border: `1px solid ${v('border')}`, 'cell-padding': 'var(--space-2) var(--space-3)', 'font-size': 'var(--font-size-sm)', hover: { 'row-bg': v('muted') } },
    nav: { bg: v('surface'), text: v('on-surface'), border: `1px solid ${v('border')}`, 'link-hover': v('primary'), 'link-active': v('primary'), 'active-indicator': `2px solid ${v('primary')}`, 'cta': 'btn-primary', 'focus-visible': { outline: `2px solid ${v('ring')}`, 'outline-offset': '2px' } },
    'inquiry-form': { bg: v('surface'), text: v('on-surface'), border: `1px solid ${v('border')}`, radius: 'var(--radius-lg)', padding: 'var(--space-8)', label: v('on-surface'), help: v('text-secondary'), 'required-mark': v('danger'), submit: 'btn-primary', success: { bg: v('success-bg'), text: v('on-success-bg') }, error: { bg: v('danger-bg'), text: v('on-danger-bg') } },
  };
  // 组件层里新出现的底/字组合也要算：badge 默认、表头、次按钮文字、占位符
    check({ where: '组件', bgToken: 'table.header-bg = muted', bgHex: sem.muted[1], textToken: 'table.header-text = on-muted', textHex: sem['on-muted'][1], textCandidates: textCands, alt: { scale: N.scale, name: 'neutral', step: 700, side: 'text' } });
  check({ where: '组件', bgToken: 'btn-secondary.bg = surface', bgHex: sem.surface[1], textToken: 'btn-secondary.text = primary-text', textHex: sem['primary-text'][1], textCandidates: textCands, alt: { scale: P.scale, name: 'primary', step: textSafeStep, side: 'text' } });
  check({ where: '组件', bgToken: 'input.bg = surface', bgHex: sem.surface[1], textToken: 'input.placeholder = text-secondary', textHex: sem['text-secondary'][1], textCandidates: textCands, alt: { scale: N.scale, name: 'neutral', step: 600, side: 'text' } });
  for (const s of Object.keys(states)) check({ where: '组件', bgToken: `badge.${s}.bg = ${s}-100`, bgHex: states[s][100], textToken: `badge.${s}.text = ${s}-800`, textHex: states[s][800], textCandidates: [{ token: 'neutral-900', hex: N.scale[900] }] });

  // ---- 输出 ----
  const semanticOut = Object.fromEntries(Object.entries(sem).map(([k, [ref, hex]]) => [k, { ref, hex }]));
  const darkOut = Object.fromEntries(Object.entries(dark).map(([k, [ref, hex]]) => [k, { ref, hex }]));
  const fails = checks.filter(c => c.result === 'fail');
  const json = { meta: { ...meta, base_steps: { primary: pStep, accent: aStep, neutral: N.baseStep }, oklch: { primary: P.oklch, accent: A.oklch, neutral: N.oklch }, contrast_summary: { checked: checks.length, fail: fails.length } }, primitive, semantic: { light: semanticOut, dark: darkOut }, component, contrast: checks };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(json, null, 2));

  // tokens.css：先在 :root 定义一次所有值，深色只重指向第二层
  const line = (k, val) => `  --${k}: ${val};`;
  const css = [];
  css.push(`/* b2b-website-skills tokens · 生成于 ${meta.generated_at} · 主色 ${primaryHex} 强调 ${accentHex} 中性 ${neutralHex}`, ` * 规则：页面与组件只用 --color-* 与 --btn-*/--input-* 等，不直接写第一层变量，更不写裸 hex。 */`, ':root {', '  /* 第一层 · 原始值 */');
  for (const [name, S] of [['primary', P.scale], ['accent', A.scale], ['neutral', N.scale]]) for (const [s, hex] of Object.entries(S)) css.push(line(`${name}-${s}`, hex));
  css.push(line('white', white));
  for (const [s, v3] of Object.entries(states)) for (const [k, hex] of Object.entries(v3)) css.push(line(`${s}-${k}`, hex));
  for (const [k, val] of Object.entries(primitive.space)) css.push(line(`space-${k}`, val));
  for (const [k, [sz, lh]] of Object.entries(primitive['font-size'])) { css.push(line(`font-size-${k}`, sz)); css.push(line(`line-height-${k}`, lh)); }
  for (const [k, val] of Object.entries(primitive.radius)) css.push(line(`radius-${k}`, val));
  for (const [k, val] of Object.entries(primitive.shadow)) css.push(line(`shadow-${k}`, val));
  for (const [k, val] of Object.entries(primitive.duration)) css.push(line(`duration-${k}`, val));
  for (const [k, val] of Object.entries(primitive.z)) css.push(line(`z-${k}`, val));
  css.push('', '  /* 第二层 · 语义（浅色） */');
  for (const [k, [ref]] of Object.entries(sem)) css.push(line(`color-${k}`, `var(--${ref})`));
  css.push('', '  /* 第三层 · 组件（只引用第二层） */');
  const flat = (prefix, obj) => { for (const [k, val] of Object.entries(obj)) { if (val && typeof val === 'object') flat(`${prefix}-${k}`, val); else if (typeof val === 'string' && !/^btn-/.test(val)) css.push(line(`${prefix}-${k}`, val)); } };
  for (const [name, obj] of Object.entries(component)) flat(name, obj);
  css.push('}', '');
  const darkLines = Object.entries(dark).map(([k, [ref]]) => `    --color-${k}: var(--${ref});`).join('\n');
  css.push('@media (prefers-color-scheme: dark) {', '  :root:not([data-theme="light"]) {', darkLines, '  }', '}', ':root[data-theme="dark"] {', darkLines.replace(/^    /gm, '  '), '}', '');
  fs.writeFileSync(path.join(OUT_DIR, 'tokens.css'), css.join('\n'));

  // 对比度表.md
  const md = [];
  md.push(`# 对比度表`, '', `生成于 ${meta.generated_at}。输入：主色 ${primaryHex}（落在 primary-${pStep}），强调色 ${accentHex}（accent-${aStep}），中性灰 ${neutralHex}（neutral-${N.baseStep}）。`, '', `每个比值都是按 WCAG 2.x 相对亮度公式算出来的；AA 正文 ≥ 4.5:1，大字 / 图形 ≥ 3:1。共 ${checks.length} 组，**fail ${fails.length} 组**。`, '');
  for (const n of meta.notes) md.push(`- ${n}`);
  if (meta.notes.length) md.push('');
  md.push('| 位置 | 底色 | 底色 hex | 文字色 | 文字 hex | 对比度 | AA 正文 | AA 大字 | 结果 / 替代 |', '|---|---|---|---|---|---|---|---|---|');
  for (const c of checks) md.push(`| ${c.where} | ${c.bg} | ${c.bgHex} | ${c.text} | ${c.textHex} | ${c.ratio}:1 | ${c.aa_normal} | ${c.aa_large} | ${c.result === 'pass' ? (c.role === 'ui' ? 'pass（界面元素 3:1）' : 'pass') : '**fail** → ' + c.fix} |`);
  md.push('', '## 色阶', '');
  for (const [name, S] of [['primary', P.scale], ['accent', A.scale], ['neutral', N.scale]]) md.push(`- **${name}**：` + Object.entries(S).map(([s, h]) => `${s} \`${h}\``).join(' · '));
  for (const [s, v3] of Object.entries(states)) md.push(`- **${s}**：` + Object.entries(v3).map(([k, h]) => `${k} \`${h}\``).join(' · '));
  md.push('', '> 色阶按 OKLCH 等明度阶梯推算，基准色原样保留在最接近的一级；凡本表没列的底/字组合，用之前先算。');
  fs.writeFileSync(path.join(OUT_DIR, '对比度表.md'), md.join('\n') + '\n');

  console.log(`已生成：\n  ${OUT}\n  ${path.join(OUT_DIR, 'tokens.css')}\n  ${path.join(OUT_DIR, '对比度表.md')}`);
  console.log(`主色 ${primaryHex} → primary-${pStep}；强调 ${accentHex} → accent-${aStep}；中性 ${neutralHex} → neutral-${N.baseStep}`);
  console.log(`对比度：共 ${checks.length} 组，fail ${fails.length} 组${fails.length ? '：' + fails.map(f => `${f.bg} / ${f.text}（${f.ratio}:1）`).join('，') : ''}`);
  for (const n of meta.notes) console.log('提示：' + n);
}
main().catch(e => { console.error('错误：' + e.message); process.exit(1); });
