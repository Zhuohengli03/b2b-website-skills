# 没有子 agent 工具时

（从 `b2b-run/SKILL.md`「怎么调用一个岗位 skill」一节搬出，原文未改。）

**没有子 agent 工具时**：一次只读一个 `SKILL.md`，跑完那一阶段、落盘、然后再读下一个。**不要一次把十个 skill 全读进来**——上下文塞满之后每个岗位都会变糊，这是这条流水线最常见的失败方式。

**优先起子 agent**：一个岗位一个子 agent，给它三样东西——该 `SKILL.md` 全文、这一阶段的输入文件路径、输出文件应该写到哪。要求它只写自己的输出文件，写完把文件路径列表报回来。宿主有子 agent 工具时，一律按正文「子 agent 通用指令」起。

**策划与设计两步特殊**：`b2b-site-diagnosis/SKILL.md` 和 `b2b-ui-designer/SKILL.md` 都要求出清单/出方向单前先读 `references/` 里对应的那几份。子 agent 必须同时拿到被指到的 reference 文件，否则它会自己编一套组件、字体和动效。设计那一步要随行的是 `b2b-ui-designer/references/产品载体与场景段.md`、`b2b-ui-designer/references/设计令牌架构.md`，以及跨 skill 的 `b2b-site-diagnosis/references/组件与特效.md`。没有子 agent 时同样只在那一步才读这几份，别的步不读。

## 自己跑一个阶段时照样守的三条

没有子 agent，正文「子 agent 通用指令」里的清单就是你自己这一步要读的全部文件：该岗位 `SKILL.md`、阶段表「随行 reference」列的那几份、阶段表「读」列的输入文件。能不能上网、看图配额、每份产出的行数上限，三条对自己同样生效——跑完这一步、落盘、更新 `RUN.md`，再读下一个岗位。

## 岗位 skill 文件（一次只读一个）

skill 根目录 = 本仓库的 `skills/` 目录。它随安装位置变化（Claude Code 插件目录、`~/.claude/skills/`、OpenClaw 的 skills 目录都可能），**只读，不写**。下文用 `skills/` 指代它；按 skill 名调用时（`b2b-project-manager` 等）由宿主自行定位，不需要绝对路径。

| 岗位 | 文件 |
|---|---|
| 项目经理 | `skills/b2b-project-manager/SKILL.md` |
| 市场研究 | `skills/b2b-market-research/SKILL.md` |
| 策划 | `skills/b2b-site-diagnosis/SKILL.md`（外加 `references/` 四份：风格与字体、组件与特效、展示技术清单、公司分型速查与自查） |
| 文案 | `skills/b2b-copywriter/SKILL.md` |
| 设计 | `skills/b2b-ui-designer/SKILL.md` |
| 前端 | `skills/b2b-frontend-dev/SKILL.md` |
| 后端 | `skills/b2b-backend-dev/SKILL.md` |
| SEO | `skills/b2b-seo-specialist/SKILL.md` |
| 测试 | `skills/b2b-qa-tester/SKILL.md` |
| 上线后增长运营 | `skills/b2b-growth-cs/SKILL.md` |
| 共同规则 | 仓库根目录的 `README-流水线总览.md`、`职责归属矩阵.md`、`文件契约.md`（文件名唯一来源） |
