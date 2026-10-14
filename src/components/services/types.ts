import type { Line, ServiceKind } from "@/lib/service-orders/flow";

export interface ServiceOrderRow {
  id: string;
  code: string;
  kind: ServiceKind;
  status: string;
  source: string;
  customerName: string;
  customerPhone: string | null;
  pickupAddress: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffAddress: string | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
  recipientName: string | null;
  recipientPhone: string | null;
  distanceKm: number | null;
  packageSize: string | null;
  packageDescription: string | null;
  handoff: string | null;
  returnMode: string | null;
  weightKg: number | null;
  items: Line[];
  deliveryFee: number;
  total: number;
  paid: boolean;
  scheduledFor: string | null;
  promisedAt: string | null;
  notes: string | null;
  token: string;
  assignedTo: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CourierOption {
  id: string;
  name: string;
}

export interface ServiceItemOption {
  id: string;
  name: string;
  price: number;
}

export const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia / Nequi",
};

export const selectClass = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

export const shortWhen = (iso: string, timeZone: string) =>
  new Date(iso).toLocaleString("es-CO", { timeZone, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).replace(/\./g, "");

export const waNumber = (phone: string | null) => {
  const d = phone?.replace(/\D/g, "") ?? "";
  return d.length === 10 ? `57${d}` : d;
};

export const mapsLink = (address: string | null, lat: number | null, lng: number | null) =>
  lat != null && lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
      : null;
