/** Paperwork tracked per vehicle (physical folder + what it contains). */
export const DOCUMENT_KEYS = [
  { key: "tarjeta_propiedad", label: "Tarjeta de propiedad", expires: false },
  { key: "soat", label: "SOAT", expires: true },
  { key: "tecnomecanica", label: "Revisión técnico-mecánica", expires: true },
  { key: "traspaso", label: "Formulario de traspaso", expires: false },
  { key: "contrato", label: "Contrato de compraventa", expires: false },
  { key: "cedula_vendedor", label: "Cédula del vendedor", expires: false },
  { key: "paz_y_salvo", label: "Paz y salvo de impuestos / multas", expires: false },
] as const;

export type DocumentKey = (typeof DOCUMENT_KEYS)[number]["key"];
export interface DocumentState {
  has: boolean;
  /** YYYY-MM-DD, only for documents that expire. */
  expires?: string | null;
}
export type VehicleDocuments = Partial<Record<DocumentKey, DocumentState>>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Keeps only known keys and well-formed values (documents arrive as arbitrary JSON). */
export function parseDocuments(raw: unknown): VehicleDocuments {
  const o = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const out: VehicleDocuments = {};
  for (const { key, expires } of DOCUMENT_KEYS) {
    const v = o[key];
    if (!v || typeof v !== "object") continue;
    const d = v as Record<string, unknown>;
    const state: DocumentState = { has: d.has === true };
    if (expires && typeof d.expires === "string" && DATE_RE.test(d.expires)) state.expires = d.expires;
    out[key] = state;
  }
  return out;
}

export interface DocumentIssue {
  key: DocumentKey;
  label: string;
  problem: "missing" | "expired" | "expiring";
}

/**
 * What blocks or threatens a sale: a document that is missing, expired, or
 * expires within `soonDays`. Everything is considered "missing" when untracked
 * so a new vehicle starts with a full to-do list.
 */
export function documentIssues(raw: unknown, today: string, soonDays = 30): DocumentIssue[] {
  const docs = parseDocuments(raw);
  const limit = new Date(Date.parse(`${today}T00:00:00Z`) + soonDays * 86_400_000).toISOString().slice(0, 10);
  const issues: DocumentIssue[] = [];
  for (const { key, label, expires } of DOCUMENT_KEYS) {
    const d = docs[key];
    if (!d?.has) {
      issues.push({ key, label, problem: "missing" });
    } else if (expires && d.expires) {
      if (d.expires < today) issues.push({ key, label, problem: "expired" });
      else if (d.expires <= limit) issues.push({ key, label, problem: "expiring" });
    }
  }
  return issues;
}

/** Documents that must be in order before handing the vehicle over. */
export const REQUIRED_TO_SELL: DocumentKey[] = ["tarjeta_propiedad", "traspaso"];

export function missingForSale(raw: unknown): string[] {
  const docs = parseDocuments(raw);
  return DOCUMENT_KEYS.filter((d) => REQUIRED_TO_SELL.includes(d.key) && !docs[d.key]?.has).map((d) => d.label);
}
