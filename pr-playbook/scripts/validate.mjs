#!/usr/bin/env node
// Consistency of the Playbook itself. Exit 1 on any problem.
// - rules.json: shape, unique ids, known scopes, every mechanical check implemented
// - guides: every "## " section carries a <!-- tips: n --> marker (no unsourced advice)
// - Skills: every <!-- reads: … --> path exists; example outputs match their schemas
// - examples/briefs match brief.schema.json
// Prints the provisional constants so nobody mistakes them for measured values.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CHECKS, DRAFT_KINDS, scopeFor, validateSchema } from "./checks/index.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skills = resolve(root, "..");
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const problems = [];

const { rules } = json(join(root, "rules.json"));
const scopes = new Set(DRAFT_KINDS.map(scopeFor));
const ids = new Set();
for (const rule of rules) {
  for (const key of ["id", "strength", "scope", "requirement", "source", "verification", "fix"]) {
    if (rule[key] === undefined) problems.push(`rules.json ${rule.id ?? "?"}: ${key} が無い`);
  }
  if (ids.has(rule.id)) problems.push(`rules.json: ${rule.id} が重複`);
  ids.add(rule.id);
  if (!["MUST", "SHOULD"].includes(rule.strength)) problems.push(`rules.json ${rule.id}: strength ${rule.strength}`);
  for (const scope of rule.scope ?? []) if (!scopes.has(scope)) problems.push(`rules.json ${rule.id}: 未知の scope ${scope}`);
  const kind = rule.verification?.kind;
  if (!["mechanical", "render", "review"].includes(kind)) problems.push(`rules.json ${rule.id}: verification.kind ${kind}`);
  if (kind === "mechanical" && !CHECKS[rule.verification.check]) problems.push(`rules.json ${rule.id}: 検査 ${rule.verification.check} が無い`);
}

for (const file of readdirSync(join(root, "guides")).filter((f) => f.endsWith(".md"))) {
  const sections = readFileSync(join(root, "guides", file), "utf8").split(/^## /m).slice(1);
  sections.forEach((section) => {
    if (!/<!--\s*tips:\s*[\d,\s]+-->/.test(section)) problems.push(`guides/${file}: 節「${section.split("\n")[0]}」に tips の出典が無い`);
  });
}

for (const dir of readdirSync(skills).filter((d) => d.startsWith("pr-") && d !== "pr-playbook")) {
  const skillMd = join(skills, dir, "SKILL.md");
  if (!existsSync(skillMd)) {
    problems.push(`${dir}: SKILL.md が無い`);
    continue;
  }
  for (const match of readFileSync(skillMd, "utf8").matchAll(/<!--\s*reads:\s*([^>]+?)\s*-->/g)) {
    for (const path of match[1].split(",").map((p) => p.trim())) {
      if (!existsSync(join(root, path))) problems.push(`${dir}/SKILL.md: reads ${path} が無い`);
    }
  }
  const schemaPath = join(skills, dir, "references/output.schema.json");
  const examplePath = join(skills, dir, "references/example-output.json");
  if (existsSync(schemaPath) && existsSync(examplePath)) {
    for (const error of validateSchema(json(schemaPath), json(examplePath))) problems.push(`${dir}/example-output.json: ${error}`);
  }
}

const briefSchema = json(join(root, "references/brief.schema.json"));
for (const file of readdirSync(join(root, "examples/briefs")).filter((f) => f.endsWith(".json"))) {
  for (const error of validateSchema(briefSchema, json(join(root, "examples/briefs", file)))) problems.push(`examples/briefs/${file}: ${error}`);
}

const provisional = [];
(function walk(node, path) {
  if (!node || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node)) {
    if (key === "provisional" && value === true) provisional.push(path || "(root)");
    else if (key.startsWith("provisional_") && value === true) provisional.push(`${path}.${key.slice(12)}`);
    else walk(value, path ? `${path}.${key}` : key);
  }
})(json(join(root, "constants.json")), "");
console.log(`仮値: ${provisional.join(", ")}`);

if (problems.length) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  process.exit(1);
}
console.log(`ok: rules ${rules.length}、checks ${Object.keys(CHECKS).length}`);
