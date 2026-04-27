import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/get-active-business";
import { NoBusinessSelected } from "@/components/dashboard/no-business-selected";
import { OrdersTable } from "@/components/orders/orders-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";

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
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="dash-header" style={{ padding: 0 }}>
          <h1 className="flex items-center gap-3">
            <div className="section-header-icon">
              <ShoppingCart className="h-5 w-5" />
            </div>
            Historial de Pedidos
            <Badge variant="secondary" className="text-xs font-normal ml-1">{transactions?.length ?? 0}</Badge>
          </h1>
          <p>
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
