import { describe, expect, it } from "vitest";
import {
  DEFAULT_STAY_SETTINGS,
  canCancelOnline,
  folio,
  nightlyRates,
  nightsBetween,
  nightsCount,
  parseStaySettings,
  requiredMinNights,
  sumNights,
  validateStayDates,
  type RateSeason,
} from "./pricing";

const settings = { ...DEFAULT_STAY_SETTINGS };

describe("nights", () => {
  it("counts nights between check-in and check-out", () => {
    expect(nightsCount("2026-12-30", "2027-01-02")).toBe(3);
    expect(nightsBetween("2026-12-30", "2027-01-02")).toEqual(["2026-12-30", "2026-12-31", "2027-01-01"]);
    expect(nightsCount("2026-12-30", "2026-12-30")).toBe(0);
    expect(nightsCount("bad", "2026-12-30")).toBe(0);
  });
});

describe("nightlyRates", () => {
  const seasons: RateSeason[] = [
    { name: "Temporada alta", itemId: null, startsOn: "2026-12-15", endsOn: "2027-01-15", adjustmentPct: 30, minNights: 3 },
    { name: "Fin de año suite", itemId: "suite", startsOn: "2026-12-30", endsOn: "2027-01-01", adjustmentPct: 50, minNights: null },
  ];

  it("applies base price outside seasons and weekend % on Friday/Saturday nights", () => {
    // 2026-11-05 is Thursday → Thu, Fri, Sat nights
    const rates = nightlyRates({ basePrice: 200000, itemId: "std", checkIn: "2026-11-05", checkOut: "2026-11-08", seasons, settings: { ...settings, weekendPct: 10 } });
    expect(rates.map((r) => r.price)).toEqual([200000, 220000, 220000]);
    expect(rates.every((r) => r.season === null)).toBe(true);
  });

  it("uses the room-type season over the general one", () => {
    const std = nightlyRates({ basePrice: 100000, itemId: "std", checkIn: "2026-12-30", checkOut: "2027-01-01", seasons, settings });
    const suite = nightlyRates({ basePrice: 100000, itemId: "suite", checkIn: "2026-12-30", checkOut: "2027-01-01", seasons, settings });
    expect(sumNights(std)).toBe(260000);
    expect(sumNights(suite)).toBe(300000);
    expect(suite[0].season).toBe("Fin de año suite");
  });

  it("rounds to hundreds", () => {
    const [n] = nightlyRates({ basePrice: 45333, itemId: "x", checkIn: "2026-11-02", checkOut: "2026-11-03", seasons: [], settings });
    expect(n.price).toBe(45300);
  });

  it("takes the strictest minimum stay", () => {
    expect(requiredMinNights("std", "2026-11-02", "2026-11-03", seasons, settings)).toBe(1);
    expect(requiredMinNights("std", "2026-12-14", "2026-12-16", seasons, settings)).toBe(3);
  });
});

describe("validation and folio", () => {
  it("rejects past, inverted, too-far or too-long stays", () => {
    const today = "2026-10-10";
    expect(validateStayDates("2026-10-09", "2026-10-11", today, settings)).toMatch(/pasó/);
    expect(validateStayDates("2026-10-12", "2026-10-12", today, settings)).toMatch(/después/);
    expect(validateStayDates("2028-01-01", "2028-01-02", today, settings)).toMatch(/365/);
    expect(validateStayDates("2026-10-12", "2027-01-12", today, settings)).toMatch(/60 noches/);
    expect(validateStayDates("2026-10-10", "2026-10-11", today, settings)).toBeNull();
  });

  it("computes the balance with extras and payments", () => {
    expect(folio(500000, [{ amount: 35000 }, { amount: 12000 }], [{ amount: 150000 }])).toEqual({
      room: 500000, extras: 47000, total: 547000, paid: 150000, balance: 397000,
    });
  });

  it("allows online cancellation only before the window", () => {
    expect(canCancelOnline("2026-10-13", "2026-10-10", settings)).toBe(true);
    expect(canCancelOnline("2026-10-11", "2026-10-10", settings)).toBe(false);
  });

  it("parses settings defensively", () => {
    const s = parseStaySettings({ checkInTime: "25:00", weekendPct: "15", minNights: 0, autoConfirm: false });
    expect(s.checkInTime).toBe("15:00");
    expect(s.weekendPct).toBe(15);
    expect(s.minNights).toBe(1);
    expect(s.autoConfirm).toBe(false);
  });
});
