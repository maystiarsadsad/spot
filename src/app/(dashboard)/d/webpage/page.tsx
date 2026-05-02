import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/get-active-business";
import { redirect } from "next/navigation";
import { WebpageEditor } from "@/components/webpage/webpage-editor";
import { Globe } from "lucide-react";

export default async function WebpagePage() {
  const business = await getActiveBusiness();
  if (!business) redirect("/d");

  const supabase = await createClient();

  const { data: fullBusiness } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", business.id)
    .single();

  if (!fullBusiness) redirect("/d");

  // Get categories and items count for preview info
  const { count: itemCount } = await supabase
    .from("catalog_items")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("active", true);

  const { count: catCount } = await supabase
    .from("catalog_categories")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("active", true);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="dash-header">
        <h1 className="flex items-center gap-3">
          <div className="section-header-icon">
            <Globe className="h-5 w-5" />
          </div>
          Mi Página Web
        </h1>
        <p>
          Configura y publica tu página pública para que tus clientes vean tu catálogo.
        </p>
      </div>

      <WebpageEditor
        business={fullBusiness}
        itemCount={itemCount || 0}
        categoryCount={catCount || 0}
      />
    </div>
  );
}
