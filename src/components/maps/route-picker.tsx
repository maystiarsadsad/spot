"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { LocateFixed, Loader2 } from "lucide-react";
import { useLeaflet, createBaseMap, DEFAULT_CENTER, type LatLng } from "./leaflet";

export type RoutePoint = "pickup" | "dropoff";

interface Props {
  pickup: LatLng | null;
  dropoff: LatLng | null;
  onChange: (which: RoutePoint, value: LatLng) => void;
}

const LABEL: Record<RoutePoint, string> = { pickup: "A", dropoff: "B" };

function letterIcon(L: typeof Leaflet, which: RoutePoint) {
  return L.divIcon({
    className: "",
    html: `<div class="map-pin map-pin-route map-pin-${which}">${LABEL[which]}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });
}

/** One map, two pins: A = where we pick up, B = where we deliver. */
export function RoutePicker({ pickup, dropoff, onChange }: Props) {
  const L = useLeaflet();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markers = useRef<Partial<Record<RoutePoint, Leaflet.Marker>>>({});
  const lineRef = useRef<Leaflet.Polyline | null>(null);
  const onChangeRef = useRef(onChange);
  const [active, setActive] = useState<RoutePoint>(pickup ? "dropoff" : "pickup");
  const activeRef = useRef(active);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
    activeRef.current = active;
  }, [onChange, active]);

  useEffect(() => {
    if (!L || !containerRef.current || mapRef.current) return;
    const map = createBaseMap(L, containerRef.current, pickup ?? dropoff ?? DEFAULT_CENTER, pickup || dropoff ? 14 : 12);
    map.on("click", (e: Leaflet.LeafletMouseEvent) => {
      const which = activeRef.current;
      onChangeRef.current(which, { lat: e.latlng.lat, lng: e.latlng.lng });
      // After placing A, the next tap places B
      if (which === "pickup") setActive("dropoff");
    });
    mapRef.current = map;
    const timer = setTimeout(() => map.invalidateSize(), 250);
    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      markers.current = {};
      lineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L]);

  // Sync markers + route line with the values
  useEffect(() => {
    const map = mapRef.current;
    if (!L || !map) return;
    for (const which of ["pickup", "dropoff"] as RoutePoint[]) {
      const value = which === "pickup" ? pickup : dropoff;
      const existing = markers.current[which];
      if (!value) {
        existing?.remove();
        delete markers.current[which];
        continue;
      }
      if (existing) existing.setLatLng([value.lat, value.lng]);
      else {
        const m = L.marker([value.lat, value.lng], { icon: letterIcon(L, which), draggable: true }).addTo(map);
        m.on("dragend", () => {
          const p = m.getLatLng();
          onChangeRef.current(which, { lat: p.lat, lng: p.lng });
        });
        markers.current[which] = m;
      }
    }
    lineRef.current?.remove();
    lineRef.current = null;
    if (pickup && dropoff) {
      lineRef.current = L.polyline([[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]], { color: "#64748b", weight: 3, dashArray: "6 8" }).addTo(map);
      map.fitBounds(lineRef.current.getBounds(), { padding: [40, 40], maxZoom: 16 });
    }
  }, [L, pickup, dropoff]);

  const locate = () => {
    if (!("geolocation" in navigator)) return setGeoError("Tu navegador no permite obtener la ubicación.");
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onChangeRef.current(active, p);
        mapRef.current?.setView([p.lat, p.lng], 16);
        if (active === "pickup") setActive("dropoff");
        setLocating(false);
      },
      () => {
        setGeoError("No pudimos obtener tu ubicación. Marca el punto tocando el mapa.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="location-picker">
      <div className="route-picker-tabs" role="tablist" aria-label="Punto a marcar">
        {(["pickup", "dropoff"] as RoutePoint[]).map((w) => (
          <button key={w} type="button" role="tab" aria-selected={active === w} className={active === w ? "is-active" : ""} onClick={() => setActive(w)}>
            <span className={`route-dot route-dot-${w}`}>{LABEL[w]}</span>
            {w === "pickup" ? "Recogida" : "Entrega"}
            {(w === "pickup" ? pickup : dropoff) ? " ✓" : ""}
          </button>
        ))}
      </div>
      <div ref={containerRef} className="location-picker-map" />
      <div className="location-picker-bar">
        <button type="button" className="location-picker-locate" onClick={locate} disabled={locating}>
          {locating ? <Loader2 size={15} className="store-spin" /> : <LocateFixed size={15} />}
          Usar mi ubicación
        </button>
        <span className="location-picker-hint">Toca el mapa para marcar {active === "pickup" ? "dónde recogemos (A)" : "dónde entregamos (B)"}</span>
      </div>
      {geoError && <p className="location-picker-error">{geoError}</p>}
    </div>
  );
}
