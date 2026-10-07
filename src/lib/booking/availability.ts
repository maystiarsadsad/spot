/**
 * Appointment availability — pure, time-zone aware.
 * Free slots come from each professional's weekly hours minus their
 * appointments and time off, following the business booking rules.
 */

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Lunes", tue: "Martes", wed: "Miércoles", thu: "Jueves", fri: "Viernes", sat: "Sábado", sun: "Domingo",
};

export interface TimeRange { start: string; end: string } // "HH:MM"
export type WeeklySchedule = Record<DayKey, TimeRange[]>;

export interface BookingSettings {
  /** Minutes between possible start times */
  slotStep: number;
  /** Earliest bookable time from now */
  minNoticeMinutes: number;
  /** How far ahead customers can book */
  maxDaysAhead: number;
  /** Free minutes kept after each appointment */
  bufferMinutes: number;
  /** Web bookings start confirmed (otherwise pending) */
  autoConfirm: boolean;
  /** Customers can cancel online until this many hours before */
  cancelHours: number;
}

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  slotStep: 15,
  minNoticeMinutes: 60,
  maxDaysAhead: 30,
  bufferMinutes: 0,
  autoConfirm: true,
  cancelHours: 2,
};

const clamp = (v: unknown, lo: number, hi: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};

export function parseBookingSettings(raw: unknown): BookingSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_BOOKING_SETTINGS;
  return {
    slotStep: [5, 10, 15, 20, 30, 60].includes(Number(r.slotStep)) ? Number(r.slotStep) : d.slotStep,
    minNoticeMinutes: clamp(r.minNoticeMinutes, 0, 7 * 24 * 60, d.minNoticeMinutes),
    maxDaysAhead: clamp(r.maxDaysAhead, 1, 180, d.maxDaysAhead),
    bufferMinutes: clamp(r.bufferMinutes, 0, 120, d.bufferMinutes),
    autoConfirm: typeof r.autoConfirm === "boolean" ? r.autoConfirm : d.autoConfirm,
    cancelHours: clamp(r.cancelHours, 0, 168, d.cancelHours),
  };
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const minToHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Sanitizes employees.schedule (drops malformed or inverted ranges, sorts, merges overlaps). */
export function parseSchedule(raw: unknown): WeeklySchedule {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = {} as WeeklySchedule;
  for (const day of DAY_KEYS) {
    const ranges = (Array.isArray(r[day]) ? r[day] : []) as TimeRange[];
    const clean = ranges
      .filter((x) => x && HHMM.test(x.start) && HHMM.test(x.end) && toMin(x.end) > toMin(x.start))
      .sort((a, b) => toMin(a.start) - toMin(b.start));
    const merged: TimeRange[] = [];
    for (const x of clean) {
      const last = merged[merged.length - 1];
      if (last && toMin(x.start) <= toMin(last.end)) {
        if (toMin(x.end) > toMin(last.end)) last.end = x.end;
      } else merged.push({ ...x });
    }
    out[day] = merged.slice(0, 6);
  }
  return out;
}

export const hasAnyHours = (s: WeeklySchedule) => DAY_KEYS.some((d) => s[d].length > 0);

/* ── time zones ──────────────────────────────────────── */

function offsetMinutes(at: Date, timeZone: string) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = name.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0;
}

/** Wall-clock date + time in a zone → UTC instant. */
export function zonedToUtc(date: string, time: string, timeZone: string) {
  const [y, mo, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, mo - 1, d, toMin(time) / 60 | 0, toMin(time) % 60);
  let utc = guess - offsetMinutes(new Date(guess), timeZone) * 60_000;
  utc = guess - offsetMinutes(new Date(utc), timeZone) * 60_000; // second pass for DST edges
  return new Date(utc);
}

/** "YYYY-MM-DD" of an instant in a zone. */
export const localDate = (at: Date, timeZone: string) => at.toLocaleDateString("en-CA", { timeZone });
/** "HH:MM" of an instant in a zone. */
export const localTime = (at: Date, timeZone: string) =>
  at.toLocaleTimeString("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false });

/** Weekday of a calendar date (independent of zone). */
export const weekdayOf = (date: string): DayKey => {
  const js = new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  return DAY_KEYS[(js + 6) % 7];
};

export const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/* ── slots ───────────────────────────────────────────── */

export interface Interval { start: Date; end: Date }

export interface StaffInput {
  id: string;
  schedule: WeeklySchedule;
  /** Active appointments and time off overlapping the day */
  busy: Interval[];
}

export interface Slot {
  /** ISO instant */
  start: string;
  end: string;
  /** "HH:MM" local */
  label: string;
  /** Professionals free at that time */
  staffIds: string[];
}

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

export function computeSlots(opts: {
  date: string;
  timeZone: string;
  durationMinutes: number;
  staff: StaffInput[];
  settings: BookingSettings;
  now?: Date;
}): Slot[] {
  const { date, timeZone, durationMinutes, staff, settings } = opts;
  const now = opts.now ?? new Date();
  const earliest = new Date(now.getTime() + settings.minNoticeMinutes * 60_000);
  const lastDay = addDays(localDate(now, timeZone), settings.maxDaysAhead);
  if (date < localDate(now, timeZone) || date > lastDay || durationMinutes <= 0) return [];

  const day = weekdayOf(date);
  const bySlot = new Map<string, Slot>();
  const buffer = settings.bufferMinutes * 60_000;

  for (const person of staff) {
    for (const range of person.schedule[day] ?? []) {
      const open = toMin(range.start);
      const close = toMin(range.end);
      for (let m = open; m + durationMinutes <= close; m += settings.slotStep) {
        const start = zonedToUtc(date, minToHHMM(m), timeZone);
        if (start < earliest) continue;
        const end = new Date(start.getTime() + durationMinutes * 60_000);
        // Keep the buffer free after this appointment and after existing ones
        const candidate = { start, end: new Date(end.getTime() + buffer) };
        const clash = person.busy.some((b) => overlaps(candidate, { start: b.start, end: new Date(b.end.getTime() + buffer) }));
        if (clash) continue;
        const key = start.toISOString();
        const slot = bySlot.get(key) ?? { start: key, end: end.toISOString(), label: minToHHMM(m), staffIds: [] };
        slot.staffIds.push(person.id);
        bySlot.set(key, slot);
      }
    }
  }
  return [...bySlot.values()].sort((a, b) => a.start.localeCompare(b.start));
}

/** "Cualquiera disponible": the least busy professional that day keeps the agenda balanced. */
export function pickStaff(candidates: string[], staff: StaffInput[]) {
  const load = (id: string) =>
    (staff.find((s) => s.id === id)?.busy ?? []).reduce((sum, b) => sum + (b.end.getTime() - b.start.getTime()), 0);
  return [...candidates].sort((a, b) => load(a) - load(b))[0] ?? null;
}

/** Calendar dates (within the horizon) where at least one professional works. */
export function bookableDates(schedules: WeeklySchedule[], timeZone: string, settings: BookingSettings, now = new Date()) {
  const today = localDate(now, timeZone);
  const out: string[] = [];
  for (let i = 0; i <= settings.maxDaysAhead; i++) {
    const date = addDays(today, i);
    if (schedules.some((s) => s[weekdayOf(date)].length > 0)) out.push(date);
  }
  return out;
}
