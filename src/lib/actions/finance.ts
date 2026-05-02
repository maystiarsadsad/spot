"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";

// ── Expenses ────────────────────────────────────────────

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
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("expenses").insert({
    ...data,
    registered_by: user?.id,
  });

  if (error) {
    console.error("Error creating expense:", error);
    return { success: false, error: error.message };
  }

  // ── F2: Update daily_cash if expense is for today ──
  const today = format(new Date(), "yyyy-MM-dd");
  if (data.date === today) {
    await incrementDailyCashField(
      supabase,
      data.business_id,
      today,
      "total_expenses",
      data.amount
    );
  }

  revalidatePath("/d/finance");
  return { success: true };
}

export async function deleteExpense(expenseId: string) {
  const supabase = await createClient();

  // Fetch expense first so we can reverse daily_cash
  const { data: expense } = await supabase
    .from("expenses")
    .select("business_id, amount, date")
    .eq("id", expenseId)
    .single();

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId);

  if (error) {
    console.error("Error deleting expense:", error);
    return { success: false, error: error.message };
  }

  // Reverse daily_cash if expense was today
  if (expense) {
    const today = format(new Date(), "yyyy-MM-dd");
    if (expense.date === today) {
      await incrementDailyCashField(
        supabase,
        expense.business_id,
        today,
        "total_expenses",
        -(expense.amount || 0)
      );
    }
  }

  revalidatePath("/d/finance");
  return { success: true };
}

// ── Daily Cash ──────────────────────────────────────────

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

export async function getDailyCashHistory(businessId: string, limit = 30) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("daily_cash")
    .select("*")
    .eq("business_id", businessId)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching daily cash history:", error);
    return [];
  }

  return data || [];
}

export async function openDailyCash(data: {
  business_id: string;
  date: string;
  opening_balance: number;
}) {
  const supabase = await createClient();

  // Check if a cash register already exists for this date
  const { data: existing } = await supabase
    .from("daily_cash")
    .select("id")
    .eq("business_id", data.business_id)
    .eq("date", data.date)
    .single();

  if (existing) {
    return { success: false, error: "Ya existe un registro de caja para hoy" };
  }

  // ── F1/F2: Compute real totals from today's transactions and expenses ──
  const dayStart = `${data.date}T00:00:00`;
  const dayEnd = `${data.date}T23:59:59`;

  const [{ data: todayTx }, { data: todayExpenses }] = await Promise.all([
    supabase
      .from("transactions")
      .select("total, payment_method")
      .eq("business_id", data.business_id)
      .in("status", ["completed", "confirmed"])
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd),
    supabase
      .from("expenses")
      .select("amount")
      .eq("business_id", data.business_id)
      .eq("date", data.date),
  ]);

  let totalSales = 0;
  let totalCashIn = 0;
  let totalDigitalIn = 0;
  for (const tx of todayTx || []) {
    const amt = Number(tx.total || 0);
    totalSales += amt;
    if (tx.payment_method === "cash") {
      totalCashIn += amt;
    } else {
      totalDigitalIn += amt;
    }
  }

  const totalExpenses = (todayExpenses || []).reduce(
    (sum, e) => sum + Number(e.amount || 0), 0
  );

  const { error } = await supabase.from("daily_cash").insert({
    business_id: data.business_id,
    date: data.date,
    opening_balance: data.opening_balance,
    status: "open",
    total_sales: totalSales,
    total_cash_in: totalCashIn,
    total_digital_in: totalDigitalIn,
    total_expenses: totalExpenses,
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

  // ── F3: Calculate expected cash and difference ──
  const { data: cashRecord } = await supabase
    .from("daily_cash")
    .select("opening_balance, total_cash_in, total_expenses")
    .eq("id", cashId)
    .single();

  let expectedCash = closingBalance;
  let difference = 0;

  if (cashRecord) {
    expectedCash = (cashRecord.opening_balance || 0)
      + (cashRecord.total_cash_in || 0)
      - (cashRecord.total_expenses || 0);
    difference = closingBalance - expectedCash;
  }

  const { error } = await supabase
    .from("daily_cash")
    .update({
      status: "closed",
      closing_balance: closingBalance,
      closed_by: user?.id,
      notes: notes
        ? `${notes}${difference !== 0 ? ` | Diferencia: ${difference >= 0 ? '+' : ''}${difference}` : ''}`
        : difference !== 0
          ? `Diferencia en arqueo: ${difference >= 0 ? '+' : ''}${difference}`
          : undefined,
    })
    .eq("id", cashId);

  if (error) {
    console.error("Error closing daily cash:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/d/finance");
  return { success: true, expectedCash, difference };
}

// ── Helper: Increment a daily_cash field atomically ─────

export async function incrementDailyCashField(
  supabase: any,
  businessId: string,
  date: string,
  field: "total_sales" | "total_cash_in" | "total_digital_in" | "total_expenses",
  amount: number
) {
  // Find today's open cash register
  const { data: cashRecord } = await supabase
    .from("daily_cash")
    .select("id, " + field)
    .eq("business_id", businessId)
    .eq("date", date)
    .eq("status", "open")
    .single();

  if (!cashRecord) return; // No open cash register — gracefully skip

  const currentValue = Number(cashRecord[field] || 0);
  const newValue = Math.max(0, currentValue + amount); // Never go negative

  await supabase
    .from("daily_cash")
    .update({ [field]: newValue })
    .eq("id", cashRecord.id);
}

// ── F1: Called by orders.ts after a POS sale ────────────

export async function updateDailyCashOnSale(
  businessId: string,
  total: number,
  paymentMethod: string
) {
  const supabase = await createClient();
  const today = format(new Date(), "yyyy-MM-dd");

  // Always increment total_sales
  await incrementDailyCashField(supabase, businessId, today, "total_sales", total);

  // Increment the appropriate payment channel
  if (paymentMethod === "cash") {
    await incrementDailyCashField(supabase, businessId, today, "total_cash_in", total);
  } else {
    await incrementDailyCashField(supabase, businessId, today, "total_digital_in", total);
  }
}
