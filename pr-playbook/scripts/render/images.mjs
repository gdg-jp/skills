#!/usr/bin/env node
// Local image renderer for the pr-asset Skill (Playwright, same HTML as the Worker):
//   node scripts/render/images.mjs --template <id> --slots out.json [--skin skin.json] --out dir/
// Writes <id>.png (2x) and checks.json (the RENDER-* results). Exits 1 when a MUST check fails.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { buildImageHtml, readChecks } from "./image-html.mjs";

const root = new URL("../../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

/** Everything the builder needs, from the Playbook on disk. */
export function loadImageTemplate(templateId) {
  const constants = JSON.parse(read("constants.json"));
  return {
    template: read(`templates/images/${templateId}/template.html`),
    schema: JSON.parse(read(`templates/images/${templateId}/slots.schema.json`)),
    baseCss: read("templates/images/base.css"),
    checksScript: read("scripts/render/checks-script.js"),
    logoSvg: readFileSync(new URL("../gdg-design/assets/gdg.svg", root), "utf8"),
    render: {
      thumbnailScale: constants.render.thumbnailScale,
      minFontPxAtThumbnail: constants.render.minFontPxAtThumbnail,
      minContrast: constants.render.minContrast,
    },
  };
}

/** Playwright from the caller's tree (the monorepo has @playwright/test); not a dependency here. */
async function chromium() {
  const require = createRequire(join(process.cwd(), "noop.js"));
  for (const name of ["playwright", "@playwright/test"]) {
    try {
      const mod = await import(require.resolve(name));
      const found = mod.chromium ?? mod.default?.chromium;
      if (found) return found;
    } catch {}
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
  const own = browser ?? (await (await chromium()).launch());
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const templateArg = arg("template");
  const slotsPath = arg("slots");
  const out = arg("out") ?? ".";
  if (!templateArg || !slotsPath) {
    console.error(
      "usage: images.mjs --template <id> --slots out.json [--skin skin.json] --out dir/",
    );
    process.exit(2);
  }
  const input = JSON.parse(readFileSync(slotsPath, "utf8"));
  const skin = arg("skin") ? JSON.parse(readFileSync(arg("skin"), "utf8")) : undefined;
  const built = buildImageHtml({
    ...loadImageTemplate(input.templateId ?? templateArg),
    slots: input.slots ?? input,
    layoutVars: input.layoutVars,
    skin,
  });
  for (const p of built.problems) console.error(`slots: ${p}`);
  const { image, checks } = await renderHtml(built.html, built);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, `${templateArg}.png`), image);
  writeFileSync(join(out, "checks.json"), `${JSON.stringify(checks, null, 2)}\n`);
  const rules = JSON.parse(read("rules.json")).rules;
  const must = new Set(rules.filter((r) => r.strength === "MUST").map((r) => r.id));
  const failed = checks.filter((c) => c.status === "fail" && must.has(c.ruleId));
  for (const c of checks) console.log(`${c.status.padEnd(11)} ${c.ruleId} ${c.detail ?? ""}`);
  process.exit(failed.length || built.problems.length ? 1 : 0);
}
