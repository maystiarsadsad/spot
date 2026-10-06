/**
 * Product option groups ("modifiers"), Rappi/DiDi style:
 * "Elige tu proteína" (1 obligatoria), "Adiciones" (0..3, con precio),
 * "¿Incluir cubiertos?" (Sí / No), "Quitar ingredientes" (0..n, gratis)…
 *
 * Stored in catalog_items.options (definition) and transaction_items.options
 * (snapshot of what the customer chose, with the price at that moment).
 * Pure module: used by the storefront, the POS and the server actions.
 */

export interface OptionChoice {
  id: string;
  name: string;
  /** Added to the base price, can be 0 */
  price: number;
  available: boolean;
  /** Pre-selected when the customer opens the product */
  default?: boolean;
  /** Optional stock consumption when this choice is sold (per unit of product) */
  inventory_id?: string | null;
  inventory_qty?: number | null;
}

export interface OptionGroup {
  id: string;
  name: string;
  /** 0 = optional, ≥1 = required */
  min: number;
  /** 1 = single choice (radio), >1 = multiple (checkbox) */
  max: number;
  choices: OptionChoice[];
}

/** groupId → chosen choiceIds */
export type OptionSelection = Record<string, string[]>;

/** What gets stored on transaction_items.options */
export interface SelectedOption {
  group: string;
  choice: string;
  price: number;
  inventory_id?: string | null;
  inventory_qty?: number | null;
}

const MAX_GROUPS = 20;
const MAX_CHOICES = 40;
export const MAX_NOTE_LENGTH = 200;

export const newOptionId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

/** Turns whatever is in the JSON column into well-formed groups (drops garbage). */
export function parseOptionGroups(raw: unknown): OptionGroup[] {
  if (!Array.isArray(raw)) return [];
  const groups: OptionGroup[] = [];
  for (const g of raw.slice(0, MAX_GROUPS)) {
    if (!g || typeof g !== "object") continue;
    const name = String((g as OptionGroup).name ?? "").trim().slice(0, 80);
    const id = String((g as OptionGroup).id ?? "").slice(0, 40);
    if (!name || !id) continue;
    const choices: OptionChoice[] = [];
    const rawChoices = Array.isArray((g as OptionGroup).choices) ? (g as OptionGroup).choices : [];
    for (const c of rawChoices.slice(0, MAX_CHOICES)) {
      if (!c || typeof c !== "object") continue;
      const cname = String(c.name ?? "").trim().slice(0, 80);
      const cid = String(c.id ?? "").slice(0, 40);
      if (!cname || !cid) continue;
      const price = Number(c.price);
      const qty = Number(c.inventory_qty);
      choices.push({
        id: cid,
        name: cname,
        price: Number.isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : 0,
        available: c.available !== false,
        default: c.default === true || undefined,
        inventory_id: c.inventory_id ? String(c.inventory_id) : null,
        inventory_qty: c.inventory_id && Number.isFinite(qty) && qty > 0 ? qty : null,
      });
    }
    if (choices.length === 0) continue;
    const max = clampInt((g as OptionGroup).max, 1, choices.length);
    const min = clampInt((g as OptionGroup).min, 0, max);
    groups.push({ id, name, min, max, choices });
  }
  return groups;
}

function clampInt(v: unknown, lo: number, hi: number) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

export const isRequired = (g: OptionGroup) => g.min > 0;
export const isSingle = (g: OptionGroup) => g.max === 1;

/** Human hint like "Obligatorio · elige 1" / "Opcional · hasta 3". */
export function groupRule(g: OptionGroup) {
  if (g.min > 0 && g.min === g.max) return `Obligatorio · elige ${g.min}`;
  if (g.min > 0) return `Obligatorio · elige de ${g.min} a ${g.max}`;
  return g.max === 1 ? "Opcional · elige 1" : `Opcional · hasta ${g.max}`;
}

export function defaultSelection(groups: OptionGroup[]): OptionSelection {
  const sel: OptionSelection = {};
  for (const g of groups) {
    const defaults = g.choices.filter((c) => c.available && c.default).map((c) => c.id);
    sel[g.id] = defaults.slice(0, g.max);
  }
  return sel;
}

/** Toggles a choice respecting the group's max (radio replaces, checkbox caps). */
export function toggleChoice(sel: OptionSelection, g: OptionGroup, choiceId: string): OptionSelection {
  const current = sel[g.id] ?? [];
  if (isSingle(g)) {
    // Optional radios can be cleared by tapping again
    const next = current[0] === choiceId && !isRequired(g) ? [] : [choiceId];
    return { ...sel, [g.id]: next };
  }
  if (current.includes(choiceId)) return { ...sel, [g.id]: current.filter((id) => id !== choiceId) };
  if (current.length >= g.max) return sel;
  return { ...sel, [g.id]: [...current, choiceId] };
}

/** Returns the first problem with the selection, or null when it's valid. */
export function validateSelection(groups: OptionGroup[], sel: OptionSelection): string | null {
  for (const g of groups) {
    const chosen = (sel[g.id] ?? []).filter((id) => g.choices.some((c) => c.id === id && c.available));
    if ((sel[g.id] ?? []).length !== chosen.length) return `Una opción de "${g.name}" ya no está disponible`;
    if (new Set(chosen).size !== chosen.length) return `Opción repetida en "${g.name}"`;
    if (chosen.length < g.min) return g.min === 1 ? `Elige una opción en "${g.name}"` : `Elige al menos ${g.min} en "${g.name}"`;
    if (chosen.length > g.max) return `Máximo ${g.max} en "${g.name}"`;
  }
  return null;
}

/** Flat snapshot (in group order) of the chosen options. Ignores unknown ids. */
export function snapshotSelection(groups: OptionGroup[], sel: OptionSelection): SelectedOption[] {
  const out: SelectedOption[] = [];
  for (const g of groups) {
    const ids = sel[g.id] ?? [];
    for (const c of g.choices) {
      if (!ids.includes(c.id)) continue;
      out.push({
        group: g.name,
        choice: c.name,
        price: c.price,
        ...(c.inventory_id && c.inventory_qty ? { inventory_id: c.inventory_id, inventory_qty: c.inventory_qty } : {}),
      });
    }
  }
  return out;
}

export const optionsPrice = (snapshot: SelectedOption[]) => snapshot.reduce((sum, o) => sum + o.price, 0);

/** Stable key so identical customizations merge into one cart line. */
export function lineKey(itemId: string, sel: OptionSelection, note = "") {
  const parts = Object.keys(sel)
    .sort()
    .map((gid) => `${gid}:${[...(sel[gid] ?? [])].sort().join(",")}`)
    .filter((p) => !p.endsWith(":"));
  return [itemId, ...parts, note.trim().toLowerCase()].join("|");
}

/** "Proteína: Res (+$3.000)" style lines, grouped by option group. */
export function describeOptions(snapshot: unknown, formatPrice?: (n: number) => string): string[] {
  if (!Array.isArray(snapshot)) return [];
  const byGroup = new Map<string, string[]>();
  for (const o of snapshot as SelectedOption[]) {
    if (!o?.group || !o?.choice) continue;
    const label = o.price > 0 && formatPrice ? `${o.choice} (+${formatPrice(o.price)})` : o.choice;
    byGroup.set(o.group, [...(byGroup.get(o.group) ?? []), label]);
  }
  return [...byGroup.entries()].map(([g, cs]) => `${g}: ${cs.join(", ")}`);
}

/* ── Presets for the catalog editor ──────────────────── */

type PresetChoice = [name: string, price?: number, isDefault?: boolean];

const preset = (name: string, min: number, max: number, choices: PresetChoice[]): (() => OptionGroup) => () => ({
  id: newOptionId(),
  name,
  min,
  max,
  choices: choices.map(([n, price = 0, isDefault]) => ({
    id: newOptionId(),
    name: n,
    price,
    available: true,
    ...(isDefault ? { default: true } : {}),
  })),
});

export const OPTION_PRESETS: { key: string; label: string; build: () => OptionGroup }[] = [
  { key: "cutlery", label: "¿Incluir cubiertos?", build: preset("¿Incluir cubiertos?", 1, 1, [["Sí, por favor"], ["No, gracias", 0, true]]) },
  { key: "protein", label: "Proteína", build: preset("Elige tu proteína", 1, 1, [["Pollo"], ["Res", 3000], ["Cerdo"], ["Vegetariana"]]) },
  { key: "doneness", label: "Término de la carne", build: preset("Término de la carne", 1, 1, [["Azul"], ["Medio"], ["Tres cuartos", 0, true], ["Bien asado"]]) },
  { key: "side", label: "Acompañamiento", build: preset("Elige tu acompañamiento", 1, 1, [["Papas a la francesa", 0, true], ["Arroz"], ["Ensalada"], ["Patacón", 2000]]) },
  { key: "extras", label: "Adiciones", build: preset("Adiciones", 0, 3, [["Queso extra", 3000], ["Tocineta", 4000], ["Huevo", 2000], ["Aguacate", 3500]]) },
  { key: "remove", label: "Quitar ingredientes", build: preset("Quitar ingredientes", 0, 4, [["Sin cebolla"], ["Sin tomate"], ["Sin salsas"], ["Sin lechuga"]]) },
  { key: "drink", label: "Bebida del combo", build: preset("Elige tu bebida", 1, 1, [["Gaseosa", 0, true], ["Limonada natural", 2000], ["Jugo natural", 2500], ["Agua"]]) },
  { key: "size", label: "Tamaño", build: preset("Tamaño", 1, 1, [["Personal", 0, true], ["Mediano", 6000], ["Grande", 12000]]) },
];
