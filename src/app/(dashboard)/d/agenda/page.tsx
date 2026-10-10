import type { Metadata } from "next";
import { requestOrigin } from "@/lib/site-url";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/get-active-business";
import { NoBusinessSelected } from "@/components/dashboard/no-business-selected";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buttonVariants } from "@/components/ui/button";
import { DayView, type AgendaAppointment } from "@/components/agenda/day-view";
import { ProfessionalsPanel } from "@/components/agenda/professionals-panel";
import { RulesCard } from "@/components/agenda/rules-card";
import { addDays, parseBookingSettings, parseSchedule, zonedToUtc } from "@/lib/booking/availability";
import { DEFAULT_SERVICE_MINUTES, todayIn } from "@/lib/booking/data";
import { appointmentTerms, verticalOf } from "@/lib/verticals";

export const metadata: Metadata = {
  title: "Agenda",
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const nowIso = () => new Date().toISOString();

export default async function AgendaPage({ searchParams }: PageProps) {
  const business = await getActiveBusiness();
  if (!business) return <NoBusinessSelected />;

  if (verticalOf(business.type) !== "appointments") {
    return (
      <div className="dash-header">
        <h1>Agenda</h1>
        <p>La agenda por profesional es para negocios de citas (barberías, tattoo, veterinarias…). <Link className="underline" href="/d/reservations">Ir a Reservas</Link></p>
      </div>
    );
  }

  const timeZone = business.timezone || "America/Bogota";
  const today = todayIn(timeZone);
  const raw = (await searchParams).date;
  const date = typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : today;
  const from = zonedToUtc(date, "00:00", timeZone);
  const to = zonedToUtc(addDays(date, 1), "00:00", timeZone);

  const supabase = await createClient();
  const [{ data: biz }, { data: employees }, { data: links }, { data: services }, { data: appts }, { data: timeOff }] = await Promise.all([
    supabase.from("businesses").select("booking_settings, slug").eq("id", business.id).single(),
    supabase
      .from("employees")
      .select("id, full_name, position, bookable, bio, schedule, status")
      .eq("business_id", business.id)
      .eq("status", "active")
      .order("full_name"),
    supabase.from("employee_services").select("employee_id, catalog_item_id").eq("business_id", business.id),
    supabase
      .from("catalog_items")
      .select("id, name, price, duration_minutes")
      .eq("business_id", business.id)
      .eq("type", "service")
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("reservations")
      .select("id, employee_id, reservation_time, end_time, status, customer_name, customer_phone, price, notes, source, item_id")
      .eq("business_id", business.id)
      .gte("reservation_time", from.toISOString())
      .lt("reservation_time", to.toISOString())
      .order("reservation_time"),
    supabase
      .from("staff_time_off")
      .select("id, employee_id, starts_at, ends_at, reason")
      .eq("business_id", business.id)
      .gte("ends_at", nowIso())
      .order("starts_at"),
  ]);

  const terms = appointmentTerms(business.type);
  const serviceName = new Map((services ?? []).map((s) => [s.id, s.name]));
  const servicesOf = (id: string) => (links ?? []).filter((l) => l.employee_id === id).map((l) => l.catalog_item_id);

  const panelEmployees = (employees ?? []).map((e) => ({
    id: e.id,
    name: e.full_name,
    position: e.position,
    bookable: e.bookable,
    bio: e.bio,
    schedule: parseSchedule(e.schedule),
    serviceIds: servicesOf(e.id),
    timeOff: (timeOff ?? []).filter((t) => t.employee_id === e.id).map((t) => ({ id: t.id, startsAt: t.starts_at, endsAt: t.ends_at, reason: t.reason })),
  }));
  const staff = panelEmployees.filter((e) => e.bookable).map((e) => ({ id: e.id, name: e.name, schedule: e.schedule, serviceIds: e.serviceIds }));

  const appointments: AgendaAppointment[] = (appts ?? []).map((a) => ({
    id: a.id,
    employeeId: a.employee_id,
    start: a.reservation_time,
    end: a.end_time ?? a.reservation_time,
    status: a.status,
    customerName: a.customer_name,
    customerPhone: a.customer_phone,
    serviceName: a.item_id ? serviceName.get(a.item_id) ?? null : null,
    price: a.price != null ? Number(a.price) : null,
    notes: a.notes,
    source: a.source,
  }));

  const siteUrl = await requestOrigin();
  const bookingUrl = `${siteUrl}/${biz?.slug ?? business.slug}`;

  return (
    <div className="space-y-6">
      <div className="dash-header flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3">
            <div className="section-header-icon">
              <CalendarClock className="h-5 w-5" />
            </div>
            Agenda
          </h1>
          <p>Citas por {terms.professional}, en tiempo real con las que agendan tus clientes en línea.</p>
        </div>
        <Link href={`/${biz?.slug ?? business.slug}`} target="_blank" className={buttonVariants({ variant: "outline" })}>
          Ver mi página de citas
        </Link>
      </div>

      <Tabs defaultValue="day">
        <TabsList>
          <TabsTrigger value="day">Día</TabsTrigger>
          <TabsTrigger value="team">{terms.professionals[0].toUpperCase() + terms.professionals.slice(1)}</TabsTrigger>
          <TabsTrigger value="rules">Reglas</TabsTrigger>
        </TabsList>
        <TabsContent value="day" className="pt-4">
          <DayView
            businessId={business.id}
            date={date}
            today={today}
            timeZone={timeZone}
            currency={business.currency || "COP"}
            staff={staff}
            services={(services ?? []).map((s) => ({ id: s.id, name: s.name, price: Number(s.price), durationMinutes: Number(s.duration_minutes) > 0 ? Number(s.duration_minutes) : DEFAULT_SERVICE_MINUTES }))}
            appointments={appointments}
            terms={terms}
          />
        </TabsContent>
        <TabsContent value="team" className="pt-4">
          <ProfessionalsPanel
            businessId={business.id}
            timeZone={timeZone}
            employees={panelEmployees}
            services={(services ?? []).map((s) => ({ id: s.id, name: s.name }))}
            terms={terms}
          />
        </TabsContent>
        <TabsContent value="rules" className="pt-4">
          <RulesCard businessId={business.id} initial={parseBookingSettings(biz?.booking_settings)} bookingUrl={bookingUrl} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
