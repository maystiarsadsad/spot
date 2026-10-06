"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { AlertTriangle, CheckCircle2, Loader2, MapPin, Navigation, Phone, Play, Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { useLeaflet, createBaseMap, pinIcon, DEFAULT_CENTER, type LatLng } from "@/components/maps/leaflet";

export interface CourierData {
  status: "pending" | "on_the_way" | "delivered" | "cancelled";
  courier_name: string | null;
  dest_lat: number | null;
  dest_lng: number | null;
  address: string | null;
  notes: string | null;
  order_code: string | null;
  order_status: string | null;
  total: number;
  payment_status: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  business_name: string;
  currency: string | null;
}

/** Min interval between GPS writes (the DB also throttles at 2s). */
const SEND_EVERY_MS = 4000;

type WakeLockSentinelLike = { release: () => Promise<void> };

export function CourierPanel({ token, initial }: { token: string; initial: CourierData }) {
  const [data, setData] = useState(initial);
  const [name, setName] = useState(initial.courier_name ?? "");
  const [busy, setBusy] = useState(false);
  const [position, setPosition] = useState<LatLng | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);

  const L = useLeaflet();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const meRef = useRef<Leaflet.Marker | null>(null);
  const lastSendRef = useRef(0);

  const dest = data.dest_lat != null && data.dest_lng != null ? { lat: data.dest_lat, lng: data.dest_lng } : null;
  const active = data.status === "on_the_way";

  // Map with destination pin
  useEffect(() => {
    if (!L || !containerRef.current || mapRef.current) return;
    const map = createBaseMap(L, containerRef.current, dest ?? DEFAULT_CENTER, dest ? 16 : 12);
    if (dest) L.marker([dest.lat, dest.lng], { icon: pinIcon(L, "home") }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      meRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L]);

  // Own position marker
  useEffect(() => {
    const map = mapRef.current;
    if (!L || !map || !position) return;
    if (!meRef.current) {
      meRef.current = L.marker([position.lat, position.lng], { icon: pinIcon(L, "courier"), zIndexOffset: 500 }).addTo(map);
      if (dest) {
        map.fitBounds(L.latLngBounds([position.lat, position.lng], [dest.lat, dest.lng]), { padding: [50, 50], maxZoom: 17 });
      } else {
        map.setView([position.lat, position.lng], 16);
      }
    } else {
      meRef.current.setLatLng([position.lat, position.lng]);
    }
  }, [L, position]); // eslint-disable-line react-hooks/exhaustive-deps

  // GPS streaming while the delivery is active
  useEffect(() => {
    if (!active) return;
    if (!("geolocation" in navigator)) {
      setGpsError("Este navegador no permite compartir la ubicación.");
      return;
    }

    const supabase = createClient();
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(p);
        setGpsError(null);
        if (Date.now() - lastSendRef.current < SEND_EVERY_MS) return;
        lastSendRef.current = Date.now();
        const { data: ok } = await supabase.rpc("courier_update_location", {
          p_token: token,
          p_lat: p.lat,
          p_lng: p.lng,
          p_heading: pos.coords.heading ?? undefined,
          p_accuracy: pos.coords.accuracy,
        });
        if (ok) setLastSentAt(Date.now());
      },
      (err) => {
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? "Debes permitir el acceso a la ubicación para que el cliente vea el recorrido."
            : "Buscando señal GPS…"
        );
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }
    );

    // Keep the screen on — mobile browsers pause GPS when the page is hidden.
    let wakeLock: WakeLockSentinelLike | null = null;
    const requestWakeLock = async () => {
      try {
        const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinelLike> } };
        wakeLock = (await nav.wakeLock?.request("screen")) ?? null;
      } catch {
        wakeLock = null;
      }
    };
    requestWakeLock();
    const onVisible = () => document.visibilityState === "visible" && requestWakeLock();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      document.removeEventListener("visibilitychange", onVisible);
      wakeLock?.release().catch(() => {});
    };
  }, [active, token]);

  const setStatus = async (status: "on_the_way" | "delivered") => {
    setBusy(true);
    const supabase = createClient();
    const { data: ok } = await supabase.rpc("courier_set_status", {
      p_token: token,
      p_status: status,
      p_name: status === "on_the_way" ? name.trim() || undefined : undefined,
    });
    const { data: fresh } = await supabase.rpc("get_courier_delivery", { p_token: token });
    if (fresh) setData(fresh as unknown as CourierData);
    if (!ok) alert("No se pudo actualizar la entrega. Recarga la página.");
    setBusy(false);
  };

  const navUrl = dest
    ? `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`
    : data.address
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(data.address)}`
      : null;
  const wazeUrl = dest ? `https://waze.com/ul?ll=${dest.lat},${dest.lng}&navigate=yes` : null;
  const sentAgo = lastSentAt ? Math.round((Date.now() - lastSentAt) / 1000) : null;

  return (
    <div className="public-store courier">
      <header className="courier-header">
        <p>{data.business_name} · Repartidor</p>
        <h1>Pedido {data.order_code ?? ""}</h1>
      </header>

      <div ref={containerRef} className="courier-map" />

      <section className="courier-card">
        <div className="courier-row">
          <MapPin size={18} />
          <div>
            <strong>{data.customer_name || "Cliente"}</strong>
            <p>{data.address || "Sin dirección escrita"}</p>
            {!dest && <p className="courier-muted">El cliente no marcó el punto en el mapa.</p>}
          </div>
        </div>
        {data.notes && <p className="courier-notes">{data.notes}</p>}
        <div className="courier-row courier-total">
          <span>Total del pedido</span>
          <strong>
            {formatCurrency(data.total, data.currency || "COP")}
            {data.payment_status === "paid" ? " · Pagado" : " · Cobrar"}
          </strong>
        </div>

        <div className="courier-links">
          {data.customer_phone && (
            <a href={`tel:${data.customer_phone}`} className="courier-link">
              <Phone size={16} /> Llamar
            </a>
          )}
          {navUrl && (
            <a href={navUrl} target="_blank" rel="noopener noreferrer" className="courier-link">
              <Navigation size={16} /> Google Maps
            </a>
          )}
          {wazeUrl && (
            <a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="courier-link">
              <Navigation size={16} /> Waze
            </a>
          )}
        </div>
      </section>

      <section className="courier-actions">
        {data.status === "pending" && (
          <>
            <div className="store-checkout-field">
              <label htmlFor="courier-name">Tu nombre (lo verá el cliente)</label>
              <input id="courier-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Carlos" maxLength={60} />
            </div>
            <button className="store-checkout-submit" onClick={() => setStatus("on_the_way")} disabled={busy}>
              {busy ? <Loader2 size={18} className="store-spin" /> : <Play size={18} />}
              Iniciar entrega y compartir ubicación
            </button>
          </>
        )}

        {active && (
          <>
            <div className={`courier-live ${gpsError ? "is-error" : ""}`}>
              {gpsError ? <AlertTriangle size={16} /> : <Radio size={16} />}
              <span>
                {gpsError ??
                  (sentAgo != null ? `Compartiendo ubicación · enviada hace ${sentAgo}s` : "Obteniendo ubicación…")}
              </span>
            </div>
            <p className="courier-muted">
              Mantén esta página abierta y la pantalla encendida mientras entregas. Si abres Waze o Google Maps,
              regresa a esta pestaña para que la ubicación siga actualizándose.
            </p>
            <button
              className="store-checkout-submit courier-done"
              onClick={() => confirm("¿Confirmas que entregaste el pedido?") && setStatus("delivered")}
              disabled={busy}
            >
              {busy ? <Loader2 size={18} className="store-spin" /> : <CheckCircle2 size={18} />}
              Marcar como entregado
            </button>
          </>
        )}

        {data.status === "delivered" && (
          <div className="courier-final">
            <CheckCircle2 size={36} />
            <p>Entrega completada. ¡Gracias!</p>
          </div>
        )}
        {data.status === "cancelled" && (
          <div className="courier-final is-cancelled">
            <AlertTriangle size={36} />
            <p>Este pedido fue cancelado. No lo entregues.</p>
          </div>
        )}
      </section>
    </div>
  );
}
