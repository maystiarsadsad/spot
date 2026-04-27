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

  const { error } = await supabase
    .from("businesses")
    .update(data)
    .eq("id", businessId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/d/webpage");
  revalidatePath(`/`);
  return { success: true };
}

function resolvePromptVariables(
  systemPrompt: string,
  ctx: Record<string, any>
): string {
  return systemPrompt
    .replace(/\{\{business_name\}\}/g, ctx.business_name)
    .replace(/\{\{business_type\}\}/g, ctx.business_type)
    .replace(/\{\{business_description\}\}/g, ctx.business_description)
    .replace(/\{\{business_phone\}\}/g, ctx.business_phone)
    .replace(/\{\{business_address\}\}/g, ctx.business_address)
    .replace(/\{\{current_date\}\}/g, ctx.current_date)
    .replace(/\{\{current_time\}\}/g, ctx.current_time)
    .replace(
      /\{\{catalog_summary\}\}/g,
      ctx.catalog_items
        .map((i: any) => `- ${i.name}: $${i.price}${i.description ? ` (${i.description})` : ""}`)
        .join("\n")
    )
    .replace(
      /\{\{inventory_summary\}\}/g,
      ctx.inventory_summary
        .map((i: any) => `- ${i.name}: ${i.stock} ${i.unit} (${i.available ? "disponible" : "agotado"})`)
        .join("\n")
    )
    .replace(/\{\{reservations_count\}\}/g, String(ctx.active_reservations_count));
}

export async function testAiAgent(
  businessId: string,
  message: string,
  systemPrompt: string
) {
  const supabase = await createClient();

  // Fetch real-time business context
  const [
    { data: business },
    { data: catalog },
    { data: inventory },
    { data: reservations },
  ] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", businessId).single(),
    supabase
      .from("catalog_items")
      .select("name, price, description, active, type, capacity")
      .eq("business_id", businessId)
      .eq("active", true)
      .limit(50),
    supabase
      .from("inventory")
      .select("name, current_stock, min_stock, unit, category")
      .eq("business_id", businessId)
      .eq("active", true)
      .limit(50),
    supabase
      .from("reservations")
      .select("reservation_time, status, item_id, party_size")
      .eq("business_id", businessId)
      .eq("status", "confirmed")
      .gte("reservation_time", new Date().toISOString())
      .limit(20),
  ]);

  const ctx = {
    business_name: business?.name || "Mi Negocio",
    business_type: business?.type || "general",
    business_description: business?.description || "",
    business_phone: business?.phone || "",
    business_address: business?.address || "",
    business_hours: business?.business_hours || {},
    catalog_items: catalog || [],
    inventory_summary: (inventory || []).map((i) => ({
      name: i.name,
      stock: i.current_stock,
      available: (i.current_stock || 0) > (i.min_stock || 0),
      unit: i.unit,
    })),
    active_reservations_count: reservations?.length || 0,
    upcoming_reservations: reservations || [],
    current_date: new Date().toLocaleDateString("es-CO"),
    current_time: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
  };

  const resolved = resolvePromptVariables(systemPrompt, ctx);

  // Try Gemini Flash (free tier)
  const apiKey = process.env.GEMINI_API_KEY;
  let aiResponse: string | null = null;

  if (apiKey) {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const models = ["gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash"];
      let response;
      
      for (const model of models) {
        try {
          response = await ai.models.generateContent({
            model,
            contents: message,
            config: {
              systemInstruction: resolved,
              maxOutputTokens: 1024,
              temperature: 0.7,
            },
          });
          break;
        } catch (err: any) {
          if (model === models[models.length - 1]) throw err;
          // Try next model
        }
      }

      aiResponse = response?.text || null;
    } catch (e: any) {
      aiResponse = `⚠️ Error de Gemini: ${e.message || "Error desconocido"}`;
    }
  }

  return {
    success: true,
    context: ctx,
    resolvedPrompt: resolved,
    aiResponse: aiResponse,
    hasApiKey: !!apiKey,
  };
}
