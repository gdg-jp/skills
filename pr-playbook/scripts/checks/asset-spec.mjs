import { asArray, fromProblems, nonEmpty } from "./util.mjs";

export function thumbFacts(ctx) {
  if (ctx.draft?.templateId !== "connpass-thumbnail")
    return { status: "pass", detail: "connpass サムネイル以外" };
  const slots = ctx.draft?.slots ?? {};
  return fromProblems(
    ["subcopy", "date", "place"]
      .filter((key) => !nonEmpty(slots[key]))
      .map((key) => `slots.${key} が無い`),
  );
}

/** The draft says where its look came from; a brief skin must win over the gdg-design default. */
export function skinDeclared(ctx) {
  const source = ctx.draft?.skinSource;
  const hasSkin = ctx.brief?.skin && Object.keys(ctx.brief.skin).length > 0;
  const problems = [];
  if (!["brief", "brand-guide", "gdg-design"].includes(source))
    problems.push(`skinSource が ${source}`);
  else if (hasSkin && source === "gdg-design")
    problems.push("brief に skin があるのに gdg-design の既定を使っている");
  else if (!hasSkin && source !== "gdg-design")
    problems.push("brief に skin が無いのに skinSource が gdg-design でない");
  const logos = asArray(ctx.draft?.logoTransforms);
  if (logos.length) problems.push("ロゴに変形を指定しない（gdg-design の Logo 節）");
  return fromProblems(problems);
}
