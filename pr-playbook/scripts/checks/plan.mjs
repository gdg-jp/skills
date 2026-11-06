import { asArray, daysBefore, fromProblems, nonEmpty, pass, unevaluated } from "./util.mjs";

const items = (ctx) => asArray(ctx.draft?.scheduleItems);

function labelFor(ctx, channel) {
  const mix = asArray(ctx.draft?.channelMix).find((entry) => entry.channel === channel);
  return mix?.label || ctx.constants.channelLabels[channel] || null;
}

export function survey(ctx) {
  const questions = asArray(ctx.draft?.surveyQuestions);
  const problems = [];
  for (const title of ctx.constants.surveyQuestions) {
    if (!questions.some((q) => String(q.title).includes(title)))
      problems.push(`設問「${title}」が無い`);
  }
  const source = questions.find((q) =>
    String(q.title).includes(ctx.constants.surveySourceQuestion),
  );
  if (source) {
    const adopted = asArray(ctx.draft?.channelMix).filter((entry) => entry.adopt);
    const expected = new Set(adopted.map((entry) => labelFor(ctx, entry.channel)).filter(Boolean));
    const options = new Set(
      asArray(source.options).filter((o) => !ctx.constants.surveyExtraOptions.includes(o)),
    );
    for (const label of expected)
      if (!options.has(label)) problems.push(`「知った場所」に ${label} が無い`);
    for (const option of options)
      if (!expected.has(option)) problems.push(`「知った場所」の ${option} は採用チャネルに無い`);
  }
  return fromProblems(problems);
}

function derivedCheck(
  ctx,
  parentKinds,
  childKind,
  offset,
  extra = () => true,
  filter = () => true,
) {
  const all = items(ctx);
  const problems = [];
  for (const parent of all.filter((item) => parentKinds.includes(item.kind) && filter(item))) {
    const child = all.find(
      (item) =>
        item.kind === childKind &&
        item.derivedFrom === parent.ref &&
        item.offsetMinutes === -offset &&
        extra(item),
    );
    if (!child) problems.push(`${parent.ref}: ${offset} 分前の ${childKind} が無い`);
  }
  return fromProblems(problems);
}

export function remindStaff(ctx) {
  return derivedCheck(
    ctx,
    ["x_post", "ig_post"],
    "staff_reminder",
    ctx.constants.reminders.staffOffsetMinutes,
  );
}

export function speakerRequest(ctx) {
  return derivedCheck(
    ctx,
    ["x_post"],
    "speaker_request",
    ctx.constants.reminders.speakerOffsetMinutes,
    (item) => item.purpose === "quote",
    (item) => nonEmpty(item.speakerId),
  );
}

export function speakerOwnAnnounce(ctx) {
  const normal = asArray(ctx.brief?.speakers).filter((speaker) => speaker.tier !== "high");
  if (normal.length === 0) return pass("tier: normal の登壇者なし");
  const problems = normal
    .filter(
      (s) =>
        !items(ctx).some(
          (i) =>
            i.kind === "speaker_request" && i.speakerId === s.id && i.purpose === "own_announce",
        ),
    )
    .map((s) => `${s.id}: 本人の登壇予告の依頼が無い`);
  return fromProblems(problems);
}

export function budgetSplit(ctx) {
  const budget = ctx.draft?.budgetAllocation;
  if (!budget) return fromProblems(["budgetAllocation が無い"]);
  const { nonAdsMaxYen, nonAdsToleranceRatio, xIgRatioRange } = ctx.constants.budget;
  const problems = [];
  const total = ctx.brief?.budget?.totalYen ?? budget.totalYen;
  if (budget.printYen > nonAdsMaxYen * (1 + nonAdsToleranceRatio))
    problems.push(`非広告 ${budget.printYen} 円は ${nonAdsMaxYen} 円前後を超える`);
  if (total && budget.printYen + budget.adsYen > total)
    problems.push(`配分 ${budget.printYen + budget.adsYen} 円が総額 ${total} 円を超える`);
  if (Math.abs(budget.x + budget.ig - budget.adsYen) > 1)
    problems.push("x + ig が adsYen と一致しない");
  const sum = budget.x + budget.ig;
  if (sum > 0) {
    const share = budget.x / sum;
    const [[lowX, lowIg], [highX, highIg]] = xIgRatioRange;
    const min = lowX / (lowX + lowIg);
    const max = highX / (highX + highIg);
    if (share < min - 1e-9 || share > max + 1e-9)
      problems.push(`X の比率 ${(share * 100).toFixed(1)} %（${min * 100}〜${max * 100} %）`);
  }
  return fromProblems(problems);
}

export function coversChannels(ctx) {
  const mix = asArray(ctx.draft?.channelMix);
  const problems = ctx.constants.channelCatalog
    .filter((channel) => !mix.some((entry) => entry.channel === channel && nonEmpty(entry.reason)))
    .map((channel) => `${channel} の採否と理由が無い`);
  return fromProblems(problems);
}

export function livePosts(ctx) {
  return fromProblems(
    items(ctx).some((item) => item.kind === "live_post") ? [] : ["live_post が無い"],
  );
}

export function adsTiming(ctx) {
  const flights = asArray(ctx.draft?.budgetAllocation?.flights);
  const { x, meta } = ctx.constants.ads;
  const problems = [];
  for (const flight of flights) {
    if (flight.medium === "x_ads") {
      const [min, max] = x.startDaysBefore;
      if (flight.startDaysBefore < min || flight.startDaysBefore > max)
        problems.push(`X Ads の開始 ${flight.startDaysBefore} 日前（${min}〜${max}）`);
      const first = asArray(flight.phases)[0];
      if (
        !first ||
        first.objective !== "impression" ||
        first.toDay - first.fromDay + 1 < x.impressionDays
      ) {
        problems.push(`X Ads の最初の ${x.impressionDays} 日がインプレッション最適化でない`);
      }
    }
    if (
      flight.medium === "ig_ads" &&
      Math.abs(flight.startDaysBefore - meta.startDaysBefore) > meta.toleranceDays
    ) {
      problems.push(
        `Meta Ads の開始 ${flight.startDaysBefore} 日前（${meta.startDaysBefore} 日前）`,
      );
    }
  }
  return fromProblems(problems);
}

export function milestones(ctx) {
  const event = ctx.brief?.event?.startAt;
  if (!event) return unevaluated("brief.event.startAt が無い");
  const { milestonesDaysBefore, milestoneToleranceDays } = ctx.constants;
  const near = (days) =>
    milestonesDaysBefore.some((m) => Math.abs(days - m) <= milestoneToleranceDays);
  const problems = [];
  for (const item of items(ctx)) {
    if (item.kind !== "discord_post" && item.kind !== "connpass_mail") continue;
    const days = daysBefore(event, item.dueAt);
    if (days === null) problems.push(`${item.ref}: dueAt が読めない`);
    else if (days > 1.5 && !near(days))
      problems.push(
        `${item.ref}: ${item.kind} が ${days.toFixed(1)} 日前（節目 ${milestonesDaysBefore.join(" / ")} 日前）`,
      );
  }
  for (const m of milestonesDaysBefore) {
    const covered = items(ctx).some((item) => {
      const days = item.kind === "discord_post" ? daysBefore(event, item.dueAt) : null;
      return days !== null && Math.abs(days - m) <= milestoneToleranceDays;
    });
    if (!covered) problems.push(`${m} 日前の discord_post が無い`);
  }
  return fromProblems(problems);
}

export function preEvents(ctx) {
  const list = asArray(ctx.draft?.preEvents);
  const problems = list.length
    ? list.filter((e) => !nonEmpty(e.leadsTo)).map((e) => `${e.name}: 本番への導線が無い`)
    : ["プレイベントが無い"];
  return fromProblems(problems);
}

export function flyerVersions(ctx) {
  const variants = new Set(
    items(ctx)
      .filter((item) => item.kind === "flyer_text")
      .map((item) => item.variant),
  );
  return fromProblems(
    ctx.constants.flyer.versions
      .filter((v) => !variants.has(v))
      .map((v) => `flyer_text ${v} が無い`),
  );
}

export function swagKinds(ctx) {
  const kinds = new Set(asArray(ctx.draft?.noveltyIdeas).map((idea) => idea.kind));
  return fromProblems(
    ctx.constants.swag.kinds
      .filter((kind) => !kinds.has(kind))
      .map((kind) => `ノベルティ ${kind} の案が無い`),
  );
}
