// pr-asset's "design" mode: the agent writes the image's HTML and CSS itself. This module turns
// that HTML into a self-contained page the Worker (Browser Rendering) and the local renderer
// (images.mjs, Playwright) draw identically: scripts, frames and event handlers are removed,
// every resource becomes a data URI or an allowed https URL, the fonts and the checks script are
// injected, and a CSP meta tag refuses anything that slipped through. Pure ESM, no DOM: the Worker
// runs it too.

/** Fonts the pr Worker serves from R2 at `${fontsBase}/<file>` (all SIL OFL). */
export const DESIGN_FONTS = [
  {
    family: "Google Sans Flex",
    file: "GoogleSansFlex.ttf",
    weight: "100 1000",
    stretch: "25% 151%",
  },
  { family: "LINE Seed JP", file: "LINESeedJP-Regular.ttf", weight: "400" },
  { family: "LINE Seed JP", file: "LINESeedJP-Bold.ttf", weight: "700" },
  { family: "LINE Seed JP", file: "LINESeedJP-ExtraBold.ttf", weight: "800" },
  { family: "Google Sans Code", file: "GoogleSansCode.ttf", weight: "300 800" },
];
export const FONT_FAMILIES = [...new Set(DESIGN_FONTS.map((f) => f.family))];

/** Hosts an image may be loaded from over https (the published assets, the pr Worker itself). */
export const ALLOWED_IMAGE_HOSTS = ["img.gdgs.jp", "pr.gdgs.jp"];

export function fontFaceCss(fontsBase) {
  const base = String(fontsBase ?? "").replace(/\/$/, "");
  return DESIGN_FONTS.map(
    (f) =>
      `@font-face{font-family:"${f.family}";src:url("${base}/${f.file}") format("truetype");font-weight:${f.weight};${f.stretch ? `font-stretch:${f.stretch};` : ""}font-style:normal;font-display:block;}`,
  ).join("\n");
}

const DROP_WITH_CONTENT =
  /<(script|iframe|object|embed|noscript|template|textarea|foreignobject|select|video|audio|canvas|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const DROP_TAGS = new Set([
  "script",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
  "base",
  "form",
  "input",
  "textarea",
  "button",
  "select",
  "option",
  "video",
  "audio",
  "source",
  "track",
  "frame",
  "frameset",
  "applet",
  "foreignobject",
  "template",
  "noscript",
  "canvas",
  "math",
  "html",
  "head",
  "body",
  "title",
  "style",
]);
const URL_ATTRS = new Set([
  "src",
  "href",
  "xlink:href",
  "poster",
  "data",
  "srcset",
  "action",
  "formaction",
  "background",
  "ping",
]);

const toBase64 = (text) => {
  const bytes = new TextEncoder().encode(String(text ?? ""));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
};

export const svgDataUri = (svg) => `data:image/svg+xml;base64,${toBase64(svg)}`;

/**
 * Resolve one URL the agent wrote. `assets` maps bundle paths ("assets/gdg.svg",
 * "assets/photos/s1.jpg", "assets/stickers/16-hash-outline.svg") to data URIs.
 * Returns the URL to use, or null (with a problem) when it is not allowed.
 */
export function resolveUrl(value, assets, problems, what = "src") {
  const raw = String(value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");
  if (!raw) return null;
  if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml|avif);/i.test(raw)) return raw;
  if (/^#[\w:-]+$/.test(raw)) return raw;
  const local = raw.replace(/^\.\//, "").replace(/^skills\/gdg-design\//, "");
  if (assets && Object.hasOwn(assets, local)) return assets[local];
  if (/^https:\/\//i.test(raw)) {
    try {
      const host = new URL(raw).hostname;
      if (ALLOWED_IMAGE_HOSTS.includes(host)) return raw;
    } catch {}
  }
  problems.push(`${what} に使えない参照: ${raw.slice(0, 80)}`);
  return null;
}

/** CSS without imports, scripts-by-css, or references outside the allowed set. */
export function filterCss(css, assets, problems) {
  let out = String(css ?? "");
  out = out.replace(/@import\b[^;]*;?/gi, () => {
    problems.push("CSS の @import は使えない");
    return "";
  });
  out = out.replace(/@font-face\s*\{[^}]*\}/gi, "");
  out = out.replace(/expression\s*\(|behavior\s*:|-moz-binding\s*:/gi, () => {
    problems.push("CSS に使えない構文がある");
    return "/* removed */";
  });
  out = out.replace(/url\(\s*(["']?)([^)"']*)\1\s*\)/gi, (_m, _q, ref) => {
    const resolved = resolveUrl(ref, assets, problems, "url()");
    return resolved ? `url("${resolved}")` : "none";
  });
  return out;
}

function parseAttributes(text) {
  const attrs = [];
  const re = /([^\s=>/"']+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g;
  for (const m of String(text ?? "").matchAll(re)) {
    const name = m[1];
    if (!name || name === "/") continue;
    const value = m[2] === undefined ? null : m[2].replace(/^["']|["']$/g, "");
    attrs.push({ name: name.toLowerCase(), value });
  }
  return attrs;
}

const escapeAttr = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * The agent's document → { body, css, problems }. Only the body's markup and its <style> text
 * survive, both filtered. Problems are reported, not fatal: the page still renders so a person
 * can see it, and the DESIGN-NO-EXTERNAL rule fails on them.
 */
export function sanitizeDesignHtml(html, assets = {}) {
  const problems = [];
  let text = String(html ?? "");
  text = text.replace(/<!--[\s\S]*?-->/g, "");
  let css = "";
  text = text.replace(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi, (_m, inner) => {
    css += `${inner}\n`;
    return "";
  });
  const bodyMatch = text.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i);
  if (bodyMatch) text = bodyMatch[1];
  text = text.replace(/<!doctype[^>]*>/gi, "");
  text = text.replace(DROP_WITH_CONTENT, (m) => {
    problems.push(
      `使えないタグ: ${m.slice(1, m.indexOf(/[\s>]/.exec(m)?.index ?? 1)).toLowerCase() || "?"}`,
    );
    return "";
  });
  text = text.replace(
    /<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:\s+[^\s=>/"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?|\s+\/)*)\s*(\/?)>/g,
    (whole, close, rawName, attrText, selfClose) => {
      const name = rawName.toLowerCase();
      if (DROP_TAGS.has(name)) {
        if (!close && !["html", "head", "body", "title"].includes(name))
          problems.push(`使えないタグ: ${name}`);
        return "";
      }
      if (close) return `</${name}>`;
      const kept = [];
      for (const { name: attr, value } of parseAttributes(attrText)) {
        if (attr.startsWith("on")) {
          problems.push(`イベント属性 ${attr} は使えない`);
          continue;
        }
        if (attr === "srcset" || attr === "ping" || attr === "action" || attr === "formaction")
          continue;
        if (URL_ATTRS.has(attr)) {
          if (name === "a" && attr === "href") continue;
          const resolved = resolveUrl(value, assets, problems, attr);
          if (resolved) kept.push(`${attr}="${escapeAttr(resolved)}"`);
          continue;
        }
        if (attr === "style") {
          kept.push(`style="${escapeAttr(filterCss(value, assets, problems))}"`);
          continue;
        }
        if (value === null) kept.push(attr);
        else if (/javascript:|vbscript:/i.test(value)) problems.push(`${attr} に script がある`);
        else kept.push(`${attr}="${escapeAttr(value)}"`);
      }
      return `<${name}${kept.length ? ` ${kept.join(" ")}` : ""}${selfClose ? " /" : ""}>`;
    },
  );
  return { body: text.trim(), css: filterCss(css, assets, problems), problems };
}

/**
 * @param {{ html: string, width: number, height: number, fontsBase: string, assets?: Record<string,string>,
 *   checksScript: string, render: { thumbnailScale: number, minFontPxAtThumbnail: number, minContrast: number },
 *   safeInset?: number }} input
 */
export function buildDesignHtml(input) {
  const { width, height } = input;
  const assets = input.assets ?? {};
  const { body, css, problems } = sanitizeDesignHtml(input.html, assets);
  const inset = Number(input.safeInset ?? 32);
  const hasCanvas = /class\s*=\s*"[^"]*\bcanvas\b/.test(body);
  const content = hasCanvas
    ? body
    : `<div class="canvas" data-safe-inset="${inset}" style="position:relative;overflow:hidden;width:${width}px;height:${height}px;">${body}</div>`;
  if (!hasCanvas) problems.push('ルートに class="canvas" が無い（包んで描画した）');
  if (!/data-logo/.test(body))
    problems.push('GDG ロゴ（<img data-logo src="assets/gdg.svg">）が無い');
  const config = JSON.stringify({
    ...input.render,
    width,
    height,
    fonts: FONT_FAMILIES,
  }).replace(/</g, "\\u003c");
  const csp = [
    "default-src 'none'",
    "img-src data: https://img.gdgs.jp https://pr.gdgs.jp",
    "font-src https://pr.gdgs.jp http://localhost:* http://127.0.0.1:*",
    "style-src 'unsafe-inline'",
    "script-src 'unsafe-inline'",
  ].join("; ");
  const html = [
    "<!doctype html>",
    '<html lang="ja"><head><meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
    `<style>${fontFaceCss(input.fontsBase)}</style>`,
    `<style>*{box-sizing:border-box}html,body{margin:0;padding:0}body{width:${width}px;height:${height}px;overflow:hidden;font-family:"Google Sans Flex","LINE Seed JP",sans-serif}.canvas{position:relative;overflow:hidden;width:${width}px;height:${height}px}img[data-logo]{object-fit:contain}</style>`,
    `<style>${css}</style>`,
    "</head><body>",
    content,
    `<pre id="__checks" style="position:absolute;left:-10000px;top:0;"></pre>`,
    `<script id="__config" type="application/json">${config}</script>`,
    `<script>${input.checksScript}</script>`,
    "</body></html>",
  ].join("\n");
  return { html, width, height, problems };
}
