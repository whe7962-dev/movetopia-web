# 前端开发与架构

## 文件与职责

| 文件 | 职责 |
| --- | --- |
| `src/main.tsx` | React StrictMode 与全局样式入口 |
| `src/App.tsx` | 页面、Hash 路由、状态、计时、模拟任务、下载、弹窗 |
| `src/styles.css` | 配色、组件、响应式与动效 |
| `src/vite-env.d.ts` | Vite 环境变量类型 |
| `public/images/` | 三张 AI 摄影示例 PNG |
| `scripts/check-build.mjs` | 实际构建资源与部署路径验证 |
| `deploy/` | 静态预览和 Nginx 配置示例 |

这是快速演示架构，页面集中在 App 中。没有 Redux、React Router 或后端 SDK，不代表生产架构定稿。

## 路由

`#home`、`#permissions`、`#practice`、`#camera`、`#select`、`#generate`、`#result`、`#gallery`、`#camera-error`。未知 Hash 显示首页。生成 / 结果页没有有效选片时展示空状态。

`navigate()` 处理生成期间的离开确认；`go()` 执行跳转。浏览器后退走 `hashchange`，不拦截浏览器自己的导航。生成中关闭页面的提示由浏览器决定是否展示。

## 状态

| 状态 | 生命周期 |
| --- | --- |
| selectedId | React + sessionStorage，只保存 01 / 02 / 03 编号；刷新恢复 |
| voice | 默认关闭，页面流程中保留；主动开启使用系统 TTS |
| remaining / paused | 初始 600 秒，可暂停 / 继续，重启练习重置 |
| countdown | null / 3 / 2 / 1；取消、离开与卸载时清理 timer |
| framing | ready / edge / absent，来自演示选项，不是模型 |
| generation | idle / running / failed / done，3500ms 模拟任务 |
| modal | 隐私、大图、离开确认；使用原生 dialog |

生成、结果和下载读取同一个所选 photo 对象。新拍摄演示结束后清除旧选片。不保存摄像头帧、Blob 或密钥。

## 路径与下载

图片使用 `import.meta.env.BASE_URL`，构建会替换为目标部署路径。便携交付使用 `./`，GitHub Pages 可选构建使用 `/movetopia-web/`。新增图片不得硬编码根路径 `/images/...`。

下载使用 `fetch(selected.src)` 读取同源 PNG，创建并释放 Object URL。未来跨域结果 URL 需要允许跨域读取，或改用后端下载代理接口；不要让前端代理模型厂商密钥。

## 样式与交互

- 主色 #191919，灰白背景；状态同时使用图标、文字和边框。
- 900px 以下切为顶部导航；650px 以下主要双栏变纵向。
- 练习 / 取景使用 100dvh，无外边距。取景图 cover，选片 / 结果 contain 保留完整身体。
- 动效遵守 prefers-reduced-motion，操作不只依赖 hover。
- 系统语音依赖设备；正式使用前需要真机测试。

## 接口接入前的整理

1. 拆分 Home、Permissions、Practice、Capture、Selection、Generation、Result 页面及复用组件。
2. 计时和任务状态抽为 hooks；正式计时用时间戳校准后台节流。
3. 提供 demo / live provider；live 失败必须显示失败，不能偷偷降级成演示成功。
4. 真实取景管理 MediaStream 生命周期，离开页面停止 tracks。
5. 上传、生成任务和结果按接口草案联调，接入后增加接口与端到端自动化测试。

## 测试范围

现有构建资源检查和实际浏览器验收，不是完整自动化测试体系。尚无 React 组件测试、真实摄像头测试或多设备系统语音测试。
