"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDate, pickStaff } from "@/lib/booking/availability";
import { daySlots, loadBookingBusiness, loadServices, loadStaff, staffForService } from "@/lib/booking/data";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Free times for a service on a date ("cualquiera" when employeeId is null). Public. */
export async function getAvailableSlots(businessId: string, serviceId: string, employeeId: string | null, date: string) {
  if (!DATE.test(date)) return { error: "Fecha inválida" };
  const business = await loadBookingBusiness(businessId);
  if (!business) return { error: "Negocio no disponible" };
  const [services, staff] = await Promise.all([loadServices(businessId), loadStaff(businessId)]);
  const service = services.find((s) => s.id === serviceId);
  if (!service) return { error: "Servicio no disponible" };

  const { slots } = await daySlots(business, service, staff, employeeId, date);
  return { slots: slots.map((s) => ({ start: s.start, label: s.label })) };
}

export interface BookingInput {
  serviceId: string;
  employeeId: string | null;
  start: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

/** Creates a web appointment after re-checking availability on the server. Public. */
export async function bookAppointment(businessId: string, input: BookingInput) {
  const name = (input.name ?? "").trim().slice(0, 120);
  const phone = (input.phone ?? "").replace(/[^\d+]/g, "").slice(0, 20);
  const email = (input.email ?? "").trim().slice(0, 160) || null;
  const notes = (input.notes ?? "").trim().slice(0, 500) || null;
  if (name.length < 2) return { error: "Escribe tu nombre" };
  if (phone.replace(/\D/g, "").length < 7) return { error: "Escribe un teléfono válido" };

  const business = await loadBookingBusiness(businessId);
  if (!business) return { error: "Negocio no disponible" };
  const [services, staff] = await Promise.all([loadServices(businessId), loadStaff(businessId)]);
  const service = services.find((s) => s.id === input.serviceId);
  if (!service) return { error: "Servicio no disponible" };
  if (input.employeeId && !staffForService(staff, service.id).some((s) => s.id === input.employeeId)) {
    return { error: "Ese profesional no realiza este servicio" };
  }

  const start = new Date(input.start);
  if (Number.isNaN(start.getTime())) return { error: "Horario inválido" };
  const date = localDate(start, business.timeZone);
  const { slots, input: staffInput } = await daySlots(business, service, staff, input.employeeId, date);
  const slot = slots.find((s) => s.start === start.toISOString());
  if (!slot) return { error: "Ese horario ya no está disponible. Elige otro, por favor.", taken: true };

  const employeeId = input.employeeId ?? pickStaff(slot.staffIds, staffInput);
  if (!employeeId) return { error: "No hay profesionales disponibles en ese horario", taken: true };

  const admin = createAdminClient();

  // Customer record (by phone) so the business sees their history
  let contactId: string | null = null;
  const { data: existing } = await admin.from("contacts").select("id").eq("business_id", businessId).eq("phone", phone).limit(1).maybeSingle();
  if (existing) contactId = existing.id;
  else {
    const { data: created } = await admin.from("contacts").insert({ business_id: businessId, full_name: name, phone, email }).select("id").single();
    contactId = created?.id ?? null;
  }

  const { data: appt, error } = await admin
    .from("reservations")
    .insert({
      business_id: businessId,
      item_id: service.id,
      employee_id: employeeId,
      contact_id: contactId,
      customer_name: name,
      customer_phone: phone,
      customer_email: email,
      notes,
      party_size: 1,
      price: service.price,
      reservation_time: slot.start,
      end_time: slot.end,
      status: business.settings.autoConfirm ? "confirmed" : "pending",
      source: "web",
    })
    .select("manage_token")
    .single();

  if (error) {
    // 23P01 = exclusion violation: someone booked that professional a moment ago
    if (error.code === "23P01") return { error: "Alguien acaba de tomar ese horario. Elige otro, por favor.", taken: true };
    console.error("[bookAppointment]", error.message);
    return { error: "No pudimos agendar tu cita. Intenta de nuevo." };
  }

  revalidatePath("/d/agenda");
  return {
    success: true,
    token: appt.manage_token as string,
    status: business.settings.autoConfirm ? "confirmed" : "pending",
    professional: staff.find((s) => s.id === employeeId)?.name ?? null,
  };
}

/** Customer cancels from their appointment link, within the business cancel window. Public. */
export async function cancelAppointmentByToken(token: string) {
  if (!/^[a-f0-9]{32}$/.test(token)) return { error: "Enlace inválido" };
  const admin = createAdminClient();
  const { data: appt } = await admin
    .from("reservations")
    .select("id, business_id, status, reservation_time, notes")
    .eq("manage_token", token)
    .maybeSingle();
  if (!appt) return { error: "No encontramos esta cita" };
  if (!["pending", "confirmed"].includes(appt.status)) return { error: "Esta cita ya no se puede cancelar" };

  const business = await loadBookingBusiness(appt.business_id);
  const hoursLeft = (new Date(appt.reservation_time).getTime() - Date.now()) / 3_600_000;
  if (business && hoursLeft < business.settings.cancelHours) {
    return { error: `Solo se puede cancelar en línea hasta ${business.settings.cancelHours} h antes. Escríbele al negocio.` };
  }

  const { error } = await admin
    .from("reservations")
    .update({
      status: "cancelled",
      notes: [appt.notes, "Cancelada por el cliente desde su enlace"].filter(Boolean).join(" · "),
      updated_at: new Date().toISOString(),
    })
    .eq("id", appt.id);
  if (error) return { error: "No se pudo cancelar" };
  revalidatePath("/d/agenda");
  return { success: true };
}
