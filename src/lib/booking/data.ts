/**
 * Server-side data for the appointments engine. The public booking page is
 * anonymous, so this uses the service role — always filtered by business_id
 * and returning only public-safe fields (no salaries, phones, notes).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeSlots,
  localDate,
  addDays,
  parseBookingSettings,
  parseSchedule,
  zonedToUtc,
  type BookingSettings,
  type Interval,
  type StaffInput,
  type WeeklySchedule,
} from "./availability";

export interface BookingBusiness {
  id: string;
  name: string;
  slug: string;
  type: string;
  timeZone: string;
  currency: string;
  whatsapp: string | null;
  settings: BookingSettings;
}

export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
  imageUrl: string | null;
  category: string | null;
}

export interface PublicStaff {
  id: string;
  name: string;
  position: string;
  bio: string | null;
  avatarUrl: string | null;
  serviceIds: string[];
  schedule: WeeklySchedule;
}

export const DEFAULT_SERVICE_MINUTES = 30;

export async function loadBookingBusiness(businessId: string): Promise<BookingBusiness | null> {
  const { data } = await createAdminClient()
    .from("businesses")
    .select("id, name, slug, type, timezone, currency, whatsapp, phone, booking_settings, active")
    .eq("id", businessId)
    .single();
  if (!data || data.active === false) return null;
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    type: data.type,
    timeZone: data.timezone || "America/Bogota",
    currency: data.currency || "COP",
    whatsapp: data.whatsapp || data.phone || null,
    settings: parseBookingSettings(data.booking_settings),
  };
}

export async function loadServices(businessId: string): Promise<PublicService[]> {
  const admin = createAdminClient();
  const [{ data: items }, { data: cats }] = await Promise.all([
    admin
      .from("catalog_items")
      .select("id, name, description, price, duration_minutes, image_url, category_id, type, active, sort_order")
      .eq("business_id", businessId)
      .eq("active", true)
      .eq("type", "service")
      .order("sort_order"),
    admin.from("catalog_categories").select("id, name").eq("business_id", businessId),
  ]);
  const catName = new Map<string, string>((cats ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));
  return (items ?? []).map((it: Record<string, unknown>) => ({
    id: it.id as string,
    name: it.name as string,
    description: (it.description as string) ?? null,
    price: Number(it.price),
    durationMinutes: Number(it.duration_minutes) > 0 ? Number(it.duration_minutes) : DEFAULT_SERVICE_MINUTES,
    imageUrl: (it.image_url as string) ?? null,
    category: it.category_id ? catName.get(it.category_id as string) ?? null : null,
  }));
}

export async function loadStaff(businessId: string): Promise<PublicStaff[]> {
  const admin = createAdminClient();
  const [{ data: people }, { data: links }] = await Promise.all([
    admin
      .from("employees")
      .select("id, full_name, position, bio, avatar_url, schedule, status, bookable")
      .eq("business_id", businessId)
      .eq("bookable", true)
      .eq("status", "active")
      .order("full_name"),
    admin.from("employee_services").select("employee_id, catalog_item_id").eq("business_id", businessId),
  ]);
  return (people ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    name: p.full_name as string,
    position: (p.position as string) ?? "",
    bio: (p.bio as string) ?? null,
    avatarUrl: (p.avatar_url as string) ?? null,
    serviceIds: (links ?? []).filter((l: { employee_id: string }) => l.employee_id === p.id).map((l: { catalog_item_id: string }) => l.catalog_item_id),
    schedule: parseSchedule(p.schedule),
  }));
}

/** Professionals that perform a service (all of them if none were configured yet). */
export function staffForService(staff: PublicStaff[], serviceId: string) {
  const configured = staff.some((s) => s.serviceIds.length > 0);
  return configured ? staff.filter((s) => s.serviceIds.includes(serviceId)) : staff;
}

/** Appointments + time off of the given professionals overlapping [from, to). */
export async function loadBusy(businessId: string, staffIds: string[], from: Date, to: Date) {
  const busy = new Map<string, Interval[]>(staffIds.map((id) => [id, []]));
  if (staffIds.length === 0) return busy;
  const admin = createAdminClient();
  const [{ data: appts }, { data: off }] = await Promise.all([
    admin
      .from("reservations")
      .select("employee_id, reservation_time, end_time")
      .eq("business_id", businessId)
      .in("employee_id", staffIds)
      .in("status", ["pending", "confirmed"])
      .lt("reservation_time", to.toISOString())
      .gt("end_time", from.toISOString()),
    admin
      .from("staff_time_off")
      .select("employee_id, starts_at, ends_at")
      .eq("business_id", businessId)
      .in("employee_id", staffIds)
      .lt("starts_at", to.toISOString())
      .gt("ends_at", from.toISOString()),
  ]);
  for (const a of appts ?? []) busy.get(a.employee_id)?.push({ start: new Date(a.reservation_time), end: new Date(a.end_time) });
  for (const o of off ?? []) busy.get(o.employee_id)?.push({ start: new Date(o.starts_at), end: new Date(o.ends_at) });
  return busy;
}

/** Free start times for a service on a date, optionally for one professional. */
export async function daySlots(business: BookingBusiness, service: PublicService, staff: PublicStaff[], employeeId: string | null, date: string) {
  const eligible = staffForService(staff, service.id).filter((s) => !employeeId || s.id === employeeId);
  const from = zonedToUtc(date, "00:00", business.timeZone);
  const to = zonedToUtc(addDays(date, 1), "00:00", business.timeZone);
  const busy = await loadBusy(business.id, eligible.map((s) => s.id), from, to);
  const input: StaffInput[] = eligible.map((s) => ({ id: s.id, schedule: s.schedule, busy: busy.get(s.id) ?? [] }));
  return {
    input,
    slots: computeSlots({ date, timeZone: business.timeZone, durationMinutes: service.durationMinutes, staff: input, settings: business.settings }),
  };
}

export const todayIn = (timeZone: string) => localDate(new Date(), timeZone);
