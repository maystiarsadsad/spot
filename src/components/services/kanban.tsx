"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { ADVANCE_LABELS, nextStatus, stagesFor, STATUS_LABELS, type ServiceKind } from "@/lib/service-orders/flow";
import { advanceServiceOrder } from "@/lib/actions/service-orders";
import { shortWhen, type ServiceOrderRow } from "./types";

interface Props {
  kind: ServiceKind;
  orders: ServiceOrderRow[];
  currency: string;
  timeZone: string;
  now: number;
  onOpen: (o: ServiceOrderRow) => void;
}

export function Kanban({ kind, orders, currency, timeZone, now, onOpen }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Laundry board shows "en camino" too; each card knows if it skips it
  const columns = [...stagesFor(kind, "delivery").filter((s) => s.key !== "delivered"), ...(kind === "shipment" ? [{ key: "failed", label: "Novedad", customer: "" }] : [])];

  const advance = (o: ServiceOrderRow, to: string) =>
    startTransition(async () => {
      const res = await advanceServiceOrder(o.id, to);
      if ("error" in res && res.error) return void toast.error(res.error);
      toast.success(`${o.code}: ${STATUS_LABELS[to]}`);
      router.refresh();
    });

  return (
    <div className="grid gap-3 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(230px, 1fr))` }}>
      {columns.map((col) => {
        const list = orders.filter((o) => o.status === col.key);
        return (
          <div key={col.key} className="flex min-h-[200px] flex-col gap-2 rounded-lg bg-muted/50 p-2">
            <div className="flex items-center justify-between px-1 text-sm font-semibold">
              {col.label}
              <Badge variant="secondary">{list.length}</Badge>
            </div>
            {list.length === 0 && <p className="px-1 text-xs text-muted-foreground">Sin órdenes</p>}
            {list.map((o) => {
              const next = nextStatus(o.kind, o.status, o.returnMode);
              const due = o.status === "requested" ? o.scheduledFor : o.promisedAt;
              const late = due && Date.parse(due) < now && !["ready", "out_for_delivery", "in_transit"].includes(o.status);
              return (
                <div key={o.id} className="rounded-md border bg-background p-2.5 text-sm shadow-sm">
                  <button type="button" className="w-full text-left" onClick={() => onOpen(o)}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{o.code}</span>
                      <span className="text-xs">{formatCurrency(o.total, currency)}</span>
                    </div>
                    <div className="truncate">{o.customerName}</div>
                    {o.kind === "shipment" ? (
                      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                        <div className="truncate"><MapPin className="mr-1 inline h-3 w-3 text-blue-600" />{o.pickupAddress}</div>
                        <div className="truncate"><MapPin className="mr-1 inline h-3 w-3 text-green-600" />{o.dropoffAddress}</div>
                      </div>
                    ) : (
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {o.items.map((l) => l.name).join(", ")}
                      </div>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {due && (
                        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] ${late ? "bg-destructive/15 text-destructive" : "bg-muted"}`}>
                          <Clock className="h-3 w-3" /> {o.status === "requested" ? "Recoger" : "Listo"} {shortWhen(due, timeZone)}
                        </span>
                      )}
                      {o.kind === "laundry" && (o.handoff === "pickup" || o.returnMode === "delivery") && (
                        <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[11px] text-sky-700 dark:text-sky-300">
                          {o.handoff === "pickup" && o.status === "requested" ? "Recoger a domicilio" : o.returnMode === "delivery" ? "Entrega a domicilio" : ""}
                        </span>
                      )}
                      {o.source === "web" && <span className="rounded bg-muted px-1.5 py-0.5 text-[11px]">Web</span>}
                      <span className={`rounded px-1.5 py-0.5 text-[11px] ${o.paid ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>
                        {o.paid ? "Pagado" : "Por cobrar"}
                      </span>
                    </div>
                  </button>
                  {next && !(o.kind === "shipment" && next === "assigned") && (
                    <Button size="sm" variant="outline" className="mt-2 h-7 w-full text-xs" disabled={isPending} onClick={() => advance(o, next)}>
                      {ADVANCE_LABELS[next] ?? STATUS_LABELS[next]} →
                    </Button>
                  )}
                  {o.kind === "shipment" && (next === "assigned") && (
                    <Button size="sm" className="mt-2 h-7 w-full text-xs" onClick={() => onOpen(o)}>Asignar mensajero</Button>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
