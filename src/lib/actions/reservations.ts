"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createReservation(businessId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const customerName = formData.get("customer_name") as string;
  const customerEmail = (formData.get("customer_email") as string) || null;
  const customerPhone = (formData.get("customer_phone") as string) || null;
  const reservationTimeRaw = formData.get("reservation_time") as string;
  const endTimeRaw = formData.get("end_time") as string;
  const partySize = parseInt((formData.get("party_size") as string) || "1", 10);
  const notes = (formData.get("notes") as string) || null;
  const itemId = (formData.get("item_id") as string) || null;

  if (!customerName?.trim()) return { error: "El nombre del cliente es obligatorio" };
  if (!reservationTimeRaw) return { error: "La fecha y hora son obligatorias" };

  const { error } = await supabase.from("reservations").insert({
    business_id: businessId,
    customer_name: customerName.trim(),
    customer_email: customerEmail,
    customer_phone: customerPhone,
    reservation_time: new Date(reservationTimeRaw).toISOString(),
    end_time: endTimeRaw ? new Date(endTimeRaw).toISOString() : null,
    party_size: partySize,
    notes,
    item_id: itemId === "none" ? null : itemId,
    status: "confirmed", // default directly to confirmed for user creation
  });

  if (error) return { error: "Error al crear la reserva: " + error.message };

  revalidatePath("/d/reservations");
  return { success: true };
}

export async function updateReservationStatus(reservationId: string, status: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { error } = await supabase
    .from("reservations")
    .update({ status })
    .eq("id", reservationId);

  if (error) return { error: "Error al actualizar estado" };

  revalidatePath("/d/reservations");
  return { success: true };
}

export async function deleteReservation(reservationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { error } = await supabase
    .from("reservations")
    .delete()
    .eq("id", reservationId);

  if (error) return { error: "Error al eliminar reserva" };

  revalidatePath("/d/reservations");
  return { success: true };
}
