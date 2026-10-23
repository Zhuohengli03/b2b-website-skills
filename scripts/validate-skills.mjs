#!/usr/bin/env node
/**
 * b2b-website-skills · skill 一致性校验
 *
 * 用法：node scripts/validate-skills.mjs [仓库根目录] [--json 报告路径]
 *   默认在脚本所在仓库（scripts/ 的上一级）里跑。零依赖（Node ≥ 22）。
 *
 * 检查什么（对应 README-流水线总览.md「文件契约」「每个 skill 的共同骨架」两节）：
 *   1. skills/<dir>/SKILL.md 的 frontmatter 有 name（且 == 目录名）和 description
 *   2. description 里不含「档位 / 轻量 / 商城」（档位制已下线，不能再从描述路由到它）
 *   3. SKILL.md「流水线接口」一节里提到的 .md / .csv 文件名（输入、输出、交接载荷）都能在 文件契约.md 找到
 *      （b2b-run 没有这一节，改为整篇核对它的目录树与阶段表）
 *      —— 名字不一致等于文件不存在，执行器第一次跑就断在交接上
 *   4. 反向：文件契约.md 文件表里的每个文件至少被一个 SKILL.md 提到
 *   5. SKILL.md 里引用的 references/xxx.md（含跨 skill 的 b2b-xxx/references/yyy.md）文件存在
 *
 * 输出：逐条不一致清单（`[编号] skill  说明`），末尾汇总；有不一致退出码 1，否则 0。
 * 只报不改——改名要按 文件契约.md「改名流程」四处同步。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const jsonOut = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;
const rootArg = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--json');
const ROOT = path.resolve(rootArg || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const SKILLS = path.join(ROOT, 'skills');
const CONTRACT = path.join(ROOT, '文件契约.md');
if (!fs.existsSync(SKILLS) || !fs.existsSync(CONTRACT)) { console.error(`找不到 ${SKILLS} 或 ${CONTRACT}`); process.exit(2); }

const issues = []; // {code, skill, detail}
const add = (code, skill, detail) => issues.push({ code, skill, detail });

// ---------- 工具 ----------
const FILE_RE = /[\p{L}\p{N}_\-./]+\.(?:md|csv)\b/gu;          // 任何 .md / .csv 路径或文件名
const BANNED = ['档位', '轻量', '商城'];
const base = s => s.split('/').pop();
const section = (md, title) => {                                  // 取「## title…」到下一个 ## 之间的内容
  const m = md.match(new RegExp(`^## [^\\n]*${title}[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'mu'));
  return m ? m[1] : null;
};
// 实例名归一到契约里的模板名：月报-2026-09.md → 月报-YYYY-MM.md
const canon = f => f.replace(/月报-\d{4}-\d{2}\.md$/u, '月报-YYYY-MM.md');
const filesIn = text => [...new Set([...text.matchAll(FILE_RE)].map(m => canon(m[0].replace(/^\.?\//, ''))).filter(f => !f.endsWith('SKILL.md')))];
const parseFrontmatter = md => {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) { const k = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/); if (k) fm[k[1]] = k[2].trim().replace(/^["'](.*)["']$/, '$1'); }
  return fm;
};

// ---------- 文件契约 ----------
const contractMd = fs.readFileSync(CONTRACT, 'utf8');
const contractFiles = new Set(filesIn(contractMd).map(base));                       // 契约里出现过的所有文件名（basename）
const tableSec = section(contractMd, '文件表') || '';
const contractTableFiles = [...new Set(filesIn(tableSec).map(base))];               // 文件表里登记的文件（反向检查用）
const IGNORE_SKILL_FILES = new Set(['SKILL.md', 'NOTICE.md', 'README-流水线总览.md', '文件契约.md', '职责归属矩阵.md', 'README.en.md']);

// ---------- 逐 skill ----------
const dirs = fs.readdirSync(SKILLS, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort();
const mentionedAnywhere = new Map(); // basename → Set(skill)
const report = {};
for (const dir of dirs) {
  const file = path.join(SKILLS, dir, 'SKILL.md');
  if (!fs.existsSync(file)) { add('FM-MISSING', dir, '没有 SKILL.md'); continue; }
  const md = fs.readFileSync(file, 'utf8');
  const r = report[dir] = { pipelineFiles: [], unknownFiles: [], missingRefs: [] };

  // 1. frontmatter
  const fm = parseFrontmatter(md);
  if (!fm) add('FM-MISSING', dir, 'SKILL.md 缺 frontmatter（--- name / description ---）');
  else {
    if (!fm.name) add('FM-NAME', dir, 'frontmatter 缺 name');
    else if (fm.name !== dir) add('FM-NAME', dir, `frontmatter name「${fm.name}」与目录名「${dir}」不一致`);
    if (!fm.description) add('FM-DESC', dir, 'frontmatter 缺 description');
    else {
      // 2. 禁用词
      for (const w of BANNED) if (fm.description.includes(w)) add('DESC-BANNED', dir, `description 含「${w}」：…${fm.description.slice(Math.max(0, fm.description.indexOf(w) - 15), fm.description.indexOf(w) + 15)}…`);
    }
  }

  // 3. 流水线接口 节里的文件名
  // b2b-run 是执行器不是岗位，没有「流水线接口」；它的目录树与阶段表整篇都按契约核
  const sec = dir === 'b2b-run' ? md : section(md, '流水线接口');
  if (sec === null) add('PIPE-MISSING', dir, 'SKILL.md 没有「## 流水线接口」一节');
  else {
    for (const f of filesIn(sec)) {
      if (/references\//.test(f) || /^(skills|scripts)\//.test(f)) continue;
      const b = base(f);
      if (IGNORE_SKILL_FILES.has(b)) continue;
      r.pipelineFiles.push(f);
      if (!contractFiles.has(b)) { r.unknownFiles.push(f); add('PIPE-UNKNOWN', dir, `流水线接口提到 \`${f}\`，文件契约.md 里没有这个名字`); }
    }
  }

  // 4. 反向统计：全文提到的文件
  for (const f of filesIn(md)) { const b = base(f); if (!mentionedAnywhere.has(b)) mentionedAnywhere.set(b, new Set()); mentionedAnywhere.get(b).add(dir); }

  // 5. references/ 引用存在
  for (const m of md.matchAll(/(?:\b(b2b-[a-z-]+)\/)?references\/([\p{L}\p{N}_\-.]+\.md)/gu)) {
    const owner = m[1] || dir;
    const p = path.join(SKILLS, owner, 'references', m[2]);
    if (!fs.existsSync(p) && !r.missingRefs.includes(`${owner}/references/${m[2]}`)) { r.missingRefs.push(`${owner}/references/${m[2]}`); add('REF-MISSING', dir, `引用的 \`${m[1] ? m[1] + '/' : ''}references/${m[2]}\` 不存在（期望 ${path.relative(ROOT, p)}）`); }
  }
}

// 4. 反向：契约文件表里的文件至少被一个 skill 提到
const orphanContract = [];
for (const b of contractTableFiles) {
  if (IGNORE_SKILL_FILES.has(b)) continue;
  if (!mentionedAnywhere.has(b)) { orphanContract.push(b); add('CONTRACT-UNUSED', '文件契约.md', `文件表登记了 \`${b}\`，没有任何 SKILL.md 提到它`); }
}

// ---------- 输出 ----------
const order = ['FM-MISSING', 'FM-NAME', 'FM-DESC', 'DESC-BANNED', 'PIPE-MISSING', 'PIPE-UNKNOWN', 'REF-MISSING', 'CONTRACT-UNUSED'];
issues.sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code) || a.skill.localeCompare(b.skill));
console.log(`校验 ${dirs.length} 个 skill · 文件契约登记 ${contractTableFiles.length} 个文件 · 不一致 ${issues.length} 处`);
issues.forEach((x, i) => console.log(`[${String(i + 1).padStart(2, '0')}] ${x.code.padEnd(15)} ${x.skill.padEnd(22)} ${x.detail}`));
const byCode = {}; for (const x of issues) byCode[x.code] = (byCode[x.code] || 0) + 1;
console.log('按类型汇总：' + (Object.entries(byCode).map(([k, v]) => `${k} ${v}`).join(' · ') || '无'));
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ skills: dirs.length, contractFiles: contractTableFiles, issues, byCode, perSkill: report, unusedContractFiles: orphanContract }, null, 2));
process.exit(issues.length ? 1 : 0);
