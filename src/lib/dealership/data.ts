import { createAdminClient } from "@/lib/supabase/admin";

/** What a visitor may see of a vehicle: never cost, plate, seller or paperwork. */
export interface PublicVehicle {
  id: string;
  type: string;
  brand: string;
  model: string | null;
  year: number | null;
  color: string | null;
  mileageKm: number | null;
  displacementCc: number | null;
  price: number | null;
  reserved: boolean;
  description: string | null;
  photos: string[];
}

export async function loadPublicVehicles(businessId: string, admin = createAdminClient()): Promise<PublicVehicle[]> {
  const { data } = await admin
    .from("vehicles")
    .select("id, vehicle_type, brand, model, year, color, mileage_km, displacement_cc, list_price, status, description, photos")
    .eq("business_id", businessId)
    .eq("published", true)
    .in("status", ["in_stock", "reserved"])
    .order("created_at", { ascending: false })
    .limit(500);
  return (data ?? []).map((v) => ({
    id: v.id,
    type: v.vehicle_type,
    brand: v.brand,
    model: v.model,
    year: v.year,
    color: v.color,
    mileageKm: v.mileage_km,
    displacementCc: v.displacement_cc,
    price: v.list_price == null ? null : Number(v.list_price),
    reserved: v.status === "reserved",
    description: v.description,
    photos: v.photos ?? [],
  }));
}
