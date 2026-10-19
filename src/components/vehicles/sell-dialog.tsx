"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { sellVehicle } from "@/lib/actions/vehicles";
import { selectClass, vehicleTitle, type VehicleRow } from "./types";

interface Props {
  vehicle: VehicleRow | null;
  onOpenChange: (open: boolean) => void;
  currency: string;
}

/** Sale of a vehicle: records the cash-in and shows the real margin before confirming. */
export function SellVehicleDialog({ vehicle, onOpenChange, currency }: Props) {
  if (!vehicle) return null;
  // Remount per vehicle so the form starts from its own asking price
  return <SellForm key={vehicle.id} vehicle={vehicle} onOpenChange={onOpenChange} currency={currency} />;
}

function SellForm({ vehicle, onOpenChange, currency }: { vehicle: VehicleRow; onOpenChange: (open: boolean) => void; currency: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [price, setPrice] = useState(String(vehicle.listPrice ?? ""));
  const [payment, setPayment] = useState("transfer");
  const [buyer, setBuyer] = useState({ name: "", phone: "" });
  const [missing, setMissing] = useState<string[]>([]);

  const value = Number(price) || 0;
  const profit = value - vehicle.cost;

  const submit = (force = false) =>
    startTransition(async () => {
      const res = await sellVehicle(vehicle.id, { price, paymentMethod: payment, buyerName: buyer.name, buyerPhone: buyer.phone, force });
      if ("missingDocuments" in res && res.missingDocuments) return void setMissing(res.missingDocuments);
      if ("error" in res && res.error) return void toast.error(res.error);
      toast.success(`${vehicle.plate} vendido por ${formatCurrency(value, currency)}`);
      onOpenChange(false);
      router.refresh();
    });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Vender {vehicle.plate}</DialogTitle>
          <DialogDescription>{vehicleTitle(vehicle)} · costo total {formatCurrency(vehicle.cost, currency)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sv-price">Valor de venta</Label>
            <Input id="sv-price" type="number" value={price} onChange={(e) => { setPrice(e.target.value); setMissing([]); }} />
            <p className={`text-xs ${profit < 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {value > 0 ? `${profit >= 0 ? "Utilidad" : "Pérdida"} de ${formatCurrency(Math.abs(profit), currency)}` : "Ingresa el valor acordado"}
              {value > 0 && vehicle.advice.floor > 0 && value < vehicle.advice.floor ? " · por debajo de tu precio piso" : ""}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sv-name">Comprador</Label>
              <Input id="sv-name" value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sv-phone">Celular</Label>
              <Input id="sv-phone" type="tel" value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sv-pay">Pago</Label>
            <select id="sv-pay" className={selectClass} value={payment} onChange={(e) => setPayment(e.target.value)}>
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
            </select>
          </div>
          {missing.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Faltan documentos para el traspaso: <strong>{missing.join(", ")}</strong>. Puedes venderlo igual y completarlos después.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {missing.length > 0 ? (
            <Button variant="destructive" onClick={() => submit(true)} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Vender de todos modos
            </Button>
          ) : (
            <Button onClick={() => submit(false)} disabled={isPending || value <= 0}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar venta
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
