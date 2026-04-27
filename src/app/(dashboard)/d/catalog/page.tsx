import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/get-active-business";
import { NoBusinessSelected } from "@/components/dashboard/no-business-selected";
import { CatalogTable } from "@/components/catalog/catalog-table";
import { CategoriesTable } from "@/components/catalog/categories-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Package, FolderOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Catálogo",
};

export default async function CatalogPage() {
  const business = await getActiveBusiness();

  if (!business) {
    return (
      <div className="space-y-6">
        <div className="dash-header">
          <h1>Catálogo</h1>
          <p>Gestiona los productos y servicios de tu negocio</p>
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

  const { data: items } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <h1 className="flex items-center gap-3">
          <div className="section-header-icon">
            <Package className="h-5 w-5" />
          </div>
          Catálogo
          <Badge variant="secondary" className="text-xs font-normal ml-1">{items?.length ?? 0} items</Badge>
        </h1>
        <p>
          Gestiona los productos, servicios o habitaciones de {business.name}.
        </p>
      </div>

      <Tabs defaultValue="items" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="items" className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Artículos
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" />
            Categorías
          </TabsTrigger>
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
