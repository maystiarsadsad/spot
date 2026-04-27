import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/get-active-business";
import { NoBusinessSelected } from "@/components/dashboard/no-business-selected";
import { ReservationsCalendar } from "@/components/reservations/reservations-calendar";
import { CalendarDays } from "lucide-react";

export const metadata: Metadata = {
  title: "Reservas",
};

export default async function ReservationsPage() {
  const business = await getActiveBusiness();

  if (!business) {
    return (
      <div className="space-y-6">
        <div className="dash-header">
          <h1>Reservas</h1>
          <p>Gestiona la agenda y citas de tu negocio.</p>
        </div>
        <NoBusinessSelected />
      </div>
    );
  }

  const supabase = await createClient();

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

  const { data: catalogItems } = await supabase
    .from("catalog_items")
    .select("id, name, type")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("name");

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <h1 className="flex items-center gap-3">
          <div className="section-header-icon">
            <CalendarDays className="h-5 w-5" />
          </div>
          Reservas
        </h1>
        <p>
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
