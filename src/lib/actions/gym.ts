"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBookingBusiness } from "@/lib/booking/data";
import { addDays, localDate, localTime, weekdayOf, DAY_KEYS } from "@/lib/booking/availability";
import { canEnter, currentMembership, membershipState, periodEnd } from "@/lib/memberships/status";
import { ensureMemberIdentity, findOrCreateContact, loadPlans, normalizePhone } from "@/lib/memberships/data";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Online sign-up: creates a pending membership the gym activates when paid. Public. */
export async function requestMembership(businessId: string, input: { planId: string; name: string; phone: string; email?: string }) {
  const name = (input.name ?? "").trim().slice(0, 120);
  const phone = normalizePhone(input.phone);
  if (name.length < 2) return { error: "Escribe tu nombre" };
  if (phone.replace(/\D/g, "").length < 7) return { error: "Escribe un celular válido" };

  const business = await loadBookingBusiness(businessId);
  if (!business) return { error: "Gimnasio no disponible" };
  const plan = (await loadPlans(businessId)).find((p) => p.id === input.planId);
  if (!plan) return { error: "Plan no disponible" };

  const admin = createAdminClient();
  const contact = await findOrCreateContact(admin, businessId, { name, phone, email: input.email?.trim() || null });

  // One open sign-up per person is enough
  const { data: open } = await admin.from("memberships").select("id").eq("contact_id", contact.id).eq("status", "pending").limit(1);
  if (!open?.length) {
    const today = localDate(new Date(), business.timeZone);
    const { error } = await admin.from("memberships").insert({
      business_id: businessId,
      contact_id: contact.id,
      plan_id: plan.id,
      plan_name: plan.name,
      status: "pending",
      starts_on: today,
      ends_on: periodEnd(today, plan.days),
      sessions_total: plan.sessions,
      price: plan.price,
      source: "web",
    });
    if (error) return { error: "No pudimos registrar tu inscripción. Intenta de nuevo." };
  }

  const identity = await ensureMemberIdentity(admin, businessId, contact);
  revalidatePath("/d/socios");
  return { success: true, token: identity.token, whatsapp: business.whatsapp, planName: plan.name };
}

/** Members book a class spot with their phone; capacity is enforced in the DB. Public. */
export async function bookClass(businessId: string, classId: string, date: string, rawPhone: string) {
  if (!DATE.test(date)) return { error: "Fecha inválida" };
  const digits = normalizePhone(rawPhone).replace(/\D/g, "").slice(-10);
  if (digits.length < 7) return { error: "Escribe el celular con el que te inscribiste" };

  const business = await loadBookingBusiness(businessId);
  if (!business) return { error: "Gimnasio no disponible" };
  const today = localDate(new Date(), business.timeZone);
  if (date < today || date > addDays(today, 14)) return { error: "Esa fecha no está disponible" };

  const admin = createAdminClient();
  const { data: cls } = await admin.from("gym_classes").select("start_time, weekday").eq("id", classId).eq("business_id", businessId).maybeSingle();
  if (!cls || cls.weekday !== DAY_KEYS.indexOf(weekdayOf(date)) + 1) return { error: "Clase no disponible" };
  if (date === today && String(cls.start_time).slice(0, 5) <= localTime(new Date(), business.timeZone)) return { error: "Esa clase ya empezó" };

  const { data: contact } = await admin
    .from("contacts")
    .select("id, member_code, portal_token")
    .eq("business_id", businessId)
    .like("phone", `%${digits}`)
    .limit(1)
    .maybeSingle();
  const generic = { error: "No encontramos un plan activo con ese número. Si eres socio, escríbenos para revisarlo." };
  if (!contact) return generic;

  const { data: list } = await admin
    .from("memberships")
    .select("status, starts_on, ends_on, sessions_total, sessions_used")
    .eq("business_id", businessId)
    .eq("contact_id", contact.id);
  const current = currentMembership(list ?? [], date);
  if (!canEnter(membershipState(current, date))) return generic;

  const { data: result, error } = await admin.rpc("book_class_spot", {
    p_business_id: businessId,
    p_class_id: classId,
    p_date: date,
    p_contact_id: contact.id,
  });
  if (error) return { error: "No pudimos reservar. Intenta de nuevo." };
  if (result === "full") return { error: "La clase se llenó 😕 Prueba con otro horario." };
  if (result === "duplicate") return { error: "Ya tienes un cupo en esta clase." };
  if (result !== "ok") return { error: "Clase no disponible" };

  const identity = await ensureMemberIdentity(admin, businessId, contact);
  revalidatePath("/d/socios");
  return { success: true, token: identity.token };
}

/** Member cancels a class spot from their private link. Public. */
export async function cancelClassBooking(token: string, bookingId: string) {
  if (!/^[a-f0-9]{32}$/.test(token)) return { error: "Enlace inválido" };
  const admin = createAdminClient();
  const { data: contact } = await admin.from("contacts").select("id, business_id").eq("portal_token", token).maybeSingle();
  if (!contact) return { error: "Enlace inválido" };
  const { data: booking } = await admin
    .from("class_bookings")
    .select("id, status")
    .eq("id", bookingId)
    .eq("contact_id", contact.id)
    .eq("business_id", contact.business_id)
    .maybeSingle();
  if (!booking || booking.status !== "booked") return { error: "Esta reserva ya no se puede cancelar" };
  const { error } = await admin.from("class_bookings").update({ status: "cancelled" }).eq("id", booking.id);
  if (error) return { error: "No se pudo cancelar" };
  revalidatePath("/d/socios");
  return { success: true };
}
