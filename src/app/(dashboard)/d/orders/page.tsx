import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/get-active-business";
import { NoBusinessSelected } from "@/components/dashboard/no-business-selected";
import { OrdersTable } from "@/components/orders/orders-table";

export const metadata: Metadata = {
  title: "Pedidos e Historial",
};

export default async function OrdersPage() {
  const business = await getActiveBusiness();

  if (!business) {
    return <NoBusinessSelected />;
  }

  const supabase = await createClient();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*, transaction_items(*)")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  return (
    <OrdersTable
      transactions={transactions || []}
      currency={business.currency || "COP"}
    />
  );
}
