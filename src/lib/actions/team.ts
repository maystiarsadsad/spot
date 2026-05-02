"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ── BUSINESS MEMBERS (User Access) ──────────────────────

export async function getBusinessMembers(businessId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("business_members")
    .select("id, user_id, role, permissions, status, joined_at")
    .eq("business_id", businessId)
    .order("joined_at");

  if (error) {
    console.error("Error fetching business members:", error);
    return [];
  }

  // Enrich with profile data
  if (!data || data.length === 0) return [];

  const userIds = data.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, email, avatar_url")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, p])
  );

  return data.map((member) => ({
    ...member,
    profile: profileMap.get(member.user_id) || null,
  }));
}

export async function inviteMember(
  businessId: string,
  email: string,
  role: string,
  allowedModules: string[]
) {
  const supabase = await createClient();

  // Check the caller is owner or admin of this business
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data: callerMember } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .single();

  if (!callerMember || !["owner", "admin"].includes(callerMember.role)) {
    return { success: false, error: "No tienes permisos para invitar usuarios" };
  }

  // Find the user by email in profiles
  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (!targetProfile) {
    return { success: false, error: "No se encontró un usuario con ese email. Debe estar registrado en Spot." };
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("business_members")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", targetProfile.id)
    .single();

  if (existing) {
    return { success: false, error: "Este usuario ya es miembro de este negocio" };
  }

  // Prevent assigning owner role
  if (role === "owner") {
    return { success: false, error: "No puedes asignar el rol de propietario" };
  }

  const { error } = await supabase.from("business_members").insert({
    business_id: businessId,
    user_id: targetProfile.id,
    role,
    permissions: { modules: allowedModules },
    status: "active",
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/d/team");
  return { success: true };
}

export async function updateMemberRole(memberId: string, role: string) {
  const supabase = await createClient();

  if (role === "owner") {
    return { success: false, error: "No puedes asignar el rol de propietario" };
  }

  const { error } = await supabase
    .from("business_members")
    .update({ role })
    .eq("id", memberId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/d/team");
  return { success: true };
}

export async function updateMemberModules(memberId: string, modules: string[]) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("business_members")
    .update({ permissions: { modules } })
    .eq("id", memberId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/d/team");
  return { success: true };
}

export async function removeMember(memberId: string) {
  const supabase = await createClient();

  // Prevent removing owners
  const { data: member } = await supabase
    .from("business_members")
    .select("role")
    .eq("id", memberId)
    .single();

  if (member?.role === "owner") {
    return { success: false, error: "No puedes eliminar al propietario del negocio" };
  }

  const { error } = await supabase
    .from("business_members")
    .delete()
    .eq("id", memberId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/d/team");
  return { success: true };
}

// Create a new user account and add them as a business member + employee
export async function createMember(
  businessId: string,
  data: {
    display_name: string;
    email: string;
    password: string;
    role: string;
    modules: string[];
    position?: string;
  }
) {
  const supabase = await createClient();

  // Check caller is owner or admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data: callerMember } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .single();

  if (!callerMember || !["owner", "admin"].includes(callerMember.role)) {
    return { success: false, error: "No tienes permisos para crear usuarios" };
  }

  // Validate
  if (!data.email || !data.password || !data.display_name) {
    return { success: false, error: "Nombre, email y contraseña son obligatorios" };
  }
  if (data.password.length < 6) {
    return { success: false, error: "La contraseña debe tener al menos 6 caracteres" };
  }
  if (data.role === "owner") {
    return { success: false, error: "No puedes asignar el rol de propietario" };
  }

  const rolePositionMap: Record<string, string> = {
    admin: "Administrador(a)",
    manager: "Gerente",
    cashier: "Cajero(a)",
    employee: "Empleado(a)",
    viewer: "Observador",
  };

  // Create auth user via admin API
  let adminClient;
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    adminClient = createAdminClient();
  } catch (e: any) {
    return { success: false, error: "Error de configuración del servidor" };
  }

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { display_name: data.display_name },
  });

  if (createError) {
    if (createError.message.includes("already been registered")) {
      // User already exists — try to add as member
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", data.email.toLowerCase().trim())
        .single();

      if (!existingProfile) {
        return { success: false, error: "Ya existe un usuario con ese email pero no se encontró su perfil" };
      }

      // Check not already a member
      const { data: existing } = await supabase
        .from("business_members")
        .select("id")
        .eq("business_id", businessId)
        .eq("user_id", existingProfile.id)
        .single();

      if (existing) {
        return { success: false, error: "Este usuario ya es miembro de este negocio" };
      }

      // Add as member
      await supabase.from("business_members").insert({
        business_id: businessId,
        user_id: existingProfile.id,
        role: data.role,
        permissions: { modules: data.modules },
        status: "active",
      });

      // Also add as employee if not already one
      const { data: existingEmployee } = await supabase
        .from("employees")
        .select("id")
        .eq("business_id", businessId)
        .eq("user_id", existingProfile.id)
        .single();

      if (!existingEmployee) {
        await supabase.from("employees").insert({
          business_id: businessId,
          user_id: existingProfile.id,
          full_name: data.display_name,
          email: data.email.toLowerCase().trim(),
          position: data.position || rolePositionMap[data.role] || "Empleado(a)",
          salary: 0,
          status: "active",
        });
      }

      revalidatePath("/d/team");
      return { success: true };
    }
    return { success: false, error: createError.message };
  }

  if (!newUser.user) {
    return { success: false, error: "No se pudo crear el usuario" };
  }

  // Add to business_members
  await supabase.from("business_members").insert({
    business_id: businessId,
    user_id: newUser.user.id,
    role: data.role,
    permissions: { modules: data.modules },
    status: "active",
  });

  // Also create employee record (linked via user_id)
  await supabase.from("employees").insert({
    business_id: businessId,
    user_id: newUser.user.id,
    full_name: data.display_name,
    email: data.email.toLowerCase().trim(),
    position: data.position || rolePositionMap[data.role] || "Empleado(a)",
    salary: 0,
    status: "active",
  });

  revalidatePath("/d/team");
  return { success: true };
}

// --- EMPLOYEES ---

export async function getEmployees(businessId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("business_id", businessId)
    .order("full_name");

  if (error) {
    console.error("Error fetching employees:", error);
    return [];
  }

  return data;
}

export async function createEmployee(data: {
  business_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  position: string;
  department?: string;
  document_id?: string;
  salary: number;
  salary_type?: string; // "monthly" | "hourly" 
  hire_date?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  notes?: string;
  status?: string; // "active" | "inactive" | "on_leave"
}) {
  const supabase = await createClient();

  const { data: newEmp, error } = await supabase
    .from("employees")
    .insert({ ...data, status: data.status || "active" })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/d/team");
  return { success: true, employee: newEmp };
}

export async function updateEmployee(
  employeeId: string,
  data: Partial<{
    full_name: string;
    email: string;
    phone: string;
    position: string;
    department: string;
    document_id: string;
    salary: number;
    salary_type: string;
    hire_date: string;
    emergency_contact: string;
    emergency_phone: string;
    notes: string;
    status: string;
  }>
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("employees")
    .update(data)
    .eq("id", employeeId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/d/team");
  return { success: true };
}

export async function deleteEmployee(employeeId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("employees")
    .delete()
    .eq("id", employeeId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/d/team");
  return { success: true };
}


// --- PAYROLL ---

export async function getPayrollRecords(businessId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payroll")
    .select("*, employee:employees(full_name, position)")
    .eq("business_id", businessId)
    .order("period_end", { ascending: false });

  if (error) {
    console.error("Error fetching payroll:", error);
    return [];
  }

  return data;
}

export async function createPayrollRecord(data: {
  business_id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  base_salary: number;
  bonuses?: number;
  deductions?: number;
  overtime_hours?: number;
  overtime_pay?: number;
  tax?: number;
  notes?: string;
  payment_method?: string;
}) {
  const supabase = await createClient();

  // Calculate net pay
  const base = data.base_salary || 0;
  const bonuses = data.bonuses || 0;
  const overtime = data.overtime_pay || 0;
  const deductions = data.deductions || 0;
  const tax = data.tax || 0;
  
  const net_pay = base + bonuses + overtime - deductions - tax;

  const { error } = await supabase.from("payroll").insert({
    ...data,
    net_pay,
    status: "paid", // Auto mark as paid for simple implementations
    paid_at: new Date().toISOString()
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/d/team");
  return { success: true };
}

export async function deletePayrollRecord(payrollId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("payroll")
    .delete()
    .eq("id", payrollId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/d/team");
  return { success: true };
}
