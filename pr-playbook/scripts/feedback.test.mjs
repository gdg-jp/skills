import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { apply, digestOf, importBundle, listPending, personalData } from "./feedback.mjs";

function playbookCopy() {
  const dir = mkdtempSync(join(tmpdir(), "pr-playbook-"));
  for (const f of ["rules.json", "constants.json"])
    cpSync(new URL(`../${f}`, import.meta.url), join(dir, f));
  return dir;
}

function bundle(dir, proposals) {
  const path = join(dir, "bundle.json");
  writeFileSync(
    path,
    JSON.stringify({
      format: "pr-playbook-proposals/1",
      baseRevision: {
        rules: digestOf(join(dir, "rules.json")),
        constants: digestOf(join(dir, "constants.json")),
      },
      proposals,
    }),
  );
  return path;
}

test("a constant is written and stops being provisional", () => {
  const dir = playbookCopy();
  importBundle(
    bundle(dir, [
      {
        id: "fold",
        kind: "constant",
        target: "constants.json#/x/foldThreshold",
        summary: "s",
        observation: "o",
        payload: { path: "/x/foldThreshold/weighted", value: 260 },
      },
    ]),
    dir,
  );
  assert.equal(listPending(dir).length, 1);
  assert.match(apply("fold", dir).message, /applied/);
  const constants = JSON.parse(readFileSync(join(dir, "constants.json"), "utf8"));
  assert.equal(constants.x.foldThreshold.weighted, 260);
  assert.equal(constants.x.foldThreshold.provisional, false);
  assert.equal(listPending(dir).length, 0);
});

test("a stale base revision is refused", () => {
  const dir = playbookCopy();
  importBundle(
    bundle(dir, [
      {
        id: "late",
        kind: "constant",
        target: "t",
        summary: "s",
        observation: "o",
        payload: { path: "/render/minContrast", value: 5 },
      },
    ]),
    dir,
  );
  const constants = JSON.parse(readFileSync(join(dir, "constants.json"), "utf8"));
  constants.render.minContrast = 4.6;
  writeFileSync(join(dir, "constants.json"), JSON.stringify(constants));
  assert.throws(() => apply("late", dir), /baseRevision/);
});

test("rules need an existing check; prose is left to a person", () => {
  const dir = playbookCopy();
  const rule = {
    id: "NEW-RULE",
    strength: "SHOULD",
    scope: ["draft.x_post"],
    requirement: "r",
    source: "s",
    verification: { kind: "mechanical", check: "nope/none" },
    fix: "f",
  };
  importBundle(
    bundle(dir, [
      {
        id: "r1",
        kind: "rule",
        target: "rules.json",
        summary: "s",
        observation: "o",
        payload: rule,
      },
      {
        id: "g1",
        kind: "guide",
        target: "guides/x.md",
        summary: "s",
        observation: "o",
        payload: { markdown: "日時を 1 行目に" },
      },
    ]),
    dir,
  );
  assert.throws(() => apply("r1", dir), /does not exist/);
  const guide = apply("g1", dir);
  assert.equal(guide.written, false);
  assert.match(guide.message, /by hand/);
});

test("personal data is refused on import", () => {
  const dir = playbookCopy();
  const r = importBundle(
    bundle(dir, [
      {
        id: "pii",
        kind: "example",
        target: "examples/x_post",
        summary: "s",
        observation: "連絡は a@example.com",
        payload: {},
      },
    ]),
    dir,
  );
  assert.deepEqual(r.written, []);
  assert.equal(r.refused.length, 1);
  assert.deepEqual(personalData("https://x.com/@me"), []);
});
