import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/get-active-business";
import { NoBusinessSelected } from "@/components/dashboard/no-business-selected";
import { CatalogClient } from "@/components/catalog/catalog-client";

export const metadata: Metadata = {
  title: "Catálogo",
};

export default async function CatalogPage() {
  const business = await getActiveBusiness();

  if (!business) {
    return <NoBusinessSelected />;
  }

  const supabase = await createClient();

  const [{ data: categories }, { data: items }, { data: inventoryItems }] = await Promise.all([
    supabase
      .from("catalog_categories")
      .select("*")
      .eq("business_id", business.id)
      .order("name"),
    supabase
      .from("catalog_items")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("inventory")
      .select("id, name, unit")
      .eq("business_id", business.id)
      .order("name"),
  ]);

  return (
    <CatalogClient
      businessId={business.id}
      businessType={business.type}
      items={items || []}
      categories={categories || []}
      inventoryItems={inventoryItems || []}
      currency={business.currency || "COP"}
    />
  );
}
