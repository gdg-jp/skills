import { asArray, findUrls, fromProblems, pass } from "./util.mjs";

const PROFILE_RE = /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/(?!intent\/|i\/|search|hashtag\/)([A-Za-z0-9_]{1,15})\/?(?:\?.*)?$/;

/** Texts in the draft that can carry links, by kind. */
function linkTexts(ctx) {
  if (ctx.kind === "connpass_page") {
    const html = String(ctx.draft?.html ?? "");
    return [...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  }
  return asArray(ctx.draft?.posts).map((post) => post.text);
}

/** Only our own accounts (brief.accounts): a speaker's profile link is not follow guidance. */
export function followIntent(ctx) {
  const own = new Set(
    asArray(ctx.brief?.accounts)
      .filter((account) => account.kind === "x")
      .map((account) => String(account.handle).replace(/^@/, "").toLowerCase()),
  );
  if (own.size === 0) return pass("brief.accounts に X アカウントが無い");
  const problems = [];
  for (const text of linkTexts(ctx)) {
    for (const { url } of findUrls(text)) {
      const match = PROFILE_RE.exec(url);
      if (match && own.has(match[1].toLowerCase())) problems.push(`${url}: プロフィール URL。intent/follow?screen_name=${match[1]} にする`);
    }
  }
  return fromProblems(problems);
}

const CONFIRMED = new Set(["confirmed", "public"]);

function sessionById(ctx, id) {
  return asArray(ctx.brief?.sessions).find((session) => session.id === id);
}

export function announceAfterConfirmed(ctx) {
  const problems = [];
  if (ctx.kind === "plan") {
    for (const item of asArray(ctx.draft?.scheduleItems)) {
      if (!item.sessionId) continue;
      const session = sessionById(ctx, item.sessionId);
      if (!session) {
        problems.push(`${item.ref}: 未知のセッション ${item.sessionId}`);
        continue;
      }
      const needed = `session:${item.sessionId}:confirmed`;
      if (!CONFIRMED.has(session.status) && !asArray(item.blockedBy).includes(needed)) {
        problems.push(`${item.ref}: TBA のセッション ${item.sessionId} に blockedBy ${needed} が無い`);
      }
    }
    return fromProblems(problems);
  }
  asArray(ctx.draft?.posts).forEach((post, i) => {
    if (post.purpose !== "session") return;
    const session = sessionById(ctx, post.sessionId);
    if (!session) problems.push(`posts[${i}]: セッション ${post.sessionId} が brief に無い`);
    else if (!CONFIRMED.has(session.status)) problems.push(`posts[${i}]: セッション ${post.sessionId} は ${session.status}`);
  });
  return fromProblems(problems);
}

export function speakerTierHigh(ctx) {
  const high = new Set(asArray(ctx.brief?.speakers).filter((s) => s.tier === "high").map((s) => s.id));
  if (high.size === 0) return pass("tier: high の登壇者なし");
  const problems = [];
  if (ctx.kind === "plan") {
    for (const item of asArray(ctx.draft?.scheduleItems)) {
      if (item.kind === "speaker_request" && high.has(item.speakerId) && item.suggestionOnly !== true) {
        problems.push(`${item.ref}: ${item.speakerId} は tier: high。suggestionOnly を true に`);
      }
    }
  } else {
    asArray(ctx.draft?.posts).forEach((post, i) => {
      const request = post.speakerRequest;
      if (request && high.has(request.speakerId) && request.suggestionOnly !== true) {
        problems.push(`posts[${i}]: ${request.speakerId} は tier: high。suggestionOnly を true に`);
      }
    });
  }
  return fromProblems(problems);
}

/** Runner / CLI inject the yomiyasu result; the Worker cannot run Python. */
export function yomiyasu(ctx) {
  return ctx.yomiyasu ?? { status: "unevaluated", detail: "yomiyasu はこの環境で実行できない" };
}
