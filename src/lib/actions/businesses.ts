"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DEFAULT_MODULES_BY_TYPE, type BusinessType } from "@/lib/constants";
import { logAudit } from "./audit";

export async function createBusiness(formData: FormData) {
  const supabase = await createClient();

  // 1. Check Auth & SuperAdmin Role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autorizado" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("platform_role")
    .eq("id", user.id)
    .single();

  if (profile?.platform_role !== "superadmin") {
    return { error: "No tienes permisos para realizar esta acción" };
  }

  // 2. Parse Form Data
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const type = formData.get("type") as BusinessType;
  const ownerEmail = formData.get("ownerEmail") as string | null;

  if (!name || !slug || !type) {
    return { error: "Faltan campos obligatorios (Nombre, Slug, y Tipo)" };
  }

  // 3. Find or Create Owner Profile
  let ownerId = user.id; // Default to superadmin (current user)

  if (ownerEmail && ownerEmail.trim() !== "") {
    const { data: ownerProfile, error: ownerError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", ownerEmail)
      .single();

    if (ownerError || !ownerProfile) {
      console.error("🔥 OWNER PROFILE ERROR:", ownerError, "PROFILE:", ownerProfile);
      return { error: `No se encontró un usuario con el email ${ownerEmail}. Verifique que el usuario esté registrado en la plataforma.` };
    }
    ownerId = ownerProfile.id;
  }

  // 4. Create Business
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .insert({
      name,
      slug,
      type,
      owner_id: ownerId,
      active: true,
      onboarding_completed: false,
    })
    .select()
    .single();

  if (businessError) {
    console.error("🔥 SUPABASE ERROR CREATING BUSINESS:", businessError);
    return { error: `Error al crear negocio: ${businessError.message}` };
  }

  // 5. Add Owner to business_members
  const { error: memberError } = await supabase.from("business_members").insert({
    business_id: business.id,
    user_id: ownerId,
    role: "owner",
    status: "active",
  });

  if (memberError) {
    console.error("Error adding owner to business_members:", memberError);
    // Not fatal, but suboptimal
  }

  // 6. Enable Default Modules
  const defaultModules = DEFAULT_MODULES_BY_TYPE[type] || [];
  const modulesToInsert = defaultModules.map((moduleKey) => ({
    business_id: business.id,
    module_key: moduleKey,
    enabled: true,
  }));

  if (modulesToInsert.length > 0) {
    const { error: modulesError } = await supabase
      .from("business_modules")
      .insert(modulesToInsert);
    
    if (modulesError) {
      console.error("Error enabling default modules:", modulesError);
    }
  }


  await logAudit({
    action: "create_business",
    entityType: "business",
    entityId: business.id,
    changes: { name, slug, type, owner_id: ownerId },
  });

  revalidatePath("/sa/businesses");
  return { success: true };
}

export async function toggleBusinessModule(
  businessId: string,
  moduleKey: string,
  enabled: boolean
) {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("platform_role")
    .eq("id", user.id)
    .single();

  if (profile?.platform_role !== "superadmin") {
    throw new Error("No tienes permisos para realizar esta acción");
  }

  // Upsert module configuration
  const { error } = await supabase.from("business_modules").upsert(
    {
      business_id: businessId,
      module_key: moduleKey,
      enabled: enabled,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "business_id, module_key",
    }
  );

  if (error) {
    throw new Error(`Error al actualizar módulo: ${error.message}`);
  }

  await logAudit({
    action: enabled ? "enable_module" : "disable_module",
    entityType: "business_module",
    entityId: businessId,
    changes: { module_key: moduleKey, enabled },
  });

  revalidatePath(`/sa/businesses/${businessId}`);
}
