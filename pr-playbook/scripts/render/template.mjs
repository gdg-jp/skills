// A minimal, dependency-free template language for connpass sections (Worker-safe):
//   {{a.b}}               escaped text (newlines become <br>)
//   {{url a.b}}           an http(s) URL, escaped; anything else becomes ""
//   {{color a.b}}         a #RGB / #RRGGBB colour; anything else becomes ""
//   {{#each list}}…{{/each}}   loop; inside, names resolve on the item first, then outward;
//                              `this` is the item, `@index` / `@number` its position (0 / 1-based)
//   {{#if a}}…{{else}}…{{/if}} truthy test (empty arrays are false)
// There is no raw output: every value is escaped, so slot text can never add tags.

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);

export function safeUrl(value) {
  const s = String(value ?? "").trim();
  return /^https?:\/\/[^\s"'<>]+$/i.test(s) ? s : "";
}

export function safeColor(value) {
  const s = String(value ?? "").trim();
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(s) ? s : "";
}

function lookup(scopes, path) {
  if (path === "this") return scopes[0];
  if (path.startsWith("@"))
    return scopes[0]?.[path] ?? scopes.find((s) => s && path in Object(s))?.[path];
  const [head, ...rest] = path.split(".");
  const scope = scopes.find((s) => s !== null && typeof s === "object" && head in s);
  let value = head === "this" ? scopes[0] : scope?.[head];
  for (const key of rest) value = value?.[key];
  return value;
}

const truthy = (v) => (Array.isArray(v) ? v.length > 0 : !!v);

/** Parse into a tree once: text, {kind:"var"}, {kind:"each"}, {kind:"if"} (with `otherwise`). */
export function parseTemplate(source) {
  const root = [];
  const stack = [{ node: null, into: root }];
  const re = /\{\{\s*([#/]?)\s*(else|each|if|url|color)?\s*([^}]*?)\s*\}\}/g;
  let last = 0;
  for (const m of source.matchAll(re)) {
    const top = stack.at(-1);
    if (m.index > last) top.into.push(source.slice(last, m.index));
    last = m.index + m[0].length;
    const [, sigil, word, arg] = m;
    if (sigil === "#") {
      if (word !== "each" && word !== "if") throw new Error(`unknown block {{#${word ?? arg}}}`);
      const node = { kind: word, path: arg, children: [], otherwise: [] };
      top.into.push(node);
      stack.push({ node, into: node.children });
    } else if (sigil === "/") {
      const closing = word ?? arg;
      if (stack.length === 1 || top.node.kind !== closing)
        throw new Error(`{{/${closing}}} does not close an open block`);
      stack.pop();
    } else if (word === "else") {
      if (top.node?.kind !== "if") throw new Error("{{else}} outside {{#if}}");
      top.into = top.node.otherwise;
    } else if (word === "each" || word === "if") {
      throw new Error(`{{${word}}} needs #`);
    } else {
      top.into.push({ kind: "var", filter: word ?? null, path: arg });
    }
  }
  if (stack.length !== 1) throw new Error(`unclosed {{#${stack.at(-1).node.kind}}}`);
  if (last < source.length) root.push(source.slice(last));
  return root;
}

function renderNodes(nodes, scopes) {
  let out = "";
  for (const node of nodes) {
    if (typeof node === "string") out += node;
    else if (node.kind === "var") {
      const value = lookup(scopes, node.path);
      if (node.filter === "url") out += escapeHtml(safeUrl(value));
      else if (node.filter === "color") out += safeColor(value);
      else out += escapeHtml(value).replace(/\r?\n/g, "<br>");
    } else if (node.kind === "if") {
      out += renderNodes(
        truthy(lookup(scopes, node.path)) ? node.children : node.otherwise,
        scopes,
      );
    } else if (node.kind === "each") {
      const list = lookup(scopes, node.path);
      if (!Array.isArray(list)) continue;
      list.forEach((item, i) => {
        const scope =
          item !== null && typeof item === "object"
            ? { ...item, "@index": i, "@number": i + 1 }
            : item;
        out += renderNodes(node.children, [scope, { "@index": i, "@number": i + 1 }, ...scopes]);
      });
    }
  }
  return out;
}

export function renderTemplate(source, data) {
  return renderNodes(parseTemplate(source), [data]);
}
