"use client";

import { useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { laundryDeliveryFee, lineTotal, quoteShipment, SIZE_LABELS, type ServiceKind, type ServiceSettings } from "@/lib/service-orders/flow";
import { createDeskServiceOrder } from "@/lib/actions/service-orders";
import type { LatLng } from "@/components/maps/leaflet";
import { selectClass, type ServiceItemOption } from "./types";

const RoutePicker = dynamic(() => import("@/components/maps/route-picker").then((m) => m.RoutePicker), { ssr: false });

interface Props {
  open: boolean;
  onClose: () => void;
  businessId: string;
  kind: ServiceKind;
  items: ServiceItemOption[];
  settings: ServiceSettings;
  currency: string;
}

type Size = "small" | "medium" | "large";

export function NewOrderDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">{props.open && <NewOrderForm {...props} />}</DialogContent>
    </Dialog>
  );
}

function NewOrderForm({ onClose, businessId, kind, items, settings, currency }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [person, setPerson] = useState({ name: "", phone: "", notes: "" });
  const fmt = (n: number) => formatCurrency(n, currency);
  // laundry
  const [qty, setQty] = useState<Record<string, string>>({});
  const [handoff, setHandoff] = useState<"store" | "pickup">("store");
  const [returnMode, setReturnMode] = useState<"store" | "delivery">("store");
  const [home, setHome] = useState("");
  // shipment
  const [serviceId, setServiceId] = useState(items[0]?.id ?? "");
  const [size, setSize] = useState<Size>("small");
  const [route, setRoute] = useState<{ pickup: LatLng | null; dropoff: LatLng | null; from: string; to: string }>({ pickup: null, dropoff: null, from: "", to: "" });
  const [recipient, setRecipient] = useState({ name: "", phone: "", description: "" });

  const total = useMemo(() => {
    if (kind === "shipment") {
      const s = items.find((i) => i.id === serviceId);
      if (!s || !route.pickup || !route.dropoff) return null;
      const q = quoteShipment({ from: route.pickup, to: route.dropoff, basePrice: s.price, size, settings });
      return { total: q.total, note: `${String(q.distanceKm).replace(".", ",")} km${q.tooFar ? " · fuera de cobertura" : ""}` };
    }
    const sub = items.reduce((a, i) => a + (Number(qty[i.id]) > 0 ? lineTotal(i.price, Number(qty[i.id])) : 0), 0);
    if (!sub) return null;
    const fee = laundryDeliveryFee(handoff, returnMode, settings);
    return { total: sub + fee, note: fee ? `incluye domicilio ${fmt(fee)}` : "" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, items, serviceId, route, size, settings, qty, handoff, returnMode]);

  const submit = () =>
    startTransition(async () => {
      const res = await createDeskServiceOrder(
        businessId,
        kind === "shipment"
          ? {
              ...person,
              serviceId,
              size,
              pickup: { address: route.from, lat: route.pickup?.lat ?? null, lng: route.pickup?.lng ?? null },
              dropoff: { address: route.to, lat: route.dropoff?.lat ?? null, lng: route.dropoff?.lng ?? null },
              recipientName: recipient.name,
              recipientPhone: recipient.phone,
              description: recipient.description,
            }
          : {
              ...person,
              lines: Object.entries(qty).map(([itemId, q]) => ({ itemId, quantity: Number(q) })).filter((l) => l.quantity > 0),
              handoff,
              returnMode,
              home: { address: home, lat: null, lng: null },
            }
      );
      if ("error" in res && res.error) return void toast.error(res.error);
      toast.success("Orden creada");
      onClose();
      router.refresh();
    });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{kind === "shipment" ? "Nuevo envío" : "Nueva orden de lavandería"}</DialogTitle>
        <DialogDescription>{kind === "shipment" ? "Para pedidos por teléfono, WhatsApp o en el mostrador." : "Registra lo que el cliente deja en el mostrador (queda como recibido)."}</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Nombre del cliente" aria-label="Nombre del cliente" value={person.name} onChange={(e) => setPerson({ ...person, name: e.target.value })} />
          <Input type="tel" placeholder="Celular" aria-label="Celular" value={person.phone} onChange={(e) => setPerson({ ...person, phone: e.target.value })} />
        </div>

        {kind === "laundry" ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              {items.map((it) => (
                <label key={it.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate">{it.name}</span>
                    <span className="text-xs text-muted-foreground">{fmt(it.price)}{/kilo|kg/i.test(it.name) ? " / kg" : ""}</span>
                  </span>
                  <Input className="h-8 w-20" type="number" min={0} step={/kilo|kg/i.test(it.name) ? 0.1 : 1} placeholder="0" value={qty[it.id] ?? ""} onChange={(e) => setQty({ ...qty, [it.id]: e.target.value })} aria-label={`Cantidad de ${it.name}`} />
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="no-h">Entrega de la ropa</Label>
                <select id="no-h" className={selectClass} value={handoff} onChange={(e) => setHandoff(e.target.value as "store" | "pickup")}>
                  <option value="store">La trae al local</option>
                  <option value="pickup">Recoger a domicilio</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="no-r">Devolución</Label>
                <select id="no-r" className={selectClass} value={returnMode} onChange={(e) => setReturnMode(e.target.value as "store" | "delivery")}>
                  <option value="store">Recoge en el local</option>
                  <option value="delivery">Entrega a domicilio</option>
                </select>
              </div>
            </div>
            {(handoff === "pickup" || returnMode === "delivery") && (
              <Input placeholder="Dirección del cliente" aria-label="Dirección del cliente" value={home} onChange={(e) => setHome(e.target.value)} />
            )}
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="no-s">Servicio</Label>
                <select id="no-s" className={selectClass} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                  {items.map((i) => <option key={i.id} value={i.id}>{i.name} · {fmt(i.price)}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="no-z">Tamaño</Label>
                <select id="no-z" className={selectClass} value={size} onChange={(e) => setSize(e.target.value as Size)}>
                  {(["small", "medium", "large"] as Size[]).map((s) => <option key={s} value={s}>{SIZE_LABELS[s]}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="A · Dirección de recogida" aria-label="Dirección de recogida" value={route.from} onChange={(e) => setRoute({ ...route, from: e.target.value })} />
              <Input placeholder="B · Dirección de entrega" aria-label="Dirección de entrega" value={route.to} onChange={(e) => setRoute({ ...route, to: e.target.value })} />
            </div>
            <RoutePicker pickup={route.pickup} dropoff={route.dropoff} onChange={(w, p) => setRoute((r) => ({ ...r, [w]: p }))} />
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Quién recibe" aria-label="Quién recibe" value={recipient.name} onChange={(e) => setRecipient({ ...recipient, name: e.target.value })} />
              <Input placeholder="Celular de quien recibe" aria-label="Celular de quien recibe" value={recipient.phone} onChange={(e) => setRecipient({ ...recipient, phone: e.target.value })} />
              <Input placeholder="¿Qué se envía?" aria-label="Contenido" value={recipient.description} onChange={(e) => setRecipient({ ...recipient, description: e.target.value })} />
            </div>
          </>
        )}
        <Input placeholder="Notas" aria-label="Notas" value={person.notes} onChange={(e) => setPerson({ ...person, notes: e.target.value })} />
        <div className="rounded-md bg-muted px-3 py-2 text-sm">
          {total ? <>Total: <strong>{fmt(total.total)}</strong> {total.note && <span className="text-muted-foreground">· {total.note}</span>}</> : kind === "shipment" ? "Marca A y B en el mapa para cotizar." : "Agrega servicios para ver el total."}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit} disabled={isPending || !total || person.name.trim().length < 2 || person.phone.trim().length < 7}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Crear orden
        </Button>
      </DialogFooter>
    </>
  );
}
