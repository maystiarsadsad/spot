"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getUserBusinesses, resolveActiveBusinessId } from "@/lib/get-user-businesses";

export interface ActiveBusiness {
  id: string;
  name: string;
  slug: string;
  type: string;
  logo_url: string | null;
  currency: string;
  timezone: string;
}

/**
 * Reads the active business from the spot-business-id cookie, validated
 * against the businesses the user actually belongs to. If the cookie is
 * missing (fresh login) or stale (belongs to someone else's session), falls
 * back to the user's first business — the same one the dashboard sidebar
 * shows as selected. Returns null only if the user has no businesses.
 */
export async function getActiveBusiness(): Promise<ActiveBusiness | null> {
  const cookieStore = await cookies();
  const cookieBusinessId = cookieStore.get("spot-business-id")?.value;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Validate against the user's own businesses rather than trusting the
  // cookie: superadmins can read every business through RLS, so a stale
  // cookie would otherwise silently point at a business the sidebar doesn't show.
  const businesses = await getUserBusinesses(supabase, user.id);
  const businessId = resolveActiveBusinessId(businesses, cookieBusinessId);

  if (!businessId) return null;

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, type, logo_url, currency, timezone")
    .eq("id", businessId)
    .single();

  if (!business) return null;

  return business as ActiveBusiness;
}
