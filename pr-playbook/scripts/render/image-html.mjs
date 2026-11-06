// Builds an image template's HTML (Worker-safe, deterministic). The Worker and the local renderer
// (images.mjs) both call this, so an image that passed in the Skill renders the same in the Worker.
// Text comes only from slots (escaped by template.mjs); layout only from bounded layoutVars.
import { normalizeSkin } from "./connpass-page.mjs";
import { renderTemplate, safeUrl } from "./template.mjs";

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

function toBase64(text) {
  const bytes = new TextEncoder().encode(String(text ?? ""));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** Bounded layout variables: titleScale (number range), align (enum), emphasis (words). */
export function layoutFrom(schema, raw = {}) {
  const spec = schema.layoutVars ?? {};
  const scale = spec.titleScale ?? { min: 0.8, max: 1.2, default: 1 };
  const align = spec.align ?? { enum: ["left", "center"], default: "left" };
  const titleScale = Number.isFinite(raw?.titleScale)
    ? clamp(raw.titleScale, scale.min, scale.max)
    : scale.default;
  return {
    titleScale: Math.round(titleScale * 100) / 100,
    align: align.enum.includes(raw?.align) ? raw.align : align.default,
    emphasis: Array.isArray(raw?.emphasis)
      ? raw.emphasis.filter((w) => typeof w === "string" && w.trim()).slice(0, 3)
      : [],
  };
}

/** Split text so emphasized words can be styled without any raw HTML. */
export function emphasize(text, words) {
  const value = String(text ?? "");
  const hits = words.filter((w) => value.includes(w));
  if (!hits.length) return [{ text: value, em: false }];
  const re = new RegExp(`(${hits.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`);
  return value
    .split(re)
    .filter(Boolean)
    .map((part) => ({ text: part, em: hits.includes(part) }));
}

/** Slot values the contract allows, with problems for what it does not. */
export function validateSlots(schema, slots) {
  const problems = [];
  const out = {};
  for (const [key, spec] of Object.entries(schema.slots ?? {})) {
    let value = slots?.[key];
    if (value === undefined || value === "") value = null;
    if (spec.type === "url") value = value === null ? null : safeUrl(value) || null;
    if (spec.type === "list")
      value = Array.isArray(value)
        ? value.filter((v) => typeof v === "string").slice(0, spec.maxItems ?? 6)
        : [];
    if (spec.required && (value === null || (Array.isArray(value) && !value.length)))
      problems.push(`slots.${key} が無い`);
    if (typeof value === "string" && spec.maxLength && [...value].length > spec.maxLength)
      problems.push(`slots.${key} は ${spec.maxLength} 字まで（${[...value].length} 字）`);
    out[key] = value;
  }
  // pr-asset returns the union of all templates' slots: unused ones are null.
  for (const [key, value] of Object.entries(slots ?? {}))
    if (!(key in (schema.slots ?? {})) && value !== null)
      problems.push(`slots.${key} はこのテンプレートに無い`);
  return { slots: out, problems };
}

/**
 * @param {{ template: string, schema: object, baseCss: string, checksScript: string,
 *   slots: object, layoutVars?: object, skin?: object, logoSvg: string,
 *   fonts?: { family: string, url: string, weight?: number }[], render: { thumbnailScale: number, minFontPxAtThumbnail: number, minContrast: number } }} input
 */
export function buildImageHtml(input) {
  const { schema } = input;
  const skin = normalizeSkin(input.skin);
  const layout = layoutFrom(schema, input.layoutVars);
  const { slots, problems } = validateSlots(schema, input.slots);
  const parts = {};
  for (const [key, value] of Object.entries(slots))
    if (typeof value === "string") parts[`${key}Parts`] = emphasize(value, layout.emphasis);
  const fonts = (input.fonts ?? []).filter((f) => safeUrl(f.url) && /^[\w -]+$/.test(f.family));
  const fontCss = fonts
    .map(
      (f) =>
        `@font-face{font-family:"${f.family}";src:url("${safeUrl(f.url)}");font-weight:${Number(f.weight) || 400};font-display:block;}`,
    )
    .join("");
  const body = renderTemplate(input.template, {
    ...slots,
    ...parts,
    skin,
    layout,
    // The gdg-design logo, inlined: no network, and the same bytes in every renderer.
    logoSrc: `data:image/svg+xml;base64,${toBase64(input.logoSvg)}`,
    width: String(schema.size.width),
    height: String(schema.size.height),
  });
  const config = JSON.stringify({
    ...input.render,
    fonts: [...new Set(fonts.map((f) => f.family))],
  }).replace(/</g, "\\u003c");
  const vars = `:root{--bg:${skin.bg};--panel:${skin.panelBg};--keyline:${skin.keyline};--text:${skin.text};--sticker:${skin.sticker};--accent1:${skin.accent1};--accent2:${skin.accent2};--accent3:${skin.accent3};--accent4:${skin.accent4};--title-scale:${layout.titleScale};--align:${layout.align};}`;
  const html = [
    "<!doctype html>",
    '<html lang="ja"><head><meta charset="utf-8">',
    `<style>${fontCss}${vars}${input.baseCss}</style>`,
    `</head><body style="margin:0;width:${schema.size.width}px;height:${schema.size.height}px;">`,
    body.trim(),
    `<pre id="__checks" style="position:absolute;left:-10000px;top:0;"></pre>`,
    `<script id="__config" type="application/json">${config}</script>`,
    `<script>${input.checksScript}</script>`,
    "</body></html>",
  ].join("\n");
  return { html, width: schema.size.width, height: schema.size.height, problems };
}

/** The render rules' results from a rendered page's HTML (`<pre id="__checks">`). */
export function readChecks(content) {
  const m = String(content ?? "").match(/<pre id="__checks"[^>]*>([\s\S]*?)<\/pre>/);
  if (!m?.[1]) return null;
  const text = m[1]
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
