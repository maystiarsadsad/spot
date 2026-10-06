import type { SupabaseClient } from "@supabase/supabase-js";

export interface UserBusiness {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  type: string;
}

/**
 * Businesses a user belongs to: active memberships first, then any they own
 * that have no membership row. Shared by the dashboard layout (sidebar) and
 * getActiveBusiness() so both fall back to the same "first business" when the
 * spot-business-id cookie is missing or stale — Server Components can't write
 * cookies, so they must at least agree on the fallback.
 */
export async function getUserBusinesses(
  supabase: SupabaseClient,
  userId: string
): Promise<UserBusiness[]> {
  const { data: memberBusinesses, error } = await supabase
    .from("business_members")
    .select("business_id, businesses ( id, name, slug, logo_url, type )")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) {
    console.log("Warning fetching member businesses:", error.message || JSON.stringify(error));
  }

  const { data: ownedBusinesses } = await supabase
    .from("businesses")
    .select("id, name, slug, logo_url, type")
    .eq("owner_id", userId);

  const businesses: UserBusiness[] = (memberBusinesses || [])
    .map((mb: { businesses: unknown }) =>
      Array.isArray(mb.businesses) ? mb.businesses[0] : mb.businesses
    )
    .filter(Boolean) as UserBusiness[];

  const seen = new Set(businesses.map((b) => b.id));
  for (const b of (ownedBusinesses || []) as UserBusiness[]) {
    if (!seen.has(b.id)) {
      businesses.push(b);
      seen.add(b.id);
    }
  }

  return businesses;
}

/** Cookie id if it belongs to the user, otherwise the first available business. */
export function resolveActiveBusinessId(
  businesses: UserBusiness[],
  cookieBusinessId: string | undefined
): string | undefined {
  if (cookieBusinessId && businesses.some((b) => b.id === cookieBusinessId)) {
    return cookieBusinessId;
  }
  return businesses[0]?.id;
}
