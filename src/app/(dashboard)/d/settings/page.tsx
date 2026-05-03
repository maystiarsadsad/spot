import { Metadata } from "next";
import { getActiveBusiness } from "@/lib/get-active-business";
import { NoBusinessSelected } from "@/components/dashboard/no-business-selected";
import { SettingsForm } from "@/components/settings/settings-form";
import { createClient } from "@/lib/supabase/server";
import { Settings2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Configuración del Negocio",
};

export default async function SettingsPage() {
  const activeBusiness = await getActiveBusiness();

  if (!activeBusiness) {
    return <NoBusinessSelected />;
  }

  const supabase = await createClient();
  
  // We fetch the latest data straight from DB to ensure accuracy
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", activeBusiness.id)
    .single();

  if (!business) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Error al cargar datos del negocio.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <h1 className="flex items-center gap-3">
          <div className="section-header-icon">
            <Settings2 className="h-5 w-5" />
          </div>
          Configuración General
        </h1>
        <p>
          Actualiza los datos, diseño y preferencias de tu negocio en la plataforma.
        </p>
      </div>

      <SettingsForm business={business as any} />
    </div>
  );
}
