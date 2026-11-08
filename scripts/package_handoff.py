"""Build an offline handoff ZIP using only the Python standard library.

Run from the source checkout after npm run build:portable && npm run check:build.
The ZIP contains no node_modules, Git credentials, environment files or local paths.
"""
from pathlib import Path
import hashlib
import json
import shutil
import tempfile
import zipfile

project = Path(__file__).resolve().parents[1]
package = json.loads((project / "package.json").read_text())
version = package["version"]
name = f"MoveTopia-handoff-v{version}"
destination = project.parent / "MoveTopia-交付包"
destination.mkdir(exist_ok=True)
dist = project / "dist"
if not (dist / "index.html").is_file():
    raise SystemExit("Missing dist. Run npm run build:portable first.")
if './assets/' not in (dist / "index.html").read_text():
    raise SystemExit("Expected portable build. Run npm run build:portable.")

entry = """# MoveTopia 前端交付包：请先读这里

版本 0.1.0 · 2026-11-08

这是可直接运行的前端演示与完整源码，不需要访问 GitHub。

## 管理者先做这三步

1. 阅读 [部署说明](docs/DEPLOYMENT.md)，把完整 `dist/` 上传到静态网站目录。
2. 打开网站，按照 [使用说明书](docs/USER_GUIDE.md) 走通一分钟演示。
3. 把 [后端交接说明](docs/BACKEND_HANDOFF.md) 和 [接口草案](docs/API_CONTRACT.md) 交给后端负责人，确认接口后安排前端联调。

## 文件用途

- `dist/`：可部署成品，运行不需要 npm 或 Node.js。
- `source/`：完整源码与依赖锁定文件；修改后需重新构建。
- `docs/`：部署、使用、前端开发、后端交接、接口草案、开发过程与 PR 说明。
- `deploy/`：Nginx 示例和无 npm 依赖的本地预览工具。
- `preview.mjs`：已有 Node.js 时，在本目录执行 `node preview.mjs ./dist 4173`，访问 http://127.0.0.1:4173/ 。不要直接双击 index.html。
- `source/verification/`：验收记录与截图。
- `RELEASE.json`：版本、依赖、范围与测试记录入口。
- `SHA256SUMS.txt`：包内文件校验清单，不包含清单自身。

## 当前真实能力与边界

导航、练习计时、倒计时、选片、大图和下载已实现。摄像头、入镜检测和 AI 生成仍为明确标注的模拟；结果为所选示例原图。没有用户照片上传、账号、后端服务或模型密钥。

把前端和后端部署在一起不等于已经完成接口接入。请先确认草案，再把前端演示逻辑替换为真实调用。离线包不依赖线上仓库或 PR；线上状态以代码平台为准，PR 文案可复制到管理者自己的代码平台。

## 可直接转发给后端负责人的话

> 这是 MoveTopia 瑜伽写真前端演示交付包。请先部署 dist 查看页面，并阅读 docs/BACKEND_HANDOFF.md 与 docs/API_CONTRACT.md。当前为演示模式，尚未接入真实摄像头、检测、上传和 AI 生成。请确认接口前缀、鉴权、上传限额、生成任务状态与结果下载方式，提供测试接口后我们继续前后端联调。
"""

with tempfile.TemporaryDirectory(prefix="movetopia-handoff-") as staging:
    root = Path(staging) / name
    root.mkdir()
    source = root / "source"
    source.mkdir()
    directories = ["src", "public", "scripts", "docs", "deploy", ".github", "verification"]
    for folder in directories:
        if (project / folder).exists():
            shutil.copytree(project / folder, source / folder,
                            ignore=shutil.ignore_patterns("下载验证-*.png", "__pycache__", "*.pyc", ".DS_Store"))
    for file in ["package.json", "package-lock.json", "tsconfig.json", "vite.config.ts", "index.html", "README.md", ".gitignore", ".nvmrc", "启动演示.command"]:
        shutil.copy2(project / file, source / file)
    shutil.copytree(dist, root / "dist")
    shutil.copytree(project / "docs", root / "docs")
    shutil.copytree(project / "deploy", root / "deploy")
    shutil.copy2(project / "deploy" / "preview.mjs", root / "preview.mjs")
    (root / "先读我.md").write_text(entry, encoding="utf-8")
    lock = json.loads((project / "package-lock.json").read_text())
    versions = {key: lock["packages"][f"node_modules/{key}"]["version"]
                for key in ["react", "react-dom", "typescript", "vite", "lucide-react"]}
    release = {
        "project": "MoveTopia", "version": version, "date": "2026-11-08",
        "delivery": "offline-static-demo", "assetBase": "./", "dependencies": versions,
        "backendConnected": False, "realCameraConnected": False, "aiGenerationConnected": False,
        "entry": "dist/index.html (serve over HTTP/HTTPS)",
        "source": "source/", "docs": "docs/", "verification": "source/verification/",
        "excludes": ["node_modules", ".git", ".env", "API keys", "user photos"],
    }
    (root / "RELEASE.json").write_text(json.dumps(release, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    files = sorted(file for file in root.rglob("*") if file.is_file())
    sums = [hashlib.sha256(file.read_bytes()).hexdigest()+"  "+file.relative_to(root).as_posix() for file in files]
    (root / "SHA256SUMS.txt").write_text("\n".join(sums)+"\n", encoding="utf-8")
    zip_path = destination / f"{name}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for file in sorted(root.rglob("*")):
            if file.is_file(): archive.write(file, file.relative_to(Path(staging)))
    digest = hashlib.sha256(zip_path.read_bytes()).hexdigest()
    (destination / f"{name}.zip.sha256").write_text(f"{digest}  {zip_path.name}\n")
    print(f"Created: {zip_path}\nSize: {zip_path.stat().st_size / 1024 / 1024:.1f} MiB\nSHA256: {digest}")
