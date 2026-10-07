"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateBusinessWebpage(
  businessId: string,
  data: {
    tagline?: string;
    description?: string;
    phone?: string;
    email?: string;
    whatsapp?: string;
    address?: string;
    logo_url?: string;
    cover_url?: string;
    webpage_published?: boolean;
    social_links?: Record<string, string>;
    business_hours?: Record<string, any>;
    theme?: Record<string, any>;
    ai_agent_enabled?: boolean;
    ai_agent_prompt?: string;
    ai_agent_greeting?: string;
  }
) {
  const supabase = await createClient();

  // `theme` is one JSON column shared with Configuración (brandColor). Merge
  // instead of replacing it, otherwise saving Mi Página wipes the brand color.
  let payload = data;
  if (data.theme) {
    const { data: existing } = await supabase
      .from("businesses")
      .select("theme")
      .eq("id", businessId)
      .single();
    const existingTheme =
      existing?.theme && typeof existing.theme === "object" && !Array.isArray(existing.theme)
        ? (existing.theme as Record<string, unknown>)
        : {};
    payload = { ...data, theme: { ...existingTheme, ...data.theme } };
  }

  const { error } = await supabase
    .from("businesses")
    .update(payload)
    .eq("id", businessId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/d", "layout");
  revalidatePath("/d/webpage");
  revalidatePath(`/`);
  return { success: true };
}
