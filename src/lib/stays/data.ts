/**
 * Server data for the stays engine (hotels, hostels). Public pages are anonymous →
 * service role, always filtered by business_id, returning public-safe fields.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import {
  nightlyRates,
  nightsCount,
  parseStaySettings,
  requiredMinNights,
  sumNights,
  type NightRate,
  type RateSeason,
  type StaySettings,
} from "./pricing";

type Admin = ReturnType<typeof createAdminClient>;

export interface StayBusiness {
  id: string;
  name: string;
  slug: string;
  type: string;
  timeZone: string;
  currency: string;
  whatsapp: string | null;
  settings: StaySettings;
}

export interface RoomType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  capacity: number;
  imageUrl: string | null;
  /** Active rooms (or beds) of this type */
  units: number;
}

export async function loadStayBusiness(businessId: string, admin: Admin = createAdminClient()): Promise<StayBusiness | null> {
  const { data } = await admin
    .from("businesses")
    .select("id, name, slug, type, timezone, currency, whatsapp, phone, stay_settings, active")
    .eq("id", businessId)
    .single();
  if (!data || data.active === false) return null;
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    type: data.type,
    timeZone: data.timezone || "America/Bogota",
    currency: data.currency || "COP",
    whatsapp: data.whatsapp || data.phone || null,
    settings: parseStaySettings(data.stay_settings),
  };
}

export async function loadRoomTypes(businessId: string, admin: Admin = createAdminClient()): Promise<RoomType[]> {
  const [{ data: items }, { data: rooms }] = await Promise.all([
    admin
      .from("catalog_items")
      .select("id, name, description, price, capacity, image_url, sort_order")
      .eq("business_id", businessId)
      .eq("type", "room")
      .eq("active", true)
      .order("sort_order"),
    admin.from("rooms").select("item_id").eq("business_id", businessId).eq("active", true),
  ]);
  const units = new Map<string, number>();
  for (const r of rooms ?? []) units.set(r.item_id, (units.get(r.item_id) ?? 0) + 1);
  return (items ?? []).map((it) => ({
    id: it.id,
    name: it.name,
    description: it.description ?? null,
    price: Number(it.price),
    capacity: Number(it.capacity) > 0 ? Number(it.capacity) : 2,
    imageUrl: it.image_url ?? null,
    units: units.get(it.id) ?? 0,
  }));
}

export async function loadSeasons(businessId: string, admin: Admin = createAdminClient()): Promise<RateSeason[]> {
  const { data } = await admin
    .from("rate_seasons")
    .select("id, name, item_id, starts_on, ends_on, adjustment_pct, min_nights")
    .eq("business_id", businessId)
    .order("starts_on");
  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    itemId: s.item_id,
    startsOn: s.starts_on,
    endsOn: s.ends_on,
    adjustmentPct: s.adjustment_pct,
    minNights: s.min_nights,
  }));
}

/** Rooms of each type that are free for every night of [checkIn, checkOut). */
export async function freeRoomsByType(businessId: string, checkIn: string, checkOut: string, admin: Admin = createAdminClient()) {
  const [{ data: rooms }, { data: busy }] = await Promise.all([
    admin.from("rooms").select("id, item_id, housekeeping").eq("business_id", businessId).eq("active", true),
    admin
      .from("stays")
      .select("room_id")
      .eq("business_id", businessId)
      .in("status", ["pending", "confirmed", "checked_in"])
      .not("room_id", "is", null)
      .lt("check_in", checkOut)
      .gt("check_out", checkIn),
  ]);
  const taken = new Set((busy ?? []).map((s) => s.room_id as string));
  const free = new Map<string, number>();
  for (const r of rooms ?? []) {
    if (r.housekeeping === "maintenance" || taken.has(r.id)) continue;
    free.set(r.item_id, (free.get(r.item_id) ?? 0) + 1);
  }
  return free;
}

export interface StayQuote {
  type: RoomType;
  free: number;
  nights: NightRate[];
  total: number;
  minNights: number;
}

/** Availability + price of every room type for a date range. */
export async function quoteStay(businessId: string, settings: StaySettings, checkIn: string, checkOut: string, admin: Admin = createAdminClient()): Promise<StayQuote[]> {
  const [types, seasons, free] = await Promise.all([
    loadRoomTypes(businessId, admin),
    loadSeasons(businessId, admin),
    freeRoomsByType(businessId, checkIn, checkOut, admin),
  ]);
  if (nightsCount(checkIn, checkOut) === 0) return [];
  return types
    .filter((t) => t.units > 0)
    .map((type) => {
      const nights = nightlyRates({ basePrice: type.price, itemId: type.id, checkIn, checkOut, seasons, settings });
      return {
        type,
        free: free.get(type.id) ?? 0,
        nights,
        total: sumNights(nights),
        minNights: requiredMinNights(type.id, checkIn, checkOut, seasons, settings),
      };
    });
}
