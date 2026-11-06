import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { test } from "node:test";
import { buildImageHtml, emphasize, layoutFrom, readChecks } from "./image-html.mjs";
import { loadImageTemplate, renderHtml } from "./images.mjs";

const ids = readdirSync(new URL("../../templates/images/", import.meta.url), {
  withFileTypes: true,
})
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

/** Short, valid text for every slot of a template. */
function sampleSlots(schema) {
  const out = {};
  for (const [key, spec] of Object.entries(schema.slots)) {
    if (spec.type === "url") out[key] = "https://img.gdgs.jp/example";
    else if (spec.type === "list") out[key] = ["録画 NG", "英語"];
    else
      out[key] =
        { date: "10/18（日）", place: "大阪", time: "10:30", track: "Track A" }[key] ??
        "AI と越境のカンファレンス";
  }
  return out;
}

test("the same input builds the same HTML", () => {
  const t = loadImageTemplate("ogp-1200x630");
  const input = { ...t, slots: sampleSlots(t.schema), layoutVars: { titleScale: 1.1 } };
  assert.equal(buildImageHtml(input).html, buildImageHtml(input).html);
});

test("layoutVars stay within their ranges, and text is never raw HTML", () => {
  const t = loadImageTemplate("x-post-16x9");
  assert.deepEqual(
    layoutFrom(t.schema, { titleScale: 9, align: "justify", emphasis: ["a", "b", "c", "d"] }),
    {
      titleScale: 1.2,
      align: "left",
      emphasis: ["a", "b", "c"],
    },
  );
  const { html } = buildImageHtml({ ...t, slots: { headline: "<img src=x onerror=alert(1)>" } });
  assert.ok(!html.includes("<img src=x"));
  assert.deepEqual(emphasize("AI と越境", ["越境"]), [
    { text: "AI と", em: false },
    { text: "越境", em: true },
  ]);
});

test("slot contracts: required, length and unknown slots are reported", () => {
  const t = loadImageTemplate("connpass-thumbnail");
  const { problems } = buildImageHtml({ ...t, slots: { title: "x".repeat(41), bogus: "y" } });
  assert.ok(problems.some((p) => p.includes("slots.subcopy が無い")));
  assert.ok(problems.some((p) => p.includes("40 字まで")));
  assert.ok(problems.some((p) => p.includes("slots.bogus")));
});

test("readChecks parses the page's results", () => {
  assert.deepEqual(
    readChecks('<pre id="__checks" style="">[{&quot;ruleId&quot;:&quot;X&quot;}]</pre>'),
    [{ ruleId: "X" }],
  );
});

test(
  "every template renders and passes its MUST render checks with short text",
  { timeout: 120_000 },
  async (t) => {
    let chromium;
    try {
      ({ chromium } = await import("@playwright/test"));
    } catch {
      t.skip("Playwright is not installed here");
      return;
    }
    const browser = await chromium.launch();
    try {
      for (const id of ids) {
        const tpl = loadImageTemplate(id);
        const built = buildImageHtml({ ...tpl, slots: sampleSlots(tpl.schema) });
        assert.deepEqual(built.problems, [], id);
        const { image, checks } = await renderHtml(built.html, { ...built, browser });
        assert.ok(image.length > 1000, id);
        const failed = checks.filter((c) => c.status === "fail" && c.ruleId !== "RENDER-SAFE-ZONE");
        assert.deepEqual(failed, [], `${id}: ${JSON.stringify(failed)}`);
      }
      // Too much text overflows; a rotated logo is caught.
      const tpl = loadImageTemplate("x-post-16x9");
      const long = buildImageHtml({
        ...tpl,
        slots: { headline: "長".repeat(40), sub: "とても長い補足の文章です。".repeat(6) },
      });
      const overflow = (await renderHtml(long.html, { ...long, browser })).checks.find(
        (c) => c.ruleId === "RENDER-NO-OVERFLOW",
      );
      assert.equal(overflow?.status, "fail");
      const rotated = buildImageHtml({
        ...tpl,
        baseCss: `${tpl.baseCss}.logo{transform:rotate(1deg);}`,
        slots: { headline: "AI" },
      });
      const logo = (await renderHtml(rotated.html, { ...rotated, browser })).checks.find(
        (c) => c.ruleId === "RENDER-LOGO-INTACT",
      );
      assert.equal(logo?.status, "fail");
    } finally {
      await browser.close();
    }
  },
);
