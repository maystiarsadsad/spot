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

/**
 * Update business basic info (superadmin only)
 */
export async function updateBusinessAsSuperadmin(
  businessId: string,
  formData: FormData
) {
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

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string;

  if (!name?.trim()) return { error: "El nombre es obligatorio" };
  if (!slug?.trim()) return { error: "El slug es obligatorio" };
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { error: "El slug solo puede contener letras minúsculas, números y guiones" };
  }

  // Check slug uniqueness (excluding current business)
  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .neq("id", businessId)
    .maybeSingle();

  if (existing) {
    return { error: `El slug "${slug}" ya está en uso por otro negocio` };
  }

  const { error } = await supabase
    .from("businesses")
    .update({
      name: name.trim(),
      slug: slug.trim(),
      description: description?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", businessId);

  if (error) {
    return { error: `Error al actualizar: ${error.message}` };
  }

  await logAudit({
    action: "update_business",
    entityType: "business",
    entityId: businessId,
    changes: { name, slug, description },
  });

  revalidatePath("/sa/businesses");
  revalidatePath(`/sa/businesses/${businessId}`);
  return { success: true };
}

/**
 * Create a new user as SuperAdmin (requires SUPABASE_SERVICE_ROLE_KEY)
 */
export async function createUserAsSuperadmin(data: {
  email: string;
  password: string;
  display_name: string;
  platform_role?: string;
}) {
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
    return { error: "No tienes permisos para crear usuarios" };
  }

  // Validate inputs
  if (!data.email || !data.password || !data.display_name) {
    return { error: "Email, contraseña y nombre son obligatorios" };
  }

  if (data.password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres" };
  }

  // Use admin client to create user
  let adminClient;
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    adminClient = createAdminClient();
  } catch (e: any) {
    return { error: e.message || "No se pudo inicializar el cliente admin. Verifica SUPABASE_SERVICE_ROLE_KEY." };
  }

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      display_name: data.display_name,
    },
  });

  if (createError) {
    if (createError.message.includes("already been registered")) {
      return { error: "Ya existe un usuario con ese email" };
    }
    return { error: createError.message };
  }

  if (!newUser.user) {
    return { error: "No se pudo crear el usuario" };
  }

  // Update platform_role if specified
  if (data.platform_role && data.platform_role !== "user") {
    await supabase
      .from("profiles")
      .update({ platform_role: data.platform_role })
      .eq("id", newUser.user.id);
  }

  // Audit log
  try {
    await logAudit({
      action: "user.created",
      entityType: "user",
      entityId: newUser.user.id,
      changes: {
        email: data.email,
        display_name: data.display_name,
        platform_role: data.platform_role || "user",
      },
    });
  } catch {}

  revalidatePath("/sa/users");
  return { success: true, userId: newUser.user.id };
}
