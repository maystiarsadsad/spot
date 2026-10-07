"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { answerQuestion } from "@/lib/assistant/answer";
import { validateAnthropicKey, type ChatTurn } from "@/lib/assistant/claude";
import { parseFaqs } from "@/lib/assistant/context";
import { CLAUDE_MODELS, planIncludesClaude } from "@/lib/assistant/models";
import type { Json } from "@/types/database";

const PATH = "/d/asistente";

/** Logged-in member of the business; `manage` requires owner/admin/manager. */
async function requireMember(businessId: string, manage = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" as const };

  const { data: member } = await supabase
    .from("business_members")
    .select("role, status")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: profile } = await supabase.from("profiles").select("platform_role").eq("id", user.id).maybeSingle();
  const isSuperadmin = profile?.platform_role === "superadmin";

  if (!isSuperadmin && (!member || member.status !== "active")) return { error: "No perteneces a este negocio" as const };
  if (manage && !isSuperadmin && !["owner", "admin", "manager"].includes(member?.role ?? "")) {
    return { error: "Solo el dueño o un administrador puede cambiar esto" as const };
  }
  return { supabase, user };
}

export interface TrainingInput {
  greeting: string;
  instructions: string;
  extraInfo: string;
  faqs: { q: string; a: string }[];
}

export async function saveAssistantTraining(businessId: string, input: TrainingInput) {
  const auth = await requireMember(businessId, true);
  if ("error" in auth) return { error: auth.error };

  const greeting = input.greeting.trim().slice(0, 300) || null;
  const { error } = await auth.supabase.from("business_ai_settings").upsert(
    {
      business_id: businessId,
      greeting,
      instructions: input.instructions.trim().slice(0, 4000) || null,
      extra_info: input.extraInfo.trim().slice(0, 8000) || null,
      faqs: parseFaqs(input.faqs) as unknown as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id" }
  );
  if (error) return { error: "No se pudo guardar el entrenamiento" };

  // The storefront reads the greeting from the public businesses row
  await auth.supabase.from("businesses").update({ ai_agent_greeting: greeting }).eq("id", businessId);

  revalidatePath(PATH);
  return { success: true };
}

export interface ClaudeSettingsInput {
  enabled: boolean;
  model: string;
  dailyCapUsd: number;
  monthlyCapUsd: number | null;
}

export async function saveClaudeSettings(businessId: string, input: ClaudeSettingsInput) {
  const auth = await requireMember(businessId, true);
  if ("error" in auth) return { error: auth.error };

  if (!CLAUDE_MODELS.some((m) => m.id === input.model)) return { error: "Modelo no válido" };
  const daily = Number(input.dailyCapUsd);
  if (!Number.isFinite(daily) || daily < 0 || daily > 1000) return { error: "El tope diario debe estar entre 0 y 1.000 USD" };
  const monthly = input.monthlyCapUsd == null || String(input.monthlyCapUsd) === "" ? null : Number(input.monthlyCapUsd);
  if (monthly != null && (!Number.isFinite(monthly) || monthly < 0 || monthly > 10000)) return { error: "El tope mensual debe estar entre 0 y 10.000 USD" };

  const { data: business } = await auth.supabase.from("businesses").select("subscription_plan").eq("id", businessId).single();
  const { data: current } = await auth.supabase.from("business_ai_settings").select("key_secret_id").eq("business_id", businessId).maybeSingle();
  if (input.enabled && !planIncludesClaude(business?.subscription_plan)) return { error: "Claude está incluido desde el plan Profesional" };
  if (input.enabled && !current?.key_secret_id) return { error: "Primero conecta tu API key de Anthropic" };

  const { error } = await auth.supabase.from("business_ai_settings").upsert(
    {
      business_id: businessId,
      claude_enabled: input.enabled,
      model: input.model,
      daily_cap_usd: Math.round(daily * 100) / 100,
      monthly_cap_usd: monthly == null ? null : Math.round(monthly * 100) / 100,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id" }
  );
  if (error) return { error: "No se pudo guardar la configuración" };
  revalidatePath(PATH);
  return { success: true };
}

export async function connectClaudeKey(businessId: string, rawKey: string) {
  const auth = await requireMember(businessId, true);
  if ("error" in auth) return { error: auth.error };

  const key = (rawKey ?? "").trim();
  if (!/^sk-ant-[A-Za-z0-9_-]{20,}$/.test(key)) return { error: "Eso no parece una API key de Anthropic (empieza por sk-ant-)" };

  const check = await validateAnthropicKey(key);
  if (!check.ok) return { error: check.error };

  // Vault write — service role only
  const { error } = await createAdminClient().rpc("set_business_ai_key", { p_business_id: businessId, p_key: key });
  if (error) return { error: "No se pudo guardar la API key" };

  revalidatePath(PATH);
  return { success: true, last4: key.slice(-4) };
}

export async function disconnectClaudeKey(businessId: string) {
  const auth = await requireMember(businessId, true);
  if ("error" in auth) return { error: auth.error };
  const { error } = await createAdminClient().rpc("set_business_ai_key", { p_business_id: businessId, p_key: "" });
  if (error) return { error: "No se pudo desconectar la API key" };
  revalidatePath(PATH);
  return { success: true };
}

/** Dashboard playground: same engine as the storefront (counts toward usage and caps). */
export async function testAssistant(businessId: string, question: string, history: ChatTurn[]) {
  const auth = await requireMember(businessId);
  if ("error" in auth) return { error: auth.error };
  if (!question?.trim()) return { error: "Escribe una pregunta" };

  const answer = await answerQuestion({ businessId, question, history: history.slice(-10), source: "playground" });
  revalidatePath(PATH);
  return { success: true, ...answer };
}
