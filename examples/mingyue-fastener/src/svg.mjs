// 内联 SVG 库。全部单色描边（currentColor / 语义 token），每个 ≤ 10KB。
// 线稿为设计自绘示意（L3），不是生产图；<title> 写型号串供抓取。

const A = (attrs) => Object.entries(attrs).filter(([, v]) => v !== undefined && v !== false).map(([k, v]) => ` ${k}="${v}"`).join('');

export const defs = () => `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <defs>
    <pattern id="pitch" width="8" height="8" patternUnits="userSpaceOnUse">
      <line x1="0.75" y1="0" x2="0.75" y2="8" stroke="currentColor" stroke-width="1.5"/>
    </pattern>
    <symbol id="hex-socket" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="1.5"/>
      <polygon points="24,12.5 33.96,18.25 33.96,29.75 24,35.5 14.04,29.75 14.04,18.25" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    </symbol>
  </defs>
</svg>`;

export const pitchRule = () => `<svg class="pitch" aria-hidden="true" focusable="false"><rect width="100%" height="8" fill="url(#pitch)"/></svg>`;

export const motif = (size = 48) => `<svg width="${size}" height="${size}" aria-hidden="true" focusable="false"><use href="#hex-socket"/></svg>`;

// ---------- 小图标（Lucide 风格，24 栅格内自绘，线宽 1.5） ----------
const icon = (vb, body, cls = '') => `<svg${cls ? ` class="${cls}"` : ''} viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
export const icons = {
  chevron: () => icon('0 0 12 12', '<path d="M2 4l4 4 4-4"/>'),
  arrow: () => icon('0 0 16 16', '<path d="M3 8h10M9 4l4 4-4 4"/>'),
  download: () => icon('0 0 16 16', '<path d="M8 2v8M4 7l4 4 4-4M2 13h12"/>'),
  burger: () => icon('0 0 22 22', '<path d="M2 5h18M2 11h18M2 17h18"/>'),
  close: () => icon('0 0 22 22', '<path d="M4 4l14 14M18 4L4 18"/>'),
  file: () => icon('0 0 20 20', '<path d="M5 2h7l4 4v12H5z M12 2v4h4 M7 11h6M7 14h6"/>'),
  drawing: () => icon('0 0 20 20', '<path d="M3 4h14v12H3z M3 10h14 M8 4v12"/>'),
  cert: () => icon('0 0 20 20', '<path d="M10 2l2.5 2.5H16v3.5L18 10l-2 2v3.5h-3.5L10 18l-2.5-2.5H4V12l-2-2 2-2V4.5h3.5z"/>'),
  filter: () => icon('0 0 16 16', '<path d="M2 3h12M4 8h8M6 13h4"/>'),
  spinner: () => `<svg class="spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false"><path d="M8 2a6 6 0 1 1-6 6"/></svg>`,
};

// ---------- 分类图标 48px（首页 H2 / 目录） ----------
const cat = (label, body) => `<svg class="icon" viewBox="0 0 48 48" role="img" aria-label="${label}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">${body}</svg>`;
export const catIcons = {
  'cat-shcs': (l) => cat(l, '<rect x="6" y="14" width="10" height="20"/><path d="M6 19h5v10H6" stroke-dasharray="2 2" stroke-width="1"/><path d="M16 18h24l2 2v8l-2 2H16"/><path d="M20 19l-1 10M25 19l-1 10M30 19l-1 10M35 19l-1 10" stroke-width="1"/>'),
  'cat-flange': (l) => cat(l, '<path d="M6 17h8v14H6z"/><path d="M6 21h8M6 27h8" stroke-width="1"/><path d="M14 13h3v22h-3z"/><path d="M17 19h23l2 2v6l-2 2H17"/><path d="M22 20l-1 8M27 20l-1 8M32 20l-1 8M37 20l-1 8" stroke-width="1"/>'),
  'cat-tapping': (l) => cat(l, '<path d="M8 16q-3 8 0 16h6V16z"/><path d="M11 20v8" stroke-width="1"/><path d="M14 20h18l10 4-10 4H14z"/><path d="M19 21l-1 6M24 21l-1 6M29 21l-1 6M33 22l-1 4" stroke-width="1"/>'),
  'cat-auto': (l) => cat(l, '<path d="M6 17h8v14H6z"/><path d="M6 21h8M6 27h8" stroke-width="1"/><path d="M14 13h3v22h-3z"/><path d="M17 14l1.5 2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2" stroke-width="1"/><path d="M17 19h23l2 2v6l-2 2H17"/><path d="M22 20l-1 8M27 20l-1 8M32 20l-1 8M37 20l-1 8" stroke-width="1"/>'),
  'cat-custom': (l) => cat(l, '<path d="M6 18h8v12H6z"/><path d="M6 22h8M6 26h8" stroke-width="1"/><path d="M14 15h2v18h-2z"/><path d="M16 20h10v8H16M26 21h14l2 2v2l-2 2H26"/><path d="M31 22l-1 6M36 22l-1 6" stroke-width="1"/><path d="M4 10h40" stroke-dasharray="2 3" stroke-width="1"/>'),
};

// ---------- 首屏参数卡线稿：ISO 4762 / DIN 912 M6×20 侧视 + 端视（10px = 1mm） ----------
export const heroDrawing = (id, title, desc) => `<svg class="drawing" viewBox="0 0 470 190" role="img" aria-labelledby="${id}">
  <title id="${id}">${title}</title>
  <desc>${desc}</desc>
  <g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
    <rect x="40" y="40" width="60" height="100"/>
    <path d="M40 65 H70 V115 H40" stroke-dasharray="4 3" stroke-width="1"/>
    <path d="M100 60 H294 L300 66 V114 L294 120 H100"/>
    <path d="M110 62 L106 118 M120 62 L116 118 M130 62 L126 118 M140 62 L136 118 M150 62 L146 118 M160 62 L156 118 M170 62 L166 118 M180 62 L176 118 M190 62 L186 118 M200 62 L196 118 M210 62 L206 118 M220 62 L216 118 M230 62 L226 118 M240 62 L236 118 M250 62 L246 118 M260 62 L256 118 M270 62 L266 118 M280 62 L276 118 M290 62 L286 118" stroke-width="1"/>
    <circle cx="400" cy="90" r="50"/>
    <polygon points="400,65 421.65,77.5 421.65,102.5 400,115 378.35,102.5 378.35,77.5"/>
  </g>
  <g fill="none" stroke="currentColor" stroke-width="1">
    <path d="M22 40 V140 M18 40 H40 M18 140 H40"/>
    <path d="M40 158 V140 M100 158 V140 M40 154 H100"/>
    <path d="M318 60 H300 M318 120 H300 M314 60 V120"/>
    <path d="M100 176 V148 M300 176 V148 M100 172 H300"/>
    <path d="M378.35 128 V102.5 M421.65 128 V102.5 M378.35 124 H421.65"/>
  </g>
  <g><text x="6" y="94">dk</text><text x="64" y="167">k</text><text x="320" y="94">d</text><text x="195" y="186">L 20</text><text x="394" y="138">s</text></g>
</svg>`;

// ---------- H3 载体（四帧由 data-frame 驱动；默认 / reduced-motion / 无 JS = 第 4 帧最终态） ----------
const CARRIER_THREADS = 'M144 76 L139 144 M156 76 L151 144 M168 76 L163 144 M180 76 L175 144 M192 76 L187 144 M204 76 L199 144 M216 76 L211 144 M228 76 L223 144 M240 76 L235 144 M252 76 L247 144 M264 76 L259 144 M276 76 L271 144 M288 76 L283 144 M300 76 L295 144 M312 76 L307 144 M324 76 L319 144 M336 76 L331 144 M348 76 L343 144 M360 76 L355 144';
export const carrier = (id, title, desc) => `<svg class="carrier" viewBox="0 0 480 230" role="img" aria-labelledby="${id}">
  <title id="${id}">${title}</title>
  <desc>${desc}</desc>
  <g class="c-outline" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
    <rect x="60" y="50" width="72" height="120"/>
    <path d="M60 80 H96 V140 H60" stroke-dasharray="4 3" stroke-width="1"/>
    <path d="M132 74 H372 L380 82 V138 L372 146 H132"/>
    <path class="c-thread" d="${CARRIER_THREADS}" stroke-width="1"/>
  </g>
  <g class="c-fill">
    <g fill="var(--color-line-art-fill)" stroke="var(--color-line-art-fill)" stroke-width="1.5" stroke-linejoin="round">
      <rect x="60" y="50" width="72" height="120"/>
      <path d="M132 74 H372 L380 82 V138 L372 146 H132 Z"/>
    </g>
    <g stroke="var(--color-bg-alt)" stroke-width="1" fill="none" opacity=".9">
      <path d="${CARRIER_THREADS}"/>
      <path d="M60 80 H96 V140 H60" stroke-dasharray="4 3"/>
    </g>
  </g>
  <g class="c-dim dim" fill="none" stroke="currentColor" stroke-width="1">
    <path d="M40 50 V170 M36 50 H60 M36 170 H60"/>
    <path d="M60 192 V170 M132 192 V170 M60 188 H132"/>
    <path d="M400 74 H380 M400 146 H380 M396 74 V146"/>
    <path d="M132 212 V180 M380 212 V180 M132 208 H380"/>
  </g>
  <g class="c-dim"><text x="20" y="114">dk</text><text x="90" y="205">k</text><text x="404" y="114">d</text><text x="245" y="224">L</text></g>
  <g class="c-dim dim" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M428 60 l7 7 14-16"/><path d="M428 118 l7 7 14-16"/><path d="M428 176 l7 7 14-16"/>
  </g>
</svg>`;

// 四步关键帧缩略（120×40）
const FRAME_THREADS = '<path d="M32 15l-1 10M40 15l-1 10M48 15l-1 10M56 15l-1 10M64 15l-1 10M72 15l-1 10M80 15l-1 10M88 15l-1 10" stroke-width="1"/>';
export const stepFrames = [
  `<svg class="frame" viewBox="0 0 120 40" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="8" y="8" width="18" height="24"/><path d="M26 14h70l2 2v8l-2 2H26"/></svg>`,
  `<svg class="frame" viewBox="0 0 120 40" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="8" y="8" width="18" height="24"/><path d="M26 14h70l2 2v8l-2 2H26"/>${FRAME_THREADS}</svg>`,
  `<svg class="frame" viewBox="0 0 120 40" aria-hidden="true" focusable="false" stroke-width="1.5" stroke-linejoin="round"><g fill="currentColor" stroke="currentColor"><rect x="8" y="8" width="18" height="24"/><path d="M26 14h70l2 2v8l-2 2H26z"/></g><g stroke="var(--color-surface)" fill="none">${FRAME_THREADS}</g></svg>`,
  `<svg class="frame" viewBox="0 0 120 40" aria-hidden="true" focusable="false" stroke-width="1.5" stroke-linejoin="round"><g fill="currentColor" stroke="currentColor"><rect x="8" y="8" width="18" height="24"/><path d="M26 14h70l2 2v8l-2 2H26z"/></g><g stroke="var(--color-surface)" fill="none">${FRAME_THREADS}</g><g stroke="var(--color-accent)" fill="none" stroke-width="1"><path d="M3 8v24M1 8h7M1 32h7M26 37h70M26 34v5M96 34v5"/><path d="M104 22l4 4 8-9" stroke-width="2" stroke-linecap="round"/></g></svg>`,
];

// ---------- 带垫异形螺栓示意（重绘，不是买家图纸） ----------
export const customBolt = (id, title, desc) => `<svg viewBox="0 0 360 180" role="img" aria-labelledby="${id}">
  <title id="${id}">${title}</title>
  <desc>${desc}</desc>
  <g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
    <path d="M40 50 H96 V130 H40 Z"/><path d="M40 76 H96 M40 104 H96" stroke-width="1"/>
    <rect x="96" y="40" width="12" height="100"/>
    <path d="M108 66 H176 V60 H300 L308 68 V112 L300 120 H176 V114 H108 Z"/>
    <path d="M214 62 L210 118 M226 62 L222 118 M238 62 L234 118 M250 62 L246 118 M262 62 L258 118 M274 62 L270 118 M286 62 L282 118 M298 62 L294 118" stroke-width="1"/>
    <path d="M20 90 H340" stroke-dasharray="12 4 2 4" stroke-width="1"/>
  </g>
  <g fill="none" stroke="currentColor" stroke-width="1">
    <path d="M108 152 V140 M176 152 V114 M108 148 H176"/>
    <path d="M176 164 V120 M308 164 V120 M176 160 H308"/>
  </g>
  <text x="120" y="146">Ø1</text><text x="228" y="158">Ø2 · thread</text>
</svg>`;

// ---------- 型号页 / 分类页图纸（480×260） ----------
const DIN912_THREADS = 'M130 82 L126 138 M140 82 L136 138 M150 82 L146 138 M160 82 L156 138 M170 82 L166 138 M180 82 L176 138 M190 82 L186 138 M200 82 L196 138 M210 82 L206 138 M220 82 L216 138 M230 82 L226 138 M240 82 L236 138 M250 82 L246 138 M260 82 L256 138 M270 82 L266 138 M280 82 L276 138 M290 82 L286 138 M300 82 L296 138 M310 82 L306 138';
const drawingDin912 = () => `<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
    <rect x="60" y="60" width="60" height="100"/>
    <path d="M60 85 H90 V135 H60" stroke-dasharray="4 3" stroke-width="1"/>
    <path d="M120 80 H314 L320 86 V134 L314 140 H120"/>
    <path d="${DIN912_THREADS}" stroke-width="1"/>
    <path d="M40 110 H340" stroke-dasharray="12 4 2 4" stroke-width="1"/>
    <circle cx="410" cy="110" r="50"/>
    <polygon points="410,85 431.65,97.5 431.65,122.5 410,135 388.35,122.5 388.35,97.5"/>
    <path d="M410 50 V170 M350 110 H470" stroke-dasharray="12 4 2 4" stroke-width="1"/>
  </g>
  <g fill="none" stroke="currentColor" stroke-width="1">
    <path d="M36 60 V160 M32 60 H60 M32 160 H60"/>
    <path d="M60 184 V160 M120 184 V160 M60 180 H120"/>
    <path d="M338 80 H320 M338 140 H320 M334 80 V140"/>
    <path d="M120 206 V146 M320 206 V146 M120 202 H320"/>
    <path d="M388.35 182 V122.5 M431.65 182 V122.5 M388.35 178 H431.65"/>
    <path d="M60 44 V60 M90 44 V85 M60 48 H90"/>
  </g>
  <g><text x="18" y="114">dk</text><text x="86" y="194">k</text><text x="341" y="114">d</text><text x="214" y="216">L</text><text x="406" y="195">s</text><text x="71" y="40">t</text></g>`;

// DIN 6921：六角法兰面螺栓，侧视（六角头三面 + 法兰 + 齿形承面 + 杆 + 螺纹）+ 端视（法兰圆 + 六角）
const drawingDin6921 = () => `<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
    <path d="M60 78 H100 V142 H60 Z"/><path d="M60 100 H100 M60 120 H100" stroke-width="1"/>
    <path d="M100 60 L112 62 V158 L100 160 Z"/>
    <path d="M112 66 l3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3" stroke-width="1"/>
    <path d="M112 88 H314 L320 94 V126 L314 132 H112"/>
    <path d="M150 90 L146 130 M162 90 L158 130 M174 90 L170 130 M186 90 L182 130 M198 90 L194 130 M210 90 L206 130 M222 90 L218 130 M234 90 L230 130 M246 90 L242 130 M258 90 L254 130 M270 90 L266 130 M282 90 L278 130 M294 90 L290 130 M306 90 L302 130" stroke-width="1"/>
    <path d="M40 110 H340" stroke-dasharray="12 4 2 4" stroke-width="1"/>
    <circle cx="410" cy="110" r="52"/>
    <polygon points="410,80 436,95 436,125 410,140 384,125 384,95"/>
    <path d="M410 46 V174 M346 110 H474" stroke-dasharray="12 4 2 4" stroke-width="1"/>
  </g>
  <g fill="none" stroke="currentColor" stroke-width="1">
    <path d="M36 60 V160 M32 60 H112 M32 160 H112"/>
    <path d="M60 184 V142 M112 184 V158 M60 180 H112"/>
    <path d="M338 88 H320 M338 132 H320 M334 88 V132"/>
    <path d="M112 206 V166 M320 206 V138 M112 202 H320"/>
    <path d="M384 190 V125 M436 190 V125 M384 186 H436"/>
  </g>
  <g><text x="18" y="114">dc</text><text x="82" y="194">k</text><text x="341" y="114">d</text><text x="210" y="216">L</text><text x="406" y="203">s</text></g>`;

// 自攻螺钉：盘头 + 锥形自攻螺纹 + 尖端；端视十字槽
const drawingTapping = () => `<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
    <path d="M70 70 Q56 110 70 150 H112 V70 Z"/><path d="M92 88 V132" stroke-width="1"/>
    <path d="M112 90 H250 L330 110 L250 130 H112"/>
    <path d="M124 90 L120 130 M140 90 L136 130 M156 90 L152 130 M172 90 L168 130 M188 90 L184 130 M204 90 L200 130 M220 90 L216 130 M236 90 L232 130 M252 91 L248 129 M268 95 L264 125 M284 99 L280 121 M300 103 L296 117" stroke-width="1"/>
    <path d="M40 110 H350" stroke-dasharray="12 4 2 4" stroke-width="1"/>
    <circle cx="410" cy="110" r="42"/>
    <path d="M410 86 V134 M386 110 H434" stroke-width="2"/>
    <path d="M410 54 V166 M354 110 H466" stroke-dasharray="12 4 2 4" stroke-width="1"/>
  </g>
  <g fill="none" stroke="currentColor" stroke-width="1">
    <path d="M36 70 V150 M32 70 H70 M32 150 H70"/>
    <path d="M70 184 V150 M112 184 V150 M70 180 H112"/>
    <path d="M338 90 H250 M338 130 H250 M334 90 V130" stroke-dasharray="3 3"/>
    <path d="M112 206 V136 M330 206 V116 M112 202 H330"/>
  </g>
  <g><text x="18" y="114">dk</text><text x="86" y="194">k</text><text x="341" y="114">d</text><text x="214" y="216">L</text></g>`;

const DRAWINGS = { din912: drawingDin912, din6921: drawingDin6921, tapping: drawingTapping };
export const drawingBody = (key) => DRAWINGS[key]();
export const drawing = (key, id, title, desc, cls = 'art') => `<svg class="${cls}" viewBox="0 0 480 260" role="img" aria-labelledby="${id}">
  <title id="${id}">${title}</title>
  <desc>${desc}</desc>
  ${DRAWINGS[key]()}
</svg>`;

// 独立下载版（Downloads → Drawing (SVG)）：无 CSS 变量，颜色写死为视觉系统的 gray-300 / gray-500
export const standaloneDrawing = (key, title, desc) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 260" width="960" height="520" role="img" aria-labelledby="t">
  <title id="t">${title}</title>
  <desc>${desc} — Illustration, not a production drawing. Mingyue Fastener Co., Ltd.</desc>
  <rect width="480" height="260" fill="#FFFFFF"/>
  <g color="#A9AFB7" style="font-family:'IBM Plex Mono',ui-monospace,Consolas,Menlo,monospace;font-size:11px" fill="#5B6169">
  ${DRAWINGS[key]()}
  </g>
</svg>
`;
