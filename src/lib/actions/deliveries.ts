"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Creates the tracking record for an order that doesn't have one yet
 * (POS orders, or web orders placed before tracking existed).
 * Idempotent: returns the existing delivery if there is one.
 */
export async function enableDeliveryTracking(transactionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  // RLS guarantees the user is a member of the order's business.
  const { data: txn, error: txnError } = await supabase
    .from("transactions")
    .select("id, business_id, status")
    .eq("id", transactionId)
    .single();

  if (txnError || !txn) return { error: "Pedido no encontrado" };
  if (txn.status === "cancelled" || txn.status === "completed") {
    return { error: "El pedido ya está cerrado" };
  }

  const { data: existing } = await supabase
    .from("deliveries")
    .select("id")
    .eq("business_id", txn.business_id)
    .eq("transaction_id", txn.id)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase
      .from("deliveries")
      .insert({ business_id: txn.business_id, transaction_id: txn.id });
    if (error) return { error: error.message };
  }

  revalidatePath("/d/orders");
  return { success: true };
}
