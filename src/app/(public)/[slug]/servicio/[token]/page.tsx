import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Clock, MapPin, MessageCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadServiceBusiness } from "@/lib/service-orders/data";
import { stagesFor, STATUS_LABELS, type Line, type ServiceKind } from "@/lib/service-orders/flow";
import { AutoRefresh } from "@/components/public/auto-refresh";
import { LiveCourierMap } from "@/components/public/live-courier-map";

interface PageProps {
  params: Promise<{ slug: string; token: string }>;
}

export const metadata: Metadata = {
  title: "Sigue tu servicio",
  robots: { index: false, follow: false },
};

export default async function ServiceTrackingPage({ params }: PageProps) {
  const { slug, token } = await params;
  if (!/^[a-f0-9]{32}$/.test(token)) notFound();

  // Private link → service role, filtered by the token
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("service_orders")
    .select("id, business_id, code, kind, status, customer_name, pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng, recipient_name, return_mode, handoff, items, delivery_fee, total, payment_status, promised_at, scheduled_for, transaction_id, distance_km")
    .eq("tracking_token", token)
    .maybeSingle();
  if (!order) notFound();
  const business = await loadServiceBusiness(order.business_id, admin);
  if (!business || business.slug !== slug) notFound();

  const [{ data: events }, { data: delivery }] = await Promise.all([
    admin.from("service_order_events").select("status, note, created_at").eq("order_id", order.id).order("created_at"),
    order.transaction_id
      ? admin.from("deliveries").select("tracking_token, status").eq("transaction_id", order.transaction_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const kind = order.kind as ServiceKind;
  const stages = stagesFor(kind, order.return_mode);
  const currentIdx = stages.findIndex((s) => s.key === order.status);
  const closed = order.status === "delivered" || order.status === "cancelled";
  const reachedAt = (key: string) => [...(events ?? [])].reverse().find((e) => e.status === key)?.created_at ?? null;
  const when = (iso: string) => new Date(iso).toLocaleString("es-CO", { timeZone: business.timeZone, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const fmt = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: business.currency, minimumFractionDigits: 0 }).format(n);
  const lines = (order.items as unknown as Line[]) ?? [];
  const wa = business.whatsapp?.replace(/\D/g, "");
  const lastNote = [...(events ?? [])].reverse().find((e) => e.note)?.note;
  const showMap = delivery && delivery.status === "on_the_way";
  const point = (lat: number | null, lng: number | null) => (lat != null && lng != null ? { lat, lng } : null);

  return (
    <div className="public-store">
      {!closed && <AutoRefresh seconds={30} />}
      <div className="bk-appt">
        <Link href={`/${business.slug}`} className="bk-link" style={{ alignSelf: "flex-start" }}>
          <ArrowLeft size={16} /> {business.name}
        </Link>
        <h1 className="bk-title">{kind === "shipment" ? "Tu envío" : "Tu orden"} {order.code}</h1>

        <div className="bk-appt-card">
          {order.status === "cancelled" ? (
            <span className="bk-status is-cancelled">Cancelado</span>
          ) : order.status === "failed" ? (
            <>
              <span className="bk-status is-cancelled">Novedad en la entrega</span>
              {lastNote && <p className="bk-hint">{lastNote}</p>}
            </>
          ) : (
            <ol className="svc-timeline">
              {stages.map((s, i) => {
                const done = i <= currentIdx;
                const at = done ? reachedAt(s.key) : null;
                return (
                  <li key={s.key} className={`${done ? "is-done" : ""} ${i === currentIdx ? "is-current" : ""}`}>
                    <span className="svc-timeline-dot">{done ? <Check size={12} /> : null}</span>
                    <span>
                      <strong>{s.customer}</strong>
                      {at && <small>{when(at)}</small>}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          {kind === "laundry" && order.promised_at && !closed && currentIdx < stages.findIndex((s) => s.key === "ready") && (
            <p className="bk-hint"><Clock size={14} /> Lista aprox. {when(order.promised_at)}</p>
          )}
        </div>

        {showMap && (
          <LiveCourierMap
            deliveryToken={delivery.tracking_token}
            pickup={kind === "shipment" ? point(order.pickup_lat, order.pickup_lng) : null}
            dropoff={point(order.dropoff_lat, order.dropoff_lng)}
          />
        )}

        <div className="bk-appt-card">
          {kind === "shipment" ? (
            <>
              <div className="bk-appt-row"><span>Recoger</span><strong>{order.pickup_address}</strong></div>
              <div className="bk-appt-row"><span>Entregar</span><strong>{order.dropoff_address}</strong></div>
              {order.recipient_name && <div className="bk-appt-row"><span>Recibe</span><strong>{order.recipient_name}</strong></div>}
              {order.distance_km != null && <div className="bk-appt-row"><span>Distancia</span><strong>{String(order.distance_km).replace(".", ",")} km</strong></div>}
            </>
          ) : (
            <>
              {lines.map((l, i) => (
                <div key={i} className="bk-appt-row"><span>{l.name}</span><strong>{fmt(l.total)}</strong></div>
              ))}
              {Number(order.delivery_fee) > 0 && <div className="bk-appt-row"><span>Servicio a domicilio</span><strong>{fmt(Number(order.delivery_fee))}</strong></div>}
              <div className="bk-appt-row">
                <span>Entrega</span>
                <strong>{order.return_mode === "delivery" ? order.dropoff_address : `En el local${business.address ? ` · ${business.address}` : ""}`}</strong>
              </div>
            </>
          )}
          <div className="bk-appt-row"><span>Total</span><strong>{fmt(Number(order.total))} · {order.payment_status === "paid" ? "Pagado ✅" : "Pendiente de pago"}</strong></div>
          {order.status !== "delivered" && order.status !== "cancelled" && (
            <p className="bk-hint">Estado actual: {STATUS_LABELS[order.status] ?? order.status}. Esta página se actualiza sola.</p>
          )}
        </div>

        {business.address && kind === "laundry" && order.return_mode !== "delivery" && (
          <p className="bk-hint"><MapPin size={14} /> {business.address}</p>
        )}

        {wa && (
          <a
            className="store-checkout-submit"
            href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hola, soy ${order.customer_name}. Quiero preguntar por ${kind === "shipment" ? "el envío" : "la orden"} ${order.code}.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            <MessageCircle size={18} /> Escribir por WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
