"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Upload a catalog item image to Supabase Storage
 * Returns the public URL of the uploaded image
 */
export async function uploadCatalogImage(
  businessId: string,
  itemId: string,
  formData: FormData
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const file = formData.get("image") as File;
  if (!file || file.size === 0) return { error: "No se seleccionó ningún archivo" };

  // Validate file
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) return { error: "La imagen no puede superar 5MB" };

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Formato no soportado. Usa JPG, PNG, WebP o GIF." };
  }

  // Generate unique path: business_id/item_id/timestamp.ext
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${businessId}/${itemId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("catalog-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    return { error: `Error al subir: ${uploadError.message}` };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("catalog-images")
    .getPublicUrl(path);

  const publicUrl = urlData.publicUrl;

  // Update the catalog item with the image URL
  const { error: updateError } = await supabase
    .from("catalog_items")
    .update({ image_url: publicUrl })
    .eq("id", itemId)
    .eq("business_id", businessId);

  if (updateError) {
    return { error: `Imagen subida pero no se pudo vincular: ${updateError.message}` };
  }

  revalidatePath("/d/catalog");
  return { success: true, url: publicUrl };
}

/**
 * Remove image from a catalog item
 */
export async function removeCatalogImage(
  businessId: string,
  itemId: string,
  imageUrl: string
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  // Extract path from URL
  const urlParts = imageUrl.split("/catalog-images/");
  if (urlParts.length > 1) {
    const filePath = urlParts[1];
    await supabase.storage.from("catalog-images").remove([filePath]);
  }

  // Clear image_url from item
  const { error } = await supabase
    .from("catalog_items")
    .update({ image_url: null })
    .eq("id", itemId)
    .eq("business_id", businessId);

  if (error) return { error: error.message };

  revalidatePath("/d/catalog");
  return { success: true };
}
