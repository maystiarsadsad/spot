"use client";

import { useMemo, useState } from "react";
import { FileWarning, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { PurchaseDialog } from "./purchase-dialog";
import { SellVehicleDialog } from "./sell-dialog";
import { VehicleDialog } from "./vehicle-dialog";
import { selectClass, STATUS_LABELS, VEHICLE_TYPE_LABELS, vehicleTitle, type VehicleRow } from "./types";

interface Props {
  businessId: string;
  currency: string;
  vehicles: VehicleRow[];
}

const FILTERS = [
  { value: "stock", label: "En inventario" },
  { value: "in_stock", label: "En venta" },
  { value: "reserved", label: "Reservados" },
  { value: "sold", label: "Vendidos" },
  { value: "all", label: "Todos" },
];

export function InventoryPanel({ businessId, currency, vehicles }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("stock");
  const [type, setType] = useState("all");
  const [buying, setBuying] = useState(false);
  const [open, setOpen] = useState<VehicleRow | null>(null);
  const [selling, setSelling] = useState<VehicleRow | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vehicles
      .filter((v) =>
        filter === "all" ? true : filter === "stock" ? v.status === "in_stock" || v.status === "reserved" : v.status === filter
      )
      .filter((v) => type === "all" || v.type === type)
      .filter((v) => !q || `${v.plate} ${v.brand} ${v.model ?? ""} ${v.year ?? ""} ${v.color ?? ""}`.toLowerCase().includes(q))
      // Oldest first: that is where the capital is stuck
      .sort((a, b) => (filter === "sold" ? (b.soldOn ?? "").localeCompare(a.soldOn ?? "") : b.days - a.days));
  }, [vehicles, query, filter, type]);

  // Keep the open dialogs pointing at fresh data after router.refresh()
  const fresh = (v: VehicleRow | null) => (v ? vehicles.find((x) => x.id === v.id) ?? v : null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por placa, marca, modelo…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar vehículo" />
        </div>
        <select className={`${selectClass} !w-auto`} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrar por estado">
          {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <select className={`${selectClass} !w-auto`} value={type} onChange={(e) => setType(e.target.value)} aria-label="Filtrar por tipo">
          <option value="all">Todos los tipos</option>
          {Object.entries(VEHICLE_TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <Button onClick={() => setBuying(true)}><Plus className="mr-1 h-4 w-4" /> Registrar compra</Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          {vehicles.length === 0 ? "Aún no hay vehículos. Registra tu primera compra para empezar el inventario." : "Ningún vehículo coincide con el filtro."}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Días</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead className="text-right">{filter === "sold" ? "Vendido por" : "Precio"}</TableHead>
                <TableHead className="text-right">Margen</TableHead>
                <TableHead>Carpeta</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((v) => {
                const sold = v.status === "sold";
                return (
                  <TableRow key={v.id} className="cursor-pointer" onClick={() => setOpen(v)}>
                    <TableCell className="font-mono font-semibold">{v.plate}</TableCell>
                    <TableCell>
                      <div>{vehicleTitle(v)}</div>
                      <div className="text-xs text-muted-foreground">{VEHICLE_TYPE_LABELS[v.type] ?? v.type}{v.color ? ` · ${v.color}` : ""}{v.mileageKm != null ? ` · ${v.mileageKm.toLocaleString("es-CO")} km` : ""}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sold ? "outline" : v.status === "reserved" ? "default" : "secondary"}>{STATUS_LABELS[v.status] ?? v.status}</Badge>
                      {!sold && v.advice.action !== "hold" && <Badge variant="destructive" className="ml-1">Rebajar</Badge>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{v.days}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(v.cost, currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency((sold ? v.soldPrice : v.listPrice) ?? 0, currency)}</TableCell>
                    <TableCell className={`text-right tabular-nums ${v.margin != null && v.margin < 0 ? "text-destructive" : ""}`}>
                      {v.margin == null ? "—" : `${v.margin.toFixed(1)}%`}
                    </TableCell>
                    <TableCell className="text-sm">
                      {v.docLocation ?? <span className="text-muted-foreground">Sin ubicar</span>}
                      {!sold && v.docProblems > 0 && <FileWarning className="ml-1 inline h-3.5 w-3.5 text-amber-600" aria-label={`${v.docProblems} documentos pendientes`} />}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {!sold && <Button size="sm" variant="outline" onClick={() => setSelling(v)}>Vender</Button>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <PurchaseDialog open={buying} onOpenChange={setBuying} businessId={businessId} />
      <VehicleDialog vehicle={fresh(open)} onOpenChange={(o) => !o && setOpen(null)} currency={currency} />
      <SellVehicleDialog vehicle={fresh(selling)} onOpenChange={(o) => !o && setSelling(null)} currency={currency} />
    </div>
  );
}
