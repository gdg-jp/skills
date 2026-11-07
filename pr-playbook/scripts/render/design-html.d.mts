export type DesignFont = { family: string; file: string; weight: string; stretch?: string };
export declare const DESIGN_FONTS: DesignFont[];
export declare const FONT_FAMILIES: string[];
export declare const ALLOWED_IMAGE_HOSTS: string[];
export declare function fontFaceCss(fontsBase: string): string;
export declare function svgDataUri(svg: string): string;
export declare function resolveUrl(
  value: unknown,
  assets: Record<string, string> | undefined,
  problems: string[],
  what?: string,
): string | null;
export declare function filterCss(
  css: string,
  assets: Record<string, string> | undefined,
  problems: string[],
): string;
export declare function sanitizeDesignHtml(
  html: string,
  assets?: Record<string, string>,
): { body: string; css: string; problems: string[] };
export declare function buildDesignHtml(input: {
  html: string;
  width: number;
  height: number;
  fontsBase: string;
  assets?: Record<string, string>;
  checksScript: string;
  render: {
    thumbnailScale: number;
    minFontPxAtThumbnail: number;
    minContrast: number;
    minContrastLarge?: number;
  };
  safeInset?: number;
}): { html: string; width: number; height: number; problems: string[] };
