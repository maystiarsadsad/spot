import { describe, expect, it } from "vitest";
import {
  ageBucket,
  costBasis,
  DEFAULT_DEALER_SETTINGS as S,
  daysBetween,
  floorPrice,
  isValidPlate,
  marginPct,
  markdownAdvice,
  normalizePlate,
  parseDealerSettings,
  stockSummary,
} from "./pricing";

describe("plates", () => {
  it("normalizes and validates", () => {
    expect(normalizePlate("abc 12d")).toBe("ABC12D");
    expect(normalizePlate("ABC-123")).toBe("ABC123");
    expect(isValidPlate("abc12d")).toBe(true);
    expect(isValidPlate("ab")).toBe(false);
    expect(isValidPlate("")).toBe(false);
  });
});

describe("aging", () => {
  it("counts days and buckets them", () => {
    expect(daysBetween("2026-10-01", "2026-10-19")).toBe(18);
    expect(daysBetween("2026-10-19", "2026-10-01")).toBe(0);
    expect(ageBucket(0)).toBe("0-30");
    expect(ageBucket(30)).toBe("0-30");
    expect(ageBucket(31)).toBe("31-60");
    expect(ageBucket(90)).toBe("61-90");
    expect(ageBucket(91)).toBe("90+");
  });
});

describe("cost and margin", () => {
  it("adds reconditioning to the purchase price", () => {
    expect(costBasis(8_000_000, [{ amount: 300_000 }, { amount: 150_000 }])).toBe(8_450_000);
    expect(costBasis(8_000_000, [])).toBe(8_000_000);
  });
  it("computes margin on price", () => {
    expect(marginPct(10_000_000, 8_000_000)).toBeCloseTo(20);
    expect(marginPct(null, 8_000_000)).toBeNull();
    expect(marginPct(7_000_000, 8_000_000)).toBeLessThan(0);
  });
  it("floor is cost + min margin, or the manual minimum if higher", () => {
    expect(floorPrice(8_000_000, S)).toBe(8_400_000);
    expect(floorPrice(8_000_000, S, 9_000_000)).toBe(9_000_000);
    expect(floorPrice(8_000_000, S, 8_100_000)).toBe(8_400_000);
  });
});

describe("markdown advice", () => {
  const cost = 8_000_000; // floor 8.400.000
  it("holds before the first step", () => {
    expect(markdownAdvice(10_000_000, cost, 44, S)).toMatchObject({ action: "hold", steps: 0, suggestedPrice: 10_000_000 });
  });
  it("lowers in steps after the threshold", () => {
    expect(markdownAdvice(10_000_000, cost, 45, S)).toMatchObject({ action: "lower", steps: 1, suggestedPrice: 9_700_000 });
    const second = markdownAdvice(10_000_000, cost, 60, S);
    expect(second.steps).toBe(2);
    expect(second.suggestedPrice).toBe(9_400_000); // 10M * 0.97^2 = 9.409M, rounded down to 50k
  });
  it("never goes below the floor and then flags at_floor", () => {
    const a = markdownAdvice(10_000_000, cost, 400, S);
    expect(a.action).toBe("at_floor");
    expect(a.suggestedPrice).toBe(8_400_000);
    expect(a.margin).toBeCloseTo(4.76, 1);
  });
  it("respects a manual minimum price", () => {
    expect(markdownAdvice(10_000_000, cost, 400, S, 9_000_000).suggestedPrice).toBe(9_000_000);
  });
  it("is at_floor when the list price is already at or below the floor", () => {
    expect(markdownAdvice(8_300_000, cost, 50, S)).toMatchObject({ action: "at_floor", suggestedPrice: 8_300_000 });
  });
  it("holds without a list price", () => {
    expect(markdownAdvice(null, cost, 100, S)).toMatchObject({ action: "hold", suggestedPrice: null });
  });
});

describe("settings", () => {
  it("falls back to defaults and clamps garbage", () => {
    expect(parseDealerSettings(null)).toEqual(S);
    expect(parseDealerSettings({ stepPct: "abc", everyDays: -5 })).toEqual(S);
    expect(parseDealerSettings({ markdownAfterDays: 30, stepPct: 5 })).toMatchObject({ markdownAfterDays: 30, stepPct: 5, everyDays: 15 });
  });
});

describe("stock summary", () => {
  it("adds up capital and aging", () => {
    const s = stockSummary(
      [
        { acquiredOn: "2026-10-10", cost: 5_000_000, listPrice: 6_000_000 },
        { acquiredOn: "2026-07-01", cost: 7_000_000, listPrice: 8_000_000 },
      ],
      "2026-10-19"
    );
    expect(s.units).toBe(2);
    expect(s.capitalTied).toBe(12_000_000);
    expect(s.askingValue).toBe(14_000_000);
    expect(s.byBucket["0-30"].units).toBe(1);
    expect(s.byBucket["90+"]).toEqual({ units: 1, capital: 7_000_000 });
    expect(s.avgDays).toBe(Math.round((9 + 110) / 2));
  });
  it("handles empty stock", () => {
    expect(stockSummary([], "2026-10-19")).toMatchObject({ units: 0, capitalTied: 0, avgDays: 0 });
  });
});
