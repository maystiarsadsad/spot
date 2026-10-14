/**
 * Server data + creation for the service-orders engine (laundries, couriers).
 * Public pages are anonymous → service role, always filtered by business_id.
 * Prices are always computed here from the catalog, never taken from the browser.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { findOrCreateContact, normalizePhone } from "@/lib/memberships/data";
import {
  laundryDeliveryFee,
  lineTotal,
  newServiceCode,
  parseServiceSettings,
  promiseFrom,
  quoteShipment,
  sumLines,
  type Line,
  type ServiceKind,
  type ServiceSettings,
} from "./flow";

type Client = ReturnType<typeof createAdminClient>;

export interface ServiceBusiness {
  id: string;
  name: string;
  slug: string;
  type: string;
  kind: ServiceKind;
  timeZone: string;
  currency: string;
  whatsapp: string | null;
  address: string | null;
  settings: ServiceSettings;
}

export const kindOf = (type: string): ServiceKind => (type === "laundry" ? "laundry" : "shipment");

export async function loadServiceBusiness(businessId: string, admin: Client = createAdminClient()): Promise<ServiceBusiness | null> {
  const { data } = await admin
    .from("businesses")
    .select("id, name, slug, type, timezone, currency, whatsapp, phone, address, city, service_settings, active")
    .eq("id", businessId)
    .single();
  if (!data || data.active === false) return null;
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    type: data.type,
    kind: kindOf(data.type),
    timeZone: data.timezone || "America/Bogota",
    currency: data.currency || "COP",
    whatsapp: data.whatsapp || data.phone || null,
    address: [data.address, data.city].filter(Boolean).join(", ") || null,
    settings: parseServiceSettings(data.service_settings),
  };
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  category: string | null;
}

export async function loadServiceItems(businessId: string, admin: Client = createAdminClient()): Promise<ServiceItem[]> {
  const [{ data: items }, { data: cats }] = await Promise.all([
    admin
      .from("catalog_items")
      .select("id, name, description, price, image_url, category_id")
      .eq("business_id", businessId)
      .eq("type", "service")
      .eq("active", true)
      .order("sort_order"),
    admin.from("catalog_categories").select("id, name").eq("business_id", businessId),
  ]);
  const catName = new Map((cats ?? []).map((c) => [c.id, c.name]));
  return (items ?? []).map((it) => ({
    id: it.id,
    name: it.name,
    description: it.description ?? null,
    price: Number(it.price),
    imageUrl: it.image_url ?? null,
    category: it.category_id ? catName.get(it.category_id) ?? null : null,
  }));
}

/* ── creation ───────────────────────────────────────── */

export interface PlacePoint {
  address: string;
  lat: number | null;
  lng: number | null;
}

export interface ServiceRequestInput {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  scheduledFor?: string | null;
  // shipment
  serviceId?: string;
  size?: "small" | "medium" | "large";
  pickup?: PlacePoint;
  dropoff?: PlacePoint;
  recipientName?: string;
  recipientPhone?: string;
  description?: string;
  declaredValue?: number | null;
  // laundry
  lines?: { itemId: string; quantity: number }[];
  handoff?: "store" | "pickup";
  returnMode?: "store" | "delivery";
  home?: PlacePoint;
  weightKg?: number | null;
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const validPoint = (p?: PlacePoint | null) =>
  !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(Number(p.lat)) <= 90 && Math.abs(Number(p.lng)) <= 180;
const fmtKg = (n: number) => `${String(n).replace(".", ",")} kg`;

/** Prices the request from the catalog and settings. Returns an error message or the priced order. */
export async function priceServiceRequest(client: Client, business: ServiceBusiness, input: ServiceRequestInput) {
  const items = await loadServiceItems(business.id, client);
  const byId = new Map(items.map((i) => [i.id, i]));

  if (business.kind === "shipment") {
    const service = input.serviceId ? byId.get(input.serviceId) : null;
    if (!service) return { error: input.serviceId ? "Ese servicio ya no está disponible. Recarga la página." : "Elige el tipo de servicio" };
    const pickup = input.pickup, dropoff = input.dropoff;
    if (!clean(pickup?.address, 300) || !clean(dropoff?.address, 300)) return { error: "Escribe las direcciones de recogida y entrega" };
    if (!validPoint(pickup) || !validPoint(dropoff)) return { error: "Marca en el mapa los puntos de recogida y entrega" };
    const size = input.size && ["small", "medium", "large"].includes(input.size) ? input.size : "small";
    const quote = quoteShipment({ from: pickup as { lat: number; lng: number }, to: dropoff as { lat: number; lng: number }, basePrice: service.price, size, settings: business.settings });
    if (quote.tooFar) return { error: `Cubrimos recorridos de hasta ${business.settings.maxKm} km. Escríbenos para envíos más lejanos.` };
    const lines: Line[] = [{ itemId: service.id, name: service.name, quantity: 1, unitPrice: service.price, total: service.price }];
    if (quote.distanceFee) lines.push({ itemId: null, name: `Recorrido adicional (${String(quote.distanceKm).replace(".", ",")} km)`, quantity: 1, unitPrice: quote.distanceFee, total: quote.distanceFee });
    if (quote.sizeFee) lines.push({ itemId: null, name: `Paquete ${size === "large" ? "grande" : "mediano"}`, quantity: 1, unitPrice: quote.sizeFee, total: quote.sizeFee });
    return { lines, subtotal: service.price, deliveryFee: quote.distanceFee + quote.sizeFee, total: quote.total, distanceKm: quote.distanceKm, size };
  }

  const requested = (input.lines ?? []).filter((l) => byId.has(l.itemId) && Number(l.quantity) > 0).slice(0, 30);
  if (!requested.length) return { error: "Elige al menos un servicio" };
  const lines: Line[] = requested.map((l) => {
    const item = byId.get(l.itemId)!;
    const quantity = Math.min(200, Math.round(Number(l.quantity) * 10) / 10);
    const byKg = /kilo|kg/i.test(item.name);
    return {
      itemId: item.id,
      name: byKg ? `${item.name} · ${fmtKg(quantity)}` : item.name,
      quantity,
      unitPrice: item.price,
      total: lineTotal(item.price, quantity),
    };
  });
  const handoff = input.handoff === "pickup" ? "pickup" : "store";
  const returnMode = input.returnMode === "delivery" ? "delivery" : "store";
  if ((handoff === "pickup" || returnMode === "delivery") && !clean(input.home?.address, 300)) return { error: "Escribe la dirección para recoger o entregar" };
  const subtotal = sumLines(lines);
  const deliveryFee = laundryDeliveryFee(handoff, returnMode, business.settings);
  return { lines, subtotal, deliveryFee, total: subtotal + deliveryFee, handoff, returnMode } as const;
}

/**
 * Creates the service order + its transaction (pending until paid) + the
 * first timeline event. `client` is the admin client for web requests and
 * the user's client for front-desk orders (RLS applies).
 */
export async function createServiceOrder(
  client: Client,
  business: ServiceBusiness,
  input: ServiceRequestInput,
  opts: { source: "web" | "desk"; initialStatus?: string }
) {
  const name = clean(input.name, 120);
  const phone = normalizePhone(input.phone ?? "");
  if (name.length < 2) return { error: "Escribe el nombre" };
  if (phone.replace(/\D/g, "").length < 7) return { error: "Escribe un celular válido" };

  const priced = await priceServiceRequest(client, business, input);
  if ("error" in priced) return { error: priced.error as string };

  const email = clean(input.email, 160) || null;
  const contact = await findOrCreateContact(createAdminClient(), business.id, { name, phone, email });
  const code = newServiceCode(business.kind);
  const isShipment = business.kind === "shipment";
  const home = input.home;
  const scheduled = input.scheduledFor && !Number.isNaN(Date.parse(input.scheduledFor)) ? new Date(input.scheduledFor).toISOString() : null;
  const status = opts.initialStatus ?? "requested";

  const pickup = isShipment ? input.pickup : "handoff" in priced && priced.handoff === "pickup" ? home : null;
  const dropoff = isShipment ? input.dropoff : "returnMode" in priced && priced.returnMode === "delivery" ? home : null;
  const description = clean(input.description, 300);
  const summary = isShipment
    ? `📦 Envío ${code} · Recoger: ${clean(pickup?.address, 300)} → Entregar: ${clean(dropoff?.address, 300)}${description ? ` · ${description}` : ""}`
    : `🧺 Lavandería ${code} · ${"handoff" in priced && priced.handoff === "pickup" ? "Recoger a domicilio" : "Trae al local"} · ${"returnMode" in priced && priced.returnMode === "delivery" ? "Entrega a domicilio" : "Recoge en el local"}`;

  const { data: tx, error: txError } = await client
    .from("transactions")
    .insert({
      business_id: business.id,
      type: "order",
      status: "pending",
      payment_status: "pending",
      payment_method: "pending",
      subtotal: priced.total,
      total: priced.total,
      customer_name: name,
      customer_phone: phone,
      customer_email: email,
      contact_id: contact.id,
      address: dropoff?.address ? clean(dropoff.address, 300) : null,
      notes: [summary, clean(input.notes, 500)].filter(Boolean).join(" | "),
      code,
    })
    .select("id")
    .single();
  if (txError) {
    console.error("[createServiceOrder] transaction", txError.message);
    return { error: "No pudimos registrar la solicitud. Intenta de nuevo." };
  }
  await client.from("transaction_items").insert(
    priced.lines.map((l) => ({ transaction_id: tx.id, catalog_item_id: l.itemId, name: l.name, quantity: 1, unit_price: l.total, total_price: l.total }))
  );

  const now = new Date();
  const weight = Number(input.weightKg);
  const { data: order, error } = await client
    .from("service_orders")
    .insert({
      business_id: business.id,
      code,
      kind: business.kind,
      status,
      source: opts.source,
      contact_id: contact.id,
      customer_name: name,
      customer_phone: phone,
      customer_email: email,
      transaction_id: tx.id,
      pickup_address: pickup?.address ? clean(pickup.address, 300) : null,
      pickup_lat: validPoint(pickup) ? pickup!.lat : null,
      pickup_lng: validPoint(pickup) ? pickup!.lng : null,
      dropoff_address: dropoff?.address ? clean(dropoff.address, 300) : null,
      dropoff_lat: validPoint(dropoff) ? dropoff!.lat : null,
      dropoff_lng: validPoint(dropoff) ? dropoff!.lng : null,
      recipient_name: isShipment ? clean(input.recipientName, 120) || null : null,
      recipient_phone: isShipment ? normalizePhone(input.recipientPhone ?? "") || null : null,
      distance_km: "distanceKm" in priced ? priced.distanceKm : null,
      package_size: "size" in priced ? priced.size : null,
      package_description: description || null,
      declared_value: isShipment && Number(input.declaredValue) > 0 ? Math.round(Number(input.declaredValue)) : null,
      handoff: "handoff" in priced ? priced.handoff : null,
      return_mode: "returnMode" in priced ? priced.returnMode : null,
      weight_kg: Number.isFinite(weight) && weight > 0 ? weight : null,
      items: priced.lines as unknown as never,
      subtotal: priced.subtotal,
      delivery_fee: priced.deliveryFee,
      total: priced.total,
      scheduled_for: scheduled,
      promised_at: !isShipment ? promiseFrom(scheduled ? new Date(scheduled) : now, business.settings).toISOString() : null,
      notes: clean(input.notes, 500) || null,
    })
    .select("id, tracking_token")
    .single();
  if (error) {
    console.error("[createServiceOrder]", error.message);
    await client.from("transactions").update({ status: "cancelled" }).eq("id", tx.id);
    return { error: "No pudimos registrar la solicitud. Intenta de nuevo." };
  }
  await client.from("service_order_events").insert({
    business_id: business.id,
    order_id: order.id,
    status,
    note: opts.source === "web" ? "Solicitud recibida desde la página" : status === "received" ? "Recibido en el local" : "Creado en el local",
  });
  return { success: true as const, id: order.id as string, token: order.tracking_token as string, code, total: priced.total };
}
