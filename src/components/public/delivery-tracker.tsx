"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type * as Leaflet from "leaflet";
import { ArrowLeft, Bike, CheckCircle2, ChefHat, ClipboardCheck, MessageCircle, Receipt, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLeaflet, createBaseMap, pinIcon, distanceMeters, DEFAULT_CENTER } from "@/components/maps/leaflet";

export interface TrackingData {
  status: "pending" | "on_the_way" | "delivered" | "cancelled";
  order_status: string | null;
  order_code: string | null;
  order_created_at: string | null;
  address: string | null;
  dest_lat: number | null;
  dest_lng: number | null;
  courier_name: string | null;
  courier_lat: number | null;
  courier_lng: number | null;
  courier_heading: number | null;
  location_updated_at: string | null;
  started_at: string | null;
  delivered_at: string | null;
  business_name: string;
  business_slug: string;
  business_logo: string | null;
  business_phone: string | null;
}

const POLL_MS = 20000;
/** Rough urban motorbike speed used for the ETA estimate (km/h). */
const AVG_SPEED_KMH = 22;

const STEPS = [
  { key: "received", label: "Recibido", icon: Receipt },
  { key: "confirmed", label: "Confirmado", icon: ClipboardCheck },
  { key: "preparing", label: "Preparando", icon: ChefHat },
  { key: "on_the_way", label: "En camino", icon: Bike },
  { key: "delivered", label: "Entregado", icon: CheckCircle2 },
] as const;

function currentStep(d: TrackingData) {
  if (d.status === "delivered" || d.order_status === "completed") return 4;
  if (d.status === "on_the_way") return 3;
  if (d.order_status === "in_progress") return 2;
  if (d.order_status === "confirmed") return 1;
  return 0;
}

function secondsAgo(iso: string | null, now: number) {
  if (!iso) return null;
  return Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
}

export function DeliveryTracker({ token, initial }: { token: string; initial: TrackingData }) {
  const [data, setData] = useState<TrackingData>(initial);
  const [now, setNow] = useState(() => Date.now());
  const L = useLeaflet();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const homeRef = useRef<Leaflet.Marker | null>(null);
  const courierRef = useRef<Leaflet.Marker | null>(null);
  const followRef = useRef(true);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data: fresh } = await supabase.rpc("get_delivery_tracking", { p_token: token });
    if (fresh) setData(fresh as unknown as TrackingData);
  }, [token]);

  // Realtime push + polling fallback
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`delivery:${token}`)
      .on("broadcast", { event: "delivery" }, ({ payload }) => {
        setData((prev) => ({ ...prev, ...(payload as Partial<TrackingData>) }));
      })
      .on("broadcast", { event: "order" }, ({ payload }) => {
        setData((prev) => ({ ...prev, ...(payload as Partial<TrackingData>) }));
      })
      .subscribe();

    const poll = setInterval(refresh, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    const tick = setInterval(() => setNow(Date.now()), 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [token, refresh]);

  const dest = data.dest_lat != null && data.dest_lng != null ? { lat: data.dest_lat, lng: data.dest_lng } : null;
  const courier =
    data.status === "on_the_way" && data.courier_lat != null && data.courier_lng != null
      ? { lat: data.courier_lat, lng: data.courier_lng }
      : null;

  // Init map
  useEffect(() => {
    if (!L || !containerRef.current || mapRef.current) return;
    const map = createBaseMap(L, containerRef.current, dest ?? DEFAULT_CENTER, dest ? 16 : 12);
    // Stop auto-following once the customer pans the map themselves
    map.on("dragstart", () => {
      followRef.current = false;
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      homeRef.current = null;
      courierRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L]);

  // Sync markers + camera
  useEffect(() => {
    const map = mapRef.current;
    if (!L || !map) return;

    if (dest && !homeRef.current) {
      homeRef.current = L.marker([dest.lat, dest.lng], { icon: pinIcon(L, "home") }).addTo(map);
    }

    if (courier) {
      if (!courierRef.current) {
        courierRef.current = L.marker([courier.lat, courier.lng], { icon: pinIcon(L, "courier"), zIndexOffset: 500 }).addTo(map);
      } else {
        courierRef.current.setLatLng([courier.lat, courier.lng]);
      }
    } else if (courierRef.current) {
      courierRef.current.remove();
      courierRef.current = null;
    }

    if (!followRef.current) return;
    if (courier && dest) {
      map.fitBounds(L.latLngBounds([courier.lat, courier.lng], [dest.lat, dest.lng]), {
        padding: [60, 60],
        maxZoom: 17,
      });
    } else if (courier) {
      map.setView([courier.lat, courier.lng], 16);
    }
  }, [L, dest?.lat, dest?.lng, courier?.lat, courier?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const recenter = () => {
    followRef.current = true;
    const map = mapRef.current;
    if (!map || !L) return;
    if (courier && dest) {
      map.fitBounds(L.latLngBounds([courier.lat, courier.lng], [dest.lat, dest.lng]), { padding: [60, 60], maxZoom: 17 });
    } else if (courier ?? dest) {
      const p = (courier ?? dest)!;
      map.setView([p.lat, p.lng], 16);
    }
  };

  const step = currentStep(data);
  const cancelled = data.status === "cancelled" || data.order_status === "cancelled";
  const delivered = step === 4;
  const distance = courier && dest ? distanceMeters(courier, dest) : null;
  const etaMin = distance != null ? Math.max(1, Math.round((distance / 1000 / AVG_SPEED_KMH) * 60)) : null;
  const lastSeen = secondsAgo(data.location_updated_at, now);
  const signalStale = lastSeen != null && lastSeen > 60;

  let headline: string;
  let subline: string;
  if (cancelled) {
    headline = "Pedido cancelado";
    subline = "Comunícate con el negocio si tienes dudas.";
  } else if (delivered) {
    headline = "¡Pedido entregado!";
    subline = "Gracias por tu compra. ¡Buen provecho!";
  } else if (data.status === "on_the_way") {
    headline = etaMin != null ? `Llega en ~${etaMin} min` : "Tu pedido va en camino";
    subline = `${data.courier_name || "El repartidor"} va hacia tu dirección${
      distance != null ? ` · ${distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1)} km`}` : ""
    }`;
  } else {
    headline = STEPS[step].label;
    subline =
      step === 0
        ? "El negocio está revisando tu pedido."
        : "Te avisaremos aquí apenas el repartidor salga.";
  }

  return (
    <div className="public-store tracker">
      <div className="tracker-map-wrap">
        <div ref={containerRef} className="tracker-map" />
        <Link href={`/${data.business_slug}`} className="tracker-back" aria-label="Volver a la tienda">
          <ArrowLeft size={18} />
        </Link>
        {(courier || dest) && (
          <button type="button" className="tracker-recenter" onClick={recenter}>
            Centrar
          </button>
        )}
        {!dest && !courier && !cancelled && !delivered && (
          <div className="tracker-map-empty">El mapa se activará cuando el repartidor salga</div>
        )}
      </div>

      <section className="tracker-sheet">
        <div className="tracker-sheet-handle" />
        <p className="tracker-business">
          {data.business_name}
          {data.order_code && <span> · {data.order_code}</span>}
        </p>
        <h1 className={`tracker-headline ${cancelled ? "is-cancelled" : ""}`}>
          {cancelled && <XCircle size={22} />}
          {headline}
        </h1>
        <p className="tracker-subline">{subline}</p>

        {data.status === "on_the_way" && (
          <p className={`tracker-live ${signalStale ? "is-stale" : ""}`}>
            <span className="tracker-live-dot" />
            {lastSeen == null
              ? "Esperando señal GPS del repartidor…"
              : signalStale
                ? `Última ubicación hace ${Math.round(lastSeen / 60)} min`
                : "Ubicación en vivo"}
          </p>
        )}

        {!cancelled && (
          <ol className="tracker-steps">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const state = i < step ? "done" : i === step ? "current" : "todo";
              return (
                <li key={s.key} className={`tracker-step is-${state}`}>
                  <span className="tracker-step-icon">
                    <Icon size={16} />
                  </span>
                  <span className="tracker-step-label">{s.label}</span>
                </li>
              );
            })}
          </ol>
        )}

        {data.address && (
          <div className="tracker-address">
            <span>Entregar en</span>
            <p>{data.address}</p>
          </div>
        )}

        {data.business_phone && !delivered && (
          <a
            className="tracker-contact"
            href={`https://wa.me/${data.business_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
              `Hola, quisiera saber sobre mi pedido ${data.order_code ?? ""}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={16} /> Escribir al negocio
          </a>
        )}
      </section>
    </div>
  );
}
