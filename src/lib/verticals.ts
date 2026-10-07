import type { BusinessType } from "@/lib/constants";

/**
 * Operating engine ("vertical") of each business type. Every vertical has its
 * own public page and its own way of running the business in the dashboard.
 */
export type Vertical = "orders" | "appointments" | "stays" | "memberships" | "service_orders";

export const VERTICAL_BY_TYPE: Record<BusinessType, Vertical> = {
  restaurant: "orders",
  fast_food: "orders",
  cafe: "orders",
  bar: "orders",
  supermarket: "orders",
  clothing: "orders",
  hardware_store: "orders",
  barbershop: "appointments",
  tattoo: "appointments",
  veterinary: "appointments",
  custom: "appointments",
  hotel: "stays",
  hostel: "stays",
  gym: "memberships",
  logistics: "service_orders",
  laundry: "service_orders",
};

export const verticalOf = (type: string | null | undefined): Vertical =>
  VERTICAL_BY_TYPE[type as BusinessType] ?? "orders";

/** Words each appointment business uses for its people and its bookings. */
export const APPOINTMENT_TERMS: Partial<Record<BusinessType, { professional: string; professionals: string; booking: string; cta: string }>> = {
  barbershop: { professional: "barbero", professionals: "barberos", booking: "cita", cta: "Agenda tu cita" },
  tattoo: { professional: "artista", professionals: "artistas", booking: "cita", cta: "Agenda tu sesión" },
  veterinary: { professional: "veterinario", professionals: "veterinarios", booking: "cita", cta: "Agenda una cita para tu mascota" },
  custom: { professional: "profesional", professionals: "profesionales", booking: "cita", cta: "Reserva tu cita" },
};

export const appointmentTerms = (type: string) =>
  APPOINTMENT_TERMS[type as BusinessType] ?? { professional: "profesional", professionals: "profesionales", booking: "cita", cta: "Reserva tu cita" };
