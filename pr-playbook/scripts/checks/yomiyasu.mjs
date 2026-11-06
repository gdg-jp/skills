// Node only (spawns Python). Not imported by index.mjs, so the Worker bundle never sees it.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { japaneseTexts } from "./util.mjs";

export function findYomiyasu(env = process.env) {
  const candidates = [
    env.YOMIYASU_DIR,
    join(homedir(), ".agents/skills/yomiyasu"),
    join(homedir(), ".claude/skills/yomiyasu"),
    join(homedir(), ".codex/skills/yomiyasu"),
  ].filter(Boolean);
  return candidates.find((dir) => existsSync(join(dir, "scripts/yomiyasu_check.py"))) ?? null;
}

/** Runs `yomiyasu_check.py run --fail-on error` on the draft's Japanese prose. */
export function runYomiyasu(draft, brief, { dir = findYomiyasu(), python = "python3" } = {}) {
  if (!dir) return { status: "unevaluated", detail: "yomiyasu が見つからない（YOMIYASU_DIR）" };
  const texts = japaneseTexts(draft);
  if (texts.length === 0) return { status: "pass", detail: "日本語の本文なし" };
  const work = mkdtempSync(join(tmpdir(), "pr-yomiyasu-"));
  try {
    const finalPath = join(work, "final.txt");
    const materialPath = join(work, "material.txt");
    writeFileSync(finalPath, `${texts.join("\n\n")}\n`);
    writeFileSync(materialPath, `${japaneseTexts(brief ?? {}).join("\n")}\n${JSON.stringify(brief ?? {})}\n`);
    const result = spawnSync(
      python,
      [join(dir, "scripts/yomiyasu_check.py"), "run", "--final", finalPath, "--material", materialPath,
        "--doc-type", "promo", "--fail-on", "error", "--no-record", "--json"],
      { encoding: "utf8", cwd: work, timeout: 60_000 },
    );
    let lint = null;
    try {
      lint = JSON.parse(result.stdout).lint;
    } catch {}
    const counts = lint?.counts ? `error ${lint.counts.error} / warn ${lint.counts.warn}` : "";
    if (result.status === 0) return { status: "pass", detail: counts };
    if (result.status === 1) return { status: "fail", detail: `yomiyasu の指摘あり（${counts}）` };
    return { status: "unevaluated", detail: `yomiyasu を実行できなかった（exit ${result.status}）` };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
