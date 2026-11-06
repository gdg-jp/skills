import { skinDeclared, thumbFacts } from "./asset-spec.mjs";
// Entry point for every consumer of the checks: the Skills' CLI (run.mjs) and the pr Worker.
// Pure ESM, no Node APIs. Data (rules, constants) is passed in.
import { announceAfterConfirmed, followIntent, speakerTierHigh, yomiyasu } from "./common.mjs";
import { htmlAllowlist, summary, title } from "./connpass.mjs";
import { metaTheme, perMedium } from "./copy.mjs";
import { decorated, sendTime, short } from "./mail.mjs";
import {
  adsTiming,
  budgetSplit,
  coversChannels,
  flyerVersions,
  livePosts,
  milestones,
  preEvents,
  remindStaff,
  speakerOwnAnnounce,
  speakerRequest,
  survey,
  swagKinds,
} from "./plan.mjs";
import { asArray } from "./util.mjs";
import {
  fold,
  igChannelSpecific,
  igHashtags,
  imageVsOgp,
  liveHashtag,
  noHashtag,
  ogpOnShortlink,
  postTime,
} from "./x-post.mjs";

/** check name → { run, provisional?(constants) } */
export const CHECKS = {
  "x-post/no-hashtag": { run: noHashtag },
  "x-post/live-hashtag": { run: liveHashtag },
  "x-post/fold": { run: fold, provisional: (c) => c.x.foldThreshold.provisional },
  "x-post/image-vs-ogp": { run: imageVsOgp },
  "x-post/ogp-on-shortlink": { run: ogpOnShortlink },
  "x-post/post-time": { run: postTime, provisional: (c) => c.x.postWindows.provisional },
  "ig-post/channel-specific": { run: igChannelSpecific },
  "ig-post/hashtags": { run: igHashtags, provisional: (c) => c.instagram.provisional_minHashtags },
  "common/follow-intent": { run: followIntent },
  "common/announce-after-confirmed": { run: announceAfterConfirmed },
  "common/speaker-tier-high": { run: speakerTierHigh },
  "common/yomiyasu": { run: yomiyasu },
  "copy/meta-theme": { run: metaTheme },
  "copy/per-medium": { run: perMedium },
  "connpass/title": { run: title, provisional: (c) => c.connpass.provisional_titleMinChars },
  "connpass/summary": { run: summary },
  "connpass/html-allowlist": { run: htmlAllowlist },
  "mail/send-time": { run: sendTime, provisional: (c) => c.mail.provisional },
  "mail/short": { run: short, provisional: (c) => c.mail.provisional_maxBodyLines },
  "mail/decorated": { run: decorated },
  "plan/survey": { run: survey },
  "plan/remind-staff": { run: remindStaff },
  "plan/speaker-request": {
    run: speakerRequest,
    provisional: (c) => c.reminders.provisional_speaker,
  },
  "plan/speaker-own-announce": { run: speakerOwnAnnounce },
  "plan/budget-split": { run: budgetSplit },
  "plan/covers-channels": { run: coversChannels },
  "plan/live-posts": { run: livePosts },
  "plan/ads-timing": { run: adsTiming },
  "plan/milestones": { run: milestones },
  "plan/pre-events": { run: preEvents },
  "plan/flyer-versions": { run: flyerVersions },
  "plan/swag-kinds": { run: swagKinds },
  "asset/thumb-facts": { run: thumbFacts },
  "brand/skin-declared": { run: skinDeclared },
};

export const DRAFT_KINDS = [
  "copy",
  "x_post",
  "ig_post",
  "connpass_page",
  "connpass_mail",
  "asset_spec",
  "plan",
];

export const scopeFor = (kind) => (kind === "plan" ? "plan" : `draft.${kind}`);

/** Rules whose scope covers this kind. */
export function rulesFor(rules, kind) {
  return rules.filter((rule) => rule.scope.includes(scopeFor(kind)));
}

/**
 * Run every rule for a draft kind.
 * @param {{ kind: string, draft: unknown, brief?: unknown, related?: unknown, yomiyasu?: unknown,
 *           playbook: { rules: object[], constants: object, version?: string } }} input
 */
export function runChecks({
  kind,
  draft,
  brief = null,
  related = null,
  yomiyasu = null,
  playbook,
}) {
  if (!DRAFT_KINDS.includes(kind)) throw new Error(`unknown draft kind ${kind}`);
  const ctx = { kind, draft, brief, related, yomiyasu, constants: playbook.constants };
  const results = rulesFor(playbook.rules, kind).map((rule) => {
    const base = { ruleId: rule.id, strength: rule.strength };
    // Render rules are measured in the browser (scripts/render/checks-script.js) and passed in.
    if (rule.verification.kind === "render") {
      const measured = asArray(related?.render).find((r) => r?.ruleId === rule.id);
      return measured
        ? { ...base, status: measured.status, detail: measured.detail ?? "" }
        : { ...base, status: "unevaluated", detail: "render: 描画していない" };
    }
    if (rule.verification.kind !== "mechanical") {
      return { ...base, status: "unevaluated", detail: `${rule.verification.kind}: 人が判断する` };
    }
    const check = CHECKS[rule.verification.check];
    if (!check)
      return { ...base, status: "unevaluated", detail: `検査 ${rule.verification.check} が無い` };
    let result;
    try {
      result = check.run(ctx);
    } catch (error) {
      result = {
        status: "fail",
        detail: `検査の実行に失敗: ${error instanceof Error ? error.message : error}`,
      };
    }
    const provisional = check.provisional?.(playbook.constants) ? "（仮値）" : "";
    return {
      ...base,
      status: result.status,
      detail: `${result.detail ?? ""}${provisional}`.trim(),
    };
  });
  return { kind, playbookVersion: playbook.version ?? "unknown", results };
}

/** MUST rules that failed. */
export const mustFailures = (report) =>
  report.results.filter((r) => r.strength === "MUST" && r.status === "fail");

export { validateSchema } from "./schema.mjs";
export { scanHtml, ALLOWED_TAGS, ALLOWED_CSS } from "./connpass-html.mjs";
export { weightedLength, foldIndex, hashtags, findUrls, japaneseTexts } from "./util.mjs";
