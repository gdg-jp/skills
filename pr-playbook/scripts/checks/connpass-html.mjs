// The connpass sanitizer allowlist, transcribed from skills/connpass-syntax/references/syntax.md
// (measured 2026-08-30). Do not widen it here: anything outside is silently stripped by connpass.

const STYLE = ["style"];
const STYLE_ALIGN = ["style", "align"];
const CELL = ["align", "style", "colspan", "rowspan"];

export const ALLOWED_TAGS = {
  b: STYLE_ALIGN,
  blockquote: STYLE,
  em: STYLE_ALIGN,
  strong: STYLE_ALIGN,
  strike: STYLE_ALIGN,
  del: [],
  a: ["href", "title", "rel"],
  i: STYLE_ALIGN,
  br: [],
  ul: [],
  ol: [],
  li: [],
  u: [],
  pre: [],
  code: [],
  p: STYLE_ALIGN,
  h1: STYLE,
  h2: STYLE,
  h3: STYLE,
  h4: STYLE,
  h5: STYLE,
  h6: STYLE,
  hr: STYLE,
  span: STYLE,
  div: STYLE_ALIGN,
  font: ["size", "style", "color"],
  table: ["style", "border"],
  thead: [],
  tbody: [],
  tfoot: [],
  th: CELL,
  td: CELL,
  tr: STYLE,
  img: ["src", "alt", "title", "width", "height", "style"],
};

export const ALLOWED_CSS = [
  "color",
  "background-color",
  "font-size",
  "font-style",
  "font-weight",
  "text-align",
  "text-decoration",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border",
  "border-top",
  "border-right",
  "border-bottom",
  "border-left",
];

const SAFE_URL = /^(https?:\/\/|mailto:|#|\{\{shortlink\}\})/i;

/** Tokenizes tags and attributes (not a full HTML parser: enough for the allowlist). */
export function scanHtml(html) {
  const findings = [];
  const source = String(html ?? "").replace(/<!--[\s\S]*?-->/g, "");
  for (const match of source.matchAll(/<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g)) {
    const [, closing, rawName, rawAttrs] = match;
    const tag = rawName.toLowerCase();
    if (!(tag in ALLOWED_TAGS)) {
      findings.push(`<${tag}> は許可されていない`);
      continue;
    }
    if (closing) continue;
    const allowed = ALLOWED_TAGS[tag];
    for (const attr of rawAttrs.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|[^\s"'>]+))?/g)) {
      const name = attr[1].toLowerCase();
      if (name === "/") continue;
      const value = attr[3] ?? attr[4] ?? (attr[2] && !attr[2].startsWith('"') && !attr[2].startsWith("'") ? attr[2] : "") ?? "";
      if (!allowed.includes(name)) {
        findings.push(`<${tag} ${name}> は許可されていない属性`);
        continue;
      }
      if ((name === "href" || name === "src") && value && !SAFE_URL.test(value.trim())) {
        findings.push(`<${tag} ${name}="${value}"> は https / mailto 以外の URL`);
      }
      if (name === "style") {
        for (const declaration of value.split(";")) {
          const [prop] = declaration.split(":");
          const property = prop?.trim().toLowerCase();
          if (!property) continue;
          if (!ALLOWED_CSS.includes(property)) findings.push(`<${tag} style="${property}"> は connpass に消される CSS`);
        }
      }
    }
  }
  return findings;
}
