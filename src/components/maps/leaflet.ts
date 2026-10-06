"use client";

import { useEffect, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

export type LatLng = { lat: number; lng: number };

/** Bogotá — fallback center when we have no coordinates yet. */
export const DEFAULT_CENTER: LatLng = { lat: 4.711, lng: -74.0721 };

/**
 * Loads Leaflet on the client only (it touches `window` at import time),
 * so the ~40KB library never ships in pages that don't render a map.
 */
export function useLeaflet() {
  const [L, setL] = useState<typeof Leaflet | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      if (!cancelled) setL((mod.default ?? mod) as typeof Leaflet);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return L;
}

export function createBaseMap(L: typeof Leaflet, el: HTMLElement, center: LatLng, zoom = 15) {
  const map = L.map(el, { zoomControl: false, attributionControl: true }).setView(
    [center.lat, center.lng],
    zoom
  );
  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  return map;
}

const PIN_SVG = {
  home: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  courier:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h2l3.5 8M5.5 17.5 9 10h6l-3.5 7.5"/></svg>',
};

/** Round branded pin built from a divIcon (no image assets to resolve). */
export function pinIcon(L: typeof Leaflet, kind: "home" | "courier") {
  return L.divIcon({
    className: "",
    html: `<div class="map-pin map-pin-${kind}">${PIN_SVG[kind]}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, kind === "home" ? 38 : 19],
  });
}

/** Great-circle distance in meters. */
export function distanceMeters(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
