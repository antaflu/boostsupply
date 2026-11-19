import type { TweakConfig } from "./types";

/* Tiny typed getters so previews/generators stay readable. */

export const str = (c: TweakConfig, k: string, fb = ""): string =>
  typeof c[k] === "string" ? (c[k] as string) : fb;

export const num = (c: TweakConfig, k: string, fb = 0): number =>
  typeof c[k] === "number" ? (c[k] as number) : fb;

export const bool = (c: TweakConfig, k: string, fb = false): boolean =>
  typeof c[k] === "boolean" ? (c[k] as boolean) : fb;

export const list = (c: TweakConfig, k: string): Record<string, string>[] =>
  Array.isArray(c[k]) ? (c[k] as Record<string, string>[]) : [];

/** Resolve a font key into a CSS font-family stack. */
export const fontStack = (font: string): string => {
  switch (font) {
    case "inherit":
      return "inherit";
    case "system":
      return "ui-sans-serif, system-ui, -apple-system, sans-serif";
    case "serif":
      return "'Times New Roman', Georgia, serif";
    case "mono":
      return "ui-monospace, 'SF Mono', Menlo, monospace";
    case "rounded":
      return "'SF Pro Rounded', ui-rounded, 'Hiragino Maru Gothic ProN', sans-serif";
    case "custom":
      return "'BS Custom Font', var(--font-geist-sans), sans-serif";
    default:
      return "var(--font-geist-sans), system-ui, sans-serif";
  }
};

/** HTML-escape user strings before embedding into Liquid output. */
export const esc = (s: string): string =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
