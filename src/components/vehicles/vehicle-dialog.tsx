"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { addVehicleCost, deleteVehicleCost, setListPrice, setVehicleStatus, updateVehicle } from "@/lib/actions/vehicles";
import { DOCUMENT_KEYS, type VehicleDocuments } from "@/lib/dealership/documents";
import { COST_CATEGORY_LABELS, selectClass, STATUS_LABELS, vehicleTitle, type VehicleRow } from "./types";

interface Props {
  vehicle: VehicleRow | null;
  onOpenChange: (open: boolean) => void;
  currency: string;
  /** Tab to open first. */
  initialTab?: "data" | "documents" | "costs" | "price";
}

export function VehicleDialog({ vehicle, onOpenChange, currency, initialTab = "data" }: Props) {
  if (!vehicle) return null;
  return <VehicleForm key={`${vehicle.id}-${initialTab}`} vehicle={vehicle} onOpenChange={onOpenChange} currency={currency} initialTab={initialTab} />;
}

function VehicleForm({ vehicle, onOpenChange, currency, initialTab }: { vehicle: VehicleRow; onOpenChange: (o: boolean) => void; currency: string; initialTab: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ error?: string } | { success: true }>, ok: string) =>
    startTransition(async () => {
      const res = await fn();
      if ("error" in res && res.error) return void toast.error(res.error);
      toast.success(ok);
      router.refresh();
    });
  const sold = vehicle.status === "sold";

  // ── data ──
  const [d, setD] = useState({
    brand: vehicle.brand,
    model: vehicle.model ?? "",
    year: vehicle.year?.toString() ?? "",
    color: vehicle.color ?? "",
    mileageKm: vehicle.mileageKm?.toString() ?? "",
    displacementCc: vehicle.displacementCc?.toString() ?? "",
    vin: vehicle.vin ?? "",
    engineNumber: vehicle.engineNumber ?? "",
    description: vehicle.description ?? "",
    published: vehicle.published,
  });
  // ── documents ──
  const [loc, setLoc] = useState(vehicle.docLocation ?? "");
  const [docs, setDocs] = useState<VehicleDocuments>(vehicle.documents);
  // ── costs ──
  const [cost, setCost] = useState({ concept: "", category: "repair", amount: "" });
  // ── price ──
  const [price, setPrice] = useState(String(vehicle.advice.suggestedPrice ?? vehicle.listPrice ?? ""));
  const [reason, setReason] = useState("");

  const setDoc = (key: string, patch: { has?: boolean; expires?: string | null }) =>
    setDocs((p) => ({ ...p, [key]: { has: p[key as keyof VehicleDocuments]?.has ?? false, ...p[key as keyof VehicleDocuments], ...patch } }));

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {vehicle.plate} · {vehicleTitle(vehicle)}
            <Badge variant={sold ? "outline" : "secondary"}>{STATUS_LABELS[vehicle.status] ?? vehicle.status}</Badge>
          </DialogTitle>
          <DialogDescription>
            Costo total {formatCurrency(vehicle.cost, currency)} · {vehicle.days} días {sold ? "hasta la venta" : "en inventario"}
          </DialogDescription>
        </DialogHeader>

        {!sold && (
          <div className="flex flex-wrap gap-2">
            {vehicle.status !== "in_stock" && <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(() => setVehicleStatus(vehicle.id, "in_stock"), "Vuelve a estar en venta")}>Volver a venta</Button>}
            {vehicle.status !== "reserved" && <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(() => setVehicleStatus(vehicle.id, "reserved"), "Marcado como reservado")}>Reservar</Button>}
            {vehicle.status !== "withdrawn" && <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(() => setVehicleStatus(vehicle.id, "withdrawn"), "Retirado de la venta")}>Retirar</Button>}
          </div>
        )}

        <Tabs defaultValue={initialTab}>
          <TabsList>
            <TabsTrigger value="data">Datos</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="costs">Costos</TabsTrigger>
            <TabsTrigger value="price">Precio</TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3">
              {([["brand", "Marca"], ["model", "Modelo"], ["year", "Año"], ["color", "Color"], ["mileageKm", "Kilometraje"], ["displacementCc", "Cilindraje (cc)"], ["vin", "Chasis / VIN"], ["engineNumber", "N.º de motor"]] as const).map(([k, label]) => (
                <div key={k} className="space-y-1.5">
                  <Label htmlFor={`vd-${k}`}>{label}</Label>
                  <Input id={`vd-${k}`} value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} />
                </div>
              ))}
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="vd-desc">Descripción pública</Label>
                <Input id="vd-desc" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} placeholder="Único dueño, mantenimientos al día…" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={d.published} onChange={(e) => setD({ ...d, published: e.target.checked })} />
              Mostrar en el catálogo público
            </label>
            <p className="text-xs text-muted-foreground">
              Compra: {formatCurrency(vehicle.purchasePrice, currency)} el {vehicle.acquiredOn}{vehicle.sellerName ? ` a ${vehicle.sellerName}` : ""}.
            </p>
            <Button disabled={isPending || !d.brand.trim()} onClick={() => run(() => updateVehicle(vehicle.id, d), "Datos guardados")}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar datos
            </Button>
          </TabsContent>

          <TabsContent value="documents" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="vd-loc">¿Dónde está la carpeta física?</Label>
              <Input id="vd-loc" value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Archivador 2 · Carpeta M-14" />
            </div>
            <div className="divide-y rounded-md border">
              {DOCUMENT_KEYS.map(({ key, label, expires }) => {
                const st = docs[key];
                return (
                  <div key={key} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                    <label className="flex flex-1 items-center gap-2">
                      <input type="checkbox" checked={st?.has ?? false} onChange={(e) => setDoc(key, { has: e.target.checked })} />
                      {label}
                    </label>
                    {expires && st?.has && (
                      <Input type="date" className="h-8 w-40" value={st.expires ?? ""} onChange={(e) => setDoc(key, { expires: e.target.value || null })} aria-label={`Vence ${label}`} />
                    )}
                  </div>
                );
              })}
            </div>
            <Button disabled={isPending} onClick={() => run(() => updateVehicle(vehicle.id, { docLocation: loc, documents: docs }), "Documentación guardada")}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar documentación
            </Button>
          </TabsContent>

          <TabsContent value="costs" className="space-y-3 pt-3">
            {vehicle.costs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay gastos de alistamiento. Todo lo que inviertas en el vehículo sube su costo y su precio piso.</p>
            ) : (
              <div className="divide-y rounded-md border text-sm">
                {vehicle.costs.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-2">
                    <div className="flex-1">
                      <div>{c.concept}</div>
                      <div className="text-xs text-muted-foreground">{COST_CATEGORY_LABELS[c.category] ?? c.category} · {c.spentOn}</div>
                    </div>
                    <div className="tabular-nums">{formatCurrency(c.amount, currency)}</div>
                    <Button variant="ghost" size="icon" aria-label="Eliminar gasto" disabled={isPending} onClick={() => run(() => deleteVehicleCost(c.id), "Gasto eliminado")}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-[1fr_9rem_8rem] items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="vc-concept">Gasto</Label>
                <Input id="vc-concept" value={cost.concept} onChange={(e) => setCost({ ...cost, concept: e.target.value })} placeholder="Cambio de llanta trasera" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vc-cat">Tipo</Label>
                <select id="vc-cat" className={selectClass} value={cost.category} onChange={(e) => setCost({ ...cost, category: e.target.value })}>
                  {Object.entries(COST_CATEGORY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vc-amt">Valor</Label>
                <Input id="vc-amt" type="number" value={cost.amount} onChange={(e) => setCost({ ...cost, amount: e.target.value })} />
              </div>
            </div>
            <Button
              disabled={isPending || !cost.concept.trim() || !cost.amount}
              onClick={() => run(async () => {
                const res = await addVehicleCost(vehicle.id, cost);
                if (!("error" in res)) setCost({ concept: "", category: "repair", amount: "" });
                return res;
              }, "Gasto registrado")}
            >
              Agregar gasto
            </Button>
          </TabsContent>

          <TabsContent value="price" className="space-y-3 pt-3">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Precio actual</div><div className="font-semibold">{vehicle.listPrice ? formatCurrency(vehicle.listPrice, currency) : "—"}</div></div>
              <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Precio piso</div><div className="font-semibold">{formatCurrency(vehicle.advice.floor, currency)}</div></div>
              <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Margen actual</div><div className="font-semibold">{vehicle.margin == null ? "—" : `${vehicle.margin.toFixed(1)}%`}</div></div>
            </div>
            {!sold && (
              <>
                <div className="grid grid-cols-[10rem_1fr] items-end gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="vp-price">Nuevo precio</Label>
                    <Input id="vp-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="vp-reason">Motivo (opcional)</Label>
                    <Input id="vp-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Rebaja por 60 días en inventario" />
                  </div>
                </div>
                {Number(price) > 0 && Number(price) < vehicle.advice.floor && (
                  <p className="text-xs text-destructive">Está por debajo del precio piso ({formatCurrency(vehicle.advice.floor, currency)}): no recuperas el capital con la utilidad mínima.</p>
                )}
                <Button disabled={isPending || !(Number(price) > 0)} onClick={() => run(() => setListPrice(vehicle.id, price, reason), "Precio actualizado")}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar precio
                </Button>
              </>
            )}
            {vehicle.priceChanges.length > 0 && (
              <div className="divide-y rounded-md border text-sm">
                {vehicle.priceChanges.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div>
                      <div>{c.oldPrice != null ? `${formatCurrency(c.oldPrice, currency)} → ` : ""}{formatCurrency(c.newPrice, currency)}</div>
                      <div className="text-xs text-muted-foreground">{c.reason ?? "—"}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{c.createdAt.slice(0, 10)}</div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
