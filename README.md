# MoveTopia · 瑜伽创作空间

版本：0.1.0。交付日期：2026-11-08。

[在线演示](https://whe7962-dev.github.io/movetopia-web/#home) · [GitHub 仓库](https://github.com/whe7962-dev/movetopia-web) · [PR 列表](https://github.com/whe7962-dev/movetopia-web/pulls)

GitHub Actions 会检查 PR，并在 main 更新后发布演示。无法访问 GitHub 的接收方仍可使用离线 ZIP。

响应式前端演示：10 分钟轻量练习 → 全屏取景 → 倒计时 → 选片 → 模拟生成 → 查看与下载。采用灰白黑、桌面左侧导航、手机顶部导航、清晰的卡片与边框控件。

> 当前为演示版：摄像头、入镜检测与 AI 生成使用模拟流程；生成结果为所选示例原图。没有上传用户照片、调用付费 API 或连接后端。部署前端和后端到同一服务器不会自动完成接口联调。

## 交付文档

| 面向谁 | 文档 |
| --- | --- |
| 管理者 / 部署负责人 | [交付与部署说明](docs/DEPLOYMENT.md) |
| 体验者 / 演示者 | [使用说明书](docs/USER_GUIDE.md) |
| 前端开发 | [前端开发与架构](docs/FRONTEND_GUIDE.md) |
| 后端开发 | [后端交接说明](docs/BACKEND_HANDOFF.md) · [接口契约草案](docs/API_CONTRACT.md) |
| 项目评审 | [开发过程与范围记录](docs/DEVELOPMENT_LOG.md) · [PR 说明](docs/PR_DESCRIPTION.md) |
| 测试验收 | [验收记录](verification/验收记录.md) · [响应式检查数据](verification/responsive-checks.json) |

## 管理者如何部署

使用交付包中的 `dist/`，上传到静态网站目录即可。运行演示不依赖 GitHub、npm、Node.js、CDN、外部字体或 AI 服务。所有运行资源随包提供。服务器配置示例在 `deploy/nginx.conf.example`，详细步骤见部署说明。

不要直接双击 `dist/index.html`；必须通过 HTTP / HTTPS 服务访问。交付包的 `preview.mjs` 可用已安装的 Node.js 本地预览，不需要下载依赖。

## 源码开发

需要 Node.js 22 或更新版本，CI 推荐 Node.js 24，提供 `.nvmrc`。在源码目录执行：

```sh
npm ci
npm run dev
```

打开终端输出地址，默认是 http://127.0.0.1:5173 。macOS 用户也可双击 `启动演示.command`。

```sh
npm run build          # 根路径构建，含 TypeScript 检查
npm run build:portable # 相对资源路径构建，交付服务器使用
npm run build:pages    # 可选：GitHub Pages 子目录构建
npm run check:build    # 验证资源路径、脚本、样式和三张图片
npm run preview       # 本地预览 dist，不是生产服务器
```

修改源码后需重新构建；不能通过修改服务器上的压缩 JS 长期维护项目。无法访问 npm 的构建机器，需要公司内部 npm 镜像或提前准备好的构建环境。不能直接把 macOS 的 `node_modules` 复制给 Linux 使用。

## 当前能力

| 能力 | 状态 |
| --- | --- |
| 导航、页面、响应式、按钮反馈 | 已实现 |
| 10 分钟计时、暂停、倒计时 | 前端已实现，后台计时精度尚未产品化 |
| 语音提示 | 浏览器系统 TTS，用户主动开启，依设备声音支持 |
| 全屏镜头与入镜提示 | 示例图片 / 手动状态，没有真实检测 |
| 选片与状态保留 | 已实现；sessionStorage 只保存选片编号 |
| 生成与重试 | 模拟等待约 3.5 秒，不调用 AI |
| 查看与下载 | 实际查看和下载本地打包的示例 PNG |
| 登录、上传、服务端存储 | 未实现 |

不包含游戏解救、伙伴、奖励、积分或虚拟角色。所有摄影素材为本轮 AI 摄影示例，不是用户真实成片。

## 技术栈与配置

React 19、TypeScript、Vite、Lucide React、原生 CSS。Hash 路由支持静态托管后直接打开和刷新子页面。

本版不需要 `.env` 或 API 密钥。第三方密钥不能加入前端、`VITE_*` 变量或代码仓库。未来接口见交接草案，尚待后端确认与实现。

项目还未通过生产上线验收；Framer 中部分手机适配和异常状态未收尾，本交付包不表示 Framer 全部完成。
