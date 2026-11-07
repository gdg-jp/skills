import { asArray, fromProblems, nonEmpty } from "./util.mjs";

const isDesign = (ctx) => typeof ctx.draft?.html === "string" && ctx.draft.html.length > 0;
const hasSlot = (html, slot) => new RegExp(`data-slot=["']${slot}["']`).test(html);

export function thumbFacts(ctx) {
  if (ctx.draft?.templateId !== "connpass-thumbnail")
    return { status: "pass", detail: "connpass サムネイル以外" };
  const required = ["subcopy", "date", "place"];
  if (isDesign(ctx))
    return fromProblems(
      required
        .filter((key) => !hasSlot(ctx.draft.html, key))
        .map((key) => `data-slot="${key}" の要素が無い`),
    );
  const slots = ctx.draft?.slots ?? {};
  return fromProblems(
    required.filter((key) => !nonEmpty(slots[key])).map((key) => `slots.${key} が無い`),
  );
}

/** The draft says where its look came from; a brief skin or an adopted kit must win over the default. */
export function skinDeclared(ctx) {
  const source = ctx.draft?.skinSource;
  const hasSkin = ctx.brief?.skin && Object.keys(ctx.brief.skin).length > 0;
  const hasKit = !!ctx.related?.kit;
  const problems = [];
  if (!["brief", "brand-guide", "gdg-design", "kit"].includes(source))
    problems.push(`skinSource が ${source}`);
  else if (hasKit && source !== "kit")
    problems.push("キットが決まっているのに skinSource が kit でない");
  else if (!hasKit && source === "kit") problems.push("キットが無いのに skinSource が kit");
  else if (!hasKit && hasSkin && source === "gdg-design")
    problems.push("brief に skin があるのに gdg-design の既定を使っている");
  else if (!hasKit && !hasSkin && source !== "gdg-design")
    problems.push("brief に skin が無いのに skinSource が gdg-design でない");
  const logos = asArray(ctx.draft?.logoTransforms);
  if (logos.length) problems.push("ロゴに変形を指定しない（gdg-design の Logo 節）");
  return fromProblems(problems);
}

/** design 方式: the template's required slots are marked so the render rules can measure them. */
export function factsMarked(ctx) {
  if (!isDesign(ctx)) return { status: "pass", detail: "テンプレート方式" };
  const required = asArray(ctx.related?.requiredSlots);
  const html = ctx.draft.html;
  const problems = required
    .filter((slot) => !hasSlot(html, slot))
    .map((slot) => `data-slot="${slot}" が無い`);
  for (const slot of required)
    if (
      hasSlot(html, slot) &&
      !new RegExp(
        `data-slot=["']${slot}["'][^>]*data-required=["']true["']|data-required=["']true["'][^>]*data-slot=["']${slot}["']`,
      ).test(html)
    )
      problems.push(`data-slot="${slot}" に data-required="true" が無い`);
  return fromProblems(problems);
}

/** design 方式: the sanitizer found nothing to remove (scripts, frames, outside URLs). */
export function noExternal(ctx) {
  if (!isDesign(ctx)) return { status: "pass", detail: "テンプレート方式" };
  const problems = asArray(ctx.related?.sanitizer?.problems).map(String);
  return fromProblems(problems.slice(0, 10));
}

/** design 方式: a self review with at least three lines. */
export function selfReview(ctx) {
  if (!isDesign(ctx)) return { status: "pass", detail: "テンプレート方式" };
  const lines = String(ctx.draft?.selfReviewMd ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return fromProblems(lines.length >= 3 ? [] : [`selfReviewMd が ${lines.length} 行（3 行以上）`]);
}

/** design 方式: with an adopted kit, the derivative uses its dominant colour. */
export function series(ctx) {
  if (!isDesign(ctx)) return { status: "pass", detail: "テンプレート方式" };
  const kit = ctx.related?.kit;
  if (!kit) return { status: "pass", detail: "キットなし" };
  const dominant = String(kit.palette?.dominant ?? "").toLowerCase();
  const html = ctx.draft.html.toLowerCase();
  const problems = [];
  if (/^#[0-9a-f]{6}$/.test(dominant) && !html.includes(dominant))
    problems.push(`キットの支配色 ${dominant} を使っていない`);
  if (ctx.draft?.skinSource !== "kit") problems.push("skinSource が kit でない");
  return fromProblems(problems);
}
