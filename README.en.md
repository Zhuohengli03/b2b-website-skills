# b2b-website-skills · An agent pipeline for export-oriented B2B websites

[中文](README.md)

Lets your factory or trading company build its own B2B inquiry site. It turns one coding agent into a ten-person web team: you spend 20 minutes on a brief, and it runs project manager → researcher → planner → copywriter → designer → frontend / backend → SEO → QA → post-launch growth, in that order. Agents hand off through files only, and the run stops at the four points where you have to sign off. The output is a B2B lead-generation site written for overseas buyers, not a template. It is written for the person inside the factory or trading company who owns the website (the boss, the export manager, a salesperson), not for a web agency.

Works with **OpenClaw**, **Claude Code**, **Codex** and anything else that reads `SKILL.md`.

![Same brief: prompting a model once vs this pipeline](examples/mingyue-fastener/screenshots/compare.png)

> Same fictional fastener factory, same brief, no photos and no logo file on either side. Left: the brief handed to a model in one prompt ([source](examples/mingyue-fastener/baseline/index.html)). Right: the pipeline's output ([every artefact](examples/mingyue-fastener/README-示例说明.md)). The left looks slicker, but it drew its own logo and invented opening hours and testimonials; on the right every number has a source row and anything unknown is a `[待确认]` placeholder that must be cleared before launch. Annotations on the image are in Chinese.

## How it differs from "ask the model to build a site"

| | Prompting a model | This pipeline |
|---|---|---|
| Facts | The model invents "20 years of experience" | Every number needs a row in the fact-source table; anything without one becomes `[待确认]` and must be cleared before launch |
| Style | A hundred factories get the same site | **Personalisation hooks**: one each from product geometry & process, company numbers, target-market taste, and the reference site you name, each tied to a concrete layout decision. The designer must answer "swap in another company's name and logo — does this design still hold?" |
| Handoff | One long chat that blurs over time | One agent per role; reads upstream files, writes only its own; missing fields mean the handoff is rejected |
| You | See the finished site, then discover the direction was wrong | Four gates: structure → colour & type direction sheet → homepage design → acceptance. Each gate settles one layer, so you never run to the end before finding out the direction was wrong; each takes feedback on its own layer only, then freezes |
| Scope | Everything | B2B inquiry sites only. If you need buyers to pay and order online the run stops and recommends Shopify / WooCommerce |
| Checks | Trust the model | `scripts/check.mjs`: dead links, H1, titles, stacked CTAs, form endpoint, placeholders, external resources, page weight and LCP |

## Install

One line, for any host that follows the Agent Skills spec (Claude Code, Codex, Cursor, OpenCode, Windsurf…):

```bash
npx skills add Zhuohengli03/b2b-website-skills
```

Or clone and install into a specific host:

```bash
git clone https://github.com/Zhuohengli03/b2b-website-skills
cd b2b-website-skills
bash install.sh openclaw   # → ~/.openclaw/workspace/skills/, then: openclaw gateway restart
bash install.sh claude     # → ~/.claude/skills/
bash install.sh codex      # → ~/.codex/skills/
```

Or as a Claude Code plugin:

```
/plugin marketplace add Zhuohengli03/b2b-website-skills
/plugin install b2b-website-skills@b2b-website-skills
```

## Usage

1. Spend 20 minutes filling in [`templates/建站需求表.md`](templates/建站需求表.md) yourself and save it as `_内部/00-资料/需求表.md`. Put it, the logo source file, photos and certificate scans in `_内部/00-资料/` inside the project folder.
2. In that folder, tell the agent: **"资料齐了，开跑"** (materials are in, start). `b2b-run` asks its pre-flight questions once (who signs off, old site URL, hard deadline, where to stop), then calls each role per the stage table.
3. At each gate it stops and prints the one thing this layer needs you to decide, on one page. Read it and say "继续"; if the boss has to sign off, forward it as is.
4. After frontend delivers the test site, run `node scripts/check.mjs dist --perf --shots`; the last line must read `BLOCKING: false` before QA starts.
5. Acceptance only after P0 / P1 and `[待确认]` are all cleared.

Partial runs work too: "只给这个旧站做个体检" (audit this old site: may crawl the whole site, writes a one-file `旧站体检报告.md` in the current folder, no project tree, no time estimates), "继续跑下一阶段" (next stage), "这个项目跑到哪了" (status).

**Assets are a hard gate.** An inquiry site needs 5 workshop / production-line photos, 3 photos per main product category, and certificate scans. Step 0 counts them and, if short, prints a shoot list and waits. Real photos have to be shot by you; the pipeline gives you a 10-photo minimum shot list and a phone shooting guide. Without them, the ceiling is what the example shows.

## What's inside

Eleven skills, ~250k Chinese characters in total. Sizes are there for context budgeting.

| skill | Use on its own for | Highlights | Size |
|---|---|---|---|
| `b2b-run` | start / resume / status | Project tree, stage table, handoff checks, stops at gates, resumable RUN.md | 32 KB |
| `b2b-project-manager` | brief intake, acceptance & launch handover | 12-item brief, asset gate, confirmation & rework rules (what counts as rework, freeze after a gate), batches what it needs from you five at a time | 44 KB |
| `b2b-market-research` | competitors, keywords | Nine-dimension teardown of local competitors, three keyword tables, scrape-injection guard + raw archive | 24 KB |
| `b2b-site-diagnosis` | old-site audit, site type, style | Company typing → site type → display tech → style & type → **four personalisation hooks** → CTA rhythm; old-site grading and migration ledger | 124 KB |
| `b2b-copywriter` | English copy, Chinglish review | Every number in a fact-source table, `[待确认]` placeholders, Chinglish + AI-tells blacklists, swap-the-logo test, GEO-citable paragraphs | 24 KB |
| `b2b-ui-designer` | direction sheet, hi-fi, review | Internal multi-direction exploration then convergence, five tone dials, product-as-carrier scroll scene, rationale + replaceability check, layout-level AI-slop checklist | 104 KB |
| `b2b-frontend-dev` | test site, performance | No preloader, three-viewport render checks, isolated review, secrets & external links | 40 KB |
| `b2b-backend-dev` | forms, domains, go-live | Inquiry pipeline (form → mail → backup → notify), CMS, i18n, DNS/SSL, security headers, AI-crawler robots | 20 KB |
| `b2b-seo-specialist` | not ranking, schema, GEO | Technical SEO list, keyword placement, schema updates (FAQPage retired / Certification), GEO paragraph rules, monthly report four-parter | 24 KB |
| `b2b-qa-tester` | pre-launch testing | P0–P3, What/Why/Fix citation format, `BLOCKING` verdict, ≤3 fix loops | 40 KB |
| `b2b-growth-cs` | post-launch growth | Inquiry log, monthly report (for you / the boss), AI-visibility baseline, upgrading a quick-start site to a full inquiry site | 20 KB |

Shared rules: `README-流水线总览.md`, `文件契约.md` (who writes and reads each file), `职责归属矩阵.md`.

### Scripts (zero-dependency, Node 22)

| Script | Does |
|---|---|
| `scripts/check.mjs <dist> [--perf] [--shots] [--online] [--diff last.json]` | Pre-release check; every rule has an id, category and a pointer to the skill section: dead links, H1, titles, stacked CTAs, form endpoint, placeholders, **leaked secrets**, required schema fields, OG tags, orphan pages. `--shots` adds 3-viewport screenshots, overflow, tap targets, measured contrast and reduced-motion. Ends with `BLOCKING: true/false` |
| `scripts/validate-skills.mjs` | Validates frontmatter, pipeline-interface file names against the file contract (both ways), references exist |
| `scripts/crawl-old-site.mjs <url> [--wayback 2024-06]` | Old-site capture: mirror + sha256 manifest + redirect table + external links; Wayback fallback for dead sites; emits `urls.csv` for the migration ledger |
| `scripts/tokens.mjs --primary "#143A6E" [--logo logo.png]` | Three-layer tokens, `tokens.css` and a **computed** WCAG contrast table from a primary colour or a logo |

Also: `templates/建站需求表.md` (the brief you fill in yourself) and `examples/mingyue-fastener/` (full example).

## Models tested

| Model / host | Status | Notes |
|---|---|---|
| Claude (Claude Code / sub-agents) | ✅ Full example run | Steps 0–5 and 7, one sub-agent per role; four real backflows (fair date, differentiator, tempering temperature, mobile H1) |
| DeepSeek / Qwen / Kimi / GLM (OpenClaw) | ⏳ Untested | Skills are 15–35 KB each; long-instruction following and the file contract need real runs. Issues with results welcome |
| Codex | ⏳ Untested | |

## Known limits

- The example did not run step 5 backend, full step 6 SEO, or steps 8–9 (no real domain, mailbox or server).
- The example uses a plain static site instead of the WordPress stack in the tech list; see `_内部/06-站点记录/降级说明.md` in the example.
- B2B inquiry sites only. Brand and solution-type sites can run, but the defaults assume factories and trading companies.

## Changelog

- **0.1.0** — first public release, built for factories and trading companies to use on their own site. Eleven skills, four scripts, one full example. Techniques borrowed from marketingskills, claude-seo, geo-seo-claude, frontend-design, ux-ui-agent-skills, oil-ui, apple-design-skill, website-rebuild-skill, scroll-craft and squirrelscan are credited inline.

## Credits and licence

MIT. Some reference data is adapted from [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT); see [NOTICE.md](NOTICE.md) and keep the attribution lines at the top of the adapted files.
