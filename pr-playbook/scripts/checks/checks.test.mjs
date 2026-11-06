import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { ALLOWED_CSS, CHECKS, mustFailures, runChecks, scanHtml, validateSchema, weightedLength } from "./index.mjs";
import { foldIndex, japaneseTexts } from "./util.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const skills = resolve(root, "..");
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const playbook = { rules: json(resolve(root, "rules.json")).rules, constants: json(resolve(root, "constants.json")), version: "test" };
const brief = json(resolve(root, "examples/briefs/devfest-kansai-2026.json"));
const result = (report, id) => report.results.find((r) => r.ruleId === id);
const check = (kind, draft, b = brief) => runChecks({ kind, draft, brief: b, playbook });

const EXAMPLES = [
  ["copy", "pr-copy"],
  ["x_post", "pr-x-post"],
  ["connpass_page", "pr-connpass-page"],
  ["connpass_mail", "pr-connpass-mail"],
  ["plan", "pr-plan"],
];

for (const [kind, skill] of EXAMPLES) {
  test(`${skill} example output matches its schema and passes every MUST rule`, () => {
    const example = json(resolve(skills, skill, "references/example-output.json"));
    const schema = json(resolve(skills, skill, "references/output.schema.json"));
    assert.deepEqual(validateSchema(schema, example), []);
    assert.deepEqual(mustFailures(check(kind, example)), []);
  });
}

test("brief example matches brief.schema.json", () => {
  assert.deepEqual(validateSchema(json(resolve(root, "references/brief.schema.json")), brief), []);
});

test("every mechanical rule has a check", () => {
  for (const rule of playbook.rules) {
    if (rule.verification.kind === "mechanical") assert.ok(CHECKS[rule.verification.check], rule.id);
  }
});

test("connpass allowlist keeps all 22 CSS properties and rejects common traps", () => {
  assert.equal(ALLOWED_CSS.length, 22);
  const keep = ALLOWED_CSS.map((p) => `${p}:0`).join(";");
  assert.deepEqual(scanHtml(`<div style="${keep}">x</div>`), []);
  for (const trap of ["border-radius", "line-height", "display", "width", "background", "font-family"]) {
    assert.equal(scanHtml(`<div style="${trap}:1px">x</div>`).length, 1, trap);
  }
  assert.equal(scanHtml('<div class="x">x</div>').length, 1);
  assert.equal(scanHtml("<script>x</script>").length, 2);
  assert.equal(scanHtml('<a href="javascript:alert(1)">x</a>').length, 1);
});

test("the real DevFest Kansai 2026 page passes the allowlist", () => {
  const draft = json(resolve(root, "examples/connpass-page/devfest-kansai-2026/as-draft.json"));
  assert.equal(result(check("connpass_page", draft), "CP-HTML-ALLOWLIST").status, "pass");
});

test("X weighted length counts CJK as 2, ASCII as 1, URLs as 23, and does not split surrogate pairs", () => {
  assert.equal(weightedLength("abc"), 3);
  assert.equal(weightedLength("あいう"), 6);
  assert.equal(weightedLength("https://example.com/very/long/path"), 23);
  assert.equal(weightedLength("{{shortlink}}"), 23);
  assert.equal(weightedLength("🎉"), 2);
  assert.equal(foldIndex("🎉🎉", 3), 2); // one emoji (2 UTF-16 units) fits, the second does not
});

const xDraft = () => json(resolve(skills, "pr-x-post/references/example-output.json"));

test("X-NO-HASHTAG ignores live posts and LIVE-EVENT-HASHTAG checks them", () => {
  const draft = xDraft();
  assert.equal(result(check("x_post", draft), "X-NO-HASHTAG").status, "pass");
  assert.equal(result(check("x_post", draft), "LIVE-EVENT-HASHTAG").status, "pass");
  draft.posts[0].text += " #DevFest";
  draft.posts[0].textBelowFold += " #DevFest";
  assert.equal(result(check("x_post", draft), "X-NO-HASHTAG").status, "fail");
  const live = xDraft();
  live.posts[2].text = live.posts[2].text.replace("#DevFestKansai", "");
  live.posts[2].textAboveFold = live.posts[2].text;
  assert.equal(result(check("x_post", live), "LIVE-EVENT-HASHTAG").status, "fail");
});

test("X-FOLD-LINK-VISIBLE fails when the link falls below the fold", () => {
  const draft = xDraft();
  const post = draft.posts[0];
  post.textAboveFold = post.textAboveFold.replace("{{shortlink}}\n", "");
  post.textBelowFold = `\n{{shortlink}}${post.textBelowFold}`;
  post.text = post.textAboveFold + post.textBelowFold;
  assert.equal(result(check("x_post", draft), "X-FOLD-LINK-VISIBLE").status, "fail");
});

test("ANNOUNCE-AFTER-CONFIRMED fails a session post for a TBA session", () => {
  const draft = xDraft();
  const tba = structuredClone(brief);
  tba.sessions.find((s) => s.id === draft.posts[1].sessionId).status = "tba";
  assert.equal(result(check("x_post", draft), "ANNOUNCE-AFTER-CONFIRMED").status, "pass");
  assert.equal(result(check("x_post", draft, tba), "ANNOUNCE-AFTER-CONFIRMED").status, "fail");
});

test("SPEAKER-TIER-HIGH-NO-ASK fails a direct request to a tier: high speaker", () => {
  const draft = xDraft();
  draft.posts[1].speakerRequest.speakerId = "llion";
  assert.equal(result(check("x_post", draft), "SPEAKER-TIER-HIGH-NO-ASK").status, "fail");
  draft.posts[1].speakerRequest.suggestionOnly = true;
  assert.equal(result(check("x_post", draft), "SPEAKER-TIER-HIGH-NO-ASK").status, "pass");
});

test("BUDGET-SPLIT: X : IG = 5 : 5 fails, 3.5 : 6.5 passes", () => {
  const plan = json(resolve(skills, "pr-plan/references/example-output.json"));
  Object.assign(plan.budgetAllocation, { x: 220000, ig: 220000 });
  assert.equal(result(check("plan", plan), "BUDGET-SPLIT").status, "fail");
  Object.assign(plan.budgetAllocation, { x: 154000, ig: 286000 });
  assert.equal(result(check("plan", plan), "BUDGET-SPLIT").status, "pass");
});

test("CP-TITLE-CONVEYS-CONTENT: the series name alone fails, with a theme passes", () => {
  const page = (title) => ({ ...json(resolve(skills, "pr-connpass-page/references/example-output.json")), title });
  assert.equal(result(check("connpass_page", page("DevFest Kansai 2026")), "CP-TITLE-CONVEYS-CONTENT").status, "fail");
  const ok = page("DevFest Kansai 2026 — AI 時代の考えるを取り戻す異分野の祭典");
  assert.equal(result(check("connpass_page", ok), "CP-TITLE-CONVEYS-CONTENT").status, "pass");
});

test("rules that read provisional constants say so", () => {
  const fold = result(check("x_post", xDraft()), "X-FOLD-LINK-VISIBLE");
  assert.match(fold.detail, /仮値/);
});

test("japaneseTexts skips markup and author notes", () => {
  const texts = japaneseTexts({ html: "<p>本文</p>", rationaleMd: "メモ", text: "告知です", url: "https://x" });
  assert.deepEqual(texts, ["告知です"]);
});
