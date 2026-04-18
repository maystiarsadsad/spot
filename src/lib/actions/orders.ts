"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface OrderItemPayload {
  catalog_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface CreateOrderPayload {
  type: 'order' | 'sale';
  customer_name?: string;
  customer_phone?: string;
  payment_method?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  items: OrderItemPayload[];
}

export async function createOrder(businessId: string, payload: CreateOrderPayload) {
  const supabase = await createClient();

  // Insert Transaction
  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .insert({
      business_id: businessId,
      type: payload.type,
      status: payload.type === 'sale' ? 'completed' : 'pending', // A sale in POS is usually completed immediately
      payment_method: payload.payment_method,
      payment_status: payload.type === 'sale' ? 'paid' : 'pending',
      subtotal: payload.subtotal,
      discount: payload.discount,
      tax: payload.tax,
      total: payload.total,
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone,
      code: `ORD-${Date.now().toString().slice(-6)}`,
    })
    .select()
    .single();

  if (transactionError) {
    return { error: transactionError.message };
  }

  // Insert Transaction Items
  const itemsToInsert = payload.items.map(item => ({
    transaction_id: transaction.id,
    catalog_item_id: item.catalog_item_id,
    name: item.name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
  }));

  const { error: itemsError } = await supabase
    .from("transaction_items")
    .insert(itemsToInsert);

  if (itemsError) {
    return { error: itemsError.message };
  }

  revalidatePath("/d/orders");
  revalidatePath("/d/pos");
  return { success: true, transaction };
}

export async function updateOrderStatus(orderId: string, status: string, paymentStatus?: string) {
  const supabase = await createClient();

  const updateData: any = { status };
  if (paymentStatus) {
    updateData.payment_status = paymentStatus;
  }
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("transactions")
    .update(updateData)
    .eq("id", orderId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/d/orders");
  return { success: true };
}
