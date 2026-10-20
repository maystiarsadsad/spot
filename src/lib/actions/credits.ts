"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireBusinessAccess, MANAGE_ROLES, WRITE_ROLES } from "@/lib/auth-guard";

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
  const auth = await requireBusinessAccess(data.business_id, MANAGE_ROLES);
  if ("error" in auth) return { success: false, error: auth.error };
  const supabase = auth.supabase;

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
  const { data: account } = await supabase.from("credit_accounts").select("business_id").eq("id", accountId).maybeSingle();
  if (!account) return { success: false, error: "Cuenta no encontrada" };
  const auth = await requireBusinessAccess(account.business_id, MANAGE_ROLES);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase
    .from("credit_accounts")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", accountId)
    .eq("business_id", account.business_id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/d/contacts");
  revalidatePath("/d/finance");
  return { success: true };
}

// ─── CHARGE (venta a crédito) ───────────────────────

/** Business that owns a credit account, read through RLS ("" if not visible). */
async function creditAccountBusinessId(accountId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("credit_accounts").select("business_id").eq("id", accountId).maybeSingle();
  return data?.business_id ?? "";
}

/** Charge or payment, applied atomically in SQL (row lock + limit/balance checks + movement + balance). */
async function applyCreditMovement(
  type: "charge" | "payment",
  data: { credit_account_id: string; amount: number; payment_method?: string; notes?: string; transaction_id?: string }
) {
  const businessId = await creditAccountBusinessId(data.credit_account_id);
  const auth = await requireBusinessAccess(businessId, WRITE_ROLES);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await auth.supabase.rpc("apply_credit_movement", {
    p_account_id: data.credit_account_id,
    p_type: type,
    p_amount: Number(data.amount),
    p_payment_method: data.payment_method,
    p_notes: data.notes?.trim().slice(0, 300) || undefined,
    p_transaction_id: data.transaction_id,
  });
  if (error) {
    return { success: false, error: error.code === "P0001" ? error.message : "No se pudo registrar el movimiento" };
  }

  revalidatePath("/d/contacts");
  revalidatePath("/d/finance");
  return { success: true };
}

export async function chargeToCredit(data: {
  credit_account_id: string;
  transaction_id?: string;
  amount: number;
  notes?: string;
}) {
  return applyCreditMovement("charge", data);
}

// ─── PAYMENT (abono) ────────────────────────────────

export async function recordCreditPayment(data: {
  credit_account_id: string;
  amount: number;
  payment_method: string;
  notes?: string;
}) {
  return applyCreditMovement("payment", data);
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
