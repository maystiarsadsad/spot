import type { Metadata } from "next";
import { requestOrigin } from "@/lib/site-url";
import Link from "next/link";
import { IdCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/get-active-business";
import { NoBusinessSelected } from "@/components/dashboard/no-business-selected";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Reception } from "@/components/members/reception";
import { MembersTable } from "@/components/members/members-table";
import { ClassesPanel, type ClassRow, type SessionRow } from "@/components/members/classes-panel";
import { PlansPanel } from "@/components/members/plans-panel";
import type { MemberRow } from "@/components/members/types";
import { addDays, DAY_KEYS, localDate, localTime, weekdayOf } from "@/lib/booking/availability";
import { currentMembership, daysLeft, membershipState, sessionsLeft } from "@/lib/memberships/status";
import { DEFAULT_PLAN_DAYS } from "@/lib/memberships/data";
import { verticalOf } from "@/lib/verticals";

export const metadata: Metadata = {
  title: "Socios",
};

type Membership = {
  id: string;
  contact_id: string;
  plan_id: string | null;
  plan_name: string;
  status: string;
  starts_on: string;
  ends_on: string;
  sessions_total: number | null;
  sessions_used: number;
};

const now = () => new Date();
const isoDaysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

/** One row per member: the membership that matters today + pending sign-up + last visit. */
function buildMembers(
  contacts: { id: string; full_name: string; phone: string | null; member_code: string | null; portal_token: string | null }[],
  memberships: Membership[],
  lastVisit: Map<string, string>,
  today: string
): MemberRow[] {
  const byContact = new Map<string, Membership[]>();
  for (const m of memberships) byContact.set(m.contact_id, [...(byContact.get(m.contact_id) ?? []), m]);
  return contacts
    .filter((c) => byContact.has(c.id))
    .map((c) => {
      const list = byContact.get(c.id)!;
      const current = currentMembership(list.filter((m) => m.status !== "pending"), today);
      const pending = list.find((m) => m.status === "pending") ?? null;
      const state = current ? membershipState(current, today) : pending ? "pending" : "none";
      return {
        contactId: c.id,
        name: c.full_name,
        phone: c.phone,
        code: c.member_code,
        token: c.portal_token,
        planId: (current ?? pending)?.plan_id ?? null,
        planName: current?.plan_name ?? null,
        state,
        membershipId: current?.id ?? null,
        startsOn: current?.starts_on ?? null,
        endsOn: current?.ends_on ?? null,
        daysLeft: current ? daysLeft(current, today) : 0,
        sessionsLeft: current ? sessionsLeft(current) : null,
        sessionsTotal: current?.sessions_total ?? null,
        pendingId: pending?.id ?? null,
        pendingPlan: pending?.plan_name ?? null,
        lastVisit: lastVisit.get(c.id) ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default async function MembersPage() {
  const business = await getActiveBusiness();
  if (!business) return <NoBusinessSelected />;

  if (verticalOf(business.type) !== "memberships") {
    return (
      <div className="dash-header">
        <h1>Socios</h1>
        <p>La gestión de socios y membresías es para gimnasios. <Link className="underline" href="/d/contacts">Ir a Clientes</Link></p>
      </div>
    );
  }

  const timeZone = business.timezone || "America/Bogota";
  const today = localDate(now(), timeZone);
  const supabase = await createClient();

  const [
    { data: biz },
    { data: plansRaw },
    { data: contacts },
    { data: memberships },
    { data: checkIns },
    { data: classesRaw },
    { data: bookings },
    { data: staff },
    { data: services },
  ] = await Promise.all([
    supabase.from("businesses").select("name, slug").eq("id", business.id).single(),
    supabase.from("catalog_items").select("id, name, price, membership_days, membership_sessions").eq("business_id", business.id).eq("type", "membership").eq("active", true).order("sort_order"),
    supabase.from("contacts").select("id, full_name, phone, member_code, portal_token").eq("business_id", business.id).not("member_code", "is", null).limit(10000),
    supabase.from("memberships").select("id, contact_id, plan_id, plan_name, status, starts_on, ends_on, sessions_total, sessions_used").eq("business_id", business.id).neq("status", "cancelled").limit(20000),
    supabase.from("check_ins").select("contact_id, checked_at").eq("business_id", business.id).gte("checked_at", isoDaysAgo(60)).order("checked_at", { ascending: false }).limit(20000),
    supabase.from("gym_classes").select("id, name, item_id, instructor_id, weekday, start_time, duration_minutes, capacity").eq("business_id", business.id).eq("active", true).order("start_time"),
    supabase.from("class_bookings").select("id, class_id, class_date, status, contacts(full_name)").eq("business_id", business.id).gte("class_date", today).lte("class_date", addDays(today, 6)),
    supabase.from("employees").select("id, full_name").eq("business_id", business.id).eq("status", "active").order("full_name"),
    supabase.from("catalog_items").select("id, name").eq("business_id", business.id).eq("type", "service").eq("active", true),
  ]);

  const plans = (plansRaw ?? []).map((p) => ({ id: p.id, name: p.name, price: Number(p.price), days: p.membership_days ?? DEFAULT_PLAN_DAYS, sessions: p.membership_sessions }));

  const lastVisit = new Map<string, string>();
  const nameById = new Map((contacts ?? []).map((c) => [c.id, c.full_name]));
  const todayCheckIns: { name: string; time: string }[] = [];
  for (const ci of checkIns ?? []) {
    if (!lastVisit.has(ci.contact_id)) lastVisit.set(ci.contact_id, ci.checked_at);
    const at = new Date(ci.checked_at);
    if (localDate(at, timeZone) === today) todayCheckIns.push({ name: nameById.get(ci.contact_id) ?? "Socio", time: localTime(at, timeZone) });
  }

  const members = buildMembers(contacts ?? [], (memberships ?? []) as Membership[], lastVisit, today);
  const counts = {
    active: members.filter((m) => m.state === "active" || m.state === "expiring").length,
    expiring: members.filter((m) => m.state === "expiring").length,
    expired: members.filter((m) => m.state === "expired" || m.state === "no_sessions").length,
    pending: members.filter((m) => m.pendingId).length,
  };

  const instructorName = new Map((staff ?? []).map((s) => [s.id, s.full_name]));
  const classes: ClassRow[] = (classesRaw ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    itemId: c.item_id,
    instructorId: c.instructor_id,
    instructor: c.instructor_id ? instructorName.get(c.instructor_id) ?? null : null,
    weekday: c.weekday,
    startTime: String(c.start_time).slice(0, 5),
    durationMinutes: c.duration_minutes,
    capacity: c.capacity,
  }));
  const sessions: SessionRow[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i);
    const weekday = DAY_KEYS.indexOf(weekdayOf(date)) + 1;
    for (const c of classes.filter((x) => x.weekday === weekday)) {
      sessions.push({
        classId: c.id,
        date,
        start: c.startTime,
        name: c.name,
        capacity: c.capacity,
        attendees: (bookings ?? [])
          .filter((b) => b.class_id === c.id && b.class_date === date)
          .map((b) => ({ bookingId: b.id, name: (b.contacts as unknown as { full_name: string } | null)?.full_name ?? "Socio", status: b.status })),
      });
    }
  }

  const siteUrl = await requestOrigin();

  return (
    <div className="space-y-6">
      <div className="dash-header flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3">
            <div className="section-header-icon">
              <IdCard className="h-5 w-5" />
            </div>
            Socios
          </h1>
          <p className="flex flex-wrap gap-2">
            <Badge variant="secondary">{counts.active} activos</Badge>
            <Badge variant={counts.expiring ? "default" : "secondary"}>{counts.expiring} por vencer</Badge>
            <Badge variant={counts.expired ? "destructive" : "secondary"}>{counts.expired} vencidos</Badge>
            {counts.pending > 0 && <Badge variant="outline">{counts.pending} inscripciones web</Badge>}
          </p>
        </div>
        <Link href={`/${biz?.slug ?? business.slug}`} target="_blank" className={buttonVariants({ variant: "outline" })}>Ver página de planes y clases</Link>
      </div>

      <Tabs defaultValue="desk">
        <TabsList>
          <TabsTrigger value="desk">Recepción</TabsTrigger>
          <TabsTrigger value="members">Socios</TabsTrigger>
          <TabsTrigger value="classes">Clases</TabsTrigger>
          <TabsTrigger value="plans">Planes</TabsTrigger>
        </TabsList>
        <TabsContent value="desk" className="pt-4">
          <Reception businessId={business.id} currency={business.currency || "COP"} members={members} plans={plans} todayCheckIns={todayCheckIns} />
        </TabsContent>
        <TabsContent value="members" className="pt-4">
          <MembersTable
            businessId={business.id}
            businessName={biz?.name ?? business.name}
            siteUrl={siteUrl}
            slug={biz?.slug ?? business.slug}
            currency={business.currency || "COP"}
            members={members}
            plans={plans}
          />
        </TabsContent>
        <TabsContent value="classes" className="pt-4">
          <ClassesPanel
            businessId={business.id}
            classes={classes}
            sessions={sessions}
            instructors={(staff ?? []).map((s) => ({ id: s.id, name: s.full_name }))}
            services={(services ?? []).map((s) => ({ id: s.id, name: s.name }))}
          />
        </TabsContent>
        <TabsContent value="plans" className="pt-4">
          <PlansPanel businessId={business.id} currency={business.currency || "COP"} plans={plans} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
