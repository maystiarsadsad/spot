"use server";

import { answerQuestion } from "@/lib/assistant/answer";
import type { ChatTurn } from "@/lib/assistant/claude";

/**
 * Storefront chat. Anonymous visitors: no auth, but the business must exist and
 * be active; Claude usage is capped per business (see lib/assistant/answer.ts).
 */
export async function publicChatMessage(
  businessId: string,
  message: string,
  history: ChatTurn[] = [],
  cart: string | null = null
) {
  const question = typeof message === "string" ? message.trim() : "";
  if (!question) return { response: "¿En qué te puedo ayudar?" };

  const safeHistory = Array.isArray(history)
    ? history
        .filter((t) => t && (t.role === "user" || t.role === "assistant") && typeof t.text === "string")
        .slice(-10)
    : [];

  const answer = await answerQuestion({
    businessId,
    question,
    history: safeHistory,
    cart: typeof cart === "string" ? cart.slice(0, 1500) : null,
    source: "storefront",
  });

  // Never leak debug/cost details to the public
  return { response: answer.text, action: answer.action };
}
