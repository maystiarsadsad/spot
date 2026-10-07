/**
 * Claude calls for the store assistant, with the business's own API key.
 * Server-only (imported from server actions).
 */
import Anthropic from "@anthropic-ai/sdk";
import { getClaudeModel, type TokenUsage } from "./models";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export type ClaudeResult =
  | { ok: true; text: string; attempts: TokenUsage[]; servedBy: string }
  | { ok: false; status: "error" | "refusal"; error: string; attempts: TokenUsage[]; invalidKey?: boolean };

const MAX_HISTORY_TURNS = 10;
const MAX_TURN_CHARS = 1500;

const client = (apiKey: string) => new Anthropic({ apiKey, timeout: 30_000, maxRetries: 1 });

/** Normalizes the chat history into valid alternating turns that start with the user. */
function buildMessages(history: ChatTurn[], question: string): Anthropic.MessageParam[] {
  const turns = history
    .filter((t) => (t.role === "user" || t.role === "assistant") && t.text.trim())
    .slice(-MAX_HISTORY_TURNS)
    .map((t) => ({ role: t.role, content: t.text.slice(0, MAX_TURN_CHARS) }));
  while (turns.length && turns[0].role !== "user") turns.shift();
  const merged: Anthropic.MessageParam[] = [];
  for (const t of [...turns, { role: "user" as const, content: question.slice(0, MAX_TURN_CHARS) }]) {
    const last = merged[merged.length - 1];
    if (last && last.role === t.role) last.content = `${last.content as string}\n${t.content}`;
    else merged.push({ ...t });
  }
  return merged;
}

/** Per-attempt usage: `usage.iterations` is the billing source of truth when a fallback ran. */
function attemptsFrom(response: { model: string; usage: unknown }): TokenUsage[] {
  const usage = response.usage as {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
    iterations?: Array<Record<string, unknown>> | null;
  };
  const iterations = (usage.iterations ?? []).filter(
    (it) => (it.type === "message" || it.type === "fallback_message") && typeof it.input_tokens === "number"
  );
  if (iterations.length > 0) {
    return iterations.map((it) => ({
      model: (it.model as string) || response.model,
      input_tokens: it.input_tokens as number,
      output_tokens: (it.output_tokens as number) ?? 0,
      cache_read_input_tokens: (it.cache_read_input_tokens as number) ?? 0,
      cache_creation_input_tokens: (it.cache_creation_input_tokens as number) ?? 0,
    }));
  }
  return [
    {
      model: response.model,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
    },
  ];
}

export async function askClaude(opts: {
  apiKey: string;
  model: string;
  /** Stable prompt (rules + business + catalog) — cached */
  system: string;
  /** Per-request context (date/time, cart) — after the cache breakpoint */
  volatile: string;
  history: ChatTurn[];
  question: string;
}): Promise<ClaudeResult> {
  const model = getClaudeModel(opts.model);
  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: opts.system, cache_control: { type: "ephemeral" } },
    { type: "text", text: opts.volatile },
  ];
  const messages = buildMessages(opts.history, opts.question);

  try {
    let response: { model: string; usage: unknown; content: Array<{ type: string; text?: string }>; stop_reason: string | null };
    if (model.modern) {
      // Opus 5.5 / Sonnet 5.5: chat works well at low effort; server-side
      // fallback re-runs a declined request on Anthropic's recommended model.
      response = await client(opts.apiKey).beta.messages.create({
        model: model.id,
        max_tokens: 2048,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system,
        messages,
      });
    } else {
      // Haiku 4.5: no effort / adaptive thinking
      response = await client(opts.apiKey).messages.create({
        model: model.id,
        max_tokens: 1024,
        system,
        messages,
      });
    }

    const attempts = attemptsFrom(response);
    if (response.stop_reason === "refusal") {
      return { ok: false, status: "refusal", error: "El modelo no respondió esta pregunta", attempts };
    }
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
    if (!text) return { ok: false, status: "error", error: "Respuesta vacía", attempts };
    return { ok: true, text, attempts, servedBy: response.model };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      return { ok: false, status: "error", error: "La API key de Anthropic no es válida o fue revocada", attempts: [], invalidKey: true };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, status: "error", error: "Límite de uso de Anthropic alcanzado (rate limit)", attempts: [] };
    }
    if (error instanceof Anthropic.APIError) {
      return { ok: false, status: "error", error: `Error de Anthropic (${error.status ?? "red"}): ${error.message}`.slice(0, 300), attempts: [] };
    }
    return { ok: false, status: "error", error: "No se pudo conectar con Anthropic", attempts: [] };
  }
}

/** Checks a key without spending tokens (lists models). */
export async function validateAnthropicKey(apiKey: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await client(apiKey).models.list({ limit: 1 });
    return { ok: true };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return { ok: false, error: "La API key no es válida" };
    if (error instanceof Anthropic.PermissionDeniedError) return { ok: false, error: "La API key no tiene permisos para usar la API" };
    if (error instanceof Anthropic.APIError) return { ok: false, error: `Anthropic respondió con error ${error.status ?? ""}` };
    return { ok: false, error: "No se pudo conectar con Anthropic" };
  }
}
