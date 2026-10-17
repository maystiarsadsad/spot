import { createClient } from "@/lib/supabase/server";

/** Roles that can change settings, people and money records of a business. */
export const MANAGE_ROLES = ["owner", "admin", "manager"] as const;
/** Roles that can record day-to-day operations (everyone except read-only). */
export const WRITE_ROLES = ["owner", "admin", "manager", "cashier", "employee"] as const;
/** Roles that can manage the team itself. */
export const ADMIN_ROLES = ["owner", "admin"] as const;

type GuardOk = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  role: string;
  isSuperadmin: boolean;
};
export type GuardResult = GuardOk | { error: string };

/**
 * Server Action guard: signed-in user, active member of `businessId` (or
 * superadmin) and, when `roles` is given, holding one of those roles.
 * RLS stays as the safety net; this makes the intent explicit in code.
 * Not a "use server" file on purpose: helpers exported from one would become
 * callable actions.
 */
export async function requireBusinessAccess(
  businessId: string,
  roles?: readonly string[]
): Promise<GuardResult> {
  if (!businessId) return { error: "Negocio no válido" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const [{ data: member }, { data: profile }] = await Promise.all([
    supabase
      .from("business_members")
      .select("role, status")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("platform_role").eq("id", user.id).maybeSingle(),
  ]);

  const isSuperadmin = profile?.platform_role === "superadmin";
  const activeMember = member && member.status === "active" ? member : null;
  if (!isSuperadmin && !activeMember) return { error: "No perteneces a este negocio" };

  const role = activeMember?.role ?? "superadmin";
  if (roles && !isSuperadmin && !roles.includes(role)) {
    return { error: "No tienes permiso para hacer esto" };
  }
  return { supabase, userId: user.id, role, isSuperadmin };
}
