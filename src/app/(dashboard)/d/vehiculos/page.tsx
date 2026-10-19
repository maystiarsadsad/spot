import type { Metadata } from "next";
import Link from "next/link";
import { Bike } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/get-active-business";
import { NoBusinessSelected } from "@/components/dashboard/no-business-selected";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { InventoryPanel } from "@/components/vehicles/inventory-panel";
import { AnalysisPanel } from "@/components/vehicles/analysis-panel";
import { DocumentsPanel } from "@/components/vehicles/documents-panel";
import type { CostRow, PriceChangeRow, VehicleRow } from "@/components/vehicles/types";
import { localDate } from "@/lib/booking/availability";
import { documentIssues, parseDocuments } from "@/lib/dealership/documents";
import { costBasis, daysBetween, marginPct, markdownAdvice, parseDealerSettings } from "@/lib/dealership/pricing";
import { verticalOf } from "@/lib/verticals";

export const metadata: Metadata = {
  title: "Vehículos",
};

export default async function VehiclesPage() {
  const business = await getActiveBusiness();
  if (!business) return <NoBusinessSelected />;

  if (verticalOf(business.type) !== "dealership") {
    return (
      <div className="dash-header">
        <h1>Vehículos</h1>
        <p>La gestión de inventario de vehículos es para compraventas. <Link className="underline" href="/d">Volver al panel</Link></p>
      </div>
    );
  }

  const today = localDate(new Date(), business.timezone || "America/Bogota");
  const supabase = await createClient();

  const [{ data: biz }, { data: vehiclesRaw }, { data: costsRaw }, { data: changesRaw }] = await Promise.all([
    supabase.from("businesses").select("name, slug, dealer_settings").eq("id", business.id).single(),
    supabase.from("vehicles").select("*").eq("business_id", business.id).order("acquired_on", { ascending: true }).limit(5000),
    supabase.from("vehicle_costs").select("id, vehicle_id, concept, category, amount, spent_on").eq("business_id", business.id).order("spent_on", { ascending: false }).limit(20000),
    supabase.from("vehicle_price_changes").select("id, vehicle_id, old_price, new_price, reason, created_at").eq("business_id", business.id).order("created_at", { ascending: false }).limit(20000),
  ]);

  const contactIds = [...new Set((vehiclesRaw ?? []).flatMap((v) => [v.seller_contact_id, v.buyer_contact_id]).filter((x): x is string => !!x))];
  const { data: contacts } = contactIds.length
    ? await supabase.from("contacts").select("id, full_name").eq("business_id", business.id).in("id", contactIds)
    : { data: [] as { id: string; full_name: string }[] };
  const contactName = new Map((contacts ?? []).map((c) => [c.id, c.full_name]));

  const costsBy = new Map<string, CostRow[]>();
  for (const c of costsRaw ?? []) {
    costsBy.set(c.vehicle_id, [...(costsBy.get(c.vehicle_id) ?? []), { id: c.id, concept: c.concept, category: c.category, amount: Number(c.amount), spentOn: c.spent_on }]);
  }
  const changesBy = new Map<string, PriceChangeRow[]>();
  for (const c of changesRaw ?? []) {
    changesBy.set(c.vehicle_id, [...(changesBy.get(c.vehicle_id) ?? []), { id: c.id, oldPrice: c.old_price == null ? null : Number(c.old_price), newPrice: Number(c.new_price), reason: c.reason, createdAt: c.created_at ?? "" }]);
  }

  const settings = parseDealerSettings(biz?.dealer_settings);
  const vehicles: VehicleRow[] = (vehiclesRaw ?? []).map((v) => {
    const costs = costsBy.get(v.id) ?? [];
    const cost = costBasis(Number(v.purchase_price), costs);
    const list = v.list_price == null ? null : Number(v.list_price);
    const days = daysBetween(v.acquired_on, v.sold_on ?? today);
    const minPrice = v.min_price == null ? null : Number(v.min_price);
    const sold = v.status === "sold";
    return {
      id: v.id,
      type: v.vehicle_type,
      plate: v.plate,
      brand: v.brand,
      model: v.model,
      year: v.year,
      color: v.color,
      mileageKm: v.mileage_km,
      displacementCc: v.displacement_cc,
      vin: v.vin,
      engineNumber: v.engine_number,
      status: v.status,
      published: v.published,
      acquiredOn: v.acquired_on,
      days,
      purchasePrice: Number(v.purchase_price),
      sellerName: v.seller_contact_id ? contactName.get(v.seller_contact_id) ?? null : null,
      purchaseNotes: v.purchase_notes,
      costs,
      cost,
      listPrice: list,
      minPrice,
      margin: marginPct(sold ? Number(v.sold_price) : list, cost),
      advice: sold
        ? { action: "hold" as const, steps: 0, suggestedPrice: null, floor: 0 }
        : (({ action, steps, suggestedPrice, floor }) => ({ action, steps, suggestedPrice, floor }))(markdownAdvice(list, cost, days, settings, minPrice)),
      docLocation: v.doc_location,
      documents: parseDocuments(v.documents),
      docProblems: documentIssues(v.documents, today).length,
      description: v.description,
      photos: v.photos ?? [],
      priceChanges: changesBy.get(v.id) ?? [],
      soldOn: v.sold_on,
      soldPrice: v.sold_price == null ? null : Number(v.sold_price),
      buyerName: v.buyer_contact_id ? contactName.get(v.buyer_contact_id) ?? null : null,
    };
  });

  const stock = vehicles.filter((v) => v.status === "in_stock" || v.status === "reserved");
  const currency = business.currency || "COP";

  return (
    <div className="space-y-6">
      <div className="dash-header flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3">
            <div className="section-header-icon">
              <Bike className="h-5 w-5" />
            </div>
            Vehículos
          </h1>
          <p className="flex flex-wrap gap-2">
            <Badge variant="secondary">{stock.length} en inventario</Badge>
            <Badge variant={stock.some((v) => v.advice.action !== "hold") ? "default" : "secondary"}>
              {stock.filter((v) => v.advice.action !== "hold").length} para rebajar
            </Badge>
            <Badge variant="outline">{vehicles.filter((v) => v.status === "sold").length} vendidos</Badge>
          </p>
        </div>
        <Link href={`/${biz?.slug ?? business.slug}`} target="_blank" className={buttonVariants({ variant: "outline" })}>Ver catálogo público</Link>
      </div>

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
          <TabsTrigger value="analysis">Análisis y rebajas</TabsTrigger>
          <TabsTrigger value="documents">Documentación</TabsTrigger>
        </TabsList>
        <TabsContent value="inventory" className="pt-4">
          <InventoryPanel businessId={business.id} currency={currency} vehicles={vehicles} />
        </TabsContent>
        <TabsContent value="analysis" className="pt-4">
          <AnalysisPanel businessId={business.id} currency={currency} vehicles={vehicles} settings={settings} today={today} />
        </TabsContent>
        <TabsContent value="documents" className="pt-4">
          <DocumentsPanel businessId={business.id} currency={currency} vehicles={vehicles} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
