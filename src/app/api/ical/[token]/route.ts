import { createAdminClient } from "@/lib/supabase/admin";
import { localDate, addDays } from "@/lib/booking/availability";
import { buildIcs } from "@/lib/stays/ical";

/**
 * Public iCal feed of one room (the secret token is the access key) for
 * Airbnb / Booking.com to import. Only busy dates are exported, never guest data.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const clean = token.replace(/\.ics$/, "");
  if (!/^[a-f0-9]{32}$/.test(clean)) return new Response("Not found", { status: 404 });

  const admin = createAdminClient();
  const { data: room } = await admin.from("rooms").select("id, name, business_id, active").eq("ical_token", clean).maybeSingle();
  if (!room || !room.active) return new Response("Not found", { status: 404 });
  const { data: biz } = await admin.from("businesses").select("name, timezone, active").eq("id", room.business_id).single();
  if (!biz || biz.active === false) return new Response("Not found", { status: 404 });

  const today = localDate(new Date(), biz.timezone || "America/Bogota");
  const { data: stays } = await admin
    .from("stays")
    .select("id, check_in, check_out")
    .eq("room_id", room.id)
    .in("status", ["pending", "confirmed", "checked_in"])
    .gte("check_out", addDays(today, -1))
    .order("check_in")
    .limit(1000);

  const body = buildIcs({
    name: `${biz.name} · ${room.name}`,
    events: (stays ?? []).map((s) => ({ uid: `${s.id}@spot`, start: s.check_in, end: s.check_out, summary: "Reservado" })),
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${room.name.replace(/[^\w-]+/g, "_")}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
