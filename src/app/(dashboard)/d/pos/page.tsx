import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/get-active-business";
import { NoBusinessSelected } from "@/components/dashboard/no-business-selected";
import { POSClient } from "@/components/pos/pos-client";

export const metadata: Metadata = {
  title: "Punto de Venta (POS)",
};

export default async function POSPage() {
  const business = await getActiveBusiness();

  if (!business) {
    return <NoBusinessSelected />;
  }

  const supabase = await createClient();

  // Fetch Categories
  const { data: categories } = await supabase
    .from("catalog_categories")
    .select("id, name, icon")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("sort_order")
    .order("name");

  // Fetch Items
  const { data: items } = await supabase
    .from("catalog_items")
    .select("id, name, price, category_id, image_url, active")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("sort_order")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Caja (POS)</h1>
        <p className="text-muted-foreground mt-1">
          Crea nuevas ventas y pedidos rápidamente para {business.name}.
        </p>
      </div>

      <POSClient 
        businessId={business.id} 
        categories={categories || []} 
        items={items || []} 
        currency={business.currency || "COP"} 
      />
    </div>
  );
}
