"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getExpenses(businessId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("business_id", businessId)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }

  return data;
}

export async function createExpense(data: {
  business_id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  payment_method?: string;
}) {
  const supabase = await createClient();
  
  // Get active session user
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("expenses").insert({
    ...data,
    registered_by: user?.id,
  });

  if (error) {
    console.error("Error creating expense:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/d/finance");
  return { success: true };
}

export async function deleteExpense(expenseId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId);

  if (error) {
    console.error("Error deleting expense:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/d/finance");
  return { success: true };
}

export async function getDailyCash(businessId: string, date: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("daily_cash")
    .select("*")
    .eq("business_id", businessId)
    .eq("date", date)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Error fetching daily cash:", error);
  }

  return data;
}

export async function openDailyCash(data: {
  business_id: string;
  date: string;
  opening_balance: number;
}) {
  const supabase = await createClient();

  const { error } = await supabase.from("daily_cash").insert({
    ...data,
    status: "open",
    total_sales: 0,
    total_cash_in: 0,
    total_digital_in: 0,
    total_expenses: 0,
  });

  if (error) {
    console.error("Error opening daily cash:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/d/finance");
  return { success: true };
}

export async function closeDailyCash(cashId: string, closingBalance: number, notes?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("daily_cash")
    .update({
      status: "closed",
      closing_balance: closingBalance,
      closed_by: user?.id,
      notes,
    })
    .eq("id", cashId);

  if (error) {
    console.error("Error closing daily cash:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/d/finance");
  return { success: true };
}
