import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

// Checks the actual release artifact, including the GitHub Pages subdirectory.
// No server, credentials or image generation service are needed.
const dist = path.resolve("dist");
const html = await readFile(path.join(dist, "index.html"), "utf8");
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((value) => value.includes("/assets/"));
assert(refs.length >= 2, "Missing generated JavaScript or stylesheet");
const base = refs[0].slice(0, refs[0].indexOf("assets/"));
for (const ref of refs) {
  assert(ref.startsWith(base), `Inconsistent asset base: ${ref}`);
  assert((await stat(path.join(dist, ref.slice(base.length)))).size > 0);
}
const bundle = (await Promise.all(
  (await readdir(path.join(dist, "assets")))
    .filter((name) => name.endsWith(".js"))
    .map((name) => readFile(path.join(dist, "assets", name), "utf8")),
)).join("\n");
for (const name of ["home.png", "camera.png", "warrior.png"]) {
  const image = await readFile(path.join(dist, "images", name));
  assert(image.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), `Invalid PNG: ${name}`);
  assert(bundle.includes(`${base}images/${name}`), `Image does not use deployment base: ${name}`);
}
assert(!/sk-[a-zA-Z0-9]{20,}/.test(bundle), "Possible secret in generated frontend");
console.log(`Build verified: ${base} — JS, CSS and all three downloadable PNGs are present.`);
