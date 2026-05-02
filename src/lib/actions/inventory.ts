"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getInventory(businessId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("business_id", businessId)
    .order("name");

  if (error) {
    console.error("Error fetching inventory:", error);
    return [];
  }

  return data;
}

export async function getInventoryMovements(businessId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inventory_movements")
    .select("*, inventory(name, unit)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching inventory movements:", error);
    return [];
  }

  return data;
}

export async function createInventoryItem(data: {
  business_id: string;
  name: string;
  category?: string;
  current_stock: number;
  min_stock?: number;
  cost_per_unit?: number;
  unit?: string;
  barcode?: string;
  supplier?: string;
  location?: string;
  notes?: string;
}) {
  const supabase = await createClient();

  // Insert the item
  const { data: newItem, error } = await supabase
    .from("inventory")
    .insert({ ...data, active: true })
    .select()
    .single();

  if (error || !newItem) {
    console.error("Error creating inventory item:", error);
    return { success: false, error: error?.message || "Unknown error" };
  }

  // If there's an initial stock, create an initial movement
  if (data.current_stock > 0) {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from("inventory_movements").insert({
      business_id: data.business_id,
      inventory_id: newItem.id,
      type: "in",
      quantity: data.current_stock,
      unit_cost: data.cost_per_unit || 0,
      total_cost: (data.cost_per_unit || 0) * data.current_stock,
      notes: "Stock inicial",
      registered_by: user?.id,
    });
  }

  revalidatePath("/d/inventory");
  return { success: true, id: newItem.id };
}

export async function updateInventoryItem(
  itemId: string,
  data: {
    name: string;
    category?: string;
    min_stock?: number;
    cost_per_unit?: number;
    unit?: string;
    barcode?: string;
    supplier?: string;
    location?: string;
    notes?: string;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("inventory")
    .update(data)
    .eq("id", itemId);

  if (error) {
    console.error("Error updating inventory item:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/d/inventory");
  return { success: true };
}

export async function deleteInventoryItem(itemId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("inventory")
    .delete()
    .eq("id", itemId);

  if (error) {
    console.error("Error deleting inventory item:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/d/inventory");
  return { success: true };
}

export async function recordMovement(data: {
  business_id: string;
  inventory_id: string;
  type: string; // 'in' | 'out' | 'adjust'
  quantity: number;
  unit_cost?: number;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // First get current stock to validate and adjust
  const { data: item, error: fetchError } = await supabase
    .from("inventory")
    .select("current_stock")
    .eq("id", data.inventory_id)
    .single();

  if (fetchError || !item) {
    return { success: false, error: "Producto no encontrado" };
  }

  const currentStock = item.current_stock || 0;
  
  // For 'out' operations, quantity is logically subtracted, but we may store it as positive or negative.
  // We'll store quantity as positive and determine math by type
  let newStock = currentStock;
  if (data.type === 'in') {
    newStock = currentStock + data.quantity;
  } else if (data.type === 'out') {
    if (currentStock < data.quantity) {
      return { success: false, error: "Stock insuficiente" };
    }
    newStock = currentStock - data.quantity;
  } else if (data.type === 'adjust') {
    // If it's an adjustment, quantity might be the absolute new stock, or differene.
    // Let's assume 'adjust' means we are passing the DIFFERENCE (can be negative)
    // Actually, safer if UI passes absolute diff. We will add the quantity to currentStock.
    newStock = currentStock + data.quantity;
  }

  // Record movement
  const { error: moveError } = await supabase.from("inventory_movements").insert({
    business_id: data.business_id,
    inventory_id: data.inventory_id,
    type: data.type,
    quantity: data.quantity, // Storing delta
    unit_cost: data.unit_cost || 0,
    total_cost: (data.unit_cost || 0) * Math.abs(data.quantity),
    notes: data.notes,
    registered_by: user?.id,
  });

  if (moveError) {
    return { success: false, error: moveError.message };
  }

  // Update item 
  const { error: updateError } = await supabase
    .from("inventory")
    .update({ 
      current_stock: newStock,
      last_restock_at: data.type === 'in' ? new Date().toISOString() : undefined 
    })
    .eq("id", data.inventory_id);

  if (updateError) {
    // Note: In a real system, you'd use a postgres function for atomicity, but this is ok for now
    return { success: false, error: updateError.message };
  }

  revalidatePath("/d/inventory");
  return { success: true };
}
