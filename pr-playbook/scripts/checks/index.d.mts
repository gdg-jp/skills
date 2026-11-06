// Types for consumers in TypeScript (the pr Worker). The implementation is index.mjs.
export type CheckStatus = "pass" | "fail" | "unevaluated";
export type RuleStrength = "MUST" | "SHOULD";
export type DraftKind =
  | "copy"
  | "x_post"
  | "ig_post"
  | "connpass_page"
  | "connpass_mail"
  | "asset_spec"
  | "plan";

export type Rule = {
  id: string;
  strength: RuleStrength;
  scope: string[];
  requirement: string;
  source: string;
  verification: { kind: "mechanical" | "render" | "review"; check?: string };
  fix: string;
  when?: Record<string, string[]>;
};

export type CheckResult = {
  ruleId: string;
  strength: RuleStrength;
  status: CheckStatus;
  detail: string;
};
export type CheckReport = { kind: DraftKind; playbookVersion: string; results: CheckResult[] };
export type Playbook = { rules: Rule[]; constants: Record<string, unknown>; version?: string };

export declare const DRAFT_KINDS: DraftKind[];
export declare const CHECKS: Record<
  string,
  { run: (ctx: unknown) => { status: CheckStatus; detail?: string } }
>;
export declare function scopeFor(kind: DraftKind): string;
export declare function rulesFor(rules: Rule[], kind: DraftKind): Rule[];
export declare function runChecks(input: {
  kind: DraftKind;
  draft: unknown;
  brief?: unknown;
  related?: unknown;
  yomiyasu?: { status: CheckStatus; detail?: string } | null;
  playbook: Playbook;
}): CheckReport;
export declare function mustFailures(report: CheckReport): CheckResult[];
export declare function validateSchema(schema: unknown, value: unknown): string[];
export declare function scanHtml(html: string): string[];
export declare const ALLOWED_TAGS: Record<string, string[]>;
export declare const ALLOWED_CSS: string[];
export declare function weightedLength(text: string, urlWeight?: number): number;
export declare function foldIndex(text: string, threshold: number, urlWeight?: number): number;
export declare function hashtags(text: string): string[];
export declare function findUrls(text: string): { url: string; start: number; end: number }[];
export declare function japaneseTexts(value: unknown, key?: string): string[];
