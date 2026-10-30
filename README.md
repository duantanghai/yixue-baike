# 医学知识百科 · 网页版

纯静态医学知识库网站，覆盖 1594 种疾病的医学知识查询（概述、流行病学、病因、临床表现、实验室检查、诊断、治疗、预后等章节），含 1447 张原生结构化表格。由微信小程序「医识百科助手」内容转换而来。

## 本地预览

```bash
# 在项目根目录执行（需 Python 3）
python -m http.server 8090
# 浏览器打开 http://localhost:8090
```

## 目录结构

```
medweb/
├── index.html          # 单页应用入口（hash 路由）
├── css/style.css       # 样式（移动端优先）
├── js/render.js        # 表格渲染：首列合并 / 注释 / 列宽（移植自小程序 detail.js）
├── js/data.js          # 数据按需加载（先索引，再按科室包加载）
├── js/app.js           # 路由与页面（首页搜索+科室宫格 / 列表 / 详情）
└── data/
    ├── index.json      # 轻量索引（1594 条：id/name/enName/specialty/aliases/tags/pkg）
    ├── specialties.json# 27 个科室
    └── disease-*.json  # 32 个科室包（按需加载）
```

## 部署到 Gitee Pages（国内免费、微信内可打开）

1. 注册 https://gitee.com 账号
2. 新建**公开**仓库，例如 `medweb`
3. 在项目根目录执行（替换 yourname / medweb 为你的）：
   ```bash
   git remote add origin https://gitee.com/yourname/medweb.git
   git push -u origin master
   ```
4. 仓库页 → **服务** → **Gitee Pages** → 勾选「强制使用 HTTPS」→ 点击「启动」
5. 生成的地址形如 `https://yourname.gitee.io/medweb/`
   - 注意：Gitee Pages 默认以仓库名为子路径，若需根路径访问，请在仓库设置里把默认分支设为 `master` 并确认 Pages 部署目录为 `/`（根目录）
6. 拿到链接后，在公众号图文放二维码 / 自动回复发链接即可触达读者

## 部署到 Cloudflare Pages / Workers（海外可用，国内常超时）

> 适合读者在海外或能访问境外网络的情况。中国大陆网络对 `*.workers.dev` / `*.pages.dev` 经常超时，微信内也多被拦截。

- 直接把整个 `medweb` 文件夹拖到 Cloudflare Dashboard 的「上传文件夹」入口即可，构建设置全部留空。

## 数据来源与合规

内容依据公开出版的医学教材、临床指南与专家共识整理，仅供健康科普参考，不提供在线诊疗及用药建议。
