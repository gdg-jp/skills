import { asArray, fromProblems, inWindows, jst } from "./util.mjs";

export function sendTime(ctx) {
  const at = jst(ctx.draft?.scheduledAt);
  if (!at) return fromProblems(["scheduledAt が読めない"]);
  return fromProblems(inWindows(at.time, ctx.constants.mail.sendWindows) ? [] : [`${at.time} JST は送信の窓の外`]);
}

export function short(ctx) {
  const { maxBodyLines, bannedPhrases } = ctx.constants.mail;
  const body = asArray(ctx.draft?.bodyLines);
  const problems = [];
  const filled = body.filter((line) => String(line).trim());
  if (filled.length > maxBodyLines) problems.push(`本文 ${filled.length} 行（${maxBodyLines} 行以内）`);
  const text = [ctx.draft?.subject, ...body, ctx.draft?.footer].join("\n");
  for (const phrase of bannedPhrases) if (text.includes(phrase)) problems.push(`「${phrase}」を使わない`);
  return fromProblems(problems);
}

export function decorated(ctx) {
  const chars = ctx.constants.mail.decorationChars;
  const heads = [ctx.draft?.subject, ...asArray(ctx.draft?.bodyLines).slice(0, 2), ctx.draft?.footer].join("\n");
  return fromProblems(chars.some((char) => heads.includes(char)) ? [] : ["件名・見出し・フッターに装飾が無い"]);
}
