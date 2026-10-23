# 第三方数据出处

本目录下部分参考文件的数据改编自开源项目，按其许可保留声明。

## ui-ux-pro-max

- 来源：https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- 许可：MIT License, Copyright (c) 2024 Next Level Builder
- 采用日期：2026-09-10
- 用到的表：`ux-guidelines.csv`、`styles.csv`（仅取 Do Not Use For 列）、`typography.csv`、`motion.csv`、`design-system/references/` 的三层令牌结构
- 改编方式：按出海 B2B 询盘站筛选条目、译为中文、重写为「必须满足 / 明确禁止 / 参考形态」三层，并补写结论列。条目与原表不一一对应。
- **未采用**：`colors.csv`、`products.csv`、`ui-reasoning.csv`（192 个品类里没有制造业，风格倾向偏 SaaS 与消费级，与工厂 / 外贸公司不符）；`design/` 的 logo 与图标生成（与「禁止重新设计公司 logo」的硬规则冲突）；`ui-styling/`（Tailwind + shadcn + React，与 WordPress 交付不匹配）。

MIT 许可要求在再分发时保留版权与许可声明。落到这套 skill 的用法上：这些参考文件可以自由用于公司自己的网站和商业用途，但**不要把文件头部的出处行删掉**；若把 reference 文件单独转给别人或对外发布，出处行必须随行。

影响到的文件：

- `b2b-qa-tester/references/可用性与可访问性检查项.md`
- `b2b-frontend-dev/references/前端自查表.md`
- `b2b-ui-designer/references/设计令牌架构.md`
- `b2b-site-diagnosis/references/风格与字体.md`（新增段）
- `b2b-site-diagnosis/references/组件与特效.md`（新增段）
