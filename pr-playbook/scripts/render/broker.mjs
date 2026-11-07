#!/usr/bin/env node
// Render broker for a sandboxed agent. Codex's sandbox cannot start Chromium (its seccomp filter
// refuses the socket calls Chromium needs), so the runner starts this outside the sandbox and the
// agent talks to it through files:
//   <queue>/<id>.json   options { width, height, scale?, type?, quality? }   (written first)
//   <queue>/<id>.html   the complete page (images.mjs builds it)            (written last)
// and reads back <id>.png, <id>.checks.json and the marker <id>.done. Every network request the
// page makes is refused, except fonts, which come from --fonts <dir> (same files pr serves).
//
//   node broker.mjs --queue .render --fonts /usr/local/share/fonts/gdg [--render-dir /opt/gdg-render]
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { readChecks } from "./image-html.mjs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const queue = arg("queue", process.env.GDG_RENDER_BROKER ?? ".render");
const fontsDir = arg("fonts", process.env.GDG_FONTS_DIR ?? "");
const renderDir = arg("render-dir", process.env.GDG_RENDER_DIR ?? process.cwd());

async function chromium() {
  if (process.env.GDG_RENDER_DIR && !process.env.PLAYWRIGHT_BROWSERS_PATH)
    process.env.PLAYWRIGHT_BROWSERS_PATH = join(process.env.GDG_RENDER_DIR, "browsers");
  for (const base of [renderDir, process.cwd()]) {
    const require = createRequire(join(base, "noop.js"));
    for (const name of ["playwright", "@playwright/test"]) {
      try {
        const mod = await import(require.resolve(name));
        const found = mod.chromium ?? mod.default?.chromium;
        if (found) return found;
      } catch {}
    }
  }
  throw new Error(`playwright が ${renderDir} に無い`);
}

const FONT_TYPES = { ttf: "font/ttf", otf: "font/otf", woff2: "font/woff2", woff: "font/woff" };

async function renderOne(browser, id) {
  const options = JSON.parse(readFileSync(join(queue, `${id}.json`), "utf8"));
  const html = readFileSync(join(queue, `${id}.html`), "utf8");
  const width = Number(options.width) || 1600;
  const height = Number(options.height) || 900;
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: Number(options.scale) || 2,
  });
  await page.route("**/*", (route) => {
    const url = route.request().url();
    const m = url.match(/\/fonts\/([\w.-]+)$/);
    if (m && fontsDir && existsSync(join(fontsDir, m[1]))) {
      const ext = m[1].split(".").pop();
      return route.fulfill({
        path: join(fontsDir, m[1]),
        contentType: FONT_TYPES[ext] ?? "application/octet-stream",
      });
    }
    return route.abort("blockedbyclient");
  });
  try {
    await page.setContent(html, { waitUntil: "load" });
    await page.waitForSelector("body[data-checks=done]", { timeout: 20_000 });
    const type = options.type === "jpeg" ? "jpeg" : "png";
    const image = await page.screenshot({
      type,
      quality: type === "jpeg" ? Number(options.quality) || 85 : undefined,
      clip: { x: 0, y: 0, width, height },
    });
    const checks = readChecks(await page.content()) ?? [];
    writeFileSync(join(queue, `${id}.${type === "jpeg" ? "jpg" : "png"}`), image);
    writeFileSync(join(queue, `${id}.checks.json`), `${JSON.stringify(checks, null, 2)}\n`);
    writeFileSync(join(queue, `${id}.done.tmp`), "ok\n");
  } catch (error) {
    writeFileSync(
      join(queue, `${id}.checks.json`),
      JSON.stringify([
        { ruleId: "RENDER-NO-OVERFLOW", status: "fail", detail: `描画に失敗: ${error}` },
      ]),
    );
    writeFileSync(join(queue, `${id}.done.tmp`), `error: ${error}\n`);
  } finally {
    await page.close();
    renameSync(join(queue, `${id}.done.tmp`), join(queue, `${id}.done`));
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  mkdirSync(queue, { recursive: true });
  const browser = await (await chromium()).launch({ args: ["--no-sandbox", "--disable-gpu"] });
  let stop = false;
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => {
      stop = true;
    });
  console.log("ready");
  while (!stop) {
    let served = false;
    for (const file of readdirSync(queue)) {
      if (!file.endsWith(".html")) continue;
      const id = file.slice(0, -".html".length);
      if (existsSync(join(queue, `${id}.done`)) || !existsSync(join(queue, `${id}.json`))) continue;
      await renderOne(browser, id);
      served = true;
    }
    if (!served) await sleep(250);
  }
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
