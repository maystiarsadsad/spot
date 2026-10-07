/**
 * Server data for the memberships engine (gyms). Public pages are anonymous →
 * service role, always filtered by business_id, returning public-safe fields.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, localDate, localTime, weekdayOf, DAY_KEYS } from "@/lib/booking/availability";
import { newMemberCode } from "./status";

export const DEFAULT_PLAN_DAYS = 30;

export interface PublicPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  days: number;
  sessions: number | null;
  featured: boolean;
}

export interface ClassSession {
  classId: string;
  date: string;
  start: string; // "HH:MM"
  name: string;
  instructor: string | null;
  durationMinutes: number;
  capacity: number;
  booked: number;
}

type Admin = ReturnType<typeof createAdminClient>;

export async function loadPlans(businessId: string, admin: Admin = createAdminClient()): Promise<PublicPlan[]> {
  const { data } = await admin
    .from("catalog_items")
    .select("id, name, description, price, membership_days, membership_sessions, featured, sort_order")
    .eq("business_id", businessId)
    .eq("type", "membership")
    .eq("active", true)
    .order("sort_order");
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: Number(p.price),
    days: p.membership_days ?? DEFAULT_PLAN_DAYS,
    sessions: p.membership_sessions,
    featured: p.featured === true,
  }));
}

/** Class sessions for the next `days` days (today's past sessions excluded), with booked counts. */
export async function loadClassSessions(businessId: string, timeZone: string, days = 7, admin: Admin = createAdminClient()): Promise<ClassSession[]> {
  const today = localDate(new Date(), timeZone);
  const nowHHMM = localTime(new Date(), timeZone);
  const last = addDays(today, days - 1);
  const [{ data: classes }, { data: bookings }, { data: staff }] = await Promise.all([
    admin
      .from("gym_classes")
      .select("id, name, instructor_id, weekday, start_time, duration_minutes, capacity")
      .eq("business_id", businessId)
      .eq("active", true)
      .order("start_time"),
    admin
      .from("class_bookings")
      .select("class_id, class_date")
      .eq("business_id", businessId)
      .in("status", ["booked", "attended"])
      .gte("class_date", today)
      .lte("class_date", last),
    admin.from("employees").select("id, full_name").eq("business_id", businessId),
  ]);
  const instructor = new Map((staff ?? []).map((e) => [e.id, e.full_name]));
  const count = new Map<string, number>();
  for (const b of bookings ?? []) count.set(`${b.class_id}|${b.class_date}`, (count.get(`${b.class_id}|${b.class_date}`) ?? 0) + 1);

  const out: ClassSession[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const weekday = DAY_KEYS.indexOf(weekdayOf(date)) + 1;
    for (const c of classes ?? []) {
      if (c.weekday !== weekday) continue;
      const start = String(c.start_time).slice(0, 5);
      if (date === today && start <= nowHHMM) continue;
      out.push({
        classId: c.id,
        date,
        start,
        name: c.name,
        instructor: c.instructor_id ? instructor.get(c.instructor_id) ?? null : null,
        durationMinutes: c.duration_minutes,
        capacity: c.capacity,
        booked: count.get(`${c.id}|${date}`) ?? 0,
      });
    }
  }
  return out;
}

export const normalizePhone = (raw: string) => (raw ?? "").replace(/[^\d+]/g, "").slice(0, 20);

/** Finds a customer by phone (last 10 digits) or creates them. */
export async function findOrCreateContact(
  admin: Admin,
  businessId: string,
  person: { name: string; phone: string; email?: string | null }
) {
  const digits = person.phone.replace(/\D/g, "").slice(-10);
  if (digits.length >= 7) {
    const { data } = await admin
      .from("contacts")
      .select("id, full_name, member_code, portal_token")
      .eq("business_id", businessId)
      .like("phone", `%${digits}`)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  const { data: created, error } = await admin
    .from("contacts")
    .insert({ business_id: businessId, full_name: person.name, phone: person.phone, email: person.email ?? null })
    .select("id, full_name, member_code, portal_token")
    .single();
  if (error) throw new Error(error.message);
  return created;
}

/** Gives a contact a desk code and a private member link if missing. */
export async function ensureMemberIdentity(admin: Admin, businessId: string, contact: { id: string; member_code: string | null; portal_token: string | null }) {
  if (contact.member_code && contact.portal_token) return { code: contact.member_code, token: contact.portal_token };
  const { data: taken } = await admin.from("contacts").select("member_code").eq("business_id", businessId).not("member_code", "is", null);
  const code = contact.member_code ?? newMemberCode(new Set((taken ?? []).map((t) => t.member_code as string)));
  const token = contact.portal_token ?? crypto.randomUUID().replace(/-/g, "");
  await admin.from("contacts").update({ member_code: code, portal_token: token }).eq("id", contact.id).eq("business_id", businessId);
  return { code, token };
}
