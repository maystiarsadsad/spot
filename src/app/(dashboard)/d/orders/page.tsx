import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/get-active-business";
import { NoBusinessSelected } from "@/components/dashboard/no-business-selected";
import { OrdersTable } from "@/components/orders/orders-table";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Pedidos e Historial",
};

export default async function OrdersPage() {
  const business = await getActiveBusiness();

  if (!business) {
    return <NoBusinessSelected />;
  }

  const supabase = await createClient();

  // Fetch Transactions
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Historial de Pedidos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los pedidos y ventas de {business.name}.
          </p>
        </div>
        <Link href="/d/pos" className={buttonVariants({ variant: "default" })}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Venta (POS)
        </Link>
      </div>

      <OrdersTable 
        transactions={transactions || []} 
        currency={business.currency || "COP"} 
      />
    </div>
  );
}
