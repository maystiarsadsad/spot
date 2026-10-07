/**
 * Claude models offered to businesses for their storefront assistant, with
 * Anthropic first-party prices (USD per million tokens) used to compute the
 * cost of every call. Pure module — safe on client and server.
 */

export interface ClaudeModel {
  id: string;
  label: string;
  description: string;
  /** USD per 1M tokens */
  input: number;
  output: number;
  cacheRead: number;
  /** 5-minute cache writes cost 1.25× input */
  cacheWrite: number;
  /** Supports `output_config.effort` + server-side refusal fallbacks */
  modern: boolean;
}

export const CLAUDE_MODELS: ClaudeModel[] = [
  {
    id: "claude-opus-5-5",
    label: "Claude Opus 5.5",
    description: "El más capaz. Respuestas más precisas y naturales.",
    input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5, modern: true,
  },
  {
    id: "claude-sonnet-5-5",
    label: "Claude Sonnet 5.5",
    description: "Muy capaz y a la mitad del costo de Opus.",
    input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5, modern: true,
  },
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    description: "El más rápido y económico, ideal para preguntas simples.",
    input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25, modern: false,
  },
];

export const DEFAULT_CLAUDE_MODEL = "claude-opus-5-5";
export const DEFAULT_DAILY_CAP_USD = 5;

export const getClaudeModel = (id: string | null | undefined) =>
  CLAUDE_MODELS.find((m) => m.id === id) ?? CLAUDE_MODELS[0];

export interface TokenUsage {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

/** Cost in USD of one or more sampling attempts (each priced by the model that ran it). */
export function costUsd(attempts: TokenUsage[]): number {
  let total = 0;
  for (const a of attempts) {
    const m = getClaudeModel(a.model);
    total +=
      (a.input_tokens * m.input +
        a.output_tokens * m.output +
        (a.cache_read_input_tokens ?? 0) * m.cacheRead +
        (a.cache_creation_input_tokens ?? 0) * m.cacheWrite) /
      1_000_000;
  }
  return Math.round(total * 1_000_000) / 1_000_000;
}

/* ── Plans ───────────────────────────────────────────── */

export type PlanKey = "free" | "starter" | "pro" | "enterprise";

export const PLAN_LABELS: Record<PlanKey, string> = {
  free: "Esencial",
  starter: "Esencial",
  pro: "Profesional",
  enterprise: "Empresa",
};

/** Claude is included from the Profesional plan up; Esencial gets the automatic assistant. */
export const planIncludesClaude = (plan: string | null | undefined) => plan === "pro" || plan === "enterprise";

export const formatUsd = (n: number, digits = 2) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 2) }).format(n);
