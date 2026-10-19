"use client";

import { useMemo, useState } from "react";
import { Bike, Gauge, MessageCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { PublicVehicle } from "@/lib/dealership/data";

interface Props {
  business: { name: string; currency: string; whatsapp: string | null };
  vehicles: PublicVehicle[];
}

const TYPE_LABELS: Record<string, string> = { moto: "Motos", carro: "Carros", camioneta: "Camionetas", otro: "Otros" };

const title = (v: PublicVehicle) => [v.brand, v.model, v.year].filter(Boolean).join(" ");

/** Public stock: filter by type/brand/price and contact the dealer about a specific vehicle. */
export function VehicleCatalog({ business, vehicles }: Props) {
  const [type, setType] = useState("all");
  const [brand, setBrand] = useState("all");
  const [maxPrice, setMaxPrice] = useState("");

  const types = useMemo(() => [...new Set(vehicles.map((v) => v.type))], [vehicles]);
  const brands = useMemo(() => [...new Set(vehicles.filter((v) => type === "all" || v.type === type).map((v) => v.brand))].sort(), [vehicles, type]);
  const list = useMemo(
    () =>
      vehicles
        .filter((v) => type === "all" || v.type === type)
        .filter((v) => brand === "all" || v.brand === brand)
        .filter((v) => !maxPrice || (v.price != null && v.price <= Number(maxPrice))),
    [vehicles, type, brand, maxPrice]
  );

  const wa = (v: PublicVehicle) => {
    const digits = (business.whatsapp ?? "").replace(/\D/g, "");
    if (!digits) return null;
    return `https://wa.me/${digits}?text=${encodeURIComponent(`Hola ${business.name}, me interesa ${title(v)}${v.price ? ` (${formatCurrency(v.price, business.currency)})` : ""}. ¿Sigue disponible?`)}`;
  };

  if (vehicles.length === 0) {
    return <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Pronto publicaremos nuestro inventario.</div>;
  }

  return (
    <section className="space-y-4" aria-label="Inventario de vehículos">
      <div className="flex flex-wrap items-center gap-2">
        {types.length > 1 && (
          <select value={type} onChange={(e) => { setType(e.target.value); setBrand("all"); }} className="h-10 rounded-md border bg-transparent px-3 text-sm" aria-label="Tipo de vehículo">
            <option value="all">Todos los tipos</option>
            {types.map((t) => <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>)}
          </select>
        )}
        <select value={brand} onChange={(e) => setBrand(e.target.value)} className="h-10 rounded-md border bg-transparent px-3 text-sm" aria-label="Marca">
          <option value="all">Todas las marcas</option>
          {brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <input
          type="number"
          inputMode="numeric"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          placeholder="Precio máximo"
          className="h-10 w-44 rounded-md border bg-transparent px-3 text-sm"
          aria-label="Precio máximo"
        />
        <span className="ml-auto text-sm text-muted-foreground">{list.length} disponibles</span>
      </div>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Ningún vehículo coincide con tu búsqueda.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((v) => {
            const link = wa(v);
            return (
              <article key={v.id} className="overflow-hidden rounded-xl border bg-card">
                <div className="relative aspect-[4/3] bg-muted">
                  {v.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.photos[0]} alt={title(v)} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground"><Bike className="h-10 w-10" /></div>
                  )}
                  {v.reserved && <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white">Reservado</span>}
                </div>
                <div className="space-y-2 p-4">
                  <h3 className="font-semibold leading-tight">{title(v)}</h3>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {v.mileageKm != null && <span className="inline-flex items-center gap-1"><Gauge className="h-3.5 w-3.5" />{v.mileageKm.toLocaleString("es-CO")} km</span>}
                    {v.displacementCc != null && <span>{v.displacementCc} cc</span>}
                    {v.color && <span>{v.color}</span>}
                  </p>
                  {v.description && <p className="line-clamp-2 text-sm text-muted-foreground">{v.description}</p>}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-lg font-bold tabular-nums">{v.price ? formatCurrency(v.price, business.currency) : "Consultar"}</span>
                    {link && (
                      <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                        <MessageCircle className="h-4 w-4" /> Me interesa
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
