"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
