#!/usr/bin/env node
// Local image renderer for the pr-asset Skill (Playwright, same HTML as the Worker).
//   Template mode:  node images.mjs --template <id> --slots out.json [--skin skin.json] --out dir/
//   Design mode:    node images.mjs --html draft.html --template <id> [--size WxH] [--assets dir] --out dir/
// Writes <id>.html (the page as rendered), <id>.png (2x) and checks.json (the RENDER-* results).
// Exits 1 when a MUST check fails or the HTML had problems. Rendering uses Playwright from the
// caller's tree, or, inside a sandbox, the broker's queue (--broker dir / GDG_RENDER_BROKER).
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
import { buildDesignHtml, svgDataUri } from "./design-html.mjs";
import { buildImageHtml, readChecks } from "./image-html.mjs";

const root = new URL("../../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

/** Everything the template builder needs, from the Playbook on disk. */
export function loadImageTemplate(templateId) {
  const constants = JSON.parse(read("constants.json"));
  return {
    template: read(`templates/images/${templateId}/template.html`),
    schema: JSON.parse(read(`templates/images/${templateId}/slots.schema.json`)),
    baseCss: read("templates/images/base.css"),
    checksScript: read("scripts/render/checks-script.js"),
    logoSvg: readFileSync(new URL("../gdg-design/assets/gdg.svg", root), "utf8"),
    render: renderLimits(constants),
  };
}

export function renderLimits(constants) {
  return {
    thumbnailScale: constants.render.thumbnailScale,
    minFontPxAtThumbnail: constants.render.minFontPxAtThumbnail,
    minContrast: constants.render.minContrast,
    minContrastLarge: constants.render.minContrastLarge,
  };
}

const IMAGE_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/** The gdg-design logo and stickers as `assets/...` data URIs (what the agent's HTML references). */
export function designAssetsFromSkills() {
  const assets = {
    "assets/gdg.svg": svgDataUri(
      readFileSync(new URL("../gdg-design/assets/gdg.svg", root), "utf8"),
    ),
  };
  const dir = new URL("../gdg-design/assets/stickers/", root);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".svg")))
    assets[`assets/stickers/${file}`] = svgDataUri(readFileSync(new URL(file, dir), "utf8"));
  return assets;
}

/** Binary files under `<dir>/assets/` (photos, the event's logo) as data URIs. */
export function designAssetsFromDir(dir) {
  const assets = {};
  const base = join(dir, "assets");
  if (!existsSync(base)) return assets;
  const walk = (sub) => {
    for (const entry of readdirSync(join(base, sub), { withFileTypes: true })) {
      const rel = sub ? `${sub}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(rel);
      else if (IMAGE_TYPES[extname(entry.name).toLowerCase()]) {
        const type = IMAGE_TYPES[extname(entry.name).toLowerCase()];
        const bytes = readFileSync(join(base, rel));
        assets[`assets/${rel}`] =
          type === "image/svg+xml"
            ? svgDataUri(bytes.toString("utf8"))
            : `data:${type};base64,${bytes.toString("base64")}`;
      }
    }
  };
  walk("");
  return assets;
}

/** Design mode: the agent's HTML wrapped into the page both renderers draw. */
export function loadDesignBuild({ templateId, size, assetsDir }) {
  const constants = JSON.parse(read("constants.json"));
  const schema = templateId
    ? JSON.parse(read(`templates/images/${templateId}/slots.schema.json`))
    : null;
  const [w, h] = size ? size.split("x").map(Number) : [schema?.size.width, schema?.size.height];
  if (!w || !h) throw new Error("size が決まらない（--template か --size WxH）");
  return {
    width: w,
    height: h,
    fontsBase: constants.design?.fontsBase ?? "https://pr.gdgs.jp/fonts",
    assets: { ...designAssetsFromSkills(), ...(assetsDir ? designAssetsFromDir(assetsDir) : {}) },
    checksScript: read("scripts/render/checks-script.js"),
    render: renderLimits(constants),
    safeInset: constants.design?.safeInset ?? 32,
    requiredSlots: schema
      ? Object.entries(schema.slots)
          .filter(([, s]) => s.required)
          .map(([k]) => k)
      : [],
  };
}

/** Playwright from the caller's tree or GDG_RENDER_DIR; not a dependency here. */
async function chromium() {
  if (process.env.GDG_RENDER_DIR && !process.env.PLAYWRIGHT_BROWSERS_PATH)
    process.env.PLAYWRIGHT_BROWSERS_PATH = join(process.env.GDG_RENDER_DIR, "browsers");
  const bases = [process.cwd(), process.env.GDG_RENDER_DIR].filter(Boolean);
  for (const base of bases) {
    const require = createRequire(join(base, "noop.js"));
    for (const name of ["playwright", "@playwright/test"]) {
      try {
        const mod = await import(require.resolve(name));
        const found = mod.chromium ?? mod.default?.chromium;
        if (found) return found;
      } catch {}
    }
  }
  throw new Error(
    "Playwright is not installed (npm i -D playwright, then npx playwright install chromium)",
  );
}

/** Render HTML to a PNG and read the in-page checks. Reuses one browser when given. */
export async function renderHtml(
  html,
  { width, height, scale = 2, type = "png", quality, browser } = {},
) {
  const own = browser ?? (await (await chromium()).launch({ args: ["--no-sandbox"] }));
  try {
    const page = await own.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
    await page.setContent(html, { waitUntil: "load" });
    await page.waitForSelector("body[data-checks=done]", { timeout: 15_000 });
    const image = await page.screenshot({
      type,
      quality: type === "jpeg" ? quality : undefined,
      clip: { x: 0, y: 0, width, height },
    });
    const checks = readChecks(await page.content()) ?? [];
    await page.close();
    return { image, checks };
  } finally {
    if (!browser) await own.close();
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Render through the broker's queue (inside a sandbox that cannot start a browser). */
export async function renderViaBroker(
  queue,
  html,
  { width, height, scale = 2, type = "png", quality, timeoutMs = 120_000 } = {},
) {
  mkdirSync(queue, { recursive: true });
  const id = `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  writeFileSync(join(queue, `${id}.json`), JSON.stringify({ width, height, scale, type, quality }));
  writeFileSync(join(queue, `${id}.html`), html);
  const done = join(queue, `${id}.done`);
  const started = Date.now();
  while (!existsSync(done)) {
    if (Date.now() - started > timeoutMs) throw new Error("描画器（broker）が応答しない");
    await sleep(200);
  }
  const status = readFileSync(done, "utf8");
  const imagePath = join(queue, `${id}.${type === "jpeg" ? "jpg" : "png"}`);
  const image = existsSync(imagePath) ? readFileSync(imagePath) : null;
  const checks = JSON.parse(readFileSync(join(queue, `${id}.checks.json`), "utf8"));
  for (const suffix of [".json", ".html", ".done", ".checks.json"]) {
    try {
      unlinkSync(join(queue, `${id}${suffix}`));
    } catch {}
  }
  if (!image) throw new Error(status.trim() || "描画に失敗");
  return { image, checks };
}

async function render(html, options) {
  const broker = options.broker ?? process.env.GDG_RENDER_BROKER;
  if (broker) return renderViaBroker(broker, html, options);
  return renderHtml(html, options);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const templateArg = arg("template");
  const slotsPath = arg("slots");
  const htmlPath = arg("html");
  const out = arg("out") ?? ".";
  if (!(htmlPath || (templateArg && slotsPath))) {
    console.error(
      "usage: images.mjs --template <id> --slots out.json [--skin skin.json] --out dir/\n       images.mjs --html draft.html --template <id> [--size WxH] [--assets dir] --out dir/",
    );
    process.exit(2);
  }
  const id = templateArg ?? "design";
  let built;
  const mustRules = JSON.parse(read("rules.json")).rules;
  if (htmlPath) {
    const load = loadDesignBuild({
      templateId: templateArg,
      size: arg("size"),
      assetsDir: resolve(arg("assets") ?? "."),
    });
    built = buildDesignHtml({ ...load, html: readFileSync(htmlPath, "utf8") });
    const missing = load.requiredSlots.filter(
      (slot) => !new RegExp(`data-slot=["']${slot}["']`).test(built.html),
    );
    if (missing.length)
      built.problems.push(
        `必須スロットに data-slot が無い: ${missing.join(", ")}（data-required="true" も付ける）`,
      );
  } else {
    const input = JSON.parse(readFileSync(slotsPath, "utf8"));
    const skin = arg("skin") ? JSON.parse(readFileSync(arg("skin"), "utf8")) : undefined;
    built = buildImageHtml({
      ...loadImageTemplate(input.templateId ?? templateArg),
      slots: input.slots ?? input,
      layoutVars: input.layoutVars,
      skin,
    });
  }
  for (const p of built.problems) console.error(`html: ${p}`);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, `${id}.html`), built.html);
  const { image, checks } = await render(built.html, { ...built, broker: arg("broker") });
  writeFileSync(join(out, `${id}.png`), image);
  writeFileSync(join(out, "checks.json"), `${JSON.stringify(checks, null, 2)}\n`);
  const must = new Set(mustRules.filter((r) => r.strength === "MUST").map((r) => r.id));
  const failed = checks.filter((c) => c.status === "fail" && must.has(c.ruleId));
  for (const c of checks) console.log(`${c.status.padEnd(11)} ${c.ruleId} ${c.detail ?? ""}`);
  console.log(`wrote ${join(out, `${id}.png`)}`);
  process.exit(failed.length || built.problems.length ? 1 : 0);
}
