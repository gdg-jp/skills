// Types for consumers in TypeScript (the pr Worker). The implementation is connpass-page.mjs.
export type ConnpassSection = {
  id: string;
  heading?: string | null;
  slots: Record<string, unknown>;
};
export type ConnpassSkin = {
  name: string;
  bg: string;
  panelBg: string;
  keyline: string;
  accent: string[];
  text: string;
  sticker: string;
};
export const DEFAULT_SKIN: ConnpassSkin;
export function normalizeSkin(raw: unknown): ConnpassSkin;
export function renderConnpassPage(
  page: { sections?: ConnpassSection[]; skin?: unknown; summary?: string },
  templates: Record<string, string>,
): { html: string; warnings: string[] };
