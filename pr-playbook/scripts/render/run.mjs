#!/usr/bin/env node
// node scripts/render/run.mjs --input page.json [--out connpass.html] [--skin skin.json]
// page.json is pr-connpass-page's output (or { sections, skin, summary }). Prints warnings to stderr.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { renderConnpassPage } from "./connpass-page.mjs";

export function loadTemplates(
  dir = new URL("../../templates/connpass-page/sections/", import.meta.url),
) {
  const path = dir instanceof URL ? dir.pathname : dir;
  return Object.fromEntries(
    readdirSync(path)
      .filter((f) => f.endsWith(".html"))
      .map((f) => [basename(f, ".html"), readFileSync(join(path, f), "utf8")]),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const input = arg("input");
  if (!input) {
    console.error("usage: run.mjs --input page.json [--out connpass.html] [--skin skin.json]");
    process.exit(2);
  }
  const page = JSON.parse(readFileSync(input, "utf8"));
  const skinPath = arg("skin");
  if (skinPath) page.skin = JSON.parse(readFileSync(skinPath, "utf8"));
  const { html, warnings } = renderConnpassPage(page, loadTemplates());
  for (const w of warnings) console.error(`warning: ${w}`);
  const out = arg("out");
  if (out) writeFileSync(out, html);
  else process.stdout.write(html);
}
