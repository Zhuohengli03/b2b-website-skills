# README-技术部分 · 铭岳紧固件（示例）

> 产出方：前端。读者：PM（并入根目录 `README.md`）。
> 本 demo 由前端直接写好了根目录 `README.md`（第二人称、零内部术语、零内部路径），内容 = 本技术部分 + 内容维护说明，PM 可直接采用或在其上增补验收 / 交付段落。此处不重复正文，只列结构：

1. 本地预览：`node build.mjs --serve`（Node ≥ 18，零依赖）；`node build.mjs` 只生成 `dist/` 并校验（死链 / H1 / title 长度 / SVG 引用 / 占位标注 / CSS 裸 hex）。
2. 改内容：全部在 `content/`（site.json / meta.csv / categories.json / models.json / pages/*.json）；JSON 规则；`[待确认]` 清零方法；加一个型号的步骤；图片尺寸表。
3. 部署：Cloudflare Pages / Netlify / Vercel（构建命令 `node build.mjs`，输出 `dist`）或对象存储直传；域名与 `baseUrl`。
4. 上线前请准备：占位清零、表单接收端（`contact.json → form.endpoint`）、素材、robots 测试态。
5. 文件夹一览。
