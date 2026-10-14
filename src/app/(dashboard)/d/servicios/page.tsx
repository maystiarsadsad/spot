import type { Metadata } from "next";
import Link from "next/link";
import { Truck, WashingMachine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/get-active-business";
import { NoBusinessSelected } from "@/components/dashboard/no-business-selected";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ServicesBoard } from "@/components/services/services-board";
import type { ServiceOrderRow } from "@/components/services/types";
import { kindOf } from "@/lib/service-orders/data";
import { parseServiceSettings, type Line, type ServiceKind } from "@/lib/service-orders/flow";
import { formatCurrency } from "@/lib/utils";
import { requestOrigin } from "@/lib/site-url";
import { verticalOf } from "@/lib/verticals";

export const metadata: Metadata = {
  title: "Servicios",
};

const nowMs = () => Date.now();
const isoDaysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export default async function ServicesPage() {
  const business = await getActiveBusiness();
  if (!business) return <NoBusinessSelected />;

  if (verticalOf(business.type) !== "service_orders") {
    return (
      <div className="dash-header">
        <h1>Servicios</h1>
        <p>El tablero de servicios es para mensajerías y lavanderías. <Link className="underline" href="/d/orders">Ir a Pedidos</Link></p>
      </div>
    );
  }

  const kind: ServiceKind = kindOf(business.type);
  const timeZone = business.timezone || "America/Bogota";
  const supabase = await createClient();
  const [{ data: biz }, { data: open }, { data: closed }, { data: staff }, { data: items }] = await Promise.all([
    supabase.from("businesses").select("name, slug, service_settings").eq("id", business.id).single(),
    supabase.from("service_orders").select("*").eq("business_id", business.id).not("status", "in", "(delivered,cancelled)").order("created_at").limit(1000),
    supabase.from("service_orders").select("*").eq("business_id", business.id).in("status", ["delivered", "cancelled"]).gte("created_at", isoDaysAgo(60)).order("completed_at", { ascending: false }).limit(500),
    supabase.from("employees").select("id, full_name, position").eq("business_id", business.id).eq("status", "active").order("full_name"),
    supabase.from("catalog_items").select("id, name, price").eq("business_id", business.id).eq("type", "service").eq("active", true).order("sort_order"),
  ]);

  const orders: ServiceOrderRow[] = [...(open ?? []), ...(closed ?? [])].map((o) => ({
    id: o.id,
    code: o.code,
    kind: o.kind as ServiceKind,
    status: o.status,
    source: o.source,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    pickupAddress: o.pickup_address,
    pickupLat: o.pickup_lat,
    pickupLng: o.pickup_lng,
    dropoffAddress: o.dropoff_address,
    dropoffLat: o.dropoff_lat,
    dropoffLng: o.dropoff_lng,
    recipientName: o.recipient_name,
    recipientPhone: o.recipient_phone,
    distanceKm: o.distance_km != null ? Number(o.distance_km) : null,
    packageSize: o.package_size,
    packageDescription: o.package_description,
    handoff: o.handoff,
    returnMode: o.return_mode,
    weightKg: o.weight_kg != null ? Number(o.weight_kg) : null,
    items: (o.items as unknown as Line[]) ?? [],
    deliveryFee: Number(o.delivery_fee),
    total: Number(o.total),
    paid: o.payment_status === "paid",
    scheduledFor: o.scheduled_for,
    promisedAt: o.promised_at,
    notes: o.notes,
    token: o.tracking_token,
    assignedTo: o.assigned_to,
    createdAt: o.created_at as string,
    completedAt: o.completed_at,
  }));

  const now = nowMs();
  const active = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const today = new Date(now).toLocaleDateString("en-CA", { timeZone });
  const deliveredToday = orders.filter((o) => o.status === "delivered" && o.completedAt && new Date(o.completedAt).toLocaleDateString("en-CA", { timeZone }) === today).length;
  const late = active.filter((o) => {
    const due = o.status === "requested" ? o.scheduledFor : o.promisedAt;
    return due && Date.parse(due) < now && !["ready", "out_for_delivery", "in_transit"].includes(o.status);
  }).length;
  const toCharge = orders.filter((o) => !o.paid && o.status !== "cancelled").reduce((a, o) => a + o.total, 0);
  const webPending = active.filter((o) => o.status === "requested" && o.source === "web").length;
  const currency = business.currency || "COP";
  // Couriers first: people whose position mentions it
  const couriers = (staff ?? [])
    .map((s) => ({ id: s.id, name: s.full_name, courier: /mensaj|repart|conduct|domicil/i.test(s.position ?? "") }))
    .sort((a, b) => Number(b.courier) - Number(a.courier))
    .map(({ id, name }) => ({ id, name }));
  const Icon = kind === "shipment" ? Truck : WashingMachine;

  return (
    <div className="space-y-6">
      <div className="dash-header flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3">
            <div className="section-header-icon">
              <Icon className="h-5 w-5" />
            </div>
            {kind === "shipment" ? "Envíos" : "Órdenes de lavandería"}
          </h1>
          <p className="flex flex-wrap gap-2">
            <Badge variant="secondary">{active.length} en curso</Badge>
            {webPending > 0 && <Badge>{webPending} solicitudes web nuevas</Badge>}
            {late > 0 && <Badge variant="destructive">{late} atrasadas</Badge>}
            <Badge variant="secondary">{deliveredToday} entregadas hoy</Badge>
            <Badge variant="outline">Por cobrar {formatCurrency(toCharge, currency)}</Badge>
          </p>
        </div>
        <Link href={`/${biz?.slug ?? business.slug}`} target="_blank" className={buttonVariants({ variant: "outline" })}>Ver página de solicitudes</Link>
      </div>

      <ServicesBoard
        businessId={business.id}
        businessName={biz?.name ?? business.name}
        slug={biz?.slug ?? business.slug}
        siteUrl={await requestOrigin()}
        kind={kind}
        currency={currency}
        timeZone={timeZone}
        now={now}
        orders={orders}
        couriers={couriers}
        items={(items ?? []).map((i) => ({ id: i.id, name: i.name, price: Number(i.price) }))}
        settings={parseServiceSettings(biz?.service_settings)}
      />
    </div>
  );
}
