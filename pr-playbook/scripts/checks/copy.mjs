import { asArray, fromProblems, nonEmpty } from "./util.mjs";

const VARIANTS = ["connpassTitle", "xShort", "igShort", "flyerLine"];

export function metaTheme(ctx) {
  const themes = asArray(ctx.brief?.metaThemes);
  const problems = [];
  asArray(ctx.draft?.candidates).forEach((candidate, i) => {
    const mapping = asArray(candidate.metaThemeMapping);
    if (mapping.length === 0) problems.push(`candidates[${i}]: metaThemeMapping が無い`);
    for (const entry of mapping) {
      if (!nonEmpty(entry.projection))
        problems.push(`candidates[${i}]: ${entry.theme} の射影の説明が無い`);
      if (themes.length && !themes.includes(entry.theme))
        problems.push(`candidates[${i}]: ${entry.theme} は brief.metaThemes に無い`);
    }
  });
  if (asArray(ctx.draft?.candidates).length === 0) problems.push("候補が無い");
  return fromProblems(problems);
}

export function perMedium(ctx) {
  const segments = asArray(ctx.brief?.audienceSegments).map((segment) => segment.id);
  const required = asArray(ctx.brief?.copyConstraints);
  const problems = [];
  asArray(ctx.draft?.candidates).forEach((candidate, i) => {
    for (const key of VARIANTS)
      if (!nonEmpty(candidate[key])) problems.push(`candidates[${i}].${key} が無い`);
    const bySegment = asArray(candidate.bySegment);
    for (const id of segments) {
      if (!bySegment.some((entry) => entry.segmentId === id && nonEmpty(entry.line)))
        problems.push(`candidates[${i}]: 層 ${id} の変種が無い`);
    }
    for (const word of required) {
      for (const key of ["mainCopy", ...VARIANTS]) {
        if (nonEmpty(candidate[key]) && !candidate[key].includes(word))
          problems.push(`candidates[${i}].${key} に「${word}」が無い`);
      }
    }
  });
  return fromProblems(problems);
}
