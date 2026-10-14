/**
 * Pulls Airbnb / Booking.com iCal feeds into `stays` (source 'ota').
 * Runs with the service role from: the daily cron, the hotel's public page and
 * the dashboard (only when a calendar is older than a few minutes), and the
 * "Sincronizar ahora" button.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { localDate } from "@/lib/booking/availability";
import { CHANNEL_LABELS, isSafeFeedUrl, parseIcs } from "./ical";
import { newStayCode } from "./pricing";

type Admin = ReturnType<typeof createAdminClient>;

interface CalendarRow {
  id: string;
  business_id: string;
  room_id: string;
  channel: string;
  url: string;
}

const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 2_000_000;
const BLOCK_WORDS = /not available|closed|blocked|bloquead|no disponible/i;

async function fetchFeed(url: string, hops = 0): Promise<string> {
  if (!isSafeFeedUrl(url)) throw new Error("Enlace no permitido");
  const res = await fetch(url, {
    redirect: "manual",
    headers: { "User-Agent": "Spot-Calendar-Sync/1.0", Accept: "text/calendar, text/plain, */*" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  // Redirects are not followed blindly: only to another public https feed
  if (res.status >= 300 && res.status < 400) {
    const next = res.headers.get("location");
    if (hops >= 3 || !next || !isSafeFeedUrl(new URL(next, url).toString())) throw new Error("El canal redirige a un enlace no permitido");
    return fetchFeed(new URL(next, url).toString(), hops + 1);
  }
  if (!res.ok) throw new Error(`El canal respondió ${res.status}`);
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new Error("El calendario es demasiado grande");
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error("El enlace no es un calendario iCal");
  return text;
}

export interface SyncResult {
  calendarId: string;
  added: number;
  updated: number;
  cancelled: number;
  conflicts: string[];
  error: string | null;
}

/** Syncs one external calendar into its room. */
export async function syncCalendar(admin: Admin, cal: CalendarRow, timeZone: string): Promise<SyncResult> {
  const result: SyncResult = { calendarId: cal.id, added: 0, updated: 0, cancelled: 0, conflicts: [], error: null };
  const label = CHANNEL_LABELS[cal.channel] ?? "Otro canal";
  const today = localDate(new Date(), timeZone);

  let events;
  try {
    events = parseIcs(await fetchFeed(cal.url)).filter((e) => e.end > today);
  } catch (e) {
    result.error = e instanceof Error && e.name !== "TimeoutError" ? e.message : "El canal no respondió a tiempo";
    await admin.from("room_calendars").update({ last_synced_at: new Date().toISOString(), last_error: result.error }).eq("id", cal.id);
    return result;
  }

  const [{ data: room }, { data: existing }] = await Promise.all([
    admin.from("rooms").select("item_id, name").eq("id", cal.room_id).single(),
    admin.from("stays").select("id, external_uid, check_in, check_out, status").eq("calendar_id", cal.id),
  ]);
  const byUid = new Map((existing ?? []).map((s) => [s.external_uid as string, s]));
  const seen = new Set<string>();
  const short = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("es-CO", { timeZone: "UTC", day: "numeric", month: "short" }).replace(".", "");

  for (const ev of events) {
    seen.add(ev.uid);
    const prev = byUid.get(ev.uid);
    if (prev) {
      if (["checked_in", "checked_out"].includes(prev.status)) continue;
      if (prev.check_in === ev.start && prev.check_out === ev.end && prev.status !== "cancelled") continue;
      const { error } = await admin
        .from("stays")
        .update({ check_in: ev.start, check_out: ev.end, status: "confirmed", updated_at: new Date().toISOString() })
        .eq("id", prev.id);
      if (error) result.conflicts.push(`${short(ev.start)}–${short(ev.end)} choca con otra reserva de ${room?.name ?? "la habitación"}`);
      else result.updated++;
      continue;
    }
    const blocked = BLOCK_WORDS.test(ev.summary);
    const { error } = await admin.from("stays").insert({
      business_id: cal.business_id,
      code: newStayCode(),
      item_id: room?.item_id ?? null,
      room_id: cal.room_id,
      guest_name: blocked ? `Bloqueado en ${label}` : `Reserva de ${label}`,
      check_in: ev.start,
      check_out: ev.end,
      status: "confirmed",
      source: "ota",
      channel: cal.channel,
      calendar_id: cal.id,
      external_uid: ev.uid,
      room_total: 0,
      nightly: [],
      notes: `Sincronizada desde ${label}. Los datos del huésped y el pago están en ${label}.`,
    });
    if (error) {
      // 23P01 = the room already has a booking those nights (possible overbooking)
      result.conflicts.push(
        error.code === "23P01"
          ? `${short(ev.start)}–${short(ev.end)}: ${label} tiene una reserva que choca con otra de ${room?.name ?? "la habitación"}`
          : `${short(ev.start)}–${short(ev.end)}: no se pudo importar`
      );
    } else result.added++;
  }

  // Bookings that disappeared from the feed were cancelled on the channel
  for (const s of existing ?? []) {
    if (seen.has(s.external_uid as string)) continue;
    if (!["pending", "confirmed"].includes(s.status) || s.check_out <= today) continue;
    await admin
      .from("stays")
      .update({ status: "cancelled", notes: `Ya no aparece en ${label}: cancelada en el canal.`, updated_at: new Date().toISOString() })
      .eq("id", s.id);
    result.cancelled++;
  }

  result.error = result.conflicts.length ? `Posible sobreventa: ${result.conflicts.slice(0, 3).join(" · ")}` : null;
  await admin.from("room_calendars").update({ last_synced_at: new Date().toISOString(), last_error: result.error }).eq("id", cal.id);
  return result;
}

/** Syncs the business calendars not refreshed in the last `maxAgeMinutes` (all of them with 0). */
export async function syncBusinessCalendars(businessId: string | null, maxAgeMinutes = 10, admin: Admin = createAdminClient()) {
  let query = admin.from("room_calendars").select("id, business_id, room_id, channel, url, last_synced_at").eq("active", true);
  if (businessId) query = query.eq("business_id", businessId);
  if (maxAgeMinutes > 0) {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60_000).toISOString();
    query = query.or(`last_synced_at.is.null,last_synced_at.lt.${cutoff}`);
  }
  const { data: calendars } = await query.limit(500);
  if (!calendars?.length) return [];

  const businessIds = [...new Set(calendars.map((c) => c.business_id))];
  const { data: businesses } = await admin.from("businesses").select("id, timezone").in("id", businessIds);
  const tz = new Map((businesses ?? []).map((b) => [b.id, b.timezone || "America/Bogota"]));

  // Claim them first so concurrent page views don't sync the same feed twice
  await admin.from("room_calendars").update({ last_synced_at: new Date().toISOString() }).in("id", calendars.map((c) => c.id));
  const results: SyncResult[] = [];
  for (const cal of calendars) results.push(await syncCalendar(admin, cal, tz.get(cal.business_id) ?? "America/Bogota"));
  return results;
}
