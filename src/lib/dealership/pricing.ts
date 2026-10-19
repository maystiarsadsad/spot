/**
 * Pure rules of the dealership vertical: plates, stock aging, cost basis and
 * markdown (rebaja) suggestions. No I/O, fully tested.
 */

export interface DealerSettings {
  /** Days in stock before the first markdown is suggested. */
  markdownAfterDays: number;
  /** Percent taken off the asking price at each step. */
  stepPct: number;
  /** Days between steps once markdowns started. */
  everyDays: number;
  /** Minimum margin over cost the suggestion never goes below. */
  minMarginPct: number;
}

export const DEFAULT_DEALER_SETTINGS: DealerSettings = {
  markdownAfterDays: 45,
  stepPct: 3,
  everyDays: 15,
  minMarginPct: 5,
};

const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

export function parseDealerSettings(raw: unknown): DealerSettings {
  const o = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_DEALER_SETTINGS;
  return {
    markdownAfterDays: Math.round(num(o.markdownAfterDays, 0, 720, d.markdownAfterDays)),
    stepPct: num(o.stepPct, 0.5, 30, d.stepPct),
    everyDays: Math.round(num(o.everyDays, 1, 180, d.everyDays)),
    minMarginPct: num(o.minMarginPct, 0, 100, d.minMarginPct),
  };
}

// ── Plates ──────────────────────────────────────────────

/** "abc 12d" → "ABC12D". */
export const normalizePlate = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Loose check (Colombian cars ABC123, bikes ABC12D, but also older/foreign plates). */
export const isValidPlate = (raw: string) => /^[A-Z0-9]{4,10}$/.test(normalizePlate(raw));

// ── Stock aging ─────────────────────────────────────────

const DAY_MS = 86_400_000;

/** Whole days between two YYYY-MM-DD dates (never negative). */
export function daysBetween(from: string, to: string) {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / DAY_MS));
}

export type AgeBucket = "0-30" | "31-60" | "61-90" | "90+";
export const AGE_BUCKETS: AgeBucket[] = ["0-30", "31-60", "61-90", "90+"];

export function ageBucket(days: number): AgeBucket {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

// ── Cost, price, margin ─────────────────────────────────

/** What the vehicle has cost us so far: purchase + reconditioning. */
export const costBasis = (purchasePrice: number, costs: { amount: number }[]) =>
  Number(purchasePrice || 0) + costs.reduce((s, c) => s + Number(c.amount || 0), 0);

/** Margin as % of the sale price (null without a price). */
export function marginPct(price: number | null | undefined, cost: number) {
  if (!price || price <= 0) return null;
  return ((price - cost) / price) * 100;
}

const STEP = 50_000;
const roundDown = (n: number) => Math.floor(n / STEP) * STEP;
const roundUp = (n: number) => Math.ceil(n / STEP) * STEP;

/** Lowest price we accept: the manual floor or cost + minimum margin, whichever is higher. */
export function floorPrice(cost: number, settings: DealerSettings, manualMin?: number | null) {
  return Math.max(Number(manualMin ?? 0), roundUp(cost * (1 + settings.minMarginPct / 100)));
}

export type MarkdownAction = "hold" | "lower" | "at_floor";

export interface MarkdownAdvice {
  action: MarkdownAction;
  steps: number;
  /** Price to publish now (equals the list price when holding). */
  suggestedPrice: number | null;
  floor: number;
  /** Margin at the suggested price, % of price. */
  margin: number | null;
}

/**
 * Markdown schedule: after `markdownAfterDays` the price drops `stepPct`% and
 * keeps dropping every `everyDays`, never below the floor. Once at the floor
 * the advice is "at_floor": the next lever is a promotion or liquidation, not
 * more discount.
 */
export function markdownAdvice(
  listPrice: number | null,
  cost: number,
  days: number,
  settings: DealerSettings,
  manualMin?: number | null
): MarkdownAdvice {
  const floor = floorPrice(cost, settings, manualMin);
  if (!listPrice || listPrice <= 0) {
    return { action: "hold", steps: 0, suggestedPrice: null, floor, margin: null };
  }
  const steps = days < settings.markdownAfterDays ? 0 : 1 + Math.floor((days - settings.markdownAfterDays) / settings.everyDays);
  if (steps === 0) {
    return { action: "hold", steps, suggestedPrice: listPrice, floor, margin: marginPct(listPrice, cost) };
  }
  const target = roundDown(listPrice * Math.pow(1 - settings.stepPct / 100, steps));
  if (listPrice <= floor || target <= floor) {
    const price = Math.min(listPrice, floor);
    return { action: "at_floor", steps, suggestedPrice: price, floor, margin: marginPct(price, cost) };
  }
  return { action: "lower", steps, suggestedPrice: target, floor, margin: marginPct(target, cost) };
}

// ── Stock summary ───────────────────────────────────────

export interface StockVehicle {
  acquiredOn: string;
  cost: number;
  listPrice: number | null;
}

export interface StockSummary {
  units: number;
  /** Money tied up in unsold vehicles (cost basis). */
  capitalTied: number;
  /** Asking value of the stock. */
  askingValue: number;
  byBucket: Record<AgeBucket, { units: number; capital: number }>;
  avgDays: number;
}

export function stockSummary(vehicles: StockVehicle[], today: string): StockSummary {
  const byBucket = Object.fromEntries(AGE_BUCKETS.map((b) => [b, { units: 0, capital: 0 }])) as StockSummary["byBucket"];
  let capital = 0;
  let asking = 0;
  let totalDays = 0;
  for (const v of vehicles) {
    const days = daysBetween(v.acquiredOn, today);
    const b = byBucket[ageBucket(days)];
    b.units += 1;
    b.capital += v.cost;
    capital += v.cost;
    asking += v.listPrice ?? 0;
    totalDays += days;
  }
  return {
    units: vehicles.length,
    capitalTied: capital,
    askingValue: asking,
    byBucket,
    avgDays: vehicles.length ? Math.round(totalDays / vehicles.length) : 0,
  };
}
