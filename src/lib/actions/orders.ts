"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { updateDailyCashOnSale } from "@/lib/actions/finance";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";
import {
  MAX_NOTE_LENGTH,
  optionsPrice,
  parseOptionGroups,
  snapshotSelection,
  validateSelection,
  type OptionSelection,
  type SelectedOption,
} from "@/lib/item-options";

/** What the client sends: which product, how many and how it was customized. */
export interface OrderLineInput {
  catalog_item_id: string;
  quantity: number;
  options?: OptionSelection;
  notes?: string;
}

/** A line priced by the server from the catalog (client prices are never trusted). */
interface PricedLine {
  catalog_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  options: SelectedOption[];
  notes: string | null;
}

/** Minimal shape needed to deduct stock for a sold line. */
interface SoldLine {
  catalog_item_id: string;
  quantity: number;
  options?: unknown;
}

type CatalogRow = { id: string; name: string; price: number; options: unknown; active: boolean | null };

/**
 * Validates every line against the business catalog and computes prices
 * (base price + chosen options). Returns a user-facing error on the first problem.
 */
async function priceOrderLines(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  lines: OrderLineInput[]
): Promise<{ error: string } | { lines: PricedLine[]; subtotal: number }> {
  if (!Array.isArray(lines) || lines.length === 0) return { error: "El pedido está vacío" };
  if (lines.length > 100) return { error: "El pedido tiene demasiados productos" };

  const ids = [...new Set(lines.map((l) => l.catalog_item_id).filter(Boolean))];
  const { data: catalog, error } = await supabase
    .from("catalog_items")
    .select("id, name, price, options, active")
    .eq("business_id", businessId)
    .in("id", ids);
  if (error) return { error: "No se pudo validar el pedido" };

  const byId = new Map<string, CatalogRow>((catalog ?? []).map((c: CatalogRow) => [c.id, c]));

  const priced: PricedLine[] = [];
  for (const line of lines) {
    const item = byId.get(line.catalog_item_id);
    if (!item || item.active === false) return { error: "Uno de los productos ya no está disponible" };
    const quantity = Math.floor(Number(line.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) return { error: `Cantidad inválida para "${item.name}"` };

    const groups = parseOptionGroups(item.options);
    const selection = line.options ?? {};
    const problem = validateSelection(groups, selection);
    if (problem) return { error: `${item.name}: ${problem}` };

    const options = snapshotSelection(groups, selection);
    const unit = Number(item.price) + optionsPrice(options);
    const notes = typeof line.notes === "string" ? line.notes.trim().slice(0, MAX_NOTE_LENGTH) : "";
    priced.push({
      catalog_item_id: item.id,
      name: item.name,
      quantity,
      unit_price: unit,
      total_price: unit * quantity,
      options,
      notes: notes || null,
    });
  }
  return { lines: priced, subtotal: priced.reduce((sum, l) => sum + l.total_price, 0) };
}

const toItemRows = (transactionId: string, lines: PricedLine[]) =>
  lines.map((l) => ({
    transaction_id: transactionId,
    catalog_item_id: l.catalog_item_id,
    name: l.name,
    quantity: l.quantity,
    unit_price: l.unit_price,
    total_price: l.total_price,
    options: l.options as unknown as Json,
    notes: l.notes,
  }));

interface CreateOrderPayload {
  type: 'order' | 'sale';
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  payment_method?: string;
  discount: number;
  tax: number;
  items: OrderLineInput[];
}

export async function createOrder(businessId: string, payload: CreateOrderPayload) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const pricing = await priceOrderLines(supabase, businessId, payload.items);
  if ("error" in pricing) return { error: pricing.error };
  const discount = Math.max(0, Number(payload.discount) || 0);
  const tax = Math.max(0, Number(payload.tax) || 0);
  const total = Math.max(0, pricing.subtotal - discount + tax);

  // Resolve or create contact
  const contactId = await resolveContact(supabase, businessId, {
    name: payload.customer_name,
    phone: payload.customer_phone,
    email: payload.customer_email,
  });

  // Insert Transaction
  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .insert({
      business_id: businessId,
      type: payload.type,
      status: payload.type === 'sale' ? 'completed' : 'pending',
      payment_method: payload.payment_method,
      payment_status: payload.type === 'sale' ? 'paid' : 'pending',
      subtotal: pricing.subtotal,
      discount,
      tax,
      total,
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone,
      customer_email: payload.customer_email,
      contact_id: contactId,
      code: `ORD-${Date.now().toString().slice(-6)}`,
    })
    .select()
    .single();

  if (transactionError) {
    return { error: transactionError.message };
  }

  // Insert Transaction Items
  const { error: itemsError } = await supabase
    .from("transaction_items")
    .insert(toItemRows(transaction.id, pricing.lines));

  if (itemsError) {
    return { error: itemsError.message };
  }

  // POS sales are completed immediately → deduct inventory + update daily cash + update contact stats
  if (payload.type === 'sale') {
    await deductInventoryForTransaction(supabase, businessId, pricing.lines);
    await updateDailyCashOnSale(businessId, total, payload.payment_method || 'cash');
    if (contactId) {
      await updateContactStats(supabase, contactId, total);
    }
  }

  revalidatePath("/d/orders");
  revalidatePath("/d/pos");
  revalidatePath("/d/inventory");
  revalidatePath("/d/finance");
  revalidatePath("/d/contacts");
  return { success: true, transaction };
}

export interface PublicOrderPayload {
  customer_name: string;
  customer_phone: string;
  delivery_type: 'pickup' | 'delivery';
  address?: string;
  /** Pin dropped by the customer on the checkout map */
  location?: { lat: number; lng: number };
  notes?: string;
  items: OrderLineInput[];
}

function isValidLocation(loc: PublicOrderPayload["location"]): loc is { lat: number; lng: number } {
  return (
    !!loc &&
    Number.isFinite(loc.lat) && Number.isFinite(loc.lng) &&
    Math.abs(loc.lat) <= 90 && Math.abs(loc.lng) <= 180
  );
}

export async function createPublicOrder(businessId: string, payload: PublicOrderPayload) {
  const { createClient: createAnonClient } = await import("@/lib/supabase/server");
  const supabase = await createAnonClient();

  // Prices always come from the catalog, never from the browser
  const pricing = await priceOrderLines(supabase, businessId, payload.items);
  if ("error" in pricing) return { error: pricing.error };

  const deliveryLabel = payload.delivery_type === 'delivery' ? 'Domicilio' : 'Recoge en tienda';
  const orderNotes = [
    `📦 ${deliveryLabel}`,
    payload.address ? `📍 ${payload.address}` : null,
    payload.notes || null,
  ].filter(Boolean).join(' | ');

  // Resolve or create contact
  const contactId = await resolveContact(supabase, businessId, {
    name: payload.customer_name,
    phone: payload.customer_phone,
    address: payload.address,
  });

  // Insert Transaction
  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .insert({
      business_id: businessId,
      type: 'order',
      status: 'pending',
      payment_method: 'pending',
      payment_status: 'pending',
      subtotal: pricing.subtotal,
      discount: 0,
      tax: 0,
      total: pricing.subtotal,
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone,
      address: payload.delivery_type === 'delivery' ? (payload.address || null) : null,
      notes: orderNotes,
      contact_id: contactId,
      code: `WEB-${Date.now().toString().slice(-6)}`,
    })
    .select()
    .single();

  if (transactionError) {
    return { error: transactionError.message };
  }

  // Insert Transaction Items
  const { error: itemsError } = await supabase
    .from("transaction_items")
    .insert(toItemRows(transaction.id, pricing.lines));

  if (itemsError) {
    return { error: itemsError.message };
  }

  // Delivery tracking — anonymous customers can't write `deliveries` (RLS),
  // so the row is created server-side. A failure here must not lose the order.
  let trackingToken: string | null = null;
  if (payload.delivery_type === 'delivery') {
    const location = isValidLocation(payload.location) ? payload.location : null;
    const { data: delivery, error: deliveryError } = await createAdminClient()
      .from("deliveries")
      .insert({
        business_id: transaction.business_id,
        transaction_id: transaction.id,
        dest_lat: location?.lat ?? null,
        dest_lng: location?.lng ?? null,
      })
      .select("tracking_token")
      .single();

    if (deliveryError) {
      console.error("[createPublicOrder] delivery tracking:", deliveryError.message);
    } else {
      trackingToken = delivery.tracking_token;
    }
  }

  revalidatePath("/d/orders");
  revalidatePath("/d/contacts");
  return { success: true, transaction, trackingToken };
}

export async function updateOrderStatus(orderId: string, status: string, paymentStatus?: string) {
  const supabase = await createClient();

  const updateData: any = { status };
  if (paymentStatus) {
    updateData.payment_status = paymentStatus;
  }
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("transactions")
    .update(updateData)
    .eq("id", orderId);

  if (error) {
    return { error: error.message };
  }

  // When order is completed → deduct inventory + update daily cash
  if (status === 'completed') {
    // Fetch the transaction details for this order
    const { data: transaction } = await supabase
      .from("transactions")
      .select("business_id, total, payment_method, contact_id")
      .eq("id", orderId)
      .single();

    if (transaction) {
      const { data: txItems } = await supabase
        .from("transaction_items")
        .select("catalog_item_id, quantity, options")
        .eq("transaction_id", orderId);

      if (txItems && txItems.length > 0) {
        const orderItems: SoldLine[] = txItems
          .filter((ti) => ti.catalog_item_id != null)
          .map((ti) => ({
            catalog_item_id: ti.catalog_item_id as string,
            quantity: ti.quantity,
            options: ti.options,
          }));
        if (orderItems.length > 0) {
          await deductInventoryForTransaction(supabase, transaction.business_id, orderItems);
        }
      }

      // Update daily cash register
      await updateDailyCashOnSale(
        transaction.business_id,
        Number(transaction.total || 0),
        transaction.payment_method || "other"
      );

      // Update contact stats
      if (transaction.contact_id) {
        await updateContactStats(supabase, transaction.contact_id, Number(transaction.total || 0));
      }
    }
  }

  revalidatePath("/d/orders");
  revalidatePath("/d/inventory");
  revalidatePath("/d/finance");
  revalidatePath("/d/contacts");
  return { success: true };
}

/* ── Inventory auto-deduction ──────────────────────────── */

/**
 * Deducts inventory for each item sold. Supports two models:
 * 
 * Model A (Retail): catalog_item.inventory_id → deduct quantity directly
 * Model B (Restaurant): catalog_item_ingredients → deduct each ingredient × qty sold
 * 
 * Items without any inventory link are silently skipped (services, memberships, etc.)
 */
async function deductInventoryForTransaction(
  supabase: any,
  businessId: string,
  items: SoldLine[]
) {
  const catalogItemIds = [...new Set(items.map((i) => i.catalog_item_id).filter(Boolean))];
  if (catalogItemIds.length === 0) return;

  // Fetch catalog items with their direct inventory link
  const { data: catalogItems } = await supabase
    .from("catalog_items")
    .select("id, inventory_id")
    .in("id", catalogItemIds);

  // Fetch all ingredient recipes for these items
  const { data: ingredients } = await supabase
    .from("catalog_item_ingredients")
    .select("catalog_item_id, inventory_id, quantity")
    .in("catalog_item_id", catalogItemIds);

  // Build a map of catalog_item_id → ingredients
  const ingredientMap = new Map<string, { inventory_id: string; quantity: number }[]>();
  for (const ing of ingredients || []) {
    if (!ingredientMap.has(ing.catalog_item_id)) {
      ingredientMap.set(ing.catalog_item_id, []);
    }
    ingredientMap.get(ing.catalog_item_id)!.push({
      inventory_id: ing.inventory_id,
      quantity: ing.quantity,
    });
  }

  // Build a map of catalog_item_id → direct inventory_id
  const directLinkMap = new Map<string, string>();
  for (const ci of catalogItems || []) {
    if (ci.inventory_id) {
      directLinkMap.set(ci.id, ci.inventory_id);
    }
  }

  // Aggregate total deductions by inventory_id
  const deductions = new Map<string, number>();

  for (const soldItem of items) {
    const itemId = soldItem.catalog_item_id;
    if (!itemId) continue;

    const recipeIngredients = ingredientMap.get(itemId);
    if (recipeIngredients && recipeIngredients.length > 0) {
      // Model B: Recipe-based deduction
      for (const ing of recipeIngredients) {
        const total = (deductions.get(ing.inventory_id) || 0) + ing.quantity * soldItem.quantity;
        deductions.set(ing.inventory_id, total);
      }
    } else {
      // Model A: Direct link deduction
      const invId = directLinkMap.get(itemId);
      if (invId) {
        const total = (deductions.get(invId) || 0) + soldItem.quantity;
        deductions.set(invId, total);
      }
      // No link → skip (service/membership)
    }

    // Chosen options can consume stock too (e.g. "Proteína: Res" → 0.15 kg de res)
    if (Array.isArray(soldItem.options)) {
      for (const opt of soldItem.options as SelectedOption[]) {
        if (!opt?.inventory_id || !opt.inventory_qty) continue;
        const total = (deductions.get(opt.inventory_id) || 0) + opt.inventory_qty * soldItem.quantity;
        deductions.set(opt.inventory_id, total);
      }
    }
  }

  // Apply deductions
  for (const [inventoryId, qty] of deductions) {
    // Fetch current stock
    const { data: invItem } = await supabase
      .from("inventory")
      .select("current_stock")
      .eq("id", inventoryId)
      .single();

    if (!invItem) continue;

    const newStock = Math.max(0, (invItem.current_stock || 0) - qty);

    // Update stock
    await supabase
      .from("inventory")
      .update({ current_stock: newStock })
      .eq("id", inventoryId);

    // Record movement
    await supabase.from("inventory_movements").insert({
      business_id: businessId,
      inventory_id: inventoryId,
      type: "out",
      quantity: qty,
      unit_cost: 0,
      total_cost: 0,
      notes: "Descuento automático por venta",
    });
  }
}

/* ── Contact resolution ───────────────────────────────── */

/**
 * Finds an existing contact by phone → email → name (priority order)
 * or creates a new one. Returns the contact_id or null.
 */
async function resolveContact(
  supabase: any,
  businessId: string,
  customer: { name?: string; phone?: string; email?: string; address?: string }
): Promise<string | null> {
  const { name, phone, email, address } = customer;

  // Need at least a name to create/match a contact
  if (!name && !phone && !email) return null;

  // 1. Try by phone (most reliable identifier)
  if (phone) {
    const cleanPhone = phone.replace(/\s+/g, "").trim();
    if (cleanPhone.length >= 7) {
      const { data: byPhone } = await supabase
        .from("contacts")
        .select("id")
        .eq("business_id", businessId)
        .eq("phone", cleanPhone)
        .limit(1)
        .single();
      if (byPhone) return byPhone.id;
    }
  }

  // 2. Try by email
  if (email) {
    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail.includes("@")) {
      const { data: byEmail } = await supabase
        .from("contacts")
        .select("id")
        .eq("business_id", businessId)
        .ilike("email", cleanEmail)
        .limit(1)
        .single();
      if (byEmail) return byEmail.id;
    }
  }

  // 3. Try by exact name match (case-insensitive)
  if (name) {
    const cleanName = name.trim();
    if (cleanName.length >= 2) {
      const { data: byName } = await supabase
        .from("contacts")
        .select("id")
        .eq("business_id", businessId)
        .ilike("full_name", cleanName)
        .limit(1)
        .single();
      if (byName) return byName.id;
    }
  }

  // 4. No match — create a new contact
  if (!name || name.trim().length < 2) return null; // need at least a name

  const { data: newContact, error } = await supabase
    .from("contacts")
    .insert({
      business_id: businessId,
      full_name: name.trim(),
      phone: phone?.replace(/\s+/g, "").trim() || null,
      email: email?.toLowerCase().trim() || null,
      address: address || null,
      total_spent: 0,
      total_visits: 0,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating contact from order:", error);
    return null;
  }

  return newContact?.id || null;
}

/**
 * Updates contact stats after a completed sale.
 */
async function updateContactStats(
  supabase: any,
  contactId: string,
  saleTotal: number
) {
  const { data: contact } = await supabase
    .from("contacts")
    .select("total_spent, total_visits")
    .eq("id", contactId)
    .single();

  if (!contact) return;

  await supabase
    .from("contacts")
    .update({
      total_spent: (contact.total_spent || 0) + saleTotal,
      total_visits: (contact.total_visits || 0) + 1,
      last_visit_at: new Date().toISOString(),
    })
    .eq("id", contactId);
}
