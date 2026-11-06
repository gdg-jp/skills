import { scanHtml } from "./connpass-html.mjs";
import { asArray, fail, fromProblems, lines, nonEmpty, pass, visibleLength } from "./util.mjs";

export function summary(ctx) {
  const { summaryMaxLines, summaryMaxCharsPerLine } = ctx.constants.connpass;
  const rows = lines(ctx.draft?.summary);
  const problems = [];
  if (rows.length === 0) problems.push("summary が空");
  if (rows.length > summaryMaxLines) problems.push(`${rows.length} 行（${summaryMaxLines} 行以内）`);
  rows.forEach((row, i) => {
    if ([...row].length > summaryMaxCharsPerLine) problems.push(`${i + 1} 行目が ${[...row].length} 字`);
  });
  return fromProblems(problems);
}

export function htmlAllowlist(ctx) {
  const findings = scanHtml(ctx.draft?.html);
  return findings.length ? fail([...new Set(findings)].slice(0, 20).join(" / ")) : pass();
}

function contentWords(title, constants) {
  let rest = String(title ?? "");
  const words = [...constants.officialSeriesNames, ...constants.connpass.placeWords].sort((a, b) => b.length - a.length);
  for (const word of words) rest = rest.split(word).join(" ");
  return rest.replace(/\d+/g, " ").replace(/[\s\p{P}\p{S}]+/gu, "");
}

function titleProblems(title, constants, where) {
  const problems = [];
  if (!nonEmpty(title)) return [`${where}: タイトルが無い`];
  const min = constants.connpass.titleMinChars;
  if (visibleLength(title) < min) problems.push(`${where}: ${visibleLength(title)} 字（${min} 字以上）`);
  if ([...contentWords(title, constants)].length < 4) problems.push(`${where}: 公式名・地名・年のほかに内容を表す語が無い`);
  return problems;
}

export function title(ctx) {
  if (ctx.kind === "connpass_page") return fromProblems(titleProblems(ctx.draft?.title, ctx.constants, "title"));
  const problems = asArray(ctx.draft?.candidates).flatMap((candidate, i) =>
    titleProblems(candidate.connpassTitle, ctx.constants, `candidates[${i}].connpassTitle`),
  );
  return fromProblems(problems);
}
