"use server";

import { revalidatePath } from "next/cache";
import { requireBusinessAccess, MANAGE_ROLES } from "@/lib/auth-guard";

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
  const auth = await requireBusinessAccess(businessId, MANAGE_ROLES);
  if ("error" in auth) return { success: false, error: auth.error };
  const supabase = auth.supabase;

  // Server Actions receive arbitrary JSON: keep only the columns this editor owns.
  const allowed = [
    "tagline", "description", "phone", "email", "whatsapp", "address", "logo_url", "cover_url",
    "webpage_published", "social_links", "business_hours", "theme",
    "ai_agent_enabled", "ai_agent_prompt", "ai_agent_greeting",
  ] as const;
  data = Object.fromEntries(allowed.filter((k) => k in data).map((k) => [k, data[k]])) as typeof data;

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
