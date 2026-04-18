import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/get-active-business";
import { NoBusinessSelected } from "@/components/dashboard/no-business-selected";
import { ReservationsCalendar } from "@/components/reservations/reservations-calendar";

export const metadata: Metadata = {
  title: "Reservas",
};

export default async function ReservationsPage() {
  const business = await getActiveBusiness();

  if (!business) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reservas</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona la agenda y citas de tu negocio.
          </p>
        </div>
        <NoBusinessSelected />
      </div>
    );
  }

  const supabase = await createClient();

  // Fetch reservations with the catalog item joined
  const { data: reservations } = await supabase
    .from("reservations")
    .select(`
      *,
      catalog_items (
        name
      )
    `)
    .eq("business_id", business.id)
    .order("reservation_time", { ascending: true });

  // Fetch items for the dialog dropdown
  const { data: catalogItems } = await supabase
    .from("catalog_items")
    .select("id, name, type")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("name");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reservas</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona las reservas, citas o alojamientos de {business.name}.
        </p>
      </div>

      <ReservationsCalendar
        businessId={business.id}
        businessType={business.type}
        reservations={reservations || []}
        catalogItems={catalogItems || []}
      />
    </div>
  );
}
