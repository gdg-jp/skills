// Types for consumers in TypeScript (the pr Worker). The implementation is image-html.mjs.
export type ImageSlotsSchema = {
  templateId?: string;
  size: { width: number; height: number };
  slots: Record<string, unknown>;
  layoutVars?: unknown;
};
export function buildImageHtml(input: {
  template: string;
  schema: ImageSlotsSchema;
  baseCss: string;
  checksScript: string;
  logoSvg: string;
  slots: Record<string, unknown>;
  layoutVars?: Record<string, unknown>;
  skin?: unknown;
  fonts?: { family: string; url: string; weight?: number }[];
  render: { thumbnailScale: number; minFontPxAtThumbnail: number; minContrast: number };
}): { html: string; width: number; height: number; problems: string[] };
export function readChecks(
  content: string,
): { ruleId: string; status: "pass" | "fail" | "unevaluated"; detail?: string }[] | null;
export function layoutFrom(
  schema: ImageSlotsSchema,
  raw?: unknown,
): { titleScale: number; align: string; emphasis: string[] };
