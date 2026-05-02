"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── READ ───────────────────────────────────────────

export async function getCreditAccounts(businessId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credit_accounts")
    .select(`
      *,
      contact:contacts!credit_accounts_contact_id_fkey(id, full_name, phone, email, document_number),
      guarantor:contacts!credit_accounts_guarantor_id_fkey(id, full_name, phone)
    `)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching credit accounts:", error);
    return [];
  }
  return data || [];
}

export async function getCreditAccount(accountId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("credit_accounts")
    .select(`
      *,
      contact:contacts!credit_accounts_contact_id_fkey(id, full_name, phone, email, document_number),
      guarantor:contacts!credit_accounts_guarantor_id_fkey(id, full_name, phone)
    `)
    .eq("id", accountId)
    .single();
  return data;
}

export async function getCreditPayments(accountId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("credit_payments")
    .select("*")
    .eq("credit_account_id", accountId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getContactCreditAccount(businessId: string, contactId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("credit_accounts")
    .select("*")
    .eq("business_id", businessId)
    .eq("contact_id", contactId)
    .single();
  return data;
}

// ─── CREATE / UPDATE ────────────────────────────────

export async function createCreditAccount(data: {
  business_id: string;
  contact_id: string;
  credit_limit: number;
  guarantor_id?: string;
  guarantor_name?: string;
  guarantor_document?: string;
  guarantor_phone?: string;
  guarantor_relationship?: string;
  notes?: string;
}) {
  const supabase = await createClient();

  const { error } = await supabase.from("credit_accounts").insert({
    business_id: data.business_id,
    contact_id: data.contact_id,
    credit_limit: data.credit_limit,
    current_balance: 0,
    status: "active",
    guarantor_id: data.guarantor_id || null,
    guarantor_name: data.guarantor_name || null,
    guarantor_document: data.guarantor_document || null,
    guarantor_phone: data.guarantor_phone || null,
    guarantor_relationship: data.guarantor_relationship || null,
    notes: data.notes || null,
  });

  if (error) {
    if (error.message.includes("duplicate key") || error.message.includes("unique")) {
      return { success: false, error: "Este cliente ya tiene una cuenta de crédito" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/d/contacts");
  revalidatePath("/d/finance");
  return { success: true };
}

export async function updateCreditAccount(
  accountId: string,
  data: {
    credit_limit?: number;
    status?: string;
    guarantor_id?: string | null;
    guarantor_name?: string;
    guarantor_document?: string;
    guarantor_phone?: string;
    guarantor_relationship?: string;
    notes?: string;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("credit_accounts")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", accountId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/d/contacts");
  revalidatePath("/d/finance");
  return { success: true };
}

// ─── CHARGE (venta a crédito) ───────────────────────

export async function chargeToCredit(data: {
  credit_account_id: string;
  transaction_id?: string;
  amount: number;
  notes?: string;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Get current account
  const { data: account } = await supabase
    .from("credit_accounts")
    .select("current_balance, credit_limit, status")
    .eq("id", data.credit_account_id)
    .single();

  if (!account) return { success: false, error: "Cuenta de crédito no encontrada" };
  if (account.status !== "active") return { success: false, error: "La cuenta de crédito no está activa" };

  const newBalance = (account.current_balance || 0) + data.amount;
  if (account.credit_limit > 0 && newBalance > account.credit_limit) {
    return {
      success: false,
      error: `Excede el límite de crédito. Disponible: ${account.credit_limit - account.current_balance}`,
    };
  }

  // Record the charge
  const { error: paymentError } = await supabase.from("credit_payments").insert({
    credit_account_id: data.credit_account_id,
    transaction_id: data.transaction_id || null,
    type: "charge",
    amount: data.amount,
    notes: data.notes || "Venta a crédito",
    recorded_by: user?.id,
  });

  if (paymentError) return { success: false, error: paymentError.message };

  // Update balance
  const { error: updateError } = await supabase
    .from("credit_accounts")
    .update({
      current_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.credit_account_id);

  if (updateError) return { success: false, error: updateError.message };

  revalidatePath("/d/contacts");
  revalidatePath("/d/finance");
  return { success: true };
}

// ─── PAYMENT (abono) ────────────────────────────────

export async function recordCreditPayment(data: {
  credit_account_id: string;
  amount: number;
  payment_method: string;
  notes?: string;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Get current balance
  const { data: account } = await supabase
    .from("credit_accounts")
    .select("current_balance")
    .eq("id", data.credit_account_id)
    .single();

  if (!account) return { success: false, error: "Cuenta no encontrada" };

  if (data.amount <= 0) return { success: false, error: "El monto debe ser mayor a 0" };
  if (data.amount > (account.current_balance || 0)) {
    return { success: false, error: "El abono no puede ser mayor al saldo pendiente" };
  }

  // Record payment
  const { error: paymentError } = await supabase.from("credit_payments").insert({
    credit_account_id: data.credit_account_id,
    type: "payment",
    amount: data.amount,
    payment_method: data.payment_method,
    notes: data.notes || "Abono",
    recorded_by: user?.id,
  });

  if (paymentError) return { success: false, error: paymentError.message };

  // Update balance
  const newBalance = (account.current_balance || 0) - data.amount;
  const { error: updateError } = await supabase
    .from("credit_accounts")
    .update({
      current_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.credit_account_id);

  if (updateError) return { success: false, error: updateError.message };

  revalidatePath("/d/contacts");
  revalidatePath("/d/finance");
  return { success: true };
}

// ─── STATS ──────────────────────────────────────────

export async function getCreditStats(businessId: string) {
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("credit_accounts")
    .select("current_balance, status, credit_limit")
    .eq("business_id", businessId);

  if (!accounts) return { totalAccounts: 0, activeAccounts: 0, totalOwed: 0, totalLimit: 0 };

  const active = accounts.filter((a) => a.status === "active");
  const totalOwed = active.reduce((sum, a) => sum + (a.current_balance || 0), 0);
  const totalLimit = active.reduce((sum, a) => sum + (a.credit_limit || 0), 0);

  return {
    totalAccounts: accounts.length,
    activeAccounts: active.length,
    totalOwed,
    totalLimit,
  };
}
