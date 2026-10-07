"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOrder } from "@/lib/actions/orders";
import { addDays, localDate } from "@/lib/booking/availability";
import { canEnter, currentMembership, membershipState, periodEnd, renewalStart, sessionsLeft, STATE_LABELS } from "@/lib/memberships/status";
import { DEFAULT_PLAN_DAYS, ensureMemberIdentity, findOrCreateContact, normalizePhone } from "@/lib/memberships/data";

const PATH = "/d/socios";
const PAYMENT_METHODS = ["cash", "card", "transfer"];

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? supabase : null;
}

async function businessToday(supabase: Awaited<ReturnType<typeof createClient>>, businessId: string) {
  const { data } = await supabase.from("businesses").select("timezone").eq("id", businessId).single();
  return localDate(new Date(), data?.timezone || "America/Bogota");
}

export interface SellInput {
  contactId?: string;
  name?: string;
  phone?: string;
  email?: string;
  planId: string;
  paymentMethod: string;
  startsOn?: string;
}

/** New member or renewal: registers the sale and the membership period. */
export async function sellMembership(businessId: string, input: SellInput) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  if (!PAYMENT_METHODS.includes(input.paymentMethod)) return { error: "Medio de pago inválido" };

  const { data: plan } = await supabase
    .from("catalog_items")
    .select("id, name, price, membership_days, membership_sessions, type")
    .eq("id", input.planId)
    .eq("business_id", businessId)
    .single();
  if (!plan || plan.type !== "membership") return { error: "Plan no encontrado" };

  // Resolve the member (existing contact or a new person)
  let contact: { id: string; full_name: string; phone: string | null; member_code: string | null; portal_token: string | null } | null = null;
  if (input.contactId) {
    const { data } = await supabase
      .from("contacts")
      .select("id, full_name, phone, member_code, portal_token")
      .eq("id", input.contactId)
      .eq("business_id", businessId)
      .single();
    contact = data;
  } else {
    const name = (input.name ?? "").trim().slice(0, 120);
    const phone = normalizePhone(input.phone ?? "");
    if (name.length < 2) return { error: "Escribe el nombre del socio" };
    if (phone.replace(/\D/g, "").length < 7) return { error: "Escribe un celular válido" };
    const found = await findOrCreateContact(createAdminClient(), businessId, { name, phone, email: input.email?.trim() || null });
    contact = { ...found, phone };
  }
  if (!contact) return { error: "Socio no encontrado" };

  const today = await businessToday(supabase, businessId);
  const { data: history } = await supabase
    .from("memberships")
    .select("status, starts_on, ends_on, sessions_total, sessions_used")
    .eq("business_id", businessId)
    .eq("contact_id", contact.id);
  const start = input.startsOn && /^\d{4}-\d{2}-\d{2}$/.test(input.startsOn) ? input.startsOn : renewalStart(history ?? [], today);
  const days = plan.membership_days ?? DEFAULT_PLAN_DAYS;

  const sale = await createOrder(businessId, {
    type: "sale",
    customer_name: contact.full_name,
    customer_phone: contact.phone ?? undefined,
    payment_method: input.paymentMethod,
    discount: 0,
    tax: 0,
    items: [{ catalog_item_id: plan.id, quantity: 1 }],
  });
  if ("error" in sale && sale.error) return { error: `No se pudo registrar el cobro: ${sale.error}` };

  const { error } = await supabase.from("memberships").insert({
    business_id: businessId,
    contact_id: contact.id,
    plan_id: plan.id,
    plan_name: plan.name,
    status: "active",
    starts_on: start,
    ends_on: periodEnd(start, days),
    sessions_total: plan.membership_sessions,
    price: plan.price,
    transaction_id: "transaction" in sale ? sale.transaction?.id ?? null : null,
    source: "desk",
  });
  if (error) return { error: "Se cobró, pero no se pudo crear la membresía. Revísalo en Pedidos." };

  await ensureMemberIdentity(createAdminClient(), businessId, contact);
  revalidatePath(PATH);
  return { success: true, startsOn: start, endsOn: periodEnd(start, days) };
}

/** Web sign-up paid at the desk: becomes active from today (or after the current plan). */
export async function activateMembership(businessId: string, membershipId: string, paymentMethod: string) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  if (!PAYMENT_METHODS.includes(paymentMethod)) return { error: "Medio de pago inválido" };

  const { data: m } = await supabase
    .from("memberships")
    .select("id, contact_id, plan_id, plan_name, status, starts_on, ends_on, price, contacts(full_name, phone)")
    .eq("id", membershipId)
    .eq("business_id", businessId)
    .single();
  if (!m || m.status !== "pending") return { error: "Esta inscripción ya no está pendiente" };

  const days = Math.max(1, Math.round((Date.parse(m.ends_on) - Date.parse(m.starts_on)) / 86_400_000) + 1);
  const today = await businessToday(supabase, businessId);
  const { data: history } = await supabase
    .from("memberships")
    .select("status, starts_on, ends_on, sessions_total, sessions_used")
    .eq("business_id", businessId)
    .eq("contact_id", m.contact_id)
    .neq("id", m.id);
  const start = renewalStart(history ?? [], today);
  const person = m.contacts as unknown as { full_name: string; phone: string | null } | null;

  let transactionId: string | null = null;
  if (m.plan_id) {
    const sale = await createOrder(businessId, {
      type: "sale",
      customer_name: person?.full_name,
      customer_phone: person?.phone ?? undefined,
      payment_method: paymentMethod,
      discount: 0,
      tax: 0,
      items: [{ catalog_item_id: m.plan_id, quantity: 1 }],
    });
    if ("error" in sale && sale.error) return { error: `No se pudo registrar el cobro: ${sale.error}` };
    transactionId = "transaction" in sale ? sale.transaction?.id ?? null : null;
  }

  const { error } = await supabase
    .from("memberships")
    .update({ status: "active", starts_on: start, ends_on: periodEnd(start, days), transaction_id: transactionId, updated_at: new Date().toISOString() })
    .eq("id", m.id)
    .eq("business_id", businessId);
  if (error) return { error: "No se pudo activar" };
  revalidatePath(PATH);
  return { success: true };
}

export async function cancelMembership(businessId: string, membershipId: string) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const { error } = await supabase
    .from("memberships")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", membershipId)
    .eq("business_id", businessId);
  if (error) return { error: "No se pudo cancelar" };
  revalidatePath(PATH);
  return { success: true };
}

/** "Congelar": adds days to the end date (travel, injury…). */
export async function extendMembership(businessId: string, membershipId: string, days: number) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const n = Math.round(Number(days));
  if (!Number.isFinite(n) || n < 1 || n > 365) return { error: "Escribe entre 1 y 365 días" };
  const { data: m } = await supabase.from("memberships").select("ends_on, notes").eq("id", membershipId).eq("business_id", businessId).single();
  if (!m) return { error: "Membresía no encontrada" };
  const { error } = await supabase
    .from("memberships")
    .update({
      ends_on: addDays(m.ends_on, n),
      notes: [m.notes, `+${n} días (congelado)`].filter(Boolean).join(" · "),
      updated_at: new Date().toISOString(),
    })
    .eq("id", membershipId)
    .eq("business_id", businessId);
  if (error) return { error: "No se pudo extender" };
  revalidatePath(PATH);
  return { success: true, endsOn: addDays(m.ends_on, n) };
}

/**
 * Front desk check-in. Blocks expired members unless `override`; uses one
 * session of punch-card plans; ignores a repeat within 2 hours.
 */
export async function checkInMember(businessId: string, contactId: string, override = false) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const today = await businessToday(supabase, businessId);

  const { data: list } = await supabase
    .from("memberships")
    .select("id, status, starts_on, ends_on, sessions_total, sessions_used")
    .eq("business_id", businessId)
    .eq("contact_id", contactId);
  const current = currentMembership(list ?? [], today);
  const state = membershipState(current, today);
  if (!canEnter(state) && !override) return { blocked: true, state, label: STATE_LABELS[state] };

  const { data: recent } = await supabase
    .from("check_ins")
    .select("id")
    .eq("business_id", businessId)
    .eq("contact_id", contactId)
    .gte("checked_at", new Date(Date.now() - 2 * 3600_000).toISOString())
    .limit(1);
  if (recent?.length) return { success: true, already: true, state };

  const covering = current && canEnter(state) ? current : null;
  const { error } = await supabase.from("check_ins").insert({
    business_id: businessId,
    contact_id: contactId,
    membership_id: covering?.id ?? null,
    note: covering ? null : `Ingreso autorizado (${STATE_LABELS[state]})`,
  });
  if (error) return { error: "No se pudo registrar la entrada" };

  if (covering && covering.sessions_total != null) {
    await supabase
      .from("memberships")
      .update({ sessions_used: covering.sessions_used + 1, updated_at: new Date().toISOString() })
      .eq("id", covering.id)
      .eq("business_id", businessId);
  }
  revalidatePath(PATH);
  const left = covering ? sessionsLeft({ ...covering, sessions_used: covering.sessions_used + (covering.sessions_total != null ? 1 : 0) }) : null;
  return { success: true, state, sessionsLeft: left };
}

export async function savePlanRules(businessId: string, itemId: string, days: number, sessions: number | null) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const d = Math.round(Number(days));
  if (!Number.isFinite(d) || d < 1 || d > 3660) return { error: "La duración debe estar entre 1 y 3660 días" };
  const s = sessions == null || String(sessions) === "" ? null : Math.round(Number(sessions));
  if (s != null && (!Number.isFinite(s) || s < 1 || s > 1000)) return { error: "Las sesiones deben estar entre 1 y 1000" };
  const { error } = await supabase
    .from("catalog_items")
    .update({ membership_days: d, membership_sessions: s })
    .eq("id", itemId)
    .eq("business_id", businessId);
  if (error) return { error: "No se pudo guardar el plan" };
  revalidatePath(PATH);
  return { success: true };
}

export interface GymClassInput {
  id?: string;
  name: string;
  itemId?: string | null;
  instructorId?: string | null;
  weekday: number;
  startTime: string;
  durationMinutes: number;
  capacity: number;
}

export async function saveGymClass(businessId: string, input: GymClassInput) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const name = input.name.trim().slice(0, 80);
  if (!name) return { error: "Escribe el nombre de la clase" };
  if (!(input.weekday >= 1 && input.weekday <= 7)) return { error: "Día inválido" };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.startTime)) return { error: "Hora inválida" };
  const row = {
    business_id: businessId,
    name,
    item_id: input.itemId || null,
    instructor_id: input.instructorId || null,
    weekday: input.weekday,
    start_time: input.startTime,
    duration_minutes: Math.min(480, Math.max(10, Math.round(input.durationMinutes) || 60)),
    capacity: Math.min(500, Math.max(1, Math.round(input.capacity) || 20)),
  };
  const { error } = input.id
    ? await supabase.from("gym_classes").update(row).eq("id", input.id).eq("business_id", businessId)
    : await supabase.from("gym_classes").insert(row);
  if (error) return { error: "No se pudo guardar la clase" };
  revalidatePath(PATH);
  return { success: true };
}

export async function deleteGymClass(businessId: string, classId: string) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  // Keep history: deactivate instead of deleting bookings
  const { error } = await supabase.from("gym_classes").update({ active: false }).eq("id", classId).eq("business_id", businessId);
  if (error) return { error: "No se pudo quitar la clase" };
  revalidatePath(PATH);
  return { success: true };
}

export async function setClassBookingStatus(businessId: string, bookingId: string, status: "booked" | "attended" | "no_show" | "cancelled") {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const { error } = await supabase.from("class_bookings").update({ status }).eq("id", bookingId).eq("business_id", businessId);
  if (error) return { error: "No se pudo actualizar" };
  revalidatePath(PATH);
  return { success: true };
}
