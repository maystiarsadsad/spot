"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type * as Leaflet from "leaflet";
import { Bike } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLeaflet, createBaseMap, pinIcon, DEFAULT_CENTER, type LatLng } from "@/components/maps/leaflet";

interface Props {
  /** deliveries.tracking_token of the courier leg */
  deliveryToken: string;
  pickup: LatLng | null;
  dropoff: LatLng | null;
}

interface Live {
  status: string;
  courier_name: string | null;
  courier_lat: number | null;
  courier_lng: number | null;
  location_updated_at: string | null;
}

const POLL_MS = 15000;

/** Courier position on the service tracking page (realtime + polling fallback). */
export function LiveCourierMap({ deliveryToken, pickup, dropoff }: Props) {
  const router = useRouter();
  const L = useLeaflet();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const courierRef = useRef<Leaflet.Marker | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const statusRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const { data } = await supabase.rpc("get_delivery_tracking", { p_token: deliveryToken });
      if (data) setLive(data as unknown as Live);
    };
    load();
    const channel = supabase
      .channel(`delivery:${deliveryToken}`)
      .on("broadcast", { event: "delivery" }, ({ payload }) => setLive((prev) => ({ ...(prev ?? ({} as Live)), ...(payload as Partial<Live>) })))
      .subscribe();
    const timer = setInterval(load, POLL_MS);
    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [deliveryToken]);

  // When the courier delivers, refresh the page so the timeline closes
  useEffect(() => {
    if (!live) return;
    if (statusRef.current && statusRef.current !== live.status) router.refresh();
    statusRef.current = live.status;
  }, [live, router]);

  useEffect(() => {
    if (!L || !containerRef.current || mapRef.current) return;
    const center = dropoff ?? pickup ?? DEFAULT_CENTER;
    const map = createBaseMap(L, containerRef.current, center, 14);
    const letter = (t: string, cls: string) =>
      L.divIcon({ className: "", html: `<div class="map-pin map-pin-route ${cls}">${t}</div>`, iconSize: [34, 34], iconAnchor: [17, 34] });
    if (pickup) L.marker([pickup.lat, pickup.lng], { icon: letter("A", "map-pin-pickup") }).addTo(map);
    if (dropoff) L.marker([dropoff.lat, dropoff.lng], { icon: letter("B", "map-pin-dropoff") }).addTo(map);
    if (pickup && dropoff) map.fitBounds(L.latLngBounds([[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]), { padding: [40, 40], maxZoom: 15 });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      courierRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L]);

  useEffect(() => {
    const map = mapRef.current;
    if (!L || !map || live?.courier_lat == null || live.courier_lng == null) return;
    const pos: [number, number] = [live.courier_lat, live.courier_lng];
    if (courierRef.current) courierRef.current.setLatLng(pos);
    else courierRef.current = L.marker(pos, { icon: pinIcon(L, "courier") }).addTo(map);
  }, [L, live]);

  return (
    <div className="bk-appt-card">
      <strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Bike size={16} /> {live?.courier_name ? `${live.courier_name} va en camino` : "Mensajero en camino"}
      </strong>
      <div ref={containerRef} className="svc-map" />
      {live?.courier_lat == null && <p className="bk-hint">Aún no recibimos la ubicación del mensajero; se actualiza sola.</p>}
    </div>
  );
}
