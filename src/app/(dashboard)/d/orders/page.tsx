import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/get-active-business";
import { NoBusinessSelected } from "@/components/dashboard/no-business-selected";
import { OrdersTable } from "@/components/orders/orders-table";

export const metadata: Metadata = {
  title: "Pedidos e Historial",
};

const WINDOWS = [30, 90, 365];
const MAX_ROWS = 500;

const windowStart = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: daysParam } = await searchParams;
  const windowDays = WINDOWS.includes(Number(daysParam)) ? Number(daysParam) : 30;
  const business = await getActiveBusiness();

  if (!business) {
    return <NoBusinessSelected />;
  }

  const supabase = await createClient();

  // Recent history only (the table grows forever). Open orders always show, however old.
  const since = windowStart(windowDays);
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*, transaction_items(*), deliveries(status, tracking_token, courier_token, courier_name, location_updated_at)")
    .eq("business_id", business.id)
    .or(`created_at.gte.${since},status.in.(pending,confirmed,in_progress)`)
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);

  return (
    <OrdersTable
      transactions={transactions || []}
      currency={business.currency || "COP"}
      businessSlug={business.slug}
      windowDays={windowDays}
      windowOptions={WINDOWS}
      truncated={(transactions?.length ?? 0) >= MAX_ROWS}
    />
  );
}
