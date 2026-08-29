import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/get-active-business";
import { NoBusinessSelected } from "@/components/dashboard/no-business-selected";
import { POSClient } from "@/components/pos/pos-client";
import { getCreditAccounts } from "@/lib/actions/credits";
import { ShoppingCart } from "lucide-react";

export const metadata: Metadata = {
  title: "Punto de Venta (POS)",
};

export default async function POSPage() {
  const business = await getActiveBusiness();

  if (!business) {
    return <NoBusinessSelected />;
  }

  const supabase = await createClient();

  // Fetch Categories, Items, and Credit Accounts in parallel
  const [
    { data: categories },
    { data: items },
    creditAccounts,
  ] = await Promise.all([
    supabase
      .from("catalog_categories")
      .select("id, name, icon")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("sort_order")
      .order("name"),
    supabase
      .from("catalog_items")
      .select("id, name, price, category_id, image_url, active, sku, inventory_id, inventory:inventory_id(barcode)")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("sort_order")
      .order("name"),
    getCreditAccounts(business.id),
  ]);

  // Products sold "directo" from an inventory item (e.g. scanned into stock with
  // a barcode) carry that barcode via the inventory_id FK — resolve it here so
  // the barcode scanner can match it at checkout, not just the manual SKU field.
  const posItems = (items || []).map((it: any) => ({
    ...it,
    barcode: it.inventory?.barcode ?? null,
  }));

  // Map credit accounts for POS (only active ones)
  const posCredits = (creditAccounts || [])
    .filter((ca: any) => ca.status === "active")
    .map((ca: any) => ({
      id: ca.id,
      contact_id: ca.contact_id,
      contact_name: ca.contact?.full_name || "—",
      credit_limit: ca.credit_limit,
      current_balance: ca.current_balance,
    }));

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <h1 className="flex items-center gap-3">
          <div className="section-header-icon">
            <ShoppingCart className="h-5 w-5" />
          </div>
          Caja (POS)
        </h1>
        <p>
          Crea nuevas ventas y pedidos rápidamente para {business.name}.
        </p>
      </div>

      <POSClient
        businessId={business.id}
        categories={categories || []}
        items={posItems}
        currency={business.currency || "COP"}
        creditAccounts={posCredits}
      />
    </div>
  );
}
