export interface RoomTypeRow {
  id: string;
  name: string;
  price: number;
  capacity: number;
}

export interface RoomRow {
  id: string;
  itemId: string;
  name: string;
  floor: string | null;
  housekeeping: string;
  active: boolean;
}

export interface StayRow {
  id: string;
  code: string;
  itemId: string | null;
  roomId: string | null;
  guestName: string;
  guestPhone: string | null;
  guestEmail: string | null;
  guestDocument: string | null;
  guestNationality: string | null;
  adults: number;
  children: number;
  checkIn: string;
  checkOut: string;
  arrivalTime: string | null;
  status: string;
  roomTotal: number;
  extras: number;
  paid: number;
  source: string;
  notes: string | null;
  token: string;
}

export interface SeasonRow {
  id: string;
  name: string;
  itemId: string | null;
  startsOn: string;
  endsOn: string;
  adjustmentPct: number;
  minNights: number | null;
}

export interface ServiceOption {
  id: string;
  name: string;
  price: number;
}

export const balanceOf = (s: StayRow) => s.roomTotal + s.extras - s.paid;

export const SOURCE_LABELS: Record<string, string> = {
  web: "Página web",
  desk: "Recepción",
  phone: "Teléfono / WhatsApp",
  ota: "Booking / Airbnb",
};

export const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia / Nequi",
};

export const shortDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("es-CO", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "");

export const selectClass = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";
