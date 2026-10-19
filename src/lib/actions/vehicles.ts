"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { updateDailyCashOnSale } from "@/lib/actions/finance";
import { requireBusinessAccess, MANAGE_ROLES, WRITE_ROLES } from "@/lib/auth-guard";
import { localDate } from "@/lib/booking/availability";
import { findOrCreateContact, normalizePhone } from "@/lib/memberships/data";
import { missingForSale, parseDocuments } from "@/lib/dealership/documents";
import { isValidPlate, normalizePlate, parseDealerSettings, type DealerSettings } from "@/lib/dealership/pricing";
import type { Json } from "@/types/database";

const PATH = "/d/vehiculos";
const PAYMENT_METHODS = ["cash", "card", "transfer"];
const VEHICLE_TYPES = ["moto", "carro", "camioneta", "otro"];
const COST_CATEGORIES = ["repair", "paperwork", "cleaning", "transport", "other"];
const STATUSES = ["in_stock", "reserved", "withdrawn"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const text = (v: unknown, max: number) => {
  const s = typeof v === "string" ? v.trim().slice(0, max) : "";
  return s || null;
};
const money = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 && n < 10_000_000_000 ? n : null;
};
const intIn = (v: unknown, min: number, max: number) => {
  if (v === "" || v == null) return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

async function businessToday(businessId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select("timezone").eq("id", businessId).single();
  return localDate(new Date(), data?.timezone || "America/Bogota");
}

/** Business that owns a vehicle, read through RLS ("" if not visible to the caller). */
async function vehicleBusinessId(vehicleId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("vehicles").select("business_id").eq("id", vehicleId).maybeSingle();
  return data?.business_id ?? "";
}

export interface VehicleInput {
  vehicleType: string;
  plate: string;
  brand: string;
  model?: string;
  year?: number | string;
  color?: string;
  mileageKm?: number | string;
  displacementCc?: number | string;
  vin?: string;
  engineNumber?: string;
  acquiredOn?: string;
  purchasePrice: number | string;
  sellerName?: string;
  sellerPhone?: string;
  purchaseNotes?: string;
  listPrice?: number | string;
  minPrice?: number | string;
  docLocation?: string;
  documents?: unknown;
  description?: string;
  photos?: string[];
  published?: boolean;
}

/** Purchase of a vehicle: it enters the inventory identified by its plate. */
export async function createVehicle(businessId: string, input: VehicleInput) {
  const auth = await requireBusinessAccess(businessId, WRITE_ROLES);
  if ("error" in auth) return { error: auth.error };

  const plate = normalizePlate(input.plate ?? "");
  if (!isValidPlate(plate)) return { error: "La placa no es válida" };
  const brand = text(input.brand, 60);
  if (!brand) return { error: "La marca es obligatoria" };
  const type = VEHICLE_TYPES.includes(input.vehicleType) ? input.vehicleType : "moto";
  const purchase = money(input.purchasePrice);
  if (purchase == null) return { error: "El valor de compra no es válido" };

  const { data: existing } = await auth.supabase
    .from("vehicles")
    .select("id, status, sold_on")
    .eq("business_id", businessId)
    .eq("plate", plate)
    .maybeSingle();
  if (existing) {
    return {
      error:
        existing.status === "sold"
          ? `La placa ${plate} ya está registrada (vendida el ${existing.sold_on ?? "—"}). Ábrela desde Vendidos para recomprarla.`
          : `La placa ${plate} ya está en el inventario`,
    };
  }

  let sellerId: string | null = null;
  const sellerName = text(input.sellerName, 120);
  if (sellerName) {
    try {
      const c = await findOrCreateContact(createAdminClient(), businessId, { name: sellerName, phone: normalizePhone(input.sellerPhone ?? "") });
      sellerId = c.id;
    } catch {
      return { error: "No se pudo registrar al vendedor" };
    }
  }

  const today = await businessToday(businessId);
  const list = input.listPrice === "" || input.listPrice == null ? null : money(input.listPrice);
  const { data, error } = await auth.supabase
    .from("vehicles")
    .insert({
      business_id: businessId,
      vehicle_type: type,
      plate,
      brand,
      model: text(input.model, 80),
      year: intIn(input.year, 1950, 2100),
      color: text(input.color, 40),
      mileage_km: intIn(input.mileageKm, 0, 2_000_000),
      displacement_cc: intIn(input.displacementCc, 1, 10_000),
      vin: text(input.vin, 40),
      engine_number: text(input.engineNumber, 40),
      acquired_on: input.acquiredOn && DATE_RE.test(input.acquiredOn) ? input.acquiredOn : today,
      purchase_price: purchase,
      seller_contact_id: sellerId,
      purchase_notes: text(input.purchaseNotes, 1000),
      list_price: list,
      min_price: input.minPrice === "" || input.minPrice == null ? null : money(input.minPrice),
      doc_location: text(input.docLocation, 120),
      documents: parseDocuments(input.documents) as unknown as Json,
      description: text(input.description, 2000),
      photos: (input.photos ?? []).filter((u) => typeof u === "string" && /^https:\/\//.test(u)).slice(0, 8),
      published: input.published !== false,
    })
    .select("id")
    .single();
  if (error) return { error: "No se pudo registrar el vehículo" };

  if (list != null) {
    await auth.supabase.from("vehicle_price_changes").insert({
      business_id: businessId,
      vehicle_id: data.id,
      old_price: null,
      new_price: list,
      reason: "Precio inicial",
      changed_by: auth.userId,
    });
  }
  revalidatePath(PATH);
  return { success: true, id: data.id };
}

export type VehiclePatch = Partial<Omit<VehicleInput, "plate" | "purchasePrice" | "sellerName" | "sellerPhone" | "listPrice">> & {
  purchasePrice?: number | string;
};

/** Details, paperwork and visibility. Price changes go through setListPrice (history). */
export async function updateVehicle(vehicleId: string, patch: VehiclePatch) {
  const businessId = await vehicleBusinessId(vehicleId);
  const auth = await requireBusinessAccess(businessId, WRITE_ROLES);
  if ("error" in auth) return { error: auth.error };

  const update: Record<string, unknown> = {};
  if (patch.vehicleType !== undefined && VEHICLE_TYPES.includes(patch.vehicleType)) update.vehicle_type = patch.vehicleType;
  if (patch.brand !== undefined) {
    const b = text(patch.brand, 60);
    if (!b) return { error: "La marca es obligatoria" };
    update.brand = b;
  }
  if (patch.model !== undefined) update.model = text(patch.model, 80);
  if (patch.year !== undefined) update.year = intIn(patch.year, 1950, 2100);
  if (patch.color !== undefined) update.color = text(patch.color, 40);
  if (patch.mileageKm !== undefined) update.mileage_km = intIn(patch.mileageKm, 0, 2_000_000);
  if (patch.displacementCc !== undefined) update.displacement_cc = intIn(patch.displacementCc, 1, 10_000);
  if (patch.vin !== undefined) update.vin = text(patch.vin, 40);
  if (patch.engineNumber !== undefined) update.engine_number = text(patch.engineNumber, 40);
  if (patch.purchaseNotes !== undefined) update.purchase_notes = text(patch.purchaseNotes, 1000);
  if (patch.docLocation !== undefined) update.doc_location = text(patch.docLocation, 120);
  if (patch.documents !== undefined) update.documents = parseDocuments(patch.documents) as unknown as Json;
  if (patch.description !== undefined) update.description = text(patch.description, 2000);
  if (patch.published !== undefined) update.published = patch.published === true;
  if (patch.photos !== undefined) update.photos = patch.photos.filter((u) => typeof u === "string" && /^https:\/\//.test(u)).slice(0, 8);
  if (patch.minPrice !== undefined) update.min_price = patch.minPrice === "" || patch.minPrice == null ? null : money(patch.minPrice);
  if (patch.purchasePrice !== undefined) {
    // Purchase price and the manual floor change the margin math: managers only.
    if (!MANAGE_ROLES.includes(auth.role as (typeof MANAGE_ROLES)[number]) && !auth.isSuperadmin) {
      return { error: "Solo un administrador puede cambiar el valor de compra" };
    }
    const p = money(patch.purchasePrice);
    if (p == null) return { error: "El valor de compra no es válido" };
    update.purchase_price = p;
  }
  if (Object.keys(update).length === 0) return { success: true };

  const { error } = await auth.supabase.from("vehicles").update(update).eq("id", vehicleId).eq("business_id", businessId);
  if (error) return { error: "No se pudo guardar el vehículo" };
  revalidatePath(PATH);
  return { success: true };
}

/** New asking price (rebaja or increase); every change is kept with its reason. */
export async function setListPrice(vehicleId: string, price: number | string, reason?: string) {
  const businessId = await vehicleBusinessId(vehicleId);
  const auth = await requireBusinessAccess(businessId, WRITE_ROLES);
  if ("error" in auth) return { error: auth.error };
  const next = money(price);
  if (next == null || next <= 0) return { error: "El precio no es válido" };

  const { data: v } = await auth.supabase
    .from("vehicles")
    .select("list_price, status")
    .eq("id", vehicleId)
    .eq("business_id", businessId)
    .single();
  if (!v) return { error: "Vehículo no encontrado" };
  if (v.status === "sold") return { error: "El vehículo ya fue vendido" };
  if (Number(v.list_price) === next) return { success: true };

  const { error } = await auth.supabase.from("vehicles").update({ list_price: next }).eq("id", vehicleId).eq("business_id", businessId);
  if (error) return { error: "No se pudo cambiar el precio" };
  await auth.supabase.from("vehicle_price_changes").insert({
    business_id: businessId,
    vehicle_id: vehicleId,
    old_price: v.list_price,
    new_price: next,
    reason: text(reason, 200),
    changed_by: auth.userId,
  });
  revalidatePath(PATH);
  return { success: true };
}

export async function setVehicleStatus(vehicleId: string, status: string) {
  if (!STATUSES.includes(status)) return { error: "Estado no válido" };
  const businessId = await vehicleBusinessId(vehicleId);
  const auth = await requireBusinessAccess(businessId, WRITE_ROLES);
  if ("error" in auth) return { error: auth.error };

  const { data: v } = await auth.supabase.from("vehicles").select("status").eq("id", vehicleId).eq("business_id", businessId).single();
  if (!v) return { error: "Vehículo no encontrado" };
  if (v.status === "sold") return { error: "El vehículo ya fue vendido" };

  const { error } = await auth.supabase.from("vehicles").update({ status }).eq("id", vehicleId).eq("business_id", businessId);
  if (error) return { error: "No se pudo cambiar el estado" };
  revalidatePath(PATH);
  return { success: true };
}

export async function addVehicleCost(
  vehicleId: string,
  input: { concept: string; category: string; amount: number | string; spentOn?: string }
) {
  const businessId = await vehicleBusinessId(vehicleId);
  const auth = await requireBusinessAccess(businessId, WRITE_ROLES);
  if ("error" in auth) return { error: auth.error };
  const concept = text(input.concept, 120);
  const amount = money(input.amount);
  if (!concept) return { error: "Describe el gasto" };
  if (amount == null || amount <= 0) return { error: "El valor no es válido" };

  const today = await businessToday(businessId);
  const { error } = await auth.supabase.from("vehicle_costs").insert({
    business_id: businessId,
    vehicle_id: vehicleId,
    concept,
    category: COST_CATEGORIES.includes(input.category) ? input.category : "other",
    amount,
    spent_on: input.spentOn && DATE_RE.test(input.spentOn) ? input.spentOn : today,
  });
  if (error) return { error: "No se pudo registrar el gasto" };
  revalidatePath(PATH);
  return { success: true };
}

export async function deleteVehicleCost(costId: string) {
  const supabase = await createClient();
  const { data: cost } = await supabase.from("vehicle_costs").select("business_id").eq("id", costId).maybeSingle();
  const auth = await requireBusinessAccess(cost?.business_id ?? "", MANAGE_ROLES);
  if ("error" in auth) return { error: auth.error };
  const { error } = await auth.supabase.from("vehicle_costs").delete().eq("id", costId).eq("business_id", cost!.business_id);
  if (error) return { error: "No se pudo eliminar el gasto" };
  revalidatePath(PATH);
  return { success: true };
}

export interface SaleInput {
  price: number | string;
  paymentMethod: string;
  buyerName?: string;
  buyerPhone?: string;
  soldOn?: string;
  /** Allow selling with the transfer paperwork incomplete. */
  force?: boolean;
}

/** Sale: closes the vehicle and records a completed transaction (cash, reports). */
export async function sellVehicle(vehicleId: string, input: SaleInput) {
  const businessId = await vehicleBusinessId(vehicleId);
  const auth = await requireBusinessAccess(businessId, WRITE_ROLES);
  if ("error" in auth) return { error: auth.error };
  if (!PAYMENT_METHODS.includes(input.paymentMethod)) return { error: "Medio de pago inválido" };
  const price = money(input.price);
  if (price == null || price <= 0) return { error: "El valor de venta no es válido" };

  const { data: v } = await auth.supabase
    .from("vehicles")
    .select("id, plate, brand, model, year, status, documents")
    .eq("id", vehicleId)
    .eq("business_id", businessId)
    .single();
  if (!v) return { error: "Vehículo no encontrado" };
  if (v.status === "sold") return { error: "El vehículo ya fue vendido" };

  const missing = missingForSale(v.documents);
  if (missing.length && !input.force) {
    return { error: `Faltan documentos para el traspaso: ${missing.join(", ")}`, missingDocuments: missing };
  }

  let buyerId: string | null = null;
  const buyerName = text(input.buyerName, 120);
  if (buyerName) {
    try {
      const c = await findOrCreateContact(createAdminClient(), businessId, { name: buyerName, phone: normalizePhone(input.buyerPhone ?? "") });
      buyerId = c.id;
    } catch {
      return { error: "No se pudo registrar al comprador" };
    }
  }

  const label = [v.brand, v.model, v.year].filter(Boolean).join(" ");
  const { data: tx, error: txError } = await auth.supabase
    .from("transactions")
    .insert({
      business_id: businessId,
      type: "sale",
      status: "completed",
      payment_method: input.paymentMethod,
      payment_status: "paid",
      subtotal: price,
      total: price,
      contact_id: buyerId,
      customer_name: buyerName,
      customer_phone: text(input.buyerPhone, 20),
      code: `VEH-${Date.now().toString().slice(-6)}`,
      notes: `Venta de vehículo ${v.plate} · ${label}`,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (txError) return { error: "No se pudo registrar la venta" };
  await auth.supabase.from("transaction_items").insert({
    transaction_id: tx.id,
    name: `${label} · ${v.plate}`,
    quantity: 1,
    unit_price: price,
    total_price: price,
  });

  const today = await businessToday(businessId);
  const { error } = await auth.supabase
    .from("vehicles")
    .update({
      status: "sold",
      sold_on: input.soldOn && DATE_RE.test(input.soldOn) ? input.soldOn : today,
      sold_price: price,
      buyer_contact_id: buyerId,
      sale_transaction_id: tx.id,
    })
    .eq("id", vehicleId)
    .eq("business_id", businessId);
  if (error) return { error: "La venta se registró en caja, pero no se pudo cerrar el vehículo. Revísalo." };

  await updateDailyCashOnSale(businessId, price, input.paymentMethod);
  revalidatePath(PATH);
  return { success: true };
}

export async function saveDealerSettings(businessId: string, input: Partial<DealerSettings>) {
  const auth = await requireBusinessAccess(businessId, MANAGE_ROLES);
  if ("error" in auth) return { error: auth.error };
  const settings = parseDealerSettings(input);
  const { error } = await auth.supabase
    .from("businesses")
    .update({ dealer_settings: settings as unknown as Json })
    .eq("id", businessId);
  if (error) return { error: "No se pudo guardar la política de rebajas" };
  revalidatePath(PATH);
  return { success: true };
}
