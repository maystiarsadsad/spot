"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

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
 * Reads the active business context from cookies and validates
 * the user has access to it. Returns null if no business is selected
 * or the user doesn't have access.
 *
 * Usage in any Server Component:
 * ```ts
 * const business = await getActiveBusiness();
 * if (!business) return <NoBusiness />;
 * // Now use business.id to filter all queries
 * ```
 */
export async function getActiveBusiness(): Promise<ActiveBusiness | null> {
  const cookieStore = await cookies();
  const businessId = cookieStore.get("spot-business-id")?.value;

  if (!businessId) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Verify the user has access: either they own it or are a member
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, type, logo_url, currency, timezone")
    .eq("id", businessId)
    .single();

  if (!business) return null;

  // Check access: owner OR active member
  const isOwner = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .single();

  if (isOwner.data) {
    return business as ActiveBusiness;
  }

  const isMember = await supabase
    .from("business_members")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (isMember.data) {
    return business as ActiveBusiness;
  }

  return null;
}
