import { describe, expect, it } from "vitest";
import { cn, contrastRatio, ensureContrast, formatCurrency, HEX_COLOR, readableTextColor } from "./utils";

describe("contrastRatio", () => {
  it("is 21:1 for black on white and 1:1 for identical colors", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#336699", "#336699")).toBeCloseTo(1, 5);
  });

  it("returns 1 for malformed input instead of throwing", () => {
    expect(contrastRatio("nope", "#ffffff")).toBe(1);
  });
});

describe("ensureContrast", () => {
  const DARK_BG = "#15140f";
  const LIGHT_BG = "#fdfaf2";

  it("returns the color untouched when it already passes", () => {
    expect(ensureContrast("#ff7a44", DARK_BG, 3)).toBe("#ff7a44");
  });

  it("lightens a too-dark brand color on a dark background until it passes", () => {
    const adjusted = ensureContrast("#3641d9", DARK_BG, 3);
    expect(adjusted).not.toBe("#3641d9");
    expect(contrastRatio(adjusted, DARK_BG)).toBeGreaterThanOrEqual(3);
  });

  it("darkens a too-light brand color on a light background until it passes", () => {
    const adjusted = ensureContrast("#ffe066", LIGHT_BG, 3);
    expect(contrastRatio(adjusted, LIGHT_BG)).toBeGreaterThanOrEqual(3);
  });

  it("leaves invalid input alone", () => {
    expect(ensureContrast("not-a-color", DARK_BG, 3)).toBe("not-a-color");
  });
});

describe("HEX_COLOR", () => {
  it("only accepts #rrggbb", () => {
    expect(HEX_COLOR.test("#3641d9")).toBe(true);
    expect(HEX_COLOR.test("3641d9")).toBe(false);
    expect(HEX_COLOR.test("red; background:url(x)")).toBe(false);
  });
});

describe("cn", () => {
  it("merges class names and resolves Tailwind conflicts", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });
});

describe("formatCurrency", () => {
  it("formats COP with no decimals by default", () => {
    // Intl.NumberFormat separates the symbol with a non-breaking space (U+00A0).
    expect(formatCurrency(15000)).toBe("$ 15.000");
  });

  it("formats a different currency when passed explicitly", () => {
    expect(formatCurrency(15000, "USD")).toContain("15.000");
  });
});

describe("readableTextColor", () => {
  it("picks dark ink text on a light/pastel background", () => {
    expect(readableTextColor("#ffe7a8")).toBe("#15140f");
  });

  it("picks white text on a dark background", () => {
    expect(readableTextColor("#15140f")).toBe("#ffffff");
  });

  it("picks the token that wins the higher contrast ratio, not a fixed 50% threshold", () => {
    // This is the accent orange this app used to hardcode white text on —
    // it reads better with dark ink (~5.9:1) than white (~3.1:1).
    expect(readableTextColor("#ff5b1f")).toBe("#15140f");
  });

  it("falls back to white for a malformed hex value", () => {
    expect(readableTextColor("not-a-color")).toBe("#ffffff");
  });

  it("accepts hex values without a leading #", () => {
    expect(readableTextColor("15140f")).toBe("#ffffff");
  });
});
