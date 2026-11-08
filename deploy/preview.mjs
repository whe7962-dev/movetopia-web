import http from "node:http";
import path from "node:path";
import { stat, readFile } from "node:fs/promises";

// Offline local preview only: no npm packages and no external network calls.
// node preview.mjs [dist-directory] [port] [mount-path]
const root = path.resolve(process.argv[2] || "./dist");
const port = Number(process.argv[3] || 4173);
let mount = process.argv[4] || "/";
if (!mount.startsWith("/") || mount.includes("..") || mount.includes("?")) {
  throw new Error("Mount path must be an absolute URL path, such as /movetopia/");
}
if (!mount.endsWith("/")) mount += "/";
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid port");
await stat(path.join(root, "index.html"));
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon",
};
const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405, { Allow: "GET, HEAD" }); res.end(); return;
  }
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (mount !== "/" && pathname === mount.slice(0, -1)) {
      res.writeHead(308, { Location: mount }); res.end(); return;
    }
    if (!pathname.startsWith(mount) || pathname.includes("\0")) {
      res.writeHead(404); res.end("Not found"); return;
    }
    let file = path.resolve(root, pathname.slice(mount.length) || "index.html");
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403); res.end("Forbidden"); return;
    }
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Content-Length": data.length,
      "Cache-Control": "no-store",
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    res.writeHead(404); res.end("Not found");
  }
});
server.listen(port, "127.0.0.1", () => console.log(`MoveTopia preview: http://127.0.0.1:${port}${mount}`));
server.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
