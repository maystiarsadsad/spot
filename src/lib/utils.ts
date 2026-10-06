import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "COP") {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Picks black or white text for readable contrast against an arbitrary
 * background color (e.g. a user-chosen brand color). Uses WCAG relative
 * luminance rather than a fixed "always white" assumption, which fails on
 * light/pastel picks.
 */
export function readableTextColor(hex: string): "#15140f" | "#ffffff" {
  const rgb = parseHex(hex);
  if (!rgb) return "#ffffff";
  const luminance = relativeLuminance(rgb);
  // Contrast of white vs. ink text against this background — pick whichever wins.
  const whiteContrast = 1.05 / (luminance + 0.05);
  const inkContrast = (luminance + 0.05) / 0.05;
  return inkContrast > whiteContrast ? "#15140f" : "#ffffff";
}

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

type RGB = [number, number, number];

function parseHex(hex: string): RGB | null {
  const clean = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16)) as RGB;
}

function toHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

function relativeLuminance([r, g, b]: RGB): number {
  const [rl, gl, bl] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const a = parseHex(hexA);
  const b = parseHex(hexB);
  if (!a || !b) return 1;
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Nudges a color toward white (on a dark background) or black (on a light one)
 * until it reaches `min` contrast against that background, keeping its hue.
 * Colors that already pass are returned unchanged. Used to make a user-chosen
 * brand color usable as text/icon/fill in both themes.
 */
export function ensureContrast(hex: string, backgroundHex: string, min: number): string {
  const color = parseHex(hex);
  const bg = parseHex(backgroundHex);
  if (!color || !bg) return hex;
  if (contrastRatio(hex, backgroundHex) >= min) return hex;
  const target: RGB = relativeLuminance(bg) < 0.5 ? [255, 255, 255] : [0, 0, 0];
  for (let step = 1; step <= 25; step++) {
    const t = step * 0.04;
    const mixed = color.map((c, i) => c + (target[i] - c) * t) as RGB;
    const candidate = toHex(mixed);
    if (contrastRatio(candidate, backgroundHex) >= min) return candidate;
  }
  return toHex(target);
}
