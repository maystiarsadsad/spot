"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateBusinessSettings(businessId: string, formData: FormData) {
  const supabase = await createClient();

  const data = {
    name: formData.get("name")?.toString(),
    description: formData.get("description")?.toString() || null,
    phone: formData.get("phone")?.toString() || null,
    email: formData.get("email")?.toString() || null,
    whatsapp: formData.get("whatsapp")?.toString() || null,
    address: formData.get("address")?.toString() || null,
    city: formData.get("city")?.toString() || null,
    currency: formData.get("currency")?.toString() || "COP",
  };

  // Validate required fields
  if (!data.name) {
    return { error: "El nombre del negocio es obligatorio" };
  }

  const { error } = await supabase
    .from("businesses")
    .update(data)
    .eq("id", businessId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/d");
  revalidatePath("/d/settings");
  return { success: true };
}
