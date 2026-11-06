// Builds the connpass description HTML from section slots (Worker-safe, no dependencies).
// The templates are passed in (the Worker bundles them with Vite; run.mjs reads them from disk),
// so this module never touches the file system.
import { renderTemplate, safeColor } from "./template.mjs";

/** Same as templates/connpass-page/skins/gdg-default.json (connpass-page.test.mjs keeps them equal). */
export const DEFAULT_SKIN = {
  name: "gdg-design",
  bg: "#F0F0F0",
  panelBg: "#FFFFFF",
  keyline: "#1E1E1E",
  accent: ["#4285F4", "#34A853", "#EA4335", "#F9AB00"],
  text: "#1E1E1E",
  sticker: "#C3ECF6",
};

/** Sections that are only an image: no image, no section. */
const IMAGE_SECTIONS = new Set(["hero", "sessions-image", "timetable-image"]);
const LIMITS = { "summary.lines": 3, "headline.paragraphs": 3 };

export function normalizeSkin(raw) {
  const skin = { ...DEFAULT_SKIN };
  for (const key of ["bg", "panelBg", "keyline", "text", "sticker"]) {
    const value = safeColor(raw?.[key]);
    if (value) skin[key] = value;
  }
  const accent = Array.isArray(raw?.accent) ? raw.accent.map(safeColor).filter(Boolean) : [];
  if (accent.length) skin.accent = accent;
  if (typeof raw?.name === "string") skin.name = raw.name;
  // 1-based names for templates: skin.accent1 … accent4.
  skin.accent.forEach((c, i) => {
    skin[`accent${i + 1}`] = c;
  });
  for (let i = skin.accent.length; i < 4; i++)
    skin[`accent${i + 1}`] = skin.accent[i % skin.accent.length];
  return skin;
}

/** Arrays of objects get `accent` (the skin's accents in turn) for left keylines. */
function withAccents(slots, skin) {
  const out = {};
  for (const [key, value] of Object.entries(slots ?? {})) {
    out[key] = Array.isArray(value)
      ? value.map((item, i) =>
          item && typeof item === "object" && !Array.isArray(item)
            ? { ...item, accent: skin.accent[i % skin.accent.length] }
            : item,
        )
      : value;
  }
  return out;
}

/**
 * @param {{ sections: { id: string, heading?: string|null, slots: object }[], skin?: object, summary?: string }} page
 * @param {Record<string, string>} templates section id → template source
 * @returns {{ html: string, warnings: string[] }}
 */
export function renderConnpassPage(page, templates) {
  const skin = normalizeSkin(page.skin);
  const warnings = [];
  const parts = [];
  for (const [index, section] of (page.sections ?? []).entries()) {
    const where = `sections[${index}] ${section?.id}`;
    const template = templates[section?.id];
    if (!template) {
      warnings.push(`${where}: テンプレートが無いので出していない`);
      continue;
    }
    const slots = { ...(section.slots ?? {}) };
    if (IMAGE_SECTIONS.has(section.id) && !slots.imageUrl) {
      warnings.push(`${where}: 画像が無いので出していない（imageSlots に載せる）`);
      continue;
    }
    for (const [path, max] of Object.entries(LIMITS)) {
      const [id, key] = path.split(".");
      if (section.id === id && Array.isArray(slots[key]) && slots[key].length > max) {
        warnings.push(`${where}: ${key} は ${max} 個まで（${slots[key].length} 個を切った）`);
        slots[key] = slots[key].slice(0, max);
      }
    }
    const html = renderTemplate(template, {
      ...withAccents(slots, skin),
      heading: section.heading ?? null,
      skin,
    }).trim();
    if (html) parts.push(`<!-- ${section.id} -->\n${html}`);
  }
  const body = `<div style="background-color:${skin.bg};padding:8px;color:${skin.text};">\n${parts.join("\n\n")}\n</div>`;
  const summary = String(page.summary ?? "").trim();
  return { html: summary ? `${summary}\n\n${body}\n` : `${body}\n`, warnings };
}
