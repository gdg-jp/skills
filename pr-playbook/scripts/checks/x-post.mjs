import {
  SHORTLINK,
  asArray,
  findUrls,
  foldIndex,
  fromProblems,
  hashtags,
  inWindows,
  jst,
  nonEmpty,
  pass,
  unevaluated,
  weightedLength,
} from "./util.mjs";

const posts = (ctx) => asArray(ctx.draft?.posts);
const label = (post, i) => `posts[${i}]${post?.purpose ? `(${post.purpose})` : ""}`;

export function noHashtag(ctx) {
  const problems = [];
  asArray(ctx.draft?.candidates).forEach((candidate, i) => {
    const tags = hashtags(candidate.xShort);
    if (tags.length) problems.push(`candidates[${i}].xShort: #${tags.join(" #")}`);
  });
  posts(ctx).forEach((post, i) => {
    if (post.purpose === "live") return;
    const tags = hashtags(post.text);
    if (tags.length) problems.push(`${label(post, i)}: #${tags.join(" #")}`);
  });
  return fromProblems(problems);
}

export function liveHashtag(ctx) {
  const live = posts(ctx).filter((post) => post.purpose === "live");
  if (live.length === 0) return pass("実況投稿なし");
  const tag = ctx.brief?.event?.hashtag;
  if (!nonEmpty(tag)) return unevaluated("brief.event.hashtag が無い");
  const problems = [];
  posts(ctx).forEach((post, i) => {
    if (post.purpose === "live" && !String(post.text).includes(tag))
      problems.push(`${label(post, i)}: ${tag} が無い`);
  });
  return fromProblems(problems);
}

/**
 * The link must sit inside what X shows before "Show more", and the declared fold must be a
 * line boundary at or before X's fold, so the hidden part starts with its own line.
 */
export function fold(ctx) {
  const { weighted: threshold } = ctx.constants.x.foldThreshold;
  const urlWeight = ctx.constants.x.urlWeight ?? 23;
  const problems = [];
  posts(ctx).forEach((post, i) => {
    const text = String(post.text ?? "");
    const above = String(post.textAboveFold ?? "");
    const below = String(post.textBelowFold ?? "");
    const name = label(post, i);
    if (above + below !== text) {
      problems.push(`${name}: textAboveFold + textBelowFold が text と一致しない`);
      return;
    }
    const total = weightedLength(text, urlWeight);
    if (total <= threshold) {
      if (below !== "")
        problems.push(`${name}: 折りたたまれない長さ（${total}）なのに textBelowFold がある`);
      return;
    }
    const xFold = foldIndex(text, threshold, urlWeight);
    if (above.length > xFold)
      problems.push(
        `${name}: 宣言した折りたたみ位置が X の折りたたみ（重み ${threshold}）より後ろ`,
      );
    if (above.length > 0 && !above.endsWith("\n") && !below.startsWith("\n"))
      problems.push(`${name}: 折りたたみ位置が行の境目でない`);
    if (!findUrls(above).length)
      problems.push(`${name}: 折りたたみ前にリンク（URL か ${SHORTLINK}）が無い`);
    const firstHidden = below.replace(/^\n+/, "").split("\n")[0] ?? "";
    if (!firstHidden.trim()) problems.push(`${name}: 折りたたみ後の 1 行目が空`);
  });
  return fromProblems(problems);
}

export function imageVsOgp(ctx) {
  const problems = [];
  posts(ctx).forEach((post, i) => {
    const kind = post.attachment?.kind;
    if (post.expectedReaction === "quote" && kind !== "image")
      problems.push(`${label(post, i)}: 引用が多い投稿は画像を添付する（${kind}）`);
    if (post.expectedReaction === "repost" && kind !== "ogp")
      problems.push(`${label(post, i)}: リポストが多い投稿は OGP 付き短縮リンク（${kind}）`);
  });
  return fromProblems(problems);
}

export function ogpOnShortlink(ctx) {
  const problems = [];
  posts(ctx).forEach((post, i) => {
    if (post.attachment?.kind !== "ogp") return;
    if (!nonEmpty(post.attachment?.link?.ogImage))
      problems.push(`${label(post, i)}: attachment.link.ogImage が無い`);
    if (!findUrls(post.text).length) problems.push(`${label(post, i)}: 本文にリンクが無い`);
  });
  return fromProblems(problems);
}

export function postTime(ctx) {
  const { postWindows } = ctx.constants.x;
  const problems = [];
  posts(ctx).forEach((post, i) => {
    if (post.purpose === "live") return;
    const at = jst(post.scheduledAt);
    if (!at) {
      problems.push(`${label(post, i)}: scheduledAt が読めない`);
      return;
    }
    const windows = at.weekend ? postWindows.weekend : postWindows.weekday;
    if (!inWindows(at.time, windows))
      problems.push(`${label(post, i)}: ${at.weekend ? "休日" : "平日"} ${at.time} JST は窓の外`);
  });
  return fromProblems(problems);
}

export function igChannelSpecific(ctx) {
  const xTexts = asArray(ctx.related?.xPosts).map((post) => String(post.text ?? "").trim());
  if (xTexts.length === 0) return unevaluated("比較する X の投稿が無い（related.xPosts）");
  const problems = [];
  posts(ctx).forEach((post, i) => {
    if (xTexts.includes(String(post.text ?? "").trim()))
      problems.push(`${label(post, i)}: X の投稿と同じ本文`);
  });
  return fromProblems(problems);
}

export function igHashtags(ctx) {
  const min = ctx.constants.instagram.minHashtags;
  const problems = [];
  posts(ctx).forEach((post, i) => {
    const count = hashtags(post.text).length;
    if (count < min) problems.push(`${label(post, i)}: ハッシュタグ ${count} 個（${min} 個以上）`);
  });
  return fromProblems(problems);
}
