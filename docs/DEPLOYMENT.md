# 管理者交付与部署说明

## 交付内容

不需要通过开发者自己的服务器中转。把整个 ZIP 通过微信、飞书、网盘或公司文件系统发送给管理者即可，不依赖 GitHub 账号或访问权限。

解压后目录结构：

```text
MoveTopia-handoff-v0.1.0/
  先读我.md                交付入口
  dist/                    可直接部署的静态成品
    index.html
    assets/                编译后的 JavaScript / CSS
    images/                三张示例 PNG
  source/                  完整可维护源码、package-lock.json、文档
  docs/                    单独列出的交接文档
  deploy/                  Nginx 示例与无依赖预览工具
  preview.mjs              预览入口（与 deploy 中内容相同）
  RELEASE.json             版本、文件、依赖版本及交付范围
  SHA256SUMS.txt            包内逐文件校验值
```

`dist` 足够运行演示，不需要 Node.js、npm、GitHub、在线字体或 CDN。系统语音能力由浏览器 / 操作系统提供，离线语音可用性不作保证；不影响其他流程。

## 方式 A：上传到现有静态网站（推荐）

1. 在服务器为本项目创建独立目录，例如 `/var/www/movetopia/releases/0.1.0/`，不要覆盖其他网站。
2. 把完整 `dist` 上传到该版本目录，保留 assets 和 images 结构。
3. 设置网站根目录指向该 `dist`；配置正确 JavaScript / CSS / PNG MIME 类型。
4. 绑定管理者自己的域名，并按其服务器惯例配置 HTTPS。
5. 打开 `<网站地址>/#home`，按下文验收。

使用宝塔等面板时，创建静态站点，把 **dist 里面的内容** 放入网站根目录。不要只上传 index.html，不需要 Node 项目进程。成品使用相对资源路径，也可放在 `<已有网站>/movetopia/`，访问时保留末尾斜杠。

## 方式 B：Nginx

参考 `deploy/nginx.conf.example`。这是配置样例，不会自动修改服务器。

修改域名和根目录后，由服务器管理员安装站点配置，执行：

```sh
nginx -t
# 上一步通过后，再按服务器管理方式重新加载，例如：
systemctl reload nginx
```

当前 `/api/` 返回 501，明确表示后端未接入。后端准备好后替换该 location，不能同时保留两个相同 location。示例 proxy_pass 无末尾斜杠，会保留 `/api/` 前缀；后端若没有该前缀，双方需调整代理路径。

如需要子目录部署，可将 dist 内容置于网站根目录中的 `movetopia/` 文件夹，保证 `/movetopia/` 对应 index.html。Hash 路由不需要 SPA 伪静态兜底；不存在的 JS / 图片应返回 404，不能返回 HTML 假装成功。

## 无需 npm 的本地预览

若电脑已安装 Node.js 22+，在解压后的交付包根目录运行：

```sh
node preview.mjs ./dist 4173
```

打开 http://127.0.0.1:4173/ 。不需要 npm install，也不连接外部服务。

验证子目录方式：

```sh
node preview.mjs ./dist 4174 /movetopia/
```

打开 http://127.0.0.1:4174/movetopia/ 。此预览工具只监听本机，用于验收，不是对外生产服务器。

不要双击 index.html 使用 `file://`，模块脚本和下载可能被浏览器阻止。

## 接后端时

建议同域部署：页面 `/`，接口 `/api/v1/`。前端静态文件由 Nginx 提供，API 请求转发到后端进程。接口草案见 API_CONTRACT，后端分工见 BACKEND_HANDOFF。

**当前没有已接好的 API 调用。** 必须先确认契约，再由前端把模拟 provider 换成真实上传、任务查询和结果下载逻辑，重新构建 dist 后更新部署。无需让管理者访问开发者自己的服务器。

## 源码重新构建

```sh
cd source
npm ci
npm run build:portable
npm run check:build
```

需要可用的 npm 包源 / 公司内部镜像。源码包不附 node_modules；跨操作系统复制依赖目录可能导致 esbuild 等工具失效。无外网环境可直接部署已提供的 dist，代码修改则在具备依赖的构建机完成，再传新的 dist。

GitHub Pages 构建：`npm run build:pages`。仓库的 `.github/workflows/pages.yml` 会检查 PR，main 更新后发布到 `https://whe7962-dev.github.io/movetopia-web/`。网站是否发布成功以 Actions 的 deploy 结果为准；此前的离线 ZIP 不依赖这个地址。Pages 路径配置参考 [Vite 官方部署说明](https://vite.dev/guide/static-deploy.html#github-pages)，离线接收方无需访问该链接即可按本文部署。

## 更新与回滚

使用版本目录部署。新版本先上传到新目录并验收，再切换站点根目录或 `current` 符号链接。回滚时指向上一个完整版本，避免只替换 index.html 导致资源混用。

index.html 与无文件名 hash 的 images 使用 no-cache；带 hash 的 assets 可长期缓存。刷新问题先检查是否残留旧 HTML。无需数据库迁移，因为当前无后端。

## 部署后验收

- 首页图片、样式、导航正常；手机没有横向滚动。
- 练习 / 取景铺满画面，暂停与倒计时可操作。
- 选照片 02，生成后仍是 02；放大、下载成功。
- 模拟生成失败可重试；没有所选照片时不能生成。
- 直接打开 `/#select`、`/#result` 并刷新不白屏；没有选片时显示空状态。
- 浏览器 Network 中静态资源都是本站，没有 GitHub/CDN/AI 请求；不存在的资源真实返回 404。
- 全部参与者理解这是演示，摄像头、检测、AI 生成还未接入。

首次部署所需的服务器密码、域名、TLS 证书及后端端口由管理者掌握；不应在 ZIP 内放置这些凭证。
