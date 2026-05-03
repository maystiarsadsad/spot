"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function setActiveBusinessCookie(businessId: string) {
  const cookieStore = await cookies();
  cookieStore.set("spot-business-id", businessId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function getMembershipForBusiness(businessId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { role: null, permissions: null };

  const { data: membership } = await supabase
    .from("business_members")
    .select("role, permissions")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .single();

  if (membership) {
    return { role: membership.role, permissions: membership.permissions };
  }

  // Check if user is owner
  const { data: business } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("id", businessId)
    .single();

  if (business?.owner_id === user.id) {
    return { role: "owner", permissions: null };
  }

  return { role: null, permissions: null };
}

export async function getEnabledModules(businessId: string): Promise<string[] | null> {
  const supabase = await createClient();

  const { data: modules } = await supabase
    .from("business_modules")
    .select("module_key, enabled")
    .eq("business_id", businessId);

  if (modules && modules.length > 0) {
    return modules
      .filter((m) => m.enabled)
      .map((m) => m.module_key);
  }

  return null; // No explicit config — fallback to defaults
}
