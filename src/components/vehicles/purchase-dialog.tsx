"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createVehicle } from "@/lib/actions/vehicles";
import { normalizePlate } from "@/lib/dealership/pricing";
import { selectClass, VEHICLE_TYPE_LABELS } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
}

const EMPTY = {
  vehicleType: "moto",
  plate: "",
  brand: "",
  model: "",
  year: "",
  color: "",
  mileageKm: "",
  displacementCc: "",
  purchasePrice: "",
  listPrice: "",
  sellerName: "",
  sellerPhone: "",
  docLocation: "",
};

/** Purchase of a vehicle: identified by its plate, with what we paid and where the folder is. */
export function PurchaseDialog({ open, onOpenChange, businessId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [f, setF] = useState(EMPTY);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = () =>
    startTransition(async () => {
      const res = await createVehicle(businessId, f);
      if ("error" in res && res.error) return void toast.error(res.error);
      toast.success(`Vehículo ${normalizePlate(f.plate)} agregado al inventario`);
      setF(EMPTY);
      onOpenChange(false);
      router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar compra</DialogTitle>
          <DialogDescription>El vehículo entra al inventario con su placa. Los documentos se marcan después desde su ficha.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pv-type">Tipo</Label>
            <select id="pv-type" className={selectClass} value={f.vehicleType} onChange={set("vehicleType")}>
              {Object.entries(VEHICLE_TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pv-plate">Placa</Label>
            <Input id="pv-plate" value={f.plate} onChange={set("plate")} placeholder="ABC12D" className="uppercase" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pv-brand">Marca</Label>
            <Input id="pv-brand" value={f.brand} onChange={set("brand")} placeholder="Yamaha" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pv-model">Modelo / línea</Label>
            <Input id="pv-model" value={f.model} onChange={set("model")} placeholder="FZ 2.0" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pv-year">Año</Label>
            <Input id="pv-year" type="number" value={f.year} onChange={set("year")} placeholder="2021" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pv-color">Color</Label>
            <Input id="pv-color" value={f.color} onChange={set("color")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pv-km">Kilometraje</Label>
            <Input id="pv-km" type="number" value={f.mileageKm} onChange={set("mileageKm")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pv-cc">Cilindraje (cc)</Label>
            <Input id="pv-cc" type="number" value={f.displacementCc} onChange={set("displacementCc")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pv-buy">Valor de compra</Label>
            <Input id="pv-buy" type="number" value={f.purchasePrice} onChange={set("purchasePrice")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pv-list">Precio de venta (opcional)</Label>
            <Input id="pv-list" type="number" value={f.listPrice} onChange={set("listPrice")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pv-seller">Vendedor (a quién se compró)</Label>
            <Input id="pv-seller" value={f.sellerName} onChange={set("sellerName")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pv-sphone">Celular del vendedor</Label>
            <Input id="pv-sphone" type="tel" value={f.sellerPhone} onChange={set("sellerPhone")} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="pv-loc">Ubicación de la carpeta física</Label>
            <Input id="pv-loc" value={f.docLocation} onChange={set("docLocation")} placeholder="Archivador 2 · Carpeta M-14" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={isPending || !f.plate.trim() || !f.brand.trim() || f.purchasePrice === ""}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Registrar compra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
