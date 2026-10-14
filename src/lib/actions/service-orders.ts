"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateDailyCashOnSale } from "@/lib/actions/finance";
import { createServiceOrder, loadServiceBusiness, loadServiceItems, type ServiceRequestInput } from "@/lib/service-orders/data";
import { CLOSED, lineTotal, nextStatus, parseServiceSettings, promiseFrom, sumLines, type Line, type ServiceKind, type ServiceSettings } from "@/lib/service-orders/flow";
import type { createAdminClient } from "@/lib/supabase/admin";

const PATH = "/d/servicios";
const PAYMENT_METHODS = ["cash", "card", "transfer"];
type Supabase = Awaited<ReturnType<typeof createClient>>;
type AnyClient = ReturnType<typeof createAdminClient>;

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? supabase : null;
}

async function loadOrder(supabase: Supabase, orderId: string) {
  const { data } = await supabase
    .from("service_orders")
    .select("id, business_id, code, kind, status, return_mode, handoff, transaction_id, payment_status, total, items, delivery_fee, dropoff_lat, dropoff_lng, pickup_lat, pickup_lng, customer_name")
    .eq("id", orderId)
    .maybeSingle();
  return data;
}

async function logEvent(supabase: Supabase, order: { id: string; business_id: string }, status: string, note?: string | null) {
  await supabase.from("service_order_events").insert({ business_id: order.business_id, order_id: order.id, status, note: note?.trim().slice(0, 200) || null });
}

/** Keeps the linked transaction in step: completed only when delivered AND paid. */
async function syncTransaction(supabase: Supabase, transactionId: string | null, status: string, paid: boolean) {
  if (!transactionId) return;
  const txStatus = status === "cancelled" ? "cancelled" : status === "delivered" && paid ? "completed" : status === "requested" ? "pending" : "in_progress";
  await supabase
    .from("transactions")
    .update({ status: txStatus, ...(txStatus === "completed" ? { completed_at: new Date().toISOString() } : {}), updated_at: new Date().toISOString() })
    .eq("id", transactionId);
}

export async function createDeskServiceOrder(businessId: string, input: ServiceRequestInput) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const business = await loadServiceBusiness(businessId, supabase as unknown as AnyClient);
  if (!business) return { error: "Negocio no encontrado" };
  // Laundry at the counter: the clothes are already here
  const initialStatus = business.kind === "laundry" && input.handoff !== "pickup" ? "received" : "requested";
  const res = await createServiceOrder(supabase as unknown as AnyClient, business, input, { source: "desk", initialStatus });
  if ("error" in res) return { error: res.error };
  revalidatePath(PATH);
  return { success: true, id: res.id };
}

/** Timeline + courier link for the detail dialog. */
export async function getServiceOrderDetail(orderId: string) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const order = await loadOrder(supabase, orderId);
  if (!order) return { error: "Orden no encontrada" };
  const [{ data: events }, { data: delivery }] = await Promise.all([
    supabase.from("service_order_events").select("status, note, created_at").eq("order_id", order.id).order("created_at"),
    order.transaction_id
      ? supabase.from("deliveries").select("courier_token, status, courier_name, location_updated_at").eq("transaction_id", order.transaction_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return {
    events: (events ?? []).map((e) => ({ status: e.status, note: e.note, at: e.created_at as string })),
    courier: delivery
      ? { token: delivery.courier_token as string, status: delivery.status as string, name: delivery.courier_name as string | null, lastSeen: delivery.location_updated_at as string | null }
      : null,
  };
}

/** Moves the order to its next stage (or a specific allowed one). */
export async function advanceServiceOrder(orderId: string, to: string, note?: string) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const order = await loadOrder(supabase, orderId);
  if (!order) return { error: "Orden no encontrada" };
  if (CLOSED.includes(order.status)) return { error: "La orden ya está cerrada" };
  const expected = nextStatus(order.kind as ServiceKind, order.status, order.return_mode);
  if (to !== expected) return { error: "Ese cambio de estado no aplica ahora" };
  if (order.kind === "shipment" && to === "assigned") return { error: "Asigna el mensajero desde el detalle de la orden" };

  const update: Record<string, unknown> = { status: to, updated_at: new Date().toISOString() };
  if (to === "received") {
    const { data: biz } = await supabase.from("businesses").select("service_settings").eq("id", order.business_id).single();
    update.promised_at = promiseFrom(new Date(), parseServiceSettings(biz?.service_settings)).toISOString();
  }
  if (to === "delivered") update.completed_at = new Date().toISOString();
  const { error } = await supabase.from("service_orders").update(update).eq("id", order.id);
  if (error) return { error: "No se pudo actualizar" };
  await logEvent(supabase, order, to, note);
  await syncTransaction(supabase, order.transaction_id, to, order.payment_status === "paid");

  // Courier link left open when the order is closed by hand
  if (to === "delivered" && order.transaction_id) {
    await supabase.from("deliveries").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("transaction_id", order.transaction_id).in("status", ["pending", "on_the_way"]);
  }
  revalidatePath(PATH);
  return { success: true };
}

/**
 * Assigns a courier: creates the live-tracking delivery (destination = drop-off)
 * and returns the courier link token. Shipments move to "assigned".
 */
export async function assignServiceCourier(orderId: string, employeeId: string | null, courierName?: string) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const order = await loadOrder(supabase, orderId);
  if (!order) return { error: "Orden no encontrada" };
  if (CLOSED.includes(order.status)) return { error: "La orden ya está cerrada" };
  if (!order.transaction_id) return { error: "La orden no tiene transacción asociada" };
  if (order.kind === "laundry" && order.return_mode !== "delivery") return { error: "Esta orden se recoge en el local" };

  let name = (courierName ?? "").trim().slice(0, 60);
  if (employeeId) {
    const { data: emp } = await supabase.from("employees").select("id, full_name").eq("id", employeeId).eq("business_id", order.business_id).single();
    if (!emp) return { error: "Mensajero no encontrado" };
    name = emp.full_name;
  }

  const { data: existing } = await supabase
    .from("deliveries")
    .select("id, courier_token, status")
    .eq("transaction_id", order.transaction_id)
    .maybeSingle();
  let courierToken = existing?.courier_token as string | undefined;
  if (!existing) {
    const { data: created, error } = await supabase
      .from("deliveries")
      .insert({
        business_id: order.business_id,
        transaction_id: order.transaction_id,
        dest_lat: order.dropoff_lat,
        dest_lng: order.dropoff_lng,
        courier_name: name || null,
      })
      .select("courier_token")
      .single();
    if (error) return { error: "No se pudo crear el enlace del mensajero" };
    courierToken = created.courier_token;
  } else if (name) {
    await supabase.from("deliveries").update({ courier_name: name }).eq("id", existing.id);
  }

  await supabase.from("service_orders").update({ assigned_to: employeeId, updated_at: new Date().toISOString() }).eq("id", order.id);
  if (order.kind === "shipment" && (order.status === "requested" || order.status === "failed")) {
    await supabase.from("service_orders").update({ status: "assigned" }).eq("id", order.id);
    await logEvent(supabase, order, "assigned", name ? `Mensajero: ${name}` : "Mensajero asignado");
    await syncTransaction(supabase, order.transaction_id, "assigned", order.payment_status === "paid");
  }
  revalidatePath(PATH);
  return { success: true, courierToken };
}

/** Shipment could not be delivered (nobody home, wrong address…). */
export async function reportServiceIssue(orderId: string, note: string) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const order = await loadOrder(supabase, orderId);
  if (!order || order.kind !== "shipment") return { error: "Orden no encontrada" };
  if (CLOSED.includes(order.status)) return { error: "La orden ya está cerrada" };
  const text = (note ?? "").trim();
  if (text.length < 3) return { error: "Describe la novedad" };
  await supabase.from("service_orders").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", order.id);
  // A new courier link is created when it's reassigned
  if (order.transaction_id) await supabase.from("deliveries").delete().eq("transaction_id", order.transaction_id).neq("status", "delivered");
  await logEvent(supabase, order, "failed", text);
  revalidatePath(PATH);
  return { success: true };
}

export async function cancelServiceOrder(orderId: string, reason?: string) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const order = await loadOrder(supabase, orderId);
  if (!order) return { error: "Orden no encontrada" };
  if (CLOSED.includes(order.status)) return { error: "La orden ya está cerrada" };
  if (order.payment_status === "paid") return { error: "La orden ya fue pagada: registra la devolución en Finanzas antes de cancelar" };
  await supabase.from("service_orders").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", order.id);
  await logEvent(supabase, order, "cancelled", reason || "Cancelado por el negocio");
  await syncTransaction(supabase, order.transaction_id, "cancelled", false); // also cancels the courier link (trigger)
  revalidatePath(PATH);
  return { success: true };
}

/** Laundry: real weight / garments counted at reception → reprices the order. */
export async function updateServiceLines(orderId: string, lines: { itemId: string; quantity: number }[], weightKg: number | null) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const order = await loadOrder(supabase, orderId);
  if (!order) return { error: "Orden no encontrada" };
  if (CLOSED.includes(order.status) || order.payment_status === "paid") return { error: "La orden ya está pagada o cerrada" };

  const items = await loadServiceItems(order.business_id, supabase as unknown as AnyClient);
  const byId = new Map(items.map((i) => [i.id, i]));
  const priced: Line[] = lines
    .filter((l) => byId.has(l.itemId) && Number(l.quantity) > 0)
    .map((l) => {
      const item = byId.get(l.itemId)!;
      const quantity = Math.min(200, Math.round(Number(l.quantity) * 10) / 10);
      return {
        itemId: item.id,
        name: /kilo|kg/i.test(item.name) ? `${item.name} · ${String(quantity).replace(".", ",")} kg` : item.name,
        quantity,
        unitPrice: item.price,
        total: lineTotal(item.price, quantity),
      };
    });
  // Keep non-catalog lines (distance, package size) as they were
  const extra = ((order.items as unknown as Line[]) ?? []).filter((l) => !l.itemId);
  if (!priced.length) return { error: "Agrega al menos un servicio" };
  const subtotal = sumLines(priced);
  const total = subtotal + Number(order.delivery_fee);
  const all = [...priced, ...extra];

  const { error } = await supabase
    .from("service_orders")
    .update({ items: all as unknown as never, subtotal, total, weight_kg: weightKg && weightKg > 0 ? weightKg : null, updated_at: new Date().toISOString() })
    .eq("id", order.id);
  if (error) return { error: "No se pudo actualizar" };
  if (order.transaction_id) {
    await supabase.from("transactions").update({ subtotal: total, total }).eq("id", order.transaction_id);
    await supabase.from("transaction_items").delete().eq("transaction_id", order.transaction_id);
    await supabase.from("transaction_items").insert(
      [...all, ...(Number(order.delivery_fee) > 0 && order.kind === "laundry" ? [{ itemId: null, name: "Servicio a domicilio", quantity: 1, unitPrice: Number(order.delivery_fee), total: Number(order.delivery_fee) }] : [])].map((l) => ({
        transaction_id: order.transaction_id!,
        catalog_item_id: l.itemId,
        name: l.name,
        quantity: 1,
        unit_price: l.total,
        total_price: l.total,
      }))
    );
  }
  revalidatePath(PATH);
  return { success: true, total };
}

/** Registers the payment (cash/card/transfer) on the order and in the daily cash. */
export async function chargeServiceOrder(orderId: string, method: string) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  if (!PAYMENT_METHODS.includes(method)) return { error: "Medio de pago inválido" };
  const order = await loadOrder(supabase, orderId);
  if (!order) return { error: "Orden no encontrada" };
  if (order.payment_status === "paid") return { error: "Ya está pagada" };
  if (order.status === "cancelled") return { error: "La orden está cancelada" };

  const { error } = await supabase
    .from("service_orders")
    .update({ payment_status: "paid", payment_method: method, updated_at: new Date().toISOString() })
    .eq("id", order.id);
  if (error) return { error: "No se pudo registrar el pago" };
  if (order.transaction_id) {
    await supabase.from("transactions").update({ payment_status: "paid", payment_method: method }).eq("id", order.transaction_id);
    await syncTransaction(supabase, order.transaction_id, order.status, true);
  }
  await updateDailyCashOnSale(order.business_id, Number(order.total), method);
  await logEvent(supabase, order, order.status, `Pago registrado (${method === "cash" ? "efectivo" : method === "card" ? "tarjeta" : "transferencia"})`);
  revalidatePath(PATH);
  return { success: true };
}

export async function saveServiceSettings(businessId: string, raw: Partial<ServiceSettings>) {
  const supabase = await requireUser();
  if (!supabase) return { error: "No autorizado" };
  const settings = parseServiceSettings(raw);
  const { error } = await supabase.from("businesses").update({ service_settings: settings as unknown as never }).eq("id", businessId);
  if (error) return { error: "No se pudo guardar" };
  revalidatePath(PATH);
  return { success: true };
}
