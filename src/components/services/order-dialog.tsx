"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bike, Copy, ExternalLink, Loader2, MapPin, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { ADVANCE_LABELS, CLOSED, nextStatus, SIZE_LABELS, stagesFor, STATUS_LABELS } from "@/lib/service-orders/flow";
import {
  advanceServiceOrder,
  assignServiceCourier,
  cancelServiceOrder,
  chargeServiceOrder,
  getServiceOrderDetail,
  reportServiceIssue,
  updateServiceLines,
} from "@/lib/actions/service-orders";
import { mapsLink, PAYMENT_LABELS, selectClass, shortWhen, waNumber, type CourierOption, type ServiceItemOption, type ServiceOrderRow } from "./types";

interface Props {
  order: ServiceOrderRow | null;
  onClose: () => void;
  couriers: CourierOption[];
  items: ServiceItemOption[];
  currency: string;
  timeZone: string;
  siteUrl: string;
  slug: string;
  businessName: string;
}

type Detail = Awaited<ReturnType<typeof getServiceOrderDetail>>;

export function OrderDialog(props: Props) {
  const { order, onClose } = props;
  return (
    <Dialog open={Boolean(order)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[620px]">
        {order && <OrderBody key={`${order.id}|${order.status}|${order.paid}|${order.total}|${order.assignedTo}`} {...props} order={order} />}
      </DialogContent>
    </Dialog>
  );
}

function OrderBody({ order, onClose, couriers, items, currency, timeZone, siteUrl, slug, businessName }: Props & { order: ServiceOrderRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [courier, setCourier] = useState({ employeeId: order.assignedTo ?? "", name: "" });
  const [method, setMethod] = useState("cash");
  const [issue, setIssue] = useState("");
  const [lines, setLines] = useState<Record<string, string>>(() =>
    Object.fromEntries(order.items.filter((l) => l.itemId).map((l) => [l.itemId as string, String(l.quantity)]))
  );
  const fmt = (n: number) => formatCurrency(n, currency);
  const closed = CLOSED.includes(order.status);
  const next = nextStatus(order.kind, order.status, order.returnMode);
  const trackingUrl = `${siteUrl}/${slug}/servicio/${order.token}`;

  useEffect(() => {
    let alive = true;
    getServiceOrderDetail(order.id).then((d) => alive && setDetail(d));
    return () => {
      alive = false;
    };
  }, [order.id]);

  const run = (fn: () => Promise<{ error?: string } | { success: boolean }>, ok: string, close = false) =>
    startTransition(async () => {
      const res = await fn();
      if ("error" in res && res.error) return void toast.error(res.error);
      toast.success(ok);
      router.refresh();
      if (close) onClose();
      else getServiceOrderDetail(order.id).then(setDetail);
    });

  const courierInfo = detail && "courier" in detail ? detail.courier : null;
  const courierUrl = courierInfo ? `${siteUrl}/${slug}/repartidor/${courierInfo.token}` : null;
  const needsCourier = order.kind === "shipment" ? !closed : order.returnMode === "delivery" && ["ready", "out_for_delivery"].includes(order.status);
  const statusText = stagesFor(order.kind, order.returnMode).find((s) => s.key === order.status)?.customer ?? STATUS_LABELS[order.status];
  const customerMsg = `Hola ${order.customerName.split(" ")[0]}, te escribimos de ${businessName} sobre ${order.kind === "shipment" ? "tu envío" : "tu orden"} ${order.code}: ${statusText}. Síguelo aquí: ${trackingUrl}`;
  const pickupLink = mapsLink(order.pickupAddress, order.pickupLat, order.pickupLng);
  const dropoffLink = mapsLink(order.dropoffAddress, order.dropoffLat, order.dropoffLng);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          {order.code} · {order.customerName}
          <Badge variant={order.status === "cancelled" || order.status === "failed" ? "destructive" : closed ? "secondary" : "default"}>{STATUS_LABELS[order.status] ?? order.status}</Badge>
          <Badge variant={order.paid ? "secondary" : "outline"}>{order.paid ? "Pagado" : "Por cobrar"}</Badge>
        </DialogTitle>
        <DialogDescription>
          {order.source === "web" ? "Solicitud web" : "Creado en el local"} · {shortWhen(order.createdAt, timeZone)}
          {order.promisedAt && !closed ? ` · prometido ${shortWhen(order.promisedAt, timeZone)}` : ""}
          {order.scheduledFor ? ` · recoger ${shortWhen(order.scheduledFor, timeZone)}` : ""}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Cliente:</span>
          <span className="font-medium">{order.customerPhone ?? "sin teléfono"}</span>
          {order.customerPhone && (
            <a className="inline-flex items-center gap-1 text-xs text-primary underline" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${waNumber(order.customerPhone)}?text=${encodeURIComponent(customerMsg)}`}>
              <MessageCircle className="h-3 w-3" /> Avisar por WhatsApp
            </a>
          )}
          <button type="button" className="inline-flex items-center gap-1 text-xs text-muted-foreground underline" onClick={() => navigator.clipboard.writeText(trackingUrl).then(() => toast.success("Enlace de seguimiento copiado"))}>
            <Copy className="h-3 w-3" /> Enlace de seguimiento
          </button>
        </div>
        {order.pickupAddress && (
          <p><MapPin className="mr-1 inline h-3.5 w-3.5 text-blue-600" /> {order.kind === "shipment" ? "Recoger" : "Recoger en casa"}: <strong>{order.pickupAddress}</strong> {pickupLink && <a className="text-xs underline" href={pickupLink} target="_blank" rel="noopener noreferrer">mapa</a>}</p>
        )}
        {order.dropoffAddress && (
          <p><MapPin className="mr-1 inline h-3.5 w-3.5 text-green-600" /> Entregar: <strong>{order.dropoffAddress}</strong> {dropoffLink && <a className="text-xs underline" href={dropoffLink} target="_blank" rel="noopener noreferrer">mapa</a>}</p>
        )}
        {order.kind === "shipment" && (
          <p className="text-muted-foreground">
            {order.recipientName ? `Recibe ${order.recipientName}${order.recipientPhone ? ` · ${order.recipientPhone}` : ""} · ` : ""}
            {order.packageSize ? SIZE_LABELS[order.packageSize] : ""}
            {order.distanceKm != null ? ` · ${String(order.distanceKm).replace(".", ",")} km` : ""}
            {order.packageDescription ? ` · ${order.packageDescription}` : ""}
          </p>
        )}
        {order.kind === "laundry" && !order.pickupAddress && !order.dropoffAddress && <p className="text-muted-foreground">Trae y recoge en el local.</p>}
        {order.notes && <p className="rounded-md bg-muted px-3 py-2">📝 {order.notes}</p>}
      </div>

      <Separator />
      <div className="space-y-1.5 text-sm">
        {order.items.map((l, i) => (
          <div key={i} className="flex justify-between"><span>{l.name}</span><span>{fmt(l.total)}</span></div>
        ))}
        {order.kind === "laundry" && order.deliveryFee > 0 && <div className="flex justify-between"><span>Servicio a domicilio</span><span>{fmt(order.deliveryFee)}</span></div>}
        <div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span>{fmt(order.total)}</span></div>
      </div>

      {order.kind === "laundry" && !closed && !order.paid && (
        <details className="rounded-md border p-3 text-sm">
          <summary className="cursor-pointer font-medium">Ajustar kilos y prendas (al recibir)</summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {items.map((it) => (
              <label key={it.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{it.name}</span>
                <Input className="h-8 w-20" type="number" min={0} step={/kilo|kg/i.test(it.name) ? 0.1 : 1} value={lines[it.id] ?? ""} placeholder="0" onChange={(e) => setLines({ ...lines, [it.id]: e.target.value })} />
              </label>
            ))}
          </div>
          <Button
            className="mt-3"
            size="sm"
            disabled={isPending}
            onClick={() => {
              const list = Object.entries(lines).map(([itemId, q]) => ({ itemId, quantity: Number(q) })).filter((l) => l.quantity > 0);
              const kg = list.filter((l) => /kilo|kg/i.test(items.find((x) => x.id === l.itemId)?.name ?? "")).reduce((a, l) => a + l.quantity, 0);
              run(() => updateServiceLines(order.id, list, kg || null), "Orden actualizada");
            }}
          >
            Guardar y recalcular
          </Button>
        </details>
      )}

      {needsCourier && (
        <div className="space-y-2 rounded-md border p-3 text-sm">
          <p className="flex items-center gap-2 font-medium"><Bike className="h-4 w-4" /> Mensajero</p>
          {courierInfo ? (
            <>
              <p className="text-muted-foreground">
                {courierInfo.name ?? "Sin nombre"} · {courierInfo.status === "on_the_way" ? "en camino" : courierInfo.status === "delivered" ? "entregó" : "aún no inicia"}
                {courierInfo.lastSeen ? ` · ubicación ${shortWhen(courierInfo.lastSeen, timeZone)}` : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => courierUrl && navigator.clipboard.writeText(courierUrl).then(() => toast.success("Enlace del mensajero copiado"))}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> Copiar enlace del mensajero
                </Button>
                {courierUrl && (
                  <a className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`${order.code}: ${order.kind === "shipment" ? `recoger en ${order.pickupAddress} y entregar en ${order.dropoffAddress}` : `entregar en ${order.dropoffAddress}`}. Abre este enlace para iniciar el recorrido: ${courierUrl}`)}`}>
                    <MessageCircle className="h-3.5 w-3.5" /> Enviar al mensajero
                  </a>
                )}
                {courierUrl && (
                  <a className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium" target="_blank" rel="noopener noreferrer" href={courierUrl}>
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir
                  </a>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[180px] flex-1 space-y-1">
                <Label htmlFor="od-courier" className="text-xs">Quién lleva</Label>
                <select id="od-courier" className={selectClass} value={courier.employeeId} onChange={(e) => setCourier({ ...courier, employeeId: e.target.value })}>
                  <option value="">Otro (escribir nombre)</option>
                  {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {!courier.employeeId && <Input className="h-9 w-40" placeholder="Nombre" value={courier.name} onChange={(e) => setCourier({ ...courier, name: e.target.value })} aria-label="Nombre del mensajero" />}
              <Button size="sm" disabled={isPending || (!courier.employeeId && courier.name.trim().length < 2)} onClick={() => run(() => assignServiceCourier(order.id, courier.employeeId || null, courier.name), "Mensajero asignado: comparte su enlace")}>
                Asignar y crear enlace
              </Button>
            </div>
          )}
        </div>
      )}

      {detail?.events && detail.events.length > 0 && (
        <div className="space-y-1 text-sm">
          <p className="font-medium">Historial</p>
          {detail.events.map((e, i) => (
            <p key={i} className="text-muted-foreground">
              <span className="text-foreground">{STATUS_LABELS[e.status] ?? e.status}</span> · {shortWhen(e.at, timeZone)}{e.note ? ` · ${e.note}` : ""}
            </p>
          ))}
        </div>
      )}

      {!closed && (
        <div className="space-y-3 rounded-md border border-primary/40 p-3">
          <div className="flex flex-wrap gap-2">
            {next && !(order.kind === "shipment" && next === "assigned") && (
              <Button disabled={isPending} onClick={() => run(() => advanceServiceOrder(order.id, next), STATUS_LABELS[next] ?? "Actualizado", next === "delivered")}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {ADVANCE_LABELS[next] ?? STATUS_LABELS[next]}
              </Button>
            )}
            {!order.paid && (
              <div className="flex items-center gap-2">
                <select className={`${selectClass} w-44`} value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Medio de pago">
                  {Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <Button variant="secondary" disabled={isPending} onClick={() => run(() => chargeServiceOrder(order.id, method), "Pago registrado")}>
                  Cobrar {fmt(order.total)}
                </Button>
              </div>
            )}
          </div>
          {order.kind === "shipment" && ["assigned", "in_transit"].includes(order.status) && (
            <div className="flex gap-2">
              <Input placeholder="Novedad: no había nadie, dirección errada…" value={issue} onChange={(e) => setIssue(e.target.value)} aria-label="Novedad" />
              <Button variant="outline" disabled={isPending || issue.trim().length < 3} onClick={() => run(() => reportServiceIssue(order.id, issue), "Novedad registrada")}>Reportar</Button>
            </div>
          )}
          {!order.paid && (
            <Button variant="ghost" size="sm" className="text-destructive" disabled={isPending} onClick={() => confirm(`¿Cancelar ${order.code}?`) && run(() => cancelServiceOrder(order.id), "Orden cancelada", true)}>
              Cancelar orden
            </Button>
          )}
        </div>
      )}
      {closed && !order.paid && order.status === "delivered" && (
        <div className="flex items-center gap-2">
          <select className={`${selectClass} w-44`} value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Medio de pago">
            {Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <Button variant="secondary" disabled={isPending} onClick={() => run(() => chargeServiceOrder(order.id, method), "Pago registrado")}>Cobrar {fmt(order.total)}</Button>
        </div>
      )}
    </>
  );
}
