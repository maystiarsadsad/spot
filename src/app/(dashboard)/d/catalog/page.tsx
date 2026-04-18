import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/get-active-business";
import { NoBusinessSelected } from "@/components/dashboard/no-business-selected";
import { CatalogTable } from "@/components/catalog/catalog-table";
import { CategoriesTable } from "@/components/catalog/categories-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export const metadata: Metadata = {
  title: "Catálogo",
};

export default async function CatalogPage() {
  const business = await getActiveBusiness();

  if (!business) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los productos y servicios de tu negocio
          </p>
        </div>
        <NoBusinessSelected />
      </div>
    );
  }

  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("catalog_categories")
    .select("*")
    .eq("business_id", business.id)
    .order("name");

  // Fetch Items
  const { data: items } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Catálogo</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona los productos, servicios o habitaciones de {business.name}.
        </p>
      </div>

      <Tabs defaultValue="items" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="items">Artículos</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
        </TabsList>
        <TabsContent value="items" className="mt-0">
          <CatalogTable
            businessId={business.id}
            businessType={business.type}
            items={items || []}
            categories={categories || []}
            currency={business.currency || "COP"}
          />
        </TabsContent>
        <TabsContent value="categories" className="mt-0">
          <CategoriesTable
            businessId={business.id}
            categories={categories || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
