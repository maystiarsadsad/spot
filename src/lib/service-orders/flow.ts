/**
 * Pure rules of the service-orders engine (laundries, couriers): status
 * pipeline per kind, shipment quote by distance and package size, laundry
 * totals and promise times.
 */

export type ServiceKind = "laundry" | "shipment";

export interface Stage {
  key: string;
  label: string;
  /** What the customer reads on the tracking page */
  customer: string;
}

const LAUNDRY: Stage[] = [
  { key: "requested", label: "Solicitado", customer: "Recibimos tu solicitud" },
  { key: "received", label: "Recibido", customer: "Tu ropa llegó al local" },
  { key: "washing", label: "En proceso", customer: "Lavando y planchando" },
  { key: "ready", label: "Listo", customer: "¡Tu ropa está lista!" },
  { key: "out_for_delivery", label: "En camino", customer: "Va en camino a tu casa" },
  { key: "delivered", label: "Entregado", customer: "Entregado" },
];

const SHIPMENT: Stage[] = [
  { key: "requested", label: "Solicitado", customer: "Recibimos tu envío" },
  { key: "assigned", label: "Asignado", customer: "Mensajero asignado" },
  { key: "in_transit", label: "En camino", customer: "Tu envío va en camino" },
  { key: "delivered", label: "Entregado", customer: "Entregado" },
];

export const CLOSED = ["delivered", "cancelled"];

export const STATUS_LABELS: Record<string, string> = {
  ...Object.fromEntries([...LAUNDRY, ...SHIPMENT].map((s) => [s.key, s.label])),
  cancelled: "Cancelado",
  failed: "Novedad",
};

/** Stages the order goes through (laundry skips "en camino" when picked up at the store). */
export function stagesFor(kind: ServiceKind, returnMode?: string | null): Stage[] {
  if (kind === "shipment") return SHIPMENT;
  return returnMode === "delivery" ? LAUNDRY : LAUNDRY.filter((s) => s.key !== "out_for_delivery");
}

/** Next step the staff can move the order to (null when there is none). */
export function nextStatus(kind: ServiceKind, status: string, returnMode?: string | null): string | null {
  if (status === "failed") return kind === "shipment" ? "assigned" : null;
  const stages = stagesFor(kind, returnMode);
  const i = stages.findIndex((s) => s.key === status);
  if (i === -1 || i === stages.length - 1) return null;
  return stages[i + 1].key;
}

/** Button label for moving to `next`. */
export const ADVANCE_LABELS: Record<string, string> = {
  received: "Marcar recibido",
  washing: "Pasar a proceso",
  ready: "Marcar listo",
  out_for_delivery: "Salió a entregar",
  delivered: "Marcar entregado",
  assigned: "Asignar mensajero",
  in_transit: "Salió a entregar",
};

/* ── settings ───────────────────────────────────────── */

export interface ServiceSettings {
  /** Km covered by the base price of the service */
  includedKm: number;
  perKm: number;
  /** Max route distance accepted online */
  maxKm: number;
  /** Real roads are longer than a straight line */
  roadFactor: number;
  sizeFees: { small: number; medium: number; large: number };
  /** Laundry: fee for picking up and/or delivering at home (0 = free) */
  homeServiceFee: number;
  /** Laundry: hours from reception to "ready" */
  turnaroundHours: number;
}

export const DEFAULT_SERVICE_SETTINGS: ServiceSettings = {
  includedKm: 5,
  perKm: 1500,
  maxKm: 40,
  roadFactor: 1.35,
  sizeFees: { small: 0, medium: 3000, large: 8000 },
  homeServiceFee: 0,
  turnaroundHours: 24,
};

const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function parseServiceSettings(raw: unknown): ServiceSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SERVICE_SETTINGS;
  const sizes = (r.sizeFees && typeof r.sizeFees === "object" ? r.sizeFees : {}) as Record<string, unknown>;
  return {
    includedKm: num(r.includedKm, 0, 100, d.includedKm),
    perKm: Math.round(num(r.perKm, 0, 100000, d.perKm)),
    maxKm: num(r.maxKm, 1, 1000, d.maxKm),
    roadFactor: num(r.roadFactor, 1, 2, d.roadFactor),
    sizeFees: {
      small: Math.round(num(sizes.small, 0, 1e6, d.sizeFees.small)),
      medium: Math.round(num(sizes.medium, 0, 1e6, d.sizeFees.medium)),
      large: Math.round(num(sizes.large, 0, 1e6, d.sizeFees.large)),
    },
    homeServiceFee: Math.round(num(r.homeServiceFee, 0, 1e6, d.homeServiceFee)),
    turnaroundHours: Math.round(num(r.turnaroundHours, 1, 720, d.turnaroundHours)),
  };
}

export const SIZE_LABELS: Record<string, string> = {
  small: "Pequeño (sobre, hasta 2 kg)",
  medium: "Mediano (caja, hasta 10 kg)",
  large: "Grande (hasta 30 kg)",
};

/* ── pricing ────────────────────────────────────────── */

export type Point = { lat: number; lng: number };

export function straightKm(a: Point, b: Point) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const round100 = (n: number) => Math.max(0, Math.round(n / 100) * 100);

export interface ShipmentQuote {
  distanceKm: number;
  base: number;
  distanceFee: number;
  sizeFee: number;
  total: number;
  tooFar: boolean;
}

/** Base price of the chosen service + km beyond the included ones + package size. */
export function quoteShipment(opts: { from: Point; to: Point; basePrice: number; size: "small" | "medium" | "large"; settings: ServiceSettings }): ShipmentQuote {
  const s = opts.settings;
  const distanceKm = Math.round(straightKm(opts.from, opts.to) * s.roadFactor * 10) / 10;
  const extraKm = Math.max(0, distanceKm - s.includedKm);
  const distanceFee = round100(extraKm * s.perKm);
  const sizeFee = s.sizeFees[opts.size] ?? 0;
  return {
    distanceKm,
    base: opts.basePrice,
    distanceFee,
    sizeFee,
    total: round100(opts.basePrice + distanceFee + sizeFee),
    tooFar: distanceKm > s.maxKm,
  };
}

export interface Line {
  itemId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export function lineTotal(unitPrice: number, quantity: number) {
  return round100(unitPrice * quantity);
}

export const sumLines = (lines: Line[]) => lines.reduce((a, l) => a + l.total, 0);

/** Laundry: pickup and/or home delivery pay the home service fee once. */
export function laundryDeliveryFee(handoff: string | null | undefined, returnMode: string | null | undefined, settings: ServiceSettings) {
  return handoff === "pickup" || returnMode === "delivery" ? settings.homeServiceFee : 0;
}

/** When the laundry promises the clothes (reception time + turnaround). */
export function promiseFrom(receivedAt: Date, settings: ServiceSettings) {
  return new Date(receivedAt.getTime() + settings.turnaroundHours * 3_600_000);
}

/** Short human code, e.g. "L-4K7Q2" (laundry) or "E-…" (shipment). */
export function newServiceCode(kind: ServiceKind, random: () => number = Math.random) {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 5; i++) code += alphabet[Math.floor(random() * alphabet.length)];
  return `${kind === "laundry" ? "L" : "E"}-${code}`;
}
