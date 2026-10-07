import { describe, expect, it } from "vitest";
import {
  bookableDates,
  computeSlots,
  DEFAULT_BOOKING_SETTINGS,
  parseBookingSettings,
  parseSchedule,
  pickStaff,
  weekdayOf,
  zonedToUtc,
  type StaffInput,
} from "./availability";

const TZ = "America/Bogota"; // UTC-5, no DST
const DATE = "2026-10-08"; // Thursday
// 7:00 a.m. Bogotá on the same day
const NOW = new Date("2026-10-08T12:00:00Z");

const week = (ranges: { start: string; end: string }[]) =>
  parseSchedule({ mon: ranges, tue: ranges, wed: ranges, thu: ranges, fri: ranges, sat: ranges });

const settings = { ...DEFAULT_BOOKING_SETTINGS, slotStep: 30, minNoticeMinutes: 60 };

describe("time zones", () => {
  it("converts Bogotá wall time to UTC", () => {
    expect(zonedToUtc(DATE, "09:00", TZ).toISOString()).toBe("2026-10-08T14:00:00.000Z");
  });
  it("knows the weekday of a date", () => {
    expect(weekdayOf(DATE)).toBe("thu");
    expect(weekdayOf("2026-10-11")).toBe("sun");
  });
});

describe("parseSchedule", () => {
  it("drops invalid ranges and merges overlaps", () => {
    const s = parseSchedule({ mon: [{ start: "14:00", end: "18:00" }, { start: "09:00", end: "15:00" }, { start: "20:00", end: "19:00" }, { start: "x", end: "y" }] });
    expect(s.mon).toEqual([{ start: "09:00", end: "18:00" }]);
    expect(s.sun).toEqual([]);
  });
});

describe("parseBookingSettings", () => {
  it("clamps values and falls back to defaults", () => {
    expect(parseBookingSettings({ slotStep: 7, maxDaysAhead: 999, autoConfirm: false })).toMatchObject({ slotStep: 15, maxDaysAhead: 180, autoConfirm: false });
  });
});

describe("computeSlots", () => {
  const ana: StaffInput = { id: "ana", schedule: week([{ start: "09:00", end: "12:00" }]), busy: [] };
  const beto: StaffInput = {
    id: "beto",
    schedule: week([{ start: "10:00", end: "12:00" }]),
    // 10:30–11:30 already booked
    busy: [{ start: zonedToUtc(DATE, "10:30", TZ), end: zonedToUtc(DATE, "11:30", TZ) }],
  };

  it("lists start times where the whole service fits", () => {
    const slots = computeSlots({ date: DATE, timeZone: TZ, durationMinutes: 60, staff: [ana], settings, now: NOW });
    expect(slots.map((s) => s.label)).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
    expect(slots[0].start).toBe("2026-10-08T14:00:00.000Z");
  });

  it("skips busy time and combines professionals", () => {
    const slots = computeSlots({ date: DATE, timeZone: TZ, durationMinutes: 30, staff: [ana, beto], settings, now: NOW });
    const at = (label: string) => slots.find((s) => s.label === label)?.staffIds;
    expect(at("10:00")).toEqual(["ana", "beto"]);
    expect(at("10:30")).toEqual(["ana"]); // beto busy
    expect(at("11:30")).toEqual(["ana", "beto"]);
  });

  it("respects minimum notice and the buffer after appointments", () => {
    const now = new Date("2026-10-08T14:10:00Z"); // 9:10 a.m.
    const slots = computeSlots({ date: DATE, timeZone: TZ, durationMinutes: 30, staff: [beto], settings: { ...settings, bufferMinutes: 15 }, now });
    // 10:00 ends 10:30 + 15 buffer → clashes with 10:30; 11:30 is 0 min after 11:30 end + buffer → clash
    expect(slots.map((s) => s.label)).toEqual([]);
    const later = computeSlots({ date: DATE, timeZone: TZ, durationMinutes: 15, staff: [beto], settings: { ...settings, slotStep: 15, bufferMinutes: 15 }, now });
    // 10:00 is before now + 60 min notice; 10:15 would end 10:30 + buffer; busy until 11:30 + 15 buffer
    expect(later.map((s) => s.label)).toEqual(["11:45"]);
  });

  it("returns nothing for past days, days off or beyond the horizon", () => {
    expect(computeSlots({ date: "2026-10-07", timeZone: TZ, durationMinutes: 30, staff: [ana], settings, now: NOW })).toEqual([]);
    expect(computeSlots({ date: "2026-10-11", timeZone: TZ, durationMinutes: 30, staff: [ana], settings, now: NOW })).toEqual([]);
    expect(computeSlots({ date: "2027-01-30", timeZone: TZ, durationMinutes: 30, staff: [ana], settings, now: NOW })).toEqual([]);
  });
});

describe("pickStaff / bookableDates", () => {
  it("assigns the least busy professional", () => {
    const busyAna: StaffInput = { id: "ana", schedule: week([]), busy: [{ start: new Date(0), end: new Date(3_600_000) }] };
    const freeBeto: StaffInput = { id: "beto", schedule: week([]), busy: [] };
    expect(pickStaff(["ana", "beto"], [busyAna, freeBeto])).toBe("beto");
  });
  it("only offers days somebody works", () => {
    const dates = bookableDates([week([{ start: "09:00", end: "12:00" }])], TZ, { ...settings, maxDaysAhead: 6 }, NOW);
    expect(dates).toEqual(["2026-10-08", "2026-10-09", "2026-10-10", "2026-10-12", "2026-10-13", "2026-10-14"]);
  });
});
