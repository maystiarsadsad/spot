"use server";

import { createClient } from "@/lib/supabase/server";

export async function publicChatMessage(
  businessId: string,
  message: string
) {
  const supabase = await createClient();

  // Get business with AI config
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  if (!business || !business.ai_agent_enabled || !business.ai_agent_prompt) {
    return { success: false, fallback: true };
  }

  // Fetch real-time context
  const [{ data: catalog }, { data: inventory }, { data: reservations }] =
    await Promise.all([
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

  const inventorySummary = (inventory || []).map((i) => ({
    name: i.name,
    stock: i.current_stock,
    available: (i.current_stock || 0) > (i.min_stock || 0),
    unit: i.unit,
  }));

  // Resolve template variables
  const resolved = business.ai_agent_prompt
    .replace(/\{\{business_name\}\}/g, business.name || "")
    .replace(/\{\{business_type\}\}/g, business.type || "")
    .replace(/\{\{business_description\}\}/g, business.description || "")
    .replace(/\{\{business_phone\}\}/g, business.phone || "")
    .replace(/\{\{business_address\}\}/g, business.address || "")
    .replace(/\{\{current_date\}\}/g, new Date().toLocaleDateString("es-CO"))
    .replace(/\{\{current_time\}\}/g, new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }))
    .replace(
      /\{\{catalog_summary\}\}/g,
      (catalog || [])
        .map((i) => `- ${i.name}: $${i.price}${i.description ? ` (${i.description})` : ""}`)
        .join("\n")
    )
    .replace(
      /\{\{inventory_summary\}\}/g,
      inventorySummary
        .map((i) => `- ${i.name}: ${i.stock} ${i.unit} (${i.available ? "disponible" : "agotado"})`)
        .join("\n")
    )
    .replace(/\{\{reservations_count\}\}/g, String(reservations?.length || 0));

  // Call Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, fallback: true };
  }

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
      } catch {
        if (model === models[models.length - 1]) {
          return { success: false, fallback: true };
        }
      }
    }

    return {
      success: true,
      response: response?.text || "No pude generar una respuesta.",
    };
  } catch {
    return { success: false, fallback: true };
  }
}
