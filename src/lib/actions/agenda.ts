"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createOrder } from "@/lib/actions/orders";
import { parseBookingSettings, parseSchedule, type BookingSettings, type WeeklySchedule } from "@/lib/booking/availability";
import { DEFAULT_SERVICE_MINUTES } from "@/lib/booking/data";
import type { Json } from "@/types/database";

const PATH = "/d/agenda";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

export interface DashboardAppointmentInput {
  serviceId: string;
  employeeId: string;
  start: string; // ISO
  name: string;
  phone?: string;
  notes?: string;
}

/** Walk-ins and phone bookings. The DB exclusion constraint still prevents overlaps. */
export async function createDashboardAppointment(businessId: string, input: DashboardAppointmentInput) {
  const auth = await requireUser();
  if (!auth) return { error: "No autorizado" };
  const { supabase } = auth;

  const name = input.name.trim().slice(0, 120);
  if (name.length < 2) return { error: "Escribe el nombre del cliente" };
  const start = new Date(input.start);
  if (Number.isNaN(start.getTime())) return { error: "Fecha u hora inválida" };

  const { data: service } = await supabase
    .from("catalog_items")
    .select("id, price, duration_minutes")
    .eq("id", input.serviceId)
    .eq("business_id", businessId)
    .single();
  if (!service) return { error: "Servicio no encontrado" };
  const minutes = Number(service.duration_minutes) > 0 ? Number(service.duration_minutes) : DEFAULT_SERVICE_MINUTES;

  const { error } = await supabase.from("reservations").insert({
    business_id: businessId,
    item_id: service.id,
    employee_id: input.employeeId,
    customer_name: name,
    customer_phone: input.phone?.replace(/[^\d+]/g, "").slice(0, 20) || null,
    notes: input.notes?.trim().slice(0, 500) || null,
    reservation_time: start.toISOString(),
    end_time: new Date(start.getTime() + minutes * 60_000).toISOString(),
    party_size: 1,
    price: service.price,
    status: "confirmed",
    source: "dashboard",
  });
  if (error) {
    if (error.code === "23P01") return { error: "Ese profesional ya tiene una cita en ese horario" };
    return { error: "No se pudo crear la cita" };
  }
  revalidatePath(PATH);
  return { success: true };
}

const STATUSES = ["pending", "confirmed", "completed", "cancelled", "no_show"] as const;

/**
 * Changes an appointment status. "completed" with a payment method also
 * registers the sale (finance, daily cash, customer stats) through createOrder.
 */
export async function setAppointmentStatus(
  businessId: string,
  appointmentId: string,
  status: (typeof STATUSES)[number],
  paymentMethod?: string
) {
  const auth = await requireUser();
  if (!auth) return { error: "No autorizado" };
  if (!STATUSES.includes(status)) return { error: "Estado inválido" };
  const { supabase } = auth;

  const { data: appt } = await supabase
    .from("reservations")
    .select("id, item_id, customer_name, customer_phone, status, notes")
    .eq("id", appointmentId)
    .eq("business_id", businessId)
    .single();
  if (!appt) return { error: "Cita no encontrada" };

  // "No asistió" is stored as cancelled with a note (frees the slot, keeps history)
  const update =
    status === "no_show"
      ? { status: "cancelled", notes: [appt.notes, "No asistió"].filter(Boolean).join(" · "), updated_at: new Date().toISOString() }
      : { status, updated_at: new Date().toISOString() };
  const { error } = await supabase.from("reservations").update(update).eq("id", appt.id).eq("business_id", businessId);
  if (error) {
    if (error.code === "23P01") return { error: "Ese horario ya está ocupado por otra cita" };
    return { error: "No se pudo actualizar la cita" };
  }

  if (status === "completed" && paymentMethod && appt.item_id && appt.status !== "completed") {
    const sale = await createOrder(businessId, {
      type: "sale",
      customer_name: appt.customer_name,
      customer_phone: appt.customer_phone ?? undefined,
      payment_method: paymentMethod,
      discount: 0,
      tax: 0,
      items: [{ catalog_item_id: appt.item_id, quantity: 1 }],
    });
    if ("error" in sale && sale.error) return { error: `Cita completada, pero no se pudo registrar el cobro: ${sale.error}` };
  }

  revalidatePath(PATH);
  return { success: true };
}

export interface ProfessionalInput {
  bookable: boolean;
  bio: string;
  schedule: WeeklySchedule;
  serviceIds: string[];
}

export async function saveProfessional(businessId: string, employeeId: string, input: ProfessionalInput) {
  const auth = await requireUser();
  if (!auth) return { error: "No autorizado" };
  const { supabase } = auth;

  const { error } = await supabase
    .from("employees")
    .update({
      bookable: input.bookable,
      bio: input.bio.trim().slice(0, 300) || null,
      schedule: parseSchedule(input.schedule) as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", employeeId)
    .eq("business_id", businessId);
  if (error) return { error: "No se pudo guardar el profesional" };

  // Replace the services this professional performs
  await supabase.from("employee_services").delete().eq("employee_id", employeeId).eq("business_id", businessId);
  const ids = [...new Set(input.serviceIds)].slice(0, 200);
  if (ids.length) {
    const { error: linkError } = await supabase
      .from("employee_services")
      .insert(ids.map((id) => ({ employee_id: employeeId, catalog_item_id: id, business_id: businessId })));
    if (linkError) return { error: "Se guardó el horario, pero no los servicios" };
  }
  revalidatePath(PATH);
  return { success: true };
}

export async function addTimeOff(businessId: string, employeeId: string, startsAt: string, endsAt: string, reason: string) {
  const auth = await requireUser();
  if (!auth) return { error: "No autorizado" };
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return { error: "Rango de fechas inválido" };
  const { error } = await auth.supabase.from("staff_time_off").insert({
    business_id: businessId,
    employee_id: employeeId,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    reason: reason.trim().slice(0, 200) || null,
  });
  if (error) return { error: "No se pudo guardar la ausencia" };
  revalidatePath(PATH);
  return { success: true };
}

export async function removeTimeOff(businessId: string, timeOffId: string) {
  const auth = await requireUser();
  if (!auth) return { error: "No autorizado" };
  const { error } = await auth.supabase.from("staff_time_off").delete().eq("id", timeOffId).eq("business_id", businessId);
  if (error) return { error: "No se pudo eliminar" };
  revalidatePath(PATH);
  return { success: true };
}

export async function saveBookingSettings(businessId: string, input: BookingSettings) {
  const auth = await requireUser();
  if (!auth) return { error: "No autorizado" };
  const settings = parseBookingSettings(input);
  const { error } = await auth.supabase
    .from("businesses")
    .update({ booking_settings: settings as unknown as Json })
    .eq("id", businessId);
  if (error) return { error: "No se pudieron guardar las reglas" };
  revalidatePath(PATH);
  return { success: true };
}
