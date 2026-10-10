import type { Metadata } from "next";
import Link from "next/link";
import { BedDouble } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/get-active-business";
import { NoBusinessSelected } from "@/components/dashboard/no-business-selected";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { StaysBoard } from "@/components/stays/stays-board";
import type { StayRow } from "@/components/stays/types";
import { addDays, localDate } from "@/lib/booking/availability";
import { DATE_RE, occupancyPct, parseStaySettings } from "@/lib/stays/pricing";
import { formatCurrency } from "@/lib/utils";
import { requestOrigin } from "@/lib/site-url";
import { verticalOf } from "@/lib/verticals";

export const metadata: Metadata = {
  title: "Estadías",
};

interface PageProps {
  searchParams: Promise<{ tab?: string; desde?: string }>;
}

const now = () => new Date();

export default async function StaysPage({ searchParams }: PageProps) {
  const business = await getActiveBusiness();
  if (!business) return <NoBusinessSelected />;

  if (verticalOf(business.type) !== "stays") {
    return (
      <div className="dash-header">
        <h1>Estadías</h1>
        <p>La gestión de habitaciones y estadías es para hoteles y hostales. <Link className="underline" href="/d/reservations">Ir a Reservas</Link></p>
      </div>
    );
  }

  const { tab = "hoy", desde } = await searchParams;
  const timeZone = business.timezone || "America/Bogota";
  const today = localDate(now(), timeZone);
  const from = desde && DATE_RE.test(desde) ? desde : addDays(today, -1);
  // Window that covers the calendar, recent history and upcoming bookings
  const lo = [from, addDays(today, -45)].sort()[0];
  const hi = [addDays(from, 14), addDays(today, 150)].sort()[1];
  const monthStart = `${today.slice(0, 7)}-01`;
  const supabase = await createClient();

  const [
    { data: biz },
    { data: staysRaw },
    { data: chargesRaw },
    { data: paymentsRaw },
    { data: roomsRaw },
    { data: typesRaw },
    { data: seasonsRaw },
    { data: servicesRaw },
    { data: monthPayments },
  ] = await Promise.all([
    supabase.from("businesses").select("slug, stay_settings").eq("id", business.id).single(),
    supabase
      .from("stays")
      .select("id, code, item_id, room_id, guest_name, guest_phone, guest_email, guest_document, guest_nationality, adults, children, check_in, check_out, arrival_time, status, room_total, source, notes, manage_token")
      .eq("business_id", business.id)
      .lt("check_in", hi)
      .gt("check_out", lo)
      .order("check_in")
      .limit(5000),
    supabase.from("stay_charges").select("stay_id, amount, stays!inner(check_in, check_out)").eq("business_id", business.id).lt("stays.check_in", hi).gt("stays.check_out", lo).limit(20000),
    supabase.from("stay_payments").select("stay_id, amount, stays!inner(check_in, check_out)").eq("business_id", business.id).lt("stays.check_in", hi).gt("stays.check_out", lo).limit(20000),
    supabase.from("rooms").select("id, item_id, name, floor, housekeeping, active, sort_order").eq("business_id", business.id).order("sort_order").order("name"),
    supabase.from("catalog_items").select("id, name, price, capacity").eq("business_id", business.id).eq("type", "room").eq("active", true).order("sort_order"),
    supabase.from("rate_seasons").select("id, name, item_id, starts_on, ends_on, adjustment_pct, min_nights").eq("business_id", business.id).order("starts_on"),
    supabase.from("catalog_items").select("id, name, price").eq("business_id", business.id).eq("type", "service").eq("active", true).order("sort_order"),
    supabase.from("stay_payments").select("amount").eq("business_id", business.id).gte("created_at", monthStart),
  ]);

  const sums = (rows: { stay_id: string; amount: number }[] | null) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) m.set(r.stay_id, (m.get(r.stay_id) ?? 0) + Number(r.amount));
    return m;
  };
  const extras = sums(chargesRaw);
  const paid = sums(paymentsRaw);

  const stays: StayRow[] = (staysRaw ?? []).map((s) => ({
    id: s.id,
    code: s.code,
    itemId: s.item_id,
    roomId: s.room_id,
    guestName: s.guest_name,
    guestPhone: s.guest_phone,
    guestEmail: s.guest_email,
    guestDocument: s.guest_document,
    guestNationality: s.guest_nationality,
    adults: s.adults,
    children: s.children,
    checkIn: s.check_in,
    checkOut: s.check_out,
    arrivalTime: s.arrival_time,
    status: s.status,
    roomTotal: Number(s.room_total),
    extras: extras.get(s.id) ?? 0,
    paid: paid.get(s.id) ?? 0,
    source: s.source,
    notes: s.notes,
    token: s.manage_token,
  }));
  const rooms = (roomsRaw ?? []).map((r) => ({ id: r.id, itemId: r.item_id, name: r.name, floor: r.floor, housekeeping: r.housekeeping, active: r.active }));
  const roomTypes = (typesRaw ?? []).map((t) => ({ id: t.id, name: t.name, price: Number(t.price), capacity: Number(t.capacity) > 0 ? Number(t.capacity) : 2 }));

  // Tonight
  const activeRooms = rooms.filter((r) => r.active && r.housekeeping !== "maintenance").length;
  const live = stays.filter((s) => ["confirmed", "checked_in", "pending"].includes(s.status));
  const tonight = live.filter((s) => s.checkIn <= today && today < s.checkOut).length;
  const arrivals = stays.filter((s) => ["pending", "confirmed"].includes(s.status) && s.checkIn === today).length;
  const departures = stays.filter((s) => s.status === "checked_in" && s.checkOut <= today).length;
  const guests = stays.filter((s) => s.status === "checked_in").reduce((a, s) => a + s.adults + s.children, 0);
  const pending = stays.filter((s) => s.status === "pending").length;
  const monthRevenue = (monthPayments ?? []).reduce((a, p) => a + Number(p.amount), 0);
  const currency = business.currency || "COP";

  return (
    <div className="space-y-6">
      <div className="dash-header flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3">
            <div className="section-header-icon">
              <BedDouble className="h-5 w-5" />
            </div>
            Estadías
          </h1>
          <p className="flex flex-wrap gap-2">
            <Badge variant="secondary">Ocupación hoy {occupancyPct(tonight, activeRooms)}% · {tonight}/{activeRooms}</Badge>
            <Badge variant={arrivals ? "default" : "secondary"}>{arrivals} llegadas</Badge>
            <Badge variant={departures ? "default" : "secondary"}>{departures} salidas</Badge>
            <Badge variant="secondary">{guests} huéspedes en casa</Badge>
            {pending > 0 && <Badge variant="outline">{pending} por confirmar</Badge>}
            <Badge variant="secondary">Cobrado este mes {formatCurrency(monthRevenue, currency)}</Badge>
          </p>
        </div>
        <Link href={`/${biz?.slug ?? business.slug}`} target="_blank" className={buttonVariants({ variant: "outline" })}>Ver página de reservas</Link>
      </div>

      <StaysBoard
        businessId={business.id}
        slug={biz?.slug ?? business.slug}
        siteUrl={await requestOrigin()}
        currency={currency}
        isHostel={business.type === "hostel"}
        today={today}
        tab={tab}
        from={from}
        stays={stays}
        rooms={rooms}
        roomTypes={roomTypes}
        seasons={(seasonsRaw ?? []).map((x) => ({ id: x.id, name: x.name, itemId: x.item_id, startsOn: x.starts_on, endsOn: x.ends_on, adjustmentPct: x.adjustment_pct, minNights: x.min_nights }))}
        services={(servicesRaw ?? []).map((x) => ({ id: x.id, name: x.name, price: Number(x.price) }))}
        settings={parseStaySettings(biz?.stay_settings)}
      />
    </div>
  );
}
