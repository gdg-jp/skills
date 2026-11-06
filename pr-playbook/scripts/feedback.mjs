#!/usr/bin/env node
// Writes accepted pr proposals back into the Playbook (run by a person or Claude Code, never the Worker):
//   node pr-playbook/scripts/feedback.mjs import proposals-2026-12-01.json   → proposals/<id>.json
//   node pr-playbook/scripts/feedback.mjs list                                → not yet applied
//   node pr-playbook/scripts/feedback.mjs apply <id>                          → rule / constant written
// Only mechanical rules (with an existing check) and constants are written automatically; guides,
// templates, examples and decisions are printed for a person to write. A proposal made against
// other rules.json / constants.json (baseRevision) is refused, and so is personal data.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CHECKS } from "./checks/index.mjs";

const defaultDir = new URL("../", import.meta.url).pathname;

/** Same digest as the pr app's export: SHA-256 of the parsed file's canonical JSON. */
export const digestOf = (path) =>
  createHash("sha256")
    .update(JSON.stringify(JSON.parse(readFileSync(path, "utf8"))))
    .digest("hex");

/** Emails and @handles (not URLs). */
export function personalData(text) {
  const found = new Set();
  for (const m of String(text).matchAll(/[\w.+-]+@[\w-]+\.[\w.-]+/g)) found.add(m[0]);
  for (const m of String(text).matchAll(/(^|[^\w@/])(@[A-Za-z0-9_]{2,15})\b/g))
    if (m[2]) found.add(m[2]);
  return [...found];
}

export function importBundle(bundlePath, dir = defaultDir) {
  const bundle = JSON.parse(readFileSync(bundlePath, "utf8"));
  if (bundle.format !== "pr-playbook-proposals/1")
    throw new Error(`unknown bundle format ${bundle.format}`);
  mkdirSync(join(dir, "proposals"), { recursive: true });
  const written = [];
  const refused = [];
  for (const p of bundle.proposals) {
    if (!/^[\w-]+$/.test(p.id)) throw new Error(`bad proposal id ${p.id}`);
    const pii = personalData(JSON.stringify([p.summary, p.observation, p.payload]));
    if (pii.length) {
      refused.push(`${p.id}: personal data (${pii.length})`);
      continue;
    }
    writeFileSync(
      join(dir, "proposals", `${p.id}.json`),
      `${JSON.stringify({ ...p, baseRevision: bundle.baseRevision, decision: { status: "accepted", reason: p.decisionReason ?? null }, appliedAt: null }, null, 2)}\n`,
    );
    written.push(p.id);
  }
  return { written, refused };
}

export function listPending(dir = defaultDir) {
  const folder = join(dir, "proposals");
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(folder, f), "utf8")))
    .filter((p) => !p.appliedAt);
}

const pointer = (path) =>
  path
    .replace(/^\//, "")
    .split("/")
    .map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));

export function apply(id, dir = defaultDir, now = new Date()) {
  const file = join(dir, "proposals", `${id}.json`);
  const proposal = JSON.parse(readFileSync(file, "utf8"));
  if (proposal.appliedAt) return { written: false, message: `${id} is already applied` };
  const rulesPath = join(dir, "rules.json");
  const constantsPath = join(dir, "constants.json");
  const base = proposal.baseRevision ?? {};
  if (base.rules !== digestOf(rulesPath) || base.constants !== digestOf(constantsPath))
    throw new Error(
      `${id}: rules.json / constants.json changed since the proposal (baseRevision); export it again`,
    );
  const pii = personalData(JSON.stringify(proposal.payload));
  if (pii.length) throw new Error(`${id}: personal data in the payload`);
  if (proposal.kind === "rule") {
    const rule = proposal.payload;
    if (!rule?.id || !rule.verification) throw new Error(`${id}: payload is not a rule`);
    if (rule.verification.kind === "mechanical" && !CHECKS[rule.verification.check])
      throw new Error(`${id}: check ${rule.verification.check} does not exist; implement it first`);
    const rules = JSON.parse(readFileSync(rulesPath, "utf8"));
    if (rules.rules.some((r) => r.id === rule.id))
      throw new Error(`${id}: rule ${rule.id} already exists`);
    rules.rules.push(rule);
    writeFileSync(rulesPath, `${JSON.stringify(rules, null, 2)}\n`);
  } else if (proposal.kind === "constant") {
    const { path, value } = proposal.payload ?? {};
    if (typeof path !== "string" || value === undefined)
      throw new Error(`${id}: payload needs { path, value }`);
    const constants = JSON.parse(readFileSync(constantsPath, "utf8"));
    const keys = pointer(path);
    const last = keys.pop();
    let node = constants;
    for (const k of keys) {
      if (!node || typeof node !== "object" || !(k in node))
        throw new Error(`${id}: ${path} does not exist`);
      node = node[k];
    }
    if (!(last in node)) throw new Error(`${id}: ${path} does not exist`);
    node[last] = value;
    // An observed value is no longer provisional.
    if (node.provisional === true) node.provisional = false;
    delete node[`provisional_${last}`];
    writeFileSync(constantsPath, `${JSON.stringify(constants, null, 2)}\n`);
  } else {
    return {
      written: false,
      message: `${id}: ${proposal.kind} is written by hand into ${proposal.target}\n${proposal.payload?.markdown ?? proposal.observation}`,
    };
  }
  writeFileSync(
    file,
    `${JSON.stringify({ ...proposal, appliedAt: now.toISOString() }, null, 2)}\n`,
  );
  return {
    written: true,
    message: `${id}: applied to ${proposal.kind === "rule" ? "rules.json" : "constants.json"}`,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [command, arg] = process.argv.slice(2);
  try {
    if (command === "import") {
      const r = importBundle(arg);
      console.log(
        `imported ${r.written.length}${r.refused.length ? `, refused: ${r.refused.join("; ")}` : ""}`,
      );
    } else if (command === "list") {
      for (const p of listPending()) console.log(`${p.id}\t${p.kind}\t${p.target}\t${p.summary}`);
    } else if (command === "apply") {
      console.log(apply(arg).message);
    } else {
      console.error("usage: feedback.mjs import <bundle.json> | list | apply <id>");
      process.exit(2);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
