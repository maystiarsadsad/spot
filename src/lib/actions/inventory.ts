"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireBusinessAccess, MANAGE_ROLES, WRITE_ROLES } from "@/lib/auth-guard";

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

/** Resolves the item's business and checks the caller may manage it. */
async function requireInventoryItemAccess(itemId: string) {
  const supabase = await createClient();
  const { data: item } = await supabase.from("inventory").select("business_id").eq("id", itemId).maybeSingle();
  if (!item) return { error: "Producto de inventario no encontrado" as const };
  const auth = await requireBusinessAccess(item.business_id, MANAGE_ROLES);
  if ("error" in auth) return { error: auth.error };
  return { auth, businessId: item.business_id as string };
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
  const guard = await requireInventoryItemAccess(itemId);
  if ("error" in guard) return { success: false, error: guard.error };

  const { error } = await guard.auth.supabase
    .from("inventory")
    .update(data)
    .eq("id", itemId)
    .eq("business_id", guard.businessId);

  if (error) {
    console.error("Error updating inventory item:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/d/inventory");
  return { success: true };
}

export async function deleteInventoryItem(itemId: string) {
  const guard = await requireInventoryItemAccess(itemId);
  if ("error" in guard) return { success: false, error: guard.error };

  const { error } = await guard.auth.supabase
    .from("inventory")
    .delete()
    .eq("id", itemId)
    .eq("business_id", guard.businessId);

  if (error) {
    console.error("Error deleting inventory item:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/d/inventory");
  return { success: true };
}

const MOVEMENT_TYPES = ["in", "out", "adjust"];

export async function recordMovement(data: {
  business_id: string;
  inventory_id: string;
  type: string; // 'in' | 'out' | 'adjust'
  quantity: number;
  unit_cost?: number;
  notes?: string;
}) {
  const auth = await requireBusinessAccess(data.business_id, WRITE_ROLES);
  if ("error" in auth) return { success: false, error: auth.error };
  if (!MOVEMENT_TYPES.includes(data.type)) return { success: false, error: "Tipo de movimiento no válido" };

  // quantity: positive for in/out, signed delta for adjust. The stock change and the
  // movement are written together in one SQL function (no read-modify-write race).
  const { error } = await auth.supabase.rpc("apply_inventory_movement", {
    p_business_id: data.business_id,
    p_inventory_id: data.inventory_id,
    p_type: data.type,
    p_quantity: Number(data.quantity),
    p_unit_cost: Number(data.unit_cost) || 0,
    p_notes: data.notes?.trim().slice(0, 300) || undefined,
  });
  if (error) {
    // P0001 = business-rule message written for the user ("Stock insuficiente", …)
    return { success: false, error: error.code === "P0001" ? error.message : "No se pudo registrar el movimiento" };
  }

  revalidatePath("/d/inventory");
  return { success: true };
}
