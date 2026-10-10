/**
 * Pure rules of the stays engine (hotels, hostels): nights, nightly rates with
 * seasons and weekends, minimum stay, folio balance and cancellation window.
 * Dates are "YYYY-MM-DD" in the business time zone; nights are [checkIn, checkOut).
 */
import { addDays, weekdayOf } from "@/lib/booking/availability";

export interface StaySettings {
  /** "HH:MM" from which guests can check in */
  checkInTime: string;
  /** "HH:MM" by which guests must leave */
  checkOutTime: string;
  /** % applied to Friday and Saturday nights (can be negative) */
  weekendPct: number;
  minNights: number;
  /** How far ahead guests can book online */
  maxDaysAhead: number;
  /** Web bookings confirmed right away (false = the hotel confirms) */
  autoConfirm: boolean;
  /** Free online cancellation until this many days before arrival */
  cancelDays: number;
  /** Suggested deposit to guarantee a web booking (0 = none) */
  depositPct: number;
}

export const DEFAULT_STAY_SETTINGS: StaySettings = {
  checkInTime: "15:00",
  checkOutTime: "12:00",
  weekendPct: 0,
  minNights: 1,
  maxDaysAhead: 365,
  autoConfirm: true,
  cancelDays: 2,
  depositPct: 30,
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function parseStaySettings(raw: unknown): StaySettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_STAY_SETTINGS;
  return {
    checkInTime: typeof r.checkInTime === "string" && HHMM.test(r.checkInTime) ? r.checkInTime : d.checkInTime,
    checkOutTime: typeof r.checkOutTime === "string" && HHMM.test(r.checkOutTime) ? r.checkOutTime : d.checkOutTime,
    weekendPct: clampInt(r.weekendPct, -90, 300, d.weekendPct),
    minNights: clampInt(r.minNights, 1, 30, d.minNights),
    maxDaysAhead: clampInt(r.maxDaysAhead, 7, 730, d.maxDaysAhead),
    autoConfirm: typeof r.autoConfirm === "boolean" ? r.autoConfirm : d.autoConfirm,
    cancelDays: clampInt(r.cancelDays, 0, 60, d.cancelDays),
    depositPct: clampInt(r.depositPct, 0, 100, d.depositPct),
  };
}

export interface RateSeason {
  id?: string;
  name: string;
  /** null = applies to every room type */
  itemId: string | null;
  startsOn: string;
  /** inclusive */
  endsOn: string;
  adjustmentPct: number;
  minNights: number | null;
}

export interface NightRate {
  date: string;
  price: number;
  season: string | null;
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Number of nights between two dates (0 when invalid). */
export function nightsCount(checkIn: string, checkOut: string) {
  if (!DATE_RE.test(checkIn) || !DATE_RE.test(checkOut)) return 0;
  const ms = Date.parse(`${checkOut}T12:00:00Z`) - Date.parse(`${checkIn}T12:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000));
}

/** Each night of the stay ("2026-12-24" = the night from the 24th to the 25th). */
export function nightsBetween(checkIn: string, checkOut: string): string[] {
  const n = nightsCount(checkIn, checkOut);
  return Array.from({ length: n }, (_, i) => addDays(checkIn, i));
}

/** Season for a night: one set for this room type beats a general one. */
function seasonFor(date: string, itemId: string, seasons: RateSeason[]) {
  const live = seasons.filter((s) => s.startsOn <= date && date <= s.endsOn);
  return live.find((s) => s.itemId === itemId) ?? live.find((s) => s.itemId === null) ?? null;
}

const roundPrice = (n: number) => Math.max(0, Math.round(n / 100) * 100);

/** Price of every night: base × season % × weekend % (Friday and Saturday nights). */
export function nightlyRates(opts: {
  basePrice: number;
  itemId: string;
  checkIn: string;
  checkOut: string;
  seasons: RateSeason[];
  settings: StaySettings;
}): NightRate[] {
  return nightsBetween(opts.checkIn, opts.checkOut).map((date) => {
    const season = seasonFor(date, opts.itemId, opts.seasons);
    const day = weekdayOf(date);
    const weekend = day === "fri" || day === "sat" ? opts.settings.weekendPct : 0;
    const factor = (1 + (season?.adjustmentPct ?? 0) / 100) * (1 + weekend / 100);
    return { date, price: roundPrice(opts.basePrice * factor), season: season?.name ?? null };
  });
}

export const sumNights = (nights: { price: number }[]) => nights.reduce((acc, n) => acc + n.price, 0);

/** Minimum stay that applies to a booking: the strictest among its nights' seasons. */
export function requiredMinNights(itemId: string, checkIn: string, checkOut: string, seasons: RateSeason[], settings: StaySettings) {
  let min = settings.minNights;
  for (const date of nightsBetween(checkIn, checkOut)) {
    const s = seasonFor(date, itemId, seasons);
    if (s?.minNights && s.minNights > min) min = s.minNights;
  }
  return min;
}

/** Validates dates for an online booking. Returns an error message or null. */
export function validateStayDates(checkIn: string, checkOut: string, today: string, settings: StaySettings): string | null {
  if (!DATE_RE.test(checkIn) || !DATE_RE.test(checkOut)) return "Elige las fechas de llegada y salida";
  if (checkIn < today) return "La fecha de llegada ya pasó";
  if (checkOut <= checkIn) return "La salida debe ser después de la llegada";
  if (checkIn > addDays(today, settings.maxDaysAhead)) return `Recibimos reservas hasta ${settings.maxDaysAhead} días antes`;
  if (nightsCount(checkIn, checkOut) > 60) return "Para estadías de más de 60 noches escríbenos directamente";
  return null;
}

export interface Folio {
  room: number;
  extras: number;
  total: number;
  paid: number;
  balance: number;
}

export function folio(roomTotal: number, charges: { amount: number }[], payments: { amount: number }[]): Folio {
  const extras = charges.reduce((a, c) => a + Number(c.amount), 0);
  const paid = payments.reduce((a, p) => a + Number(p.amount), 0);
  const total = Number(roomTotal) + extras;
  return { room: Number(roomTotal), extras, total, paid, balance: total - paid };
}

/** Suggested deposit for a web booking. */
export const depositFor = (total: number, settings: StaySettings) => roundPrice((total * settings.depositPct) / 100);

/** Guests can cancel online until `cancelDays` days before arrival. */
export const canCancelOnline = (checkIn: string, today: string, settings: StaySettings) =>
  nightsCount(today, checkIn) >= settings.cancelDays;

/** Live statuses hold the room; the rest free it. */
export const HOLDS_ROOM = ["pending", "confirmed", "checked_in"] as const;

export const STAY_STATUS_LABELS: Record<string, string> = {
  pending: "Por confirmar",
  confirmed: "Confirmada",
  checked_in: "En casa",
  checked_out: "Salió",
  cancelled: "Cancelada",
  no_show: "No llegó",
};

export const HOUSEKEEPING_LABELS: Record<string, string> = {
  clean: "Limpia",
  dirty: "Por limpiar",
  inspected: "Revisada",
  maintenance: "Mantenimiento",
};

/** Short human code for a booking, e.g. "H-4K7Q2". */
export function newStayCode(random: () => number = Math.random) {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 5; i++) code += alphabet[Math.floor(random() * alphabet.length)];
  return `H-${code}`;
}

/** Occupancy of a night: rooms with a live stay / active rooms. */
export function occupancyPct(occupied: number, rooms: number) {
  return rooms > 0 ? Math.round((occupied / rooms) * 100) : 0;
}
