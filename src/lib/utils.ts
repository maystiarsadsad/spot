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
  const clean = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return "#ffffff";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16) / 255);
  const [rl, gl, bl] = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  const luminance = 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
  // Contrast of white vs. ink text against this background — pick whichever wins.
  const whiteContrast = 1.05 / (luminance + 0.05);
  const inkContrast = (luminance + 0.05) / 0.05;
  return inkContrast > whiteContrast ? "#15140f" : "#ffffff";
}
