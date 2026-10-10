"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateDailyCashOnSale } from "@/lib/actions/finance";
import { localDate } from "@/lib/booking/availability";
import { findOrCreateContact, normalizePhone } from "@/lib/memberships/data";
import { loadSeasons } from "@/lib/stays/data";
import {
  DATE_RE,
  folio,
  newStayCode,
  nightlyRates,
  nightsCount,
  parseStaySettings,
  sumNights,
  type StaySettings,
} from "@/lib/stays/pricing";

const PATH = "/d/estadias";
const PAYMENT_METHODS = ["cash", "card", "transfer"];
type Supabase = Awaited<ReturnType<typeof createClient>>;

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? supabase : null;
}

/** Loads a stay the current user can manage (RLS = business members only). */
async function loadStay(supabase: Supabase, stayId: string) {
  const { data } = await supabase
    .from("stays")
    .select("id, business_id, code, item_id, room_id, contact_id, guest_name, guest_phone, guest_email, status, check_in, check_out, room_total, notes")
    .eq("id", stayId)
    .maybeSingle();
  return data;
}

async function businessInfo(supabase: Supabase, businessId: string) {
  const { data } = await supabase.from("businesses").select("timezone, stay_settings").eq("id", businessId).single();
  return { timeZone: data?.timezone || "America/Bogota", settings: parseStaySettings(data?.stay_settings) };
}

/** First active room of a type with no live stay on any night of the range. */
async function findFreeRoom(supabase: Supabase, businessId: string, itemId: string, checkIn: string, checkOut: string, ignoreStayId?: string) {
  const [{ data: rooms }, { data: busy }] = await Promise.all([
    supabase.from("rooms").select("id, housekeeping").eq("business_id", businessId).eq("item_id", itemId).eq("active", true).order("sort_order").order("name"),
    supabase
      .from("stays")
      .select("id, room_id")
      .eq("business_id", businessId)
      .in("status", ["pending", "confirmed", "checked_in"])
      .not("room_id", "is", null)
      .lt("check_in", checkOut)
      .gt("check_out", checkIn),
  ]);
  const taken = new Set((busy ?? []).filter((s) => s.id !== ignoreStayId).map((s) => s.room_id));
  return (rooms ?? []).find((r) => r.housekeeping !== "maintenance" && !taken.has(r.id))?.id ?? null;
}

async function priceStay(supabase: Supabase, businessId: string, itemId: string, checkIn: string, checkOut: string, settings: StaySettings) {
  const { data: type } = await supabase.from("catalog_items").select("id, price, type").eq("id", itemId).eq("business_id", businessId).single();
  if (!type || type.type !== "room") return null;
  const seasons = await loadSeasons(businessId, createAdminClient());
  const nights = nightlyRates({ basePrice: Number(type.price), itemId, checkIn, checkOut, seasons, settings });
  return { nights, total: sumNights(nights) };
}

const OVERLAP = "Esa habitación ya está ocupada en alguna de esas noches.";

export interface DeskStayInput {
  itemId: string;
  roomId: string | null;
  checkIn: string;
  checkOut: string;
  name: string;
  phone?: string;
  email?: string;
  document?: string;
  nationality?: string;
  adults: number;
  children: number;
  source: "desk" | "phone" | "ota";
  notes?: string;
  /** Agreed total for the whole stay (overrides the rate) */
  totalOverride?: number | null;
  deposit?: { amount: number; method: string } | null;
}

/** Front desk / phone booking. Picks a free room of the type when none is chosen. */
export async function createDeskStay(businessId: string, input: DeskStayInput) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const name = (input.name ?? "").trim().slice(0, 120);
  if (name.length < 2) return { error: "Escribe el nombre del huésped" };
  if (!DATE_RE.test(input.checkIn) || !DATE_RE.test(input.checkOut) || input.checkOut <= input.checkIn) return { error: "Revisa las fechas" };
  if (nightsCount(input.checkIn, input.checkOut) > 120) return { error: "Máximo 120 noches por reserva" };

  const { settings } = await businessInfo(supabase, businessId);
  const priced = await priceStay(supabase, businessId, input.itemId, input.checkIn, input.checkOut, settings);
  if (!priced) return { error: "Tipo de habitación no encontrado" };

  let roomId = input.roomId;
  if (roomId) {
    const { data: room } = await supabase.from("rooms").select("id, item_id").eq("id", roomId).eq("business_id", businessId).single();
    if (!room) return { error: "Habitación no encontrada" };
  } else {
    roomId = await findFreeRoom(supabase, businessId, input.itemId, input.checkIn, input.checkOut);
    if (!roomId) return { error: "No hay habitaciones libres de ese tipo en esas fechas" };
  }

  const phone = normalizePhone(input.phone ?? "");
  let contactId: string | null = null;
  if (phone.replace(/\D/g, "").length >= 7) {
    contactId = (await findOrCreateContact(createAdminClient(), businessId, { name, phone, email: input.email?.trim() || null })).id;
  }

  const override = input.totalOverride != null && Number(input.totalOverride) >= 0 ? Math.round(Number(input.totalOverride)) : null;
  const { data: stay, error } = await supabase
    .from("stays")
    .insert({
      business_id: businessId,
      code: newStayCode(),
      item_id: input.itemId,
      room_id: roomId,
      contact_id: contactId,
      guest_name: name,
      guest_phone: phone || null,
      guest_email: input.email?.trim().slice(0, 160) || null,
      guest_document: input.document?.trim().slice(0, 40) || null,
      guest_nationality: input.nationality?.trim().slice(0, 60) || null,
      adults: Math.min(30, Math.max(1, Math.round(input.adults || 1))),
      children: Math.min(30, Math.max(0, Math.round(input.children || 0))),
      check_in: input.checkIn,
      check_out: input.checkOut,
      status: "confirmed",
      nightly: priced.nights as unknown as never,
      room_total: override ?? priced.total,
      source: ["desk", "phone", "ota"].includes(input.source) ? input.source : "desk",
      notes: [input.notes?.trim().slice(0, 500), override != null && override !== priced.total ? "Tarifa acordada" : null].filter(Boolean).join(" · ") || null,
    })
    .select("id, code, business_id, item_id, contact_id, guest_name, guest_phone")
    .single();
  if (error) return { error: error.code === "23P01" ? OVERLAP : "No se pudo crear la reserva" };

  if (input.deposit && Number(input.deposit.amount) > 0) {
    const paid = await recordPayment(supabase, stay, Number(input.deposit.amount), input.deposit.method, "Anticipo");
    if ("error" in paid) return { error: `Reserva creada, pero el anticipo no se registró: ${paid.error}` };
  }
  revalidatePath(PATH);
  return { success: true, id: stay.id };
}

/** Payment on the folio → stay_payments + a completed transaction (shows in cash & reports). */
async function recordPayment(
  supabase: Supabase,
  stay: { id: string; business_id: string; code: string; item_id: string | null; contact_id: string | null; guest_name: string; guest_phone: string | null },
  amount: number,
  method: string,
  note: string
) {
  if (!PAYMENT_METHODS.includes(method)) return { error: "Medio de pago inválido" };
  const value = Math.round(amount);
  if (!(value > 0)) return { error: "Monto inválido" };

  const { data: tx, error: txError } = await supabase
    .from("transactions")
    .insert({
      business_id: stay.business_id,
      type: "reservation",
      status: "completed",
      payment_method: method,
      payment_status: "paid",
      subtotal: value,
      total: value,
      customer_name: stay.guest_name,
      customer_phone: stay.guest_phone,
      contact_id: stay.contact_id,
      code: `HOS-${Date.now().toString().slice(-6)}`,
      notes: `Estadía ${stay.code} · ${note}`,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (txError) return { error: "No se pudo registrar el pago" };
  await supabase.from("transaction_items").insert({
    transaction_id: tx.id,
    catalog_item_id: stay.item_id,
    name: `Estadía ${stay.code} · ${note}`,
    quantity: 1,
    unit_price: value,
    total_price: value,
  });
  const { error } = await supabase
    .from("stay_payments")
    .insert({ business_id: stay.business_id, stay_id: stay.id, amount: value, method, transaction_id: tx.id, note });
  if (error) return { error: "No se pudo registrar el pago" };
  await updateDailyCashOnSale(stay.business_id, value, method);
  return { success: true };
}

async function balanceOf(supabase: Supabase, stayId: string, roomTotal: number) {
  const [{ data: charges }, { data: payments }] = await Promise.all([
    supabase.from("stay_charges").select("amount").eq("stay_id", stayId),
    supabase.from("stay_payments").select("amount").eq("stay_id", stayId),
  ]);
  return folio(roomTotal, charges ?? [], payments ?? []);
}

/** Folio detail for the stay dialog: extras and payments. */
export async function getStayFolio(stayId: string) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const [{ data: charges }, { data: payments }] = await Promise.all([
    supabase.from("stay_charges").select("id, description, quantity, amount, created_at").eq("stay_id", stayId).order("created_at"),
    supabase.from("stay_payments").select("id, amount, method, note, created_at").eq("stay_id", stayId).order("created_at"),
  ]);
  return {
    charges: (charges ?? []).map((c) => ({ id: c.id, description: c.description, quantity: c.quantity, amount: Number(c.amount), at: c.created_at as string })),
    payments: (payments ?? []).map((p) => ({ id: p.id, amount: Number(p.amount), method: p.method, note: p.note, at: p.created_at as string })),
  };
}

export async function addStayPayment(stayId: string, amount: number, method: string, note?: string) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const stay = await loadStay(supabase, stayId);
  if (!stay) return { error: "Reserva no encontrada" };
  const res = await recordPayment(supabase, stay, amount, method, (note ?? "").trim().slice(0, 80) || "Abono");
  if ("error" in res) return res;
  revalidatePath(PATH);
  return { success: true };
}

export async function addStayCharge(stayId: string, input: { itemId?: string | null; description?: string; quantity: number; unitPrice?: number }) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const stay = await loadStay(supabase, stayId);
  if (!stay) return { error: "Reserva no encontrada" };
  if (["cancelled", "no_show"].includes(stay.status)) return { error: "La reserva está cerrada" };
  const quantity = Math.min(999, Math.max(1, Math.round(input.quantity || 1)));

  let description = (input.description ?? "").trim().slice(0, 120);
  let unit = Math.round(Number(input.unitPrice) || 0);
  if (input.itemId) {
    const { data: item } = await supabase.from("catalog_items").select("name, price").eq("id", input.itemId).eq("business_id", stay.business_id).single();
    if (!item) return { error: "Producto no encontrado" };
    description = description || item.name;
    unit = input.unitPrice != null ? unit : Number(item.price);
  }
  if (description.length < 2) return { error: "Describe el consumo" };
  if (unit < 0) return { error: "Precio inválido" };

  const { error } = await supabase.from("stay_charges").insert({
    business_id: stay.business_id,
    stay_id: stay.id,
    item_id: input.itemId || null,
    description,
    quantity,
    amount: unit * quantity,
  });
  if (error) return { error: "No se pudo agregar el consumo" };
  revalidatePath(PATH);
  return { success: true };
}

export async function removeStayCharge(chargeId: string) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const { error } = await supabase.from("stay_charges").delete().eq("id", chargeId);
  if (error) return { error: "No se pudo quitar el consumo" };
  revalidatePath(PATH);
  return { success: true };
}

/** Confirms a web booking, or cancels / marks no-show (frees the room). */
export async function setStayStatus(stayId: string, status: "confirmed" | "cancelled" | "no_show") {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const stay = await loadStay(supabase, stayId);
  if (!stay) return { error: "Reserva no encontrada" };
  if (!["pending", "confirmed"].includes(stay.status)) return { error: "Esta reserva ya no se puede cambiar" };
  const label = status === "cancelled" ? "Cancelada en recepción" : status === "no_show" ? "No llegó" : null;
  const { error } = await supabase
    .from("stays")
    .update({
      status,
      notes: label ? [stay.notes, label].filter(Boolean).join(" · ") : stay.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", stay.id);
  if (error) return { error: "No se pudo actualizar" };
  revalidatePath(PATH);
  return { success: true };
}

/** Assigns or moves the stay to a room (upgrades keep the agreed price). */
export async function assignStayRoom(stayId: string, roomId: string) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const stay = await loadStay(supabase, stayId);
  if (!stay) return { error: "Reserva no encontrada" };
  const { data: room } = await supabase.from("rooms").select("id, item_id").eq("id", roomId).eq("business_id", stay.business_id).single();
  if (!room) return { error: "Habitación no encontrada" };
  const { error } = await supabase
    .from("stays")
    .update({ room_id: room.id, item_id: room.item_id, updated_at: new Date().toISOString() })
    .eq("id", stay.id);
  if (error) return { error: error.code === "23P01" ? OVERLAP : "No se pudo mover" };
  revalidatePath(PATH);
  return { success: true };
}

/** Changes dates; reprices with the current rates unless the price was agreed. */
export async function changeStayDates(stayId: string, checkIn: string, checkOut: string, reprice: boolean) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const stay = await loadStay(supabase, stayId);
  if (!stay) return { error: "Reserva no encontrada" };
  if (!["pending", "confirmed", "checked_in"].includes(stay.status)) return { error: "Esta reserva ya está cerrada" };
  if (!DATE_RE.test(checkIn) || !DATE_RE.test(checkOut) || checkOut <= checkIn) return { error: "Revisa las fechas" };
  if (stay.status === "checked_in" && checkIn !== stay.check_in) return { error: "El huésped ya llegó: solo puedes cambiar la salida" };

  const update: Record<string, unknown> = { check_in: checkIn, check_out: checkOut, updated_at: new Date().toISOString() };
  if (reprice && stay.item_id) {
    const { settings } = await businessInfo(supabase, stay.business_id);
    const priced = await priceStay(supabase, stay.business_id, stay.item_id, checkIn, checkOut, settings);
    if (priced) Object.assign(update, { nightly: priced.nights, room_total: priced.total });
  }
  const { error } = await supabase.from("stays").update(update).eq("id", stay.id);
  if (error) return { error: error.code === "23P01" ? `${OVERLAP} Mueve la reserva a otra habitación primero.` : "No se pudo cambiar" };
  revalidatePath(PATH);
  return { success: true };
}

/** Check-in: the guest's ID is required (hotel registration card, TRA). */
export async function checkInStay(stayId: string, guest: { document: string; nationality?: string; phone?: string }) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const stay = await loadStay(supabase, stayId);
  if (!stay) return { error: "Reserva no encontrada" };
  if (!["pending", "confirmed"].includes(stay.status)) return { error: "Esta reserva no está para check-in" };
  if (!stay.room_id) return { error: "Asigna una habitación antes del check-in" };
  const document = (guest.document ?? "").trim().slice(0, 40);
  if (document.length < 4) return { error: "Escribe el documento del huésped (requerido para la tarjeta de registro)" };

  const { timeZone } = await businessInfo(supabase, stay.business_id);
  if (stay.check_in > localDate(new Date(), timeZone)) return { error: "La llegada es en una fecha futura. Cambia las fechas primero." };

  const phone = normalizePhone(guest.phone ?? "");
  const { error } = await supabase
    .from("stays")
    .update({
      status: "checked_in",
      checked_in_at: new Date().toISOString(),
      guest_document: document,
      guest_nationality: guest.nationality?.trim().slice(0, 60) || null,
      ...(phone ? { guest_phone: phone } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", stay.id);
  if (error) return { error: "No se pudo hacer el check-in" };
  revalidatePath(PATH);
  return { success: true };
}

/** Check-out: settles the balance (if a method is given) and sends the room to housekeeping. */
export async function checkOutStay(stayId: string, payBalanceWith?: string | null) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const stay = await loadStay(supabase, stayId);
  if (!stay) return { error: "Reserva no encontrada" };
  if (stay.status !== "checked_in") return { error: "El huésped no está en casa" };

  const account = await balanceOf(supabase, stay.id, Number(stay.room_total));
  if (account.balance > 0) {
    if (!payBalanceWith) return { error: "Hay saldo pendiente. Cóbralo antes del check-out.", balance: account.balance };
    const paid = await recordPayment(supabase, stay, account.balance, payBalanceWith, "Saldo al salir");
    if ("error" in paid) return paid;
  }

  const { timeZone } = await businessInfo(supabase, stay.business_id);
  const today = localDate(new Date(), timeZone);
  const { error } = await supabase
    .from("stays")
    .update({
      status: "checked_out",
      checked_out_at: new Date().toISOString(),
      // Early departure: the room is free again from today
      ...(stay.check_out > today && today > stay.check_in ? { check_out: today } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", stay.id);
  if (error) return { error: "No se pudo hacer el check-out" };
  if (stay.room_id) await supabase.from("rooms").update({ housekeeping: "dirty" }).eq("id", stay.room_id);
  revalidatePath(PATH);
  return { success: true };
}

/* ── rooms, housekeeping, rates ───────────────────────── */

export async function setHousekeeping(roomId: string, status: "clean" | "dirty" | "inspected" | "maintenance") {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  if (!["clean", "dirty", "inspected", "maintenance"].includes(status)) return { error: "Estado inválido" };
  const { error } = await supabase.from("rooms").update({ housekeeping: status }).eq("id", roomId);
  if (error) return { error: "No se pudo actualizar" };
  revalidatePath(PATH);
  return { success: true };
}

export async function saveRoom(businessId: string, input: { id?: string; itemId: string; name: string; floor?: string; active: boolean }) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const name = (input.name ?? "").trim().slice(0, 40);
  if (!name) return { error: "Escribe el número o nombre" };
  const { data: type } = await supabase.from("catalog_items").select("id, type").eq("id", input.itemId).eq("business_id", businessId).single();
  if (!type || type.type !== "room") return { error: "Tipo de habitación inválido" };
  const row = { business_id: businessId, item_id: input.itemId, name, floor: input.floor?.trim().slice(0, 20) || null, active: input.active };
  const { error } = input.id
    ? await supabase.from("rooms").update(row).eq("id", input.id).eq("business_id", businessId)
    : await supabase.from("rooms").insert(row);
  if (error) return { error: error.code === "23505" ? "Ya existe una habitación con ese nombre" : "No se pudo guardar" };
  revalidatePath(PATH);
  return { success: true };
}

/** Adds several rooms at once: "201-210" or "201, 202, 305". */
export async function addRoomsBulk(businessId: string, itemId: string, spec: string, floor?: string) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const names = new Set<string>();
  for (const part of (spec ?? "").split(",").map((p) => p.trim()).filter(Boolean)) {
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const [a, b] = [Number(range[1]), Number(range[2])];
      if (b < a || b - a > 200) return { error: `Rango inválido: ${part}` };
      for (let n = a; n <= b; n++) names.add(String(n));
    } else names.add(part.slice(0, 40));
  }
  if (!names.size) return { error: "Escribe los números, p. ej. 201-210" };
  const { data: type } = await supabase.from("catalog_items").select("id, type").eq("id", itemId).eq("business_id", businessId).single();
  if (!type || type.type !== "room") return { error: "Tipo de habitación inválido" };
  const { error } = await supabase.from("rooms").insert(
    [...names].map((name, i) => ({ business_id: businessId, item_id: itemId, name, floor: floor?.trim() || null, sort_order: i }))
  );
  if (error) return { error: error.code === "23505" ? "Alguno de esos números ya existe" : "No se pudieron crear" };
  revalidatePath(PATH);
  return { success: true, count: names.size };
}

export async function deleteRoom(roomId: string) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const { count } = await supabase.from("stays").select("id", { count: "exact", head: true }).eq("room_id", roomId);
  // With history the room is only deactivated, so past bookings keep their room
  const { error } = count
    ? await supabase.from("rooms").update({ active: false }).eq("id", roomId)
    : await supabase.from("rooms").delete().eq("id", roomId);
  if (error) return { error: "No se pudo eliminar" };
  revalidatePath(PATH);
  return { success: true, deactivated: Boolean(count) };
}

export async function saveRoomTypeRate(businessId: string, itemId: string, price: number, capacity: number) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  if (!(price >= 0) || !(capacity >= 1 && capacity <= 30)) return { error: "Revisa precio y capacidad" };
  const { error } = await supabase
    .from("catalog_items")
    .update({ price: Math.round(price), capacity: Math.round(capacity), updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("business_id", businessId)
    .eq("type", "room");
  if (error) return { error: "No se pudo guardar" };
  revalidatePath(PATH);
  return { success: true };
}

export async function saveSeason(
  businessId: string,
  input: { id?: string; name: string; itemId: string | null; startsOn: string; endsOn: string; adjustmentPct: number; minNights: number | null }
) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const name = (input.name ?? "").trim().slice(0, 60);
  if (!name) return { error: "Ponle nombre a la temporada" };
  if (!DATE_RE.test(input.startsOn) || !DATE_RE.test(input.endsOn) || input.endsOn < input.startsOn) return { error: "Revisa las fechas" };
  const pct = Math.round(Number(input.adjustmentPct) || 0);
  if (pct < -90 || pct > 300) return { error: "El ajuste debe estar entre -90% y 300%" };
  const min = input.minNights ? Math.min(30, Math.max(1, Math.round(input.minNights))) : null;
  const row = { business_id: businessId, name, item_id: input.itemId || null, starts_on: input.startsOn, ends_on: input.endsOn, adjustment_pct: pct, min_nights: min };
  const { error } = input.id
    ? await supabase.from("rate_seasons").update(row).eq("id", input.id).eq("business_id", businessId)
    : await supabase.from("rate_seasons").insert(row);
  if (error) return { error: "No se pudo guardar" };
  revalidatePath(PATH);
  return { success: true };
}

export async function deleteSeason(seasonId: string) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const { error } = await supabase.from("rate_seasons").delete().eq("id", seasonId);
  if (error) return { error: "No se pudo eliminar" };
  revalidatePath(PATH);
  return { success: true };
}

export async function saveStaySettings(businessId: string, raw: Partial<StaySettings>) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const settings = parseStaySettings(raw);
  const { error } = await supabase.from("businesses").update({ stay_settings: settings as unknown as never }).eq("id", businessId);
  if (error) return { error: "No se pudo guardar" };
  revalidatePath(PATH);
  return { success: true };
}
