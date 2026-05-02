"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { updateDailyCashOnSale } from "@/lib/actions/finance";

interface OrderItemPayload {
  catalog_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface CreateOrderPayload {
  type: 'order' | 'sale';
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  payment_method?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  items: OrderItemPayload[];
}

export async function createOrder(businessId: string, payload: CreateOrderPayload) {
  const supabase = await createClient();

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
      subtotal: payload.subtotal,
      discount: payload.discount,
      tax: payload.tax,
      total: payload.total,
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
  const itemsToInsert = payload.items.map(item => ({
    transaction_id: transaction.id,
    catalog_item_id: item.catalog_item_id,
    name: item.name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
  }));

  const { error: itemsError } = await supabase
    .from("transaction_items")
    .insert(itemsToInsert);

  if (itemsError) {
    return { error: itemsError.message };
  }

  // POS sales are completed immediately → deduct inventory + update daily cash + update contact stats
  if (payload.type === 'sale') {
    await deductInventoryForTransaction(supabase, businessId, payload.items);
    await updateDailyCashOnSale(businessId, payload.total, payload.payment_method || 'cash');
    if (contactId) {
      await updateContactStats(supabase, contactId, payload.total);
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
  notes?: string;
  items: OrderItemPayload[];
  subtotal: number;
  total: number;
}

export async function createPublicOrder(businessId: string, payload: PublicOrderPayload) {
  const { createClient: createAnonClient } = await import("@/lib/supabase/server");
  const supabase = await createAnonClient();

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
      subtotal: payload.subtotal,
      discount: 0,
      tax: 0,
      total: payload.total,
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
  const itemsToInsert = payload.items.map(item => ({
    transaction_id: transaction.id,
    catalog_item_id: item.catalog_item_id,
    name: item.name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
  }));

  const { error: itemsError } = await supabase
    .from("transaction_items")
    .insert(itemsToInsert);

  if (itemsError) {
    return { error: itemsError.message };
  }

  revalidatePath("/d/orders");
  revalidatePath("/d/contacts");
  return { success: true, transaction };
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
        .select("catalog_item_id, quantity")
        .eq("transaction_id", orderId);

      if (txItems && txItems.length > 0) {
        const orderItems = txItems
          .filter((ti) => ti.catalog_item_id != null)
          .map((ti) => ({
            catalog_item_id: ti.catalog_item_id as string,
            quantity: ti.quantity,
            name: "",
            unit_price: 0,
            total_price: 0,
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
  items: OrderItemPayload[]
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
