"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicLimit, TOO_MANY } from "@/lib/rate-limit";
import { localDate } from "@/lib/booking/availability";
import { findOrCreateContact, normalizePhone } from "@/lib/memberships/data";
import { loadStayBusiness, quoteStay } from "@/lib/stays/data";
import { canCancelOnline, depositFor, newStayCode, validateStayDates } from "@/lib/stays/pricing";

/** Room types with free units and the price for those dates. Public. */
export async function searchStays(businessId: string, checkIn: string, checkOut: string, guests: number) {
  if (!(await publicLimit("slots", businessId))) return { error: TOO_MANY };
  const business = await loadStayBusiness(businessId);
  if (!business) return { error: "Hotel no disponible" };
  const invalid = validateStayDates(checkIn, checkOut, localDate(new Date(), business.timeZone), business.settings);
  if (invalid) return { error: invalid };

  const people = Math.min(30, Math.max(1, Math.round(Number(guests) || 1)));
  const quotes = await quoteStay(businessId, business.settings, checkIn, checkOut);
  return {
    results: quotes.map((q) => ({
      id: q.type.id,
      free: q.free,
      total: q.total,
      nights: q.nights.length,
      minNights: q.minNights,
      season: q.nights.find((n) => n.season)?.season ?? null,
      // rooms needed for the group with this type
      roomsNeeded: Math.ceil(people / q.type.capacity),
    })),
  };
}

export interface StayBookingInput {
  itemId: string;
  rooms: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  name: string;
  phone: string;
  email?: string;
  document?: string;
  arrivalTime?: string;
  notes?: string;
}

/** Web booking: re-prices on the server and books free rooms atomically. Public. */
export async function bookStay(businessId: string, input: StayBookingInput) {
  const name = (input.name ?? "").trim().slice(0, 120);
  const phone = normalizePhone(input.phone ?? "");
  const email = (input.email ?? "").trim().slice(0, 160) || null;
  if (name.length < 2) return { error: "Escribe tu nombre" };
  if (phone.replace(/\D/g, "").length < 7) return { error: "Escribe un celular válido" };
  if (!(await publicLimit("book", businessId, phone))) return { error: TOO_MANY };

  const business = await loadStayBusiness(businessId);
  if (!business) return { error: "Hotel no disponible" };
  const invalid = validateStayDates(input.checkIn, input.checkOut, localDate(new Date(), business.timeZone), business.settings);
  if (invalid) return { error: invalid };

  const rooms = Math.min(10, Math.max(1, Math.round(Number(input.rooms) || 1)));
  const adults = Math.min(30, Math.max(1, Math.round(Number(input.adults) || 1)));
  const children = Math.min(30, Math.max(0, Math.round(Number(input.children) || 0)));

  const admin = createAdminClient();
  const quote = (await quoteStay(businessId, business.settings, input.checkIn, input.checkOut, admin)).find((q) => q.type.id === input.itemId);
  if (!quote) return { error: "Esa habitación no está disponible" };
  if (quote.nights.length < quote.minNights) return { error: `Para esas fechas la estadía mínima es de ${quote.minNights} noches` };
  if (adults + children > quote.type.capacity * rooms) {
    return { error: `${quote.type.name} es para máximo ${quote.type.capacity} ${quote.type.capacity === 1 ? "persona" : "personas"}. Agrega otra habitación.` };
  }
  if (quote.free < rooms) return { error: "Ya no quedan suficientes habitaciones de ese tipo para esas fechas.", taken: true };

  const contact = await findOrCreateContact(admin, businessId, { name, phone, email });
  // Guests are split across the rooms; each room is priced the same
  const perRoomAdults = Math.max(1, Math.ceil(adults / rooms));
  const perRoomChildren = Math.ceil(children / rooms);
  const status = business.settings.autoConfirm ? "confirmed" : "pending";

  const { data: token, error } = await admin.rpc("book_stay_rooms", {
    p_business_id: businessId,
    p_item_id: quote.type.id,
    p_check_in: input.checkIn,
    p_check_out: input.checkOut,
    p_count: rooms,
    p_stay: {
      code: newStayCode(),
      contact_id: contact.id,
      guest_name: name,
      guest_phone: phone,
      guest_email: email,
      guest_document: (input.document ?? "").trim().slice(0, 40) || null,
      adults: perRoomAdults,
      children: perRoomChildren,
      arrival_time: (input.arrivalTime ?? "").trim().slice(0, 20) || null,
      status,
      nightly: quote.nights,
      room_total: quote.total,
      source: "web",
      notes: (input.notes ?? "").trim().slice(0, 500) || null,
    },
  });
  if (error) {
    if (error.code === "23P01") return { error: "Alguien acaba de reservar esa habitación. Intenta de nuevo.", taken: true };
    console.error("[bookStay]", error.message);
    return { error: "No pudimos hacer la reserva. Intenta de nuevo." };
  }
  if (token === "full") return { error: "Ya no quedan suficientes habitaciones de ese tipo para esas fechas.", taken: true };
  if (typeof token !== "string" || token === "invalid") return { error: "Esa habitación no está disponible" };

  revalidatePath("/d/estadias");
  const total = quote.total * rooms;
  return {
    success: true,
    token,
    status,
    total,
    deposit: depositFor(total, business.settings),
    whatsapp: business.whatsapp,
  };
}

/** Guest cancels every room of their booking from the private link. Public. */
export async function cancelStayByToken(token: string) {
  if (!/^[a-f0-9]{32}$/.test(token)) return { error: "Enlace inválido" };
  const admin = createAdminClient();
  const { data: stays } = await admin
    .from("stays")
    .select("id, business_id, status, check_in, notes")
    .eq("manage_token", token);
  const live = (stays ?? []).filter((s) => s.status === "pending" || s.status === "confirmed");
  if (!stays?.length) return { error: "No encontramos esta reserva" };
  if (!live.length) return { error: "Esta reserva ya no se puede cancelar" };

  const business = await loadStayBusiness(live[0].business_id, admin);
  if (!business) return { error: "Hotel no disponible" };
  const today = localDate(new Date(), business.timeZone);
  if (!canCancelOnline(live[0].check_in, today, business.settings)) {
    return { error: `Solo se puede cancelar en línea hasta ${business.settings.cancelDays} ${business.settings.cancelDays === 1 ? "día" : "días"} antes de la llegada. Escríbenos.` };
  }

  for (const s of live) {
    await admin
      .from("stays")
      .update({
        status: "cancelled",
        notes: [s.notes, "Cancelada por el huésped desde su enlace"].filter(Boolean).join(" · "),
        updated_at: new Date().toISOString(),
      })
      .eq("id", s.id);
  }
  revalidatePath("/d/estadias");
  return { success: true };
}
