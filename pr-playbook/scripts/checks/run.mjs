#!/usr/bin/env node
// node run.mjs --kind <kind> --input <draft.json> [--brief brief.json] [--related related.json]
//              [--playbook <dir>] [--no-yomiyasu] [--json]
// Prints the report and exits 1 when a MUST rule fails.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mustFailures, runChecks } from "./index.mjs";
import { runYomiyasu } from "./yomiyasu.mjs";

const here = dirname(fileURLToPath(import.meta.url));

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith("--")) throw new Error(`unexpected argument ${key}`);
    const name = key.slice(2);
    if (["no-yomiyasu", "json"].includes(name)) out[name] = true;
    else out[name] = argv[++i];
  }
  return out;
}

export function loadPlaybook(dir = resolve(here, "../..")) {
  const read = (name) => JSON.parse(readFileSync(resolve(dir, name), "utf8"));
  let version = "unknown";
  try {
    version = execFileSync("git", ["-C", dir, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  } catch {}
  return { rules: read("rules.json").rules, constants: read("constants.json"), version };
}

const readJson = (path) => (path ? JSON.parse(readFileSync(path, "utf8")) : null);

if (import.meta.url === `file://${process.argv[1]}`) {
  const opts = args(process.argv.slice(2));
  if (!opts.kind || !opts.input) {
    console.error("usage: run.mjs --kind <kind> --input <draft.json> [--brief brief.json] [--related related.json]");
    process.exit(2);
  }
  const draft = readJson(opts.input);
  const brief = readJson(opts.brief);
  const playbook = loadPlaybook(opts.playbook);
  const yomiyasu = opts["no-yomiyasu"] ? null : runYomiyasu(draft, brief);
  const report = runChecks({ kind: opts.kind, draft, brief, related: readJson(opts.related), yomiyasu, playbook });
  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    for (const r of report.results) {
      const mark = r.status === "pass" ? "ok  " : r.status === "fail" ? "FAIL" : "--  ";
      console.log(`${mark} ${r.strength.padEnd(6)} ${r.ruleId}${r.detail ? `  ${r.detail}` : ""}`);
    }
  }
  process.exit(mustFailures(report).length ? 1 : 0);
}
