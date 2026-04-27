"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logAudit } from "./audit";

/**
 * Change a user's platform role (superadmin only)
 */
export async function changeUserRole(userId: string, newRole: string) {
  const supabase = await createClient();

  // Auth & superadmin check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("platform_role")
    .eq("id", user.id)
    .single();

  if (profile?.platform_role !== "superadmin") {
    return { error: "No tienes permisos para realizar esta acción" };
  }

  // Prevent changing own role
  if (userId === user.id) {
    return { error: "No puedes cambiar tu propio rol" };
  }

  // Validate role
  const validRoles = ["superadmin", "support", "user"];
  if (!validRoles.includes(newRole)) {
    return { error: `Rol inválido: ${newRole}` };
  }

  // Get old role for audit
  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("platform_role, display_name, email")
    .eq("id", userId)
    .single();

  const oldRole = targetProfile?.platform_role;

  // Update
  const { error } = await supabase
    .from("profiles")
    .update({ platform_role: newRole, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    return { error: `Error al cambiar rol: ${error.message}` };
  }

  await logAudit({
    action: "update_role",
    entityType: "profile",
    entityId: userId,
    changes: {
      old_role: oldRole,
      new_role: newRole,
      target_user: targetProfile?.display_name || targetProfile?.email,
    },
  });

  revalidatePath("/sa/users");
  return { success: true };
}

/**
 * Suspend a business (superadmin only)
 */
export async function suspendBusiness(businessId: string, reason: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("platform_role")
    .eq("id", user.id)
    .single();

  if (profile?.platform_role !== "superadmin") {
    return { error: "No tienes permisos" };
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("name, suspended")
    .eq("id", businessId)
    .single();

  const { error } = await supabase
    .from("businesses")
    .update({
      suspended: true,
      suspended_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", businessId);

  if (error) {
    return { error: `Error al suspender: ${error.message}` };
  }

  await logAudit({
    action: "suspend_business",
    entityType: "business",
    entityId: businessId,
    changes: {
      business_name: business?.name,
      reason,
    },
  });

  revalidatePath("/sa/businesses");
  revalidatePath(`/sa/businesses/${businessId}`);
  return { success: true };
}

/**
 * Reactivate a suspended business (superadmin only)
 */
export async function reactivateBusiness(businessId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("platform_role")
    .eq("id", user.id)
    .single();

  if (profile?.platform_role !== "superadmin") {
    return { error: "No tienes permisos" };
  }

  const { error } = await supabase
    .from("businesses")
    .update({
      suspended: false,
      suspended_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", businessId);

  if (error) {
    return { error: `Error al reactivar: ${error.message}` };
  }

  await logAudit({
    action: "reactivate_business",
    entityType: "business",
    entityId: businessId,
  });

  revalidatePath("/sa/businesses");
  revalidatePath(`/sa/businesses/${businessId}`);
  return { success: true };
}
