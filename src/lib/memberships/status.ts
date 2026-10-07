/**
 * Membership rules — pure. Dates are local calendar dates "YYYY-MM-DD"
 * in the business time zone; a plan covers starts_on..ends_on inclusive.
 */
import { addDays } from "@/lib/booking/availability";

/** "Por vencer" window */
export const EXPIRING_DAYS = 5;

export type MemberState =
  | "active" // covers today
  | "expiring" // covers today and ends within EXPIRING_DAYS
  | "no_sessions" // punch card used up
  | "scheduled" // paid, starts later
  | "pending" // signed up online, not paid yet
  | "expired"
  | "cancelled"
  | "none";

export interface MembershipLike {
  status: string;
  starts_on: string;
  ends_on: string;
  sessions_total: number | null;
  sessions_used: number;
}

export const daysBetween = (from: string, to: string) =>
  Math.round((Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10)) - Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10))) / 86_400_000);

/** Days left including today (ends today → 1). */
export const daysLeft = (m: MembershipLike, today: string) => Math.max(0, daysBetween(today, m.ends_on) + 1);

export const sessionsLeft = (m: MembershipLike) =>
  m.sessions_total == null ? null : Math.max(0, m.sessions_total - m.sessions_used);

export function membershipState(m: MembershipLike | null | undefined, today: string): MemberState {
  if (!m) return "none";
  if (m.status === "cancelled") return "cancelled";
  if (m.status === "pending") return "pending";
  if (today < m.starts_on) return "scheduled";
  if (today > m.ends_on) return "expired";
  if (sessionsLeft(m) === 0) return "no_sessions";
  return daysLeft(m, today) <= EXPIRING_DAYS ? "expiring" : "active";
}

/** Lets the member in today? */
export const canEnter = (state: MemberState) => state === "active" || state === "expiring";

/**
 * The membership that matters today: one covering today (with sessions left),
 * else the next scheduled one, else the most recent paid one, else a pending signup.
 */
export function currentMembership<T extends MembershipLike>(list: T[], today: string): T | null {
  const paid = list.filter((m) => m.status === "active");
  const covering = paid
    .filter((m) => m.starts_on <= today && today <= m.ends_on && sessionsLeft(m) !== 0)
    .sort((a, b) => a.ends_on.localeCompare(b.ends_on))[0];
  if (covering) return covering;
  const next = paid.filter((m) => m.starts_on > today).sort((a, b) => a.starts_on.localeCompare(b.starts_on))[0];
  if (next) return next;
  const latest = [...paid].sort((a, b) => b.ends_on.localeCompare(a.ends_on))[0];
  if (latest) return latest;
  return list.find((m) => m.status === "pending") ?? null;
}

/** Renewing early stacks the new period after the current one; otherwise it starts today. */
export function renewalStart(list: MembershipLike[], today: string) {
  const lastEnd = list
    .filter((m) => m.status === "active" && m.ends_on >= today && sessionsLeft(m) !== 0)
    .map((m) => m.ends_on)
    .sort()
    .pop();
  return lastEnd ? addDays(lastEnd, 1) : today;
}

export const periodEnd = (start: string, days: number) => addDays(start, Math.max(1, days) - 1);

export const STATE_LABELS: Record<MemberState, string> = {
  active: "Al día",
  expiring: "Por vencer",
  no_sessions: "Sin sesiones",
  scheduled: "Inicia pronto",
  pending: "Pendiente de pago",
  expired: "Vencido",
  cancelled: "Cancelado",
  none: "Sin plan",
};

const longDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("es-CO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

/** WhatsApp reminder text for renewals. */
export function reminderMessage(opts: { name: string; businessName: string; planName: string; endsOn: string; state: MemberState; link?: string }) {
  const first = opts.name.split(" ")[0];
  const tail = opts.link ? `\n\nTu plan y tus clases: ${opts.link}` : "";
  if (opts.state === "expired") {
    return `Hola ${first} 👋 Te extrañamos en ${opts.businessName}. Tu ${opts.planName} venció el ${longDate(opts.endsOn)}. ¿Lo renovamos para que sigas entrenando? 💪${tail}`;
  }
  if (opts.state === "no_sessions") {
    return `Hola ${first} 👋 Ya usaste todas las sesiones de tu ${opts.planName} en ${opts.businessName}. ¿Te renovamos el plan? 💪${tail}`;
  }
  return `Hola ${first} 👋 Te recordamos que tu ${opts.planName} en ${opts.businessName} vence el ${longDate(opts.endsOn)}. Renueva antes para no perder días 💪${tail}`;
}

/** 6-digit desk code avoiding the ones already taken. */
export function newMemberCode(taken: Set<string>, random: () => number = Math.random) {
  for (let i = 0; i < 50; i++) {
    const code = String(Math.floor(100000 + random() * 900000));
    if (!taken.has(code)) return code;
  }
  return String(Date.now()).slice(-8);
}
