import type { Page } from "../schema/page.js";

export interface ThemeTokens {
  bg: string;
  fg: string;
  accent: string;
  accentFg: string;
  border: string;
  radius: string;
  space1: string;
  space2: string;
  space3: string;
  space4: string;
  space5: string;
  font: string;
}

export type ResolvedTheme = {
  tokens: ThemeTokens;
  cssVars: Record<string, string>;
};

const DEFAULT_TOKENS: ThemeTokens = {
  bg: "#ffffff",
  fg: "#1a1a1a",
  accent: "#2E86DE",
  accentFg: "#ffffff",
  border: "#e4e4e7",
  radius: "8px",
  space1: "4px",
  space2: "8px",
  space3: "12px",
  space4: "16px",
  space5: "24px",
  font: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
};

export function resolveTheme(
  page: Page,
  override: Partial<ThemeTokens> = {},
): ResolvedTheme {
  const accent = override.accent ?? page.theme?.accent ?? page.main_color ?? DEFAULT_TOKENS.accent;
  const bg = override.bg ?? page.theme?.background ?? DEFAULT_TOKENS.bg;
  const fg = override.fg ?? page.theme?.foreground ?? DEFAULT_TOKENS.fg;
  const accentFg = override.accentFg ?? contrastFg(accent);
  const border = override.border ?? DEFAULT_TOKENS.border;

  const tokens: ThemeTokens = {
    ...DEFAULT_TOKENS,
    ...override,
    accent,
    bg,
    fg,
    accentFg,
    border,
  };

  const cssVars: Record<string, string> = {
    "--au-bg": tokens.bg,
    "--au-fg": tokens.fg,
    "--au-accent": tokens.accent,
    "--au-accent-fg": tokens.accentFg,
    "--au-border": tokens.border,
    "--au-radius": tokens.radius,
    "--au-space-1": tokens.space1,
    "--au-space-2": tokens.space2,
    "--au-space-3": tokens.space3,
    "--au-space-4": tokens.space4,
    "--au-space-5": tokens.space5,
    "--au-font": tokens.font,
    "--au-accent-hover": shade(tokens.accent, -0.1),
    "--au-accent-soft": shade(tokens.accent, 0.85),
  };

  return { tokens, cssVars };
}

function contrastFg(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return lum > 0.6 ? "#1a1a1a" : "#ffffff";
}

/**
 * Adjust a hex color toward black (negative amt) or white (positive amt).
 * amt in [-1, 1].
 */
function shade(hex: string, amt: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const target = amt < 0 ? 0 : 255;
  const a = Math.abs(amt);
  const r = Math.round(rgb.r + (target - rgb.r) * a);
  const g = Math.round(rgb.g + (target - rgb.g) * a);
  const b = Math.round(rgb.b + (target - rgb.b) * a);
  return rgbToHex(r, g, b);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length !== 6 && h.length !== 8) return null;
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (x: number) => x.toString(16).padStart(2, "0");
  return `#${c(clamp(r))}${c(clamp(g))}${c(clamp(b))}`;
}

function clamp(x: number): number {
  return Math.max(0, Math.min(255, x));
}
