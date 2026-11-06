// Pure helpers shared by the checks. No Node or Worker APIs: the pr Worker imports this tree.

export const SHORTLINK = "{{shortlink}}";
const URL_RE = /https?:\/\/[^\s<>"'）」』】]+|\{\{shortlink\}\}/g;

/** URLs (and the {{shortlink}} placeholder) in a text, with their positions. */
export function findUrls(text) {
  const out = [];
  for (const match of String(text ?? "").matchAll(URL_RE)) {
    out.push({ url: match[0], start: match.index, end: match.index + match[0].length });
  }
  return out;
}

// twitter-text v3: these code point ranges weigh 1, everything else 2. URLs weigh `urlWeight`.
const LIGHT_RANGES = [
  [0x0000, 0x10ff],
  [0x2000, 0x200d],
  [0x2010, 0x201f],
  [0x2032, 0x2037],
];
export function charWeight(codePoint) {
  return LIGHT_RANGES.some(([a, b]) => codePoint >= a && codePoint <= b) ? 1 : 2;
}

/** X's weighted length. URLs and {{shortlink}} count as `urlWeight` each. */
export function weightedLength(text, urlWeight = 23) {
  return segments(text, urlWeight).reduce((sum, seg) => sum + seg.weight, 0);
}

/** Text split into URL tokens and single code points, each with its weight and UTF-16 range. */
export function segments(text, urlWeight = 23) {
  const value = String(text ?? "");
  const urls = findUrls(value);
  const out = [];
  let index = 0;
  for (const url of urls) {
    pushChars(value.slice(index, url.start), index, out);
    out.push({ text: url.url, start: url.start, end: url.end, weight: urlWeight, url: true });
    index = url.end;
  }
  pushChars(value.slice(index), index, out);
  return out;
}
function pushChars(chunk, offset, out) {
  let position = offset;
  for (const char of chunk) {
    const cp = char.codePointAt(0);
    out.push({
      text: char,
      start: position,
      end: position + char.length,
      weight: charWeight(cp),
      url: false,
    });
    position += char.length;
  }
}

/** UTF-16 index where X folds a text of the given weighted threshold (URLs are never split). */
export function foldIndex(text, threshold, urlWeight = 23) {
  let weight = 0;
  let index = 0;
  for (const seg of segments(text, urlWeight)) {
    if (weight + seg.weight > threshold) return index;
    weight += seg.weight;
    index = seg.end;
  }
  return String(text ?? "").length;
}

/** Hashtags outside URLs. Accepts both # and ＃. */
export function hashtags(text) {
  let value = String(text ?? "");
  for (const url of findUrls(value).reverse()) {
    value = value.slice(0, url.start) + " ".repeat(url.end - url.start) + value.slice(url.end);
  }
  return [...value.matchAll(/(?:^|[\s　(（「『【])[#＃]([^\s#＃　]+)/g)].map((m) => m[1]);
}

/** JST calendar parts for an ISO instant (or null when unparseable). */
export function jst(iso) {
  const ms = Date.parse(String(iso ?? ""));
  if (Number.isNaN(ms)) return null;
  const date = new Date(ms + 9 * 3600 * 1000);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const day = date.getUTCDay();
  return { day, weekend: day === 0 || day === 6, time: `${hh}:${mm}`, ms };
}

export function inWindows(time, windows) {
  return (windows ?? []).some(([from, to]) => time >= from && time <= to);
}

export function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function lines(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Visible length in code points, ignoring whitespace. */
export function visibleLength(text) {
  return [...String(text ?? "").replace(/\s+/g, "")].length;
}

export const DAY_MS = 86_400_000;

export function daysBefore(eventIso, dueIso) {
  const event = Date.parse(String(eventIso ?? ""));
  const due = Date.parse(String(dueIso ?? ""));
  if (Number.isNaN(event) || Number.isNaN(due)) return null;
  return (event - due) / DAY_MS;
}

export const pass = (detail = "") => ({ status: "pass", detail });
export const fail = (detail) => ({ status: "fail", detail });
export const unevaluated = (detail) => ({ status: "unevaluated", detail });

/** Combine per-item problems into one result. */
export function fromProblems(problems, okDetail = "") {
  return problems.length === 0 ? pass(okDetail) : fail(problems.join(" / "));
}

export const asArray = (value) => (Array.isArray(value) ? value : []);

const JA_RE = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
const SKIP_KEYS = new Set([
  "html",
  "metaThemeMapping",
  "rationaleMd",
  "textAboveFold",
  "textBelowFold",
]);

/**
 * Japanese prose in a draft, for yomiyasu: every string leaf with kana or kanji, except markup and
 * the author's own notes. The Go runner (apps/cli/internal/pr/runner/yomiyasu.go) mirrors this.
 */
export function japaneseTexts(value, key = "") {
  if (SKIP_KEYS.has(key)) return [];
  if (typeof value === "string") return JA_RE.test(value) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap((item) => japaneseTexts(item, key));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) => japaneseTexts(v, k));
  return [];
}
