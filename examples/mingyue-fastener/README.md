# Mingyue Fastener 网站 · 使用说明

这是你们公司网站的全部源文件。网站是**纯静态站**：没有后台、没有数据库，所有页面由一条命令生成，放到任何静态托管上即可访问。你只需要会三件事：本地预览、改内容、发布。

## 1 · 本地预览

需要 Node.js 18 或更高版本（https://nodejs.org 下载安装即可，选 LTS）。

```
node build.mjs --serve
```

终端会显示 `预览：http://localhost:8080/`，用浏览器打开即可。按 Ctrl+C 停止。

只生成文件、不启动预览：

```
node build.mjs
```

生成结果在 `dist/` 文件夹，整个文件夹就是要发布的网站。

生成时会自动检查：站内链接是否都能打开、每页是否只有一个主标题、页面标题是否超过 60 个字符、图形引用是否完整。有问题会在终端用「错误：」列出并停止生成，改好后再运行一次即可。

## 2 · 改内容

所有文字和数据都在 `content/` 文件夹，是普通的 JSON 文本文件，用记事本、VS Code 等任何文本编辑器打开。**改完保存，再运行一次 `node build.mjs`，页面就更新了。**不需要碰 `src/` 和 `dist/`。

| 想改什么 | 打开哪个文件 |
|---|---|
| 公司名、地址、邮箱、电话、导航菜单、页脚链接、页尾那句话 | `content/site.json` |
| 每页的浏览器标题（title）和搜索结果描述（description） | `content/meta.csv`（可用 Excel 打开，保存时保持 CSV 格式） |
| 首页各区块 | `content/pages/home.json` |
| 四个产品分类页（标题、副句、说明文字、页尾按钮） | `content/categories.json` |
| 型号页（参数、MOQ、交期、下载、替代型号、同类型号） | `content/models.json` |
| 产品目录页的筛选项与提示文字 | `content/pages/products.json` |
| 非标定制页 | `content/pages/custom.json` |
| 质量与下载页 | `content/pages/quality.json` |
| 关于我们 / 新闻与展会 | `content/pages/about.json`、`content/pages/news.json` |
| 常见问题 | `content/pages/faq.json` |
| 联系页表单文字、感谢页 | `content/pages/contact.json` |
| 隐私政策、Imprint、404 页 | `content/pages/legal.json` |

几条规则：

- JSON 里的文字放在英文双引号之间；文字本身要用引号时写成 `\"`。少一个逗号或引号，生成时会报错并指出第几行。
- 页面上黄底虚线框里的 `[待确认：…]` 是**还没定稿的内容**。确认后把文字替换成正式内容即可；删掉所有 `[待确认` 字样，黄框就消失了。上线前请清零。
- 页面上的虚线占位框（车间照片、证书、产品图）是图片位。图片到位后把图片放进 `src/assets/img/`，再把文件名填进对应 JSON 里的图片字段（`content/` 各文件里的 `photo` / `photos` 字段；图片尺寸要求见下表）。

### 加一个产品型号

打开 `content/models.json`，复制一整段（从 `{` 到 `}`），改成新型号的数据，注意：

- `model_string` 是型号串，格式 `DIN912-M6x20-12.9-BO`（标准号-规格-等级-表面代码）；
- `slug` 是网址，全小写、点改成横线：`din912-m6x20-12-9-bo`；
- `category` 填所属分类的 `slug`（见 `content/categories.json`）；
- 在 `content/meta.csv` 加一行该型号页的 title 和 description（按已有的型号行照抄格式）。

运行 `node build.mjs`，型号页、目录页、分类页、站点地图会自动带上它。

### 图片尺寸要求

| 位置 | 比例 | 最小尺寸 | 格式 / 大小 |
|---|---|---|---|
| 首页车间图 | 4:3 | 1600 × 1200 | webp ≤ 300KB |
| 证书扫描件 | 竖版 3:4（页面裁成 4:3 缩略） | 800 宽 | jpg/webp 缩略 + PDF 原件 |
| 分类页 / 型号页产品图 | 4:3 | 1200 × 900 | webp ≤ 200KB |
| 关于我们厂区 / 设备 | 16:9（厂区）、4:3（设备） | 1600 宽 | webp ≤ 200KB |
| logo | 横版 | 高 ≥ 144 px（页面显示 36 px） | svg 或 png 透明底 |

## 3 · 发布到静态托管

把 `dist/` 文件夹的内容上传到任何静态托管即可。推荐任选其一（均有免费档、自动 HTTPS）：

**Cloudflare Pages / Netlify / Vercel**
1. 把整个项目文件夹放进一个 Git 仓库（GitHub / GitLab）。
2. 在托管平台新建站点，连接这个仓库。
3. 构建命令填 `node build.mjs`，输出目录填 `dist`。
4. 之后每次推送代码，平台自动重新生成并发布。

**普通虚拟主机 / 对象存储（阿里云 OSS、腾讯云 COS、S3）**
1. 本地运行 `node build.mjs`。
2. 把 `dist/` 里的全部文件上传到站点根目录，目录结构保持不变。
3. 404 页面指向 `404.html`（大多数平台会自动识别）。

**域名**：在托管平台添加你们的域名并按提示改 DNS。网站内的规范链接和站点地图使用 `content/site.json` 里的 `baseUrl`，域名确定后请把它改成正式域名（如 `https://www.mingyue-fastener.com`），再生成一次。

## 4 · 上线前请准备

- 把所有 `[待确认：…]` 替换为正式内容（搜索 `content/` 文件夹里的「待确认」）。
- 询盘表单的接收端：表单目前把提交内容存在访问者自己的浏览器里，**还不会发到邮箱**。接收端配好后，把 `content/pages/contact.json` 里 `"endpoint": ""` 的引号内填上接收地址即可（上线前在后端步骤一并完成）。
- 把 logo、证书扫描件、车间与产品照片按上表尺寸提供。
- `dist/robots.txt`：测试期间如果站点已可公开访问，请把其中 `Allow: /` 改为 `Disallow: /`，正式上线时改回。

## 5 · 文件夹一览

```
build.mjs      生成网站的命令（也能本地预览）
content/       所有文字与数据 —— 你只需要改这里
src/           页面模板、样式、脚本（改版式时才需要动）
dist/          生成出来的网站，上传这个文件夹
```
