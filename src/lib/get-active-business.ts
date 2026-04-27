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
 * Optimized: single auth call + single business query (RLS handles access).
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

  // RLS policies already enforce that the user can only read businesses
  // they own or are a member of — no need for extra owner/member checks
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, type, logo_url, currency, timezone")
    .eq("id", businessId)
    .single();

  if (!business) return null;

  return business as ActiveBusiness;
}
