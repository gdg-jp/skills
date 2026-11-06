import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { scanHtml } from "../checks/connpass-html.mjs";
import { DEFAULT_SKIN, renderConnpassPage } from "./connpass-page.mjs";
import { loadTemplates } from "./run.mjs";

const templates = loadTemplates();
const pageSchema = JSON.parse(
  readFileSync(new URL("../../templates/connpass-page/page.schema.json", import.meta.url), "utf8"),
);
const devfestSkin = JSON.parse(
  readFileSync(
    new URL("../../templates/connpass-page/skins/devfest-kansai-2026.json", import.meta.url),
    "utf8",
  ),
);

/** Every slot filled, with hostile text in every string. */
function sample(schema) {
  if (schema.anyOf) return sample(schema.anyOf[0]);
  if (schema.enum) return schema.enum[0];
  if (schema.type === "string") return 'x <script>alert(1)</script> "q" https://e.x/a?b=1&c=2';
  if (schema.type === "array") return [sample(schema.items), sample(schema.items)];
  if (schema.type === "object")
    return Object.fromEntries(Object.entries(schema.properties).map(([k, v]) => [k, sample(v)]));
  return null;
}
const urlish = (o) =>
  JSON.parse(JSON.stringify(o), (k, v) =>
    /Url$|^url$/.test(k) && typeof v === "string" ? "https://img.gdgs.jp/abc" : v,
  );

const everySection = Object.keys(pageSchema.$defs).map((id) =>
  urlish({ id, heading: "見出し", slots: sample(pageSchema.$defs[id].properties.slots) }),
);

test("every section has a template and every template a slot contract", () => {
  assert.deepEqual(Object.keys(templates).sort(), Object.keys(pageSchema.$defs).sort());
});

test("all sections × all slots pass the connpass allowlist and escape text", () => {
  for (const skin of [DEFAULT_SKIN, devfestSkin]) {
    const { html, warnings } = renderConnpassPage(
      { sections: everySection, skin, summary: "1 行目\n2 行目" },
      templates,
    );
    assert.deepEqual(scanHtml(html), [], html);
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
    assert.deepEqual(warnings, []);
  }
});

test("javascript: URLs and unsafe colours never reach the page", () => {
  const { html } = renderConnpassPage(
    {
      sections: [
        {
          id: "links",
          heading: null,
          slots: { links: [{ label: "x", url: "javascript:alert(1)" }] },
        },
      ],
      skin: { bg: "red;background:url(x)", keyline: "#000000" },
    },
    templates,
  );
  assert.ok(!html.includes("javascript:"));
  assert.ok(html.includes(`background-color:${DEFAULT_SKIN.bg}`));
});

test("image sections without an image are skipped with a warning", () => {
  const { html, warnings } = renderConnpassPage(
    {
      sections: [{ id: "hero", heading: null, slots: { imageUrl: null, alt: "a", linkUrl: null } }],
    },
    templates,
  );
  assert.ok(!html.includes("<img"));
  assert.match(warnings[0], /画像が無い/);
});

test("the default skin matches skins/gdg-default.json", () => {
  const file = JSON.parse(
    readFileSync(
      new URL("../../templates/connpass-page/skins/gdg-default.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(file, DEFAULT_SKIN);
});

test("the DevFest Kansai 2026 example renders with the same section order as the real page", () => {
  const example = JSON.parse(
    readFileSync(
      new URL("../../../pr-connpass-page/references/example-output.json", import.meta.url),
      "utf8",
    ),
  );
  const { html } = renderConnpassPage({ ...example, skin: devfestSkin }, templates);
  assert.deepEqual(scanHtml(html), []);
  const order = [...html.matchAll(/<!-- ([a-z-]+) -->/g)].map((m) => m[1]);
  assert.deepEqual(
    order,
    example.sections
      .filter(
        (s) => !["hero", "sessions-image", "timetable-image"].includes(s.id) || s.slots.imageUrl,
      )
      .map((s) => s.id),
  );
  assert.deepEqual(order.slice(0, 4), ["hero", "sessions-image", "overview", "headline"]);
});
