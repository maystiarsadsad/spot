"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ── Categories ─────────────────────────────────────────────

export async function createCategory(businessId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const icon = (formData.get("icon") as string) || "📦";

  if (!name?.trim()) return { error: "El nombre es obligatorio" };

  const { error } = await supabase.from("catalog_categories").insert({
    business_id: businessId,
    name: name.trim(),
    description,
    icon,
  });

  if (error) return { error: "Error al crear categoría: " + error.message };

  revalidatePath("/d/catalog");
  return { success: true };
}

export async function updateCategory(categoryId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const icon = (formData.get("icon") as string) || "📦";

  if (!name?.trim()) return { error: "El nombre es obligatorio" };

  const { error } = await supabase
    .from("catalog_categories")
    .update({ name: name.trim(), description, icon })
    .eq("id", categoryId);

  if (error) return { error: "Error al actualizar categoría" };

  revalidatePath("/d/catalog");
  return { success: true };
}

export async function deleteCategory(categoryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { error } = await supabase
    .from("catalog_categories")
    .delete()
    .eq("id", categoryId);

  if (error) return { error: "Error al eliminar categoría" };

  revalidatePath("/d/catalog");
  return { success: true };
}

// ── Items ──────────────────────────────────────────────────

export async function createItem(businessId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const price = parseFloat(formData.get("price") as string) || 0;
  const cost = parseFloat(formData.get("cost") as string) || null;
  const comparePrice = parseFloat(formData.get("compare_price") as string) || null;
  const sku = (formData.get("sku") as string) || null;
  const categoryIdRaw = formData.get("category_id") as string;
  const categoryId = categoryIdRaw && categoryIdRaw !== "none" ? categoryIdRaw : null;
  const type = (formData.get("type") as string) || "product";

  if (!name?.trim()) return { error: "El nombre es obligatorio" };
  if (price < 0) return { error: "El precio no puede ser negativo" };

  const inventoryIdRaw = formData.get("inventory_id") as string;
  const inventoryId = inventoryIdRaw && inventoryIdRaw !== "none" ? inventoryIdRaw : null;

  const { data, error } = await supabase.from("catalog_items").insert({
    business_id: businessId,
    category_id: categoryId || null,
    inventory_id: inventoryId,
    name: name.trim(),
    description,
    price,
    cost,
    compare_price: comparePrice,
    sku,
    type,
  }).select("id").single();

  if (error) return { error: "Error al crear producto: " + error.message };

  revalidatePath("/d/catalog");
  return { success: true, itemId: data.id };
}

export async function updateItem(itemId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const price = parseFloat(formData.get("price") as string) || 0;
  const cost = parseFloat(formData.get("cost") as string) || null;
  const comparePrice = parseFloat(formData.get("compare_price") as string) || null;
  const sku = (formData.get("sku") as string) || null;
  const categoryIdRaw = formData.get("category_id") as string;
  const categoryId = categoryIdRaw && categoryIdRaw !== "none" ? categoryIdRaw : null;
  const type = (formData.get("type") as string) || "product";
  const active = formData.get("active") === "true";

  if (!name?.trim()) return { error: "El nombre es obligatorio" };

  const inventoryIdRaw = formData.get("inventory_id") as string;
  const inventoryId = inventoryIdRaw && inventoryIdRaw !== "none" ? inventoryIdRaw : null;

  const { error } = await supabase
    .from("catalog_items")
    .update({
      category_id: categoryId || null,
      inventory_id: inventoryId,
      name: name.trim(),
      description,
      price,
      cost,
      compare_price: comparePrice,
      sku,
      type,
      active,
    })
    .eq("id", itemId);

  if (error) return { error: "Error al actualizar producto" };

  revalidatePath("/d/catalog");
  return { success: true };
}

export async function deleteItem(itemId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { error } = await supabase
    .from("catalog_items")
    .delete()
    .eq("id", itemId);

  if (error) return { error: "Error al eliminar producto" };

  revalidatePath("/d/catalog");
  return { success: true };
}

export async function toggleItemActive(itemId: string, active: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { error } = await supabase
    .from("catalog_items")
    .update({ active })
    .eq("id", itemId);

  if (error) return { error: "Error al cambiar estado" };

  revalidatePath("/d/catalog");
  return { success: true };
}

// ── Ingredients (Recipe) ──────────────────────────────────

export async function getItemIngredients(catalogItemId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalog_item_ingredients")
    .select("*, inventory(name, unit)")
    .eq("catalog_item_id", catalogItemId)
    .order("created_at");

  if (error) return [];
  return data || [];
}

export async function upsertIngredient(data: {
  catalog_item_id: string;
  inventory_id: string;
  quantity: number;
  unit?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { error } = await supabase
    .from("catalog_item_ingredients")
    .upsert({
      catalog_item_id: data.catalog_item_id,
      inventory_id: data.inventory_id,
      quantity: data.quantity,
      unit: data.unit,
    }, { onConflict: "catalog_item_id,inventory_id" });

  if (error) return { error: error.message };

  revalidatePath("/d/catalog");
  return { success: true };
}

export async function removeIngredient(catalogItemId: string, inventoryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { error } = await supabase
    .from("catalog_item_ingredients")
    .delete()
    .eq("catalog_item_id", catalogItemId)
    .eq("inventory_id", inventoryId);

  if (error) return { error: error.message };

  revalidatePath("/d/catalog");
  return { success: true };
}
