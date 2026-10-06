"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { LocateFixed, Loader2 } from "lucide-react";
import { useLeaflet, createBaseMap, pinIcon, DEFAULT_CENTER, type LatLng } from "./leaflet";

interface LocationPickerProps {
  value: LatLng | null;
  onChange: (value: LatLng) => void;
}

/** Checkout mini-map: tap or drag the pin, or use the device GPS. */
export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const L = useLeaflet();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerRef = useRef<Leaflet.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Init map once Leaflet is loaded
  useEffect(() => {
    if (!L || !containerRef.current || mapRef.current) return;
    const map = createBaseMap(L, containerRef.current, value ?? DEFAULT_CENTER, value ? 17 : 12);
    const marker = L.marker([(value ?? DEFAULT_CENTER).lat, (value ?? DEFAULT_CENTER).lng], {
      icon: pinIcon(L, "home"),
      draggable: true,
      opacity: value ? 1 : 0,
    }).addTo(map);

    marker.on("dragend", () => {
      const p = marker.getLatLng();
      onChangeRef.current({ lat: p.lat, lng: p.lng });
    });
    map.on("click", (e: Leaflet.LeafletMouseEvent) => {
      onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapRef.current = map;
    markerRef.current = marker;
    // The checkout modal animates in; recompute size once it settles.
    const resizeTimer = setTimeout(() => map.invalidateSize(), 250);
    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L]);

  // Sync marker with value
  useEffect(() => {
    if (!value || !markerRef.current || !mapRef.current) return;
    markerRef.current.setLatLng([value.lat, value.lng]).setOpacity(1);
  }, [value]);

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setGeoError("Tu navegador no permite obtener la ubicación.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onChangeRef.current(p);
        mapRef.current?.setView([p.lat, p.lng], 17);
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
      <div ref={containerRef} className="location-picker-map" />
      <div className="location-picker-bar">
        <button type="button" className="location-picker-locate" onClick={locate} disabled={locating}>
          {locating ? <Loader2 size={15} className="store-spin" /> : <LocateFixed size={15} />}
          Usar mi ubicación
        </button>
        <span className="location-picker-hint">
          {value ? "Ubicación marcada · arrastra el pin para ajustar" : "Toca el mapa para marcar tu entrega"}
        </span>
      </div>
      {geoError && <p className="location-picker-error">{geoError}</p>}
    </div>
  );
}
