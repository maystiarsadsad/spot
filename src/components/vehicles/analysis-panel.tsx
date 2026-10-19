"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { saveDealerSettings, setListPrice } from "@/lib/actions/vehicles";
import { AGE_BUCKETS, stockSummary, type DealerSettings } from "@/lib/dealership/pricing";
import { vehicleTitle, type VehicleRow } from "./types";

interface Props {
  businessId: string;
  currency: string;
  vehicles: VehicleRow[];
  settings: DealerSettings;
  today: string;
}

const BUCKET_LABEL = { "0-30": "0–30 días", "31-60": "31–60 días", "61-90": "61–90 días", "90+": "Más de 90 días" } as const;

/** Where the capital is stuck and which prices to lower to get it back. */
export function AnalysisPanel({ businessId, currency, vehicles, settings, today }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    markdownAfterDays: String(settings.markdownAfterDays),
    stepPct: String(settings.stepPct),
    everyDays: String(settings.everyDays),
    minMarginPct: String(settings.minMarginPct),
  });

  const stock = useMemo(() => vehicles.filter((v) => v.status === "in_stock" || v.status === "reserved"), [vehicles]);
  const summary = useMemo(() => stockSummary(stock.map((v) => ({ acquiredOn: v.acquiredOn, cost: v.cost, listPrice: v.listPrice })), today), [stock, today]);
  const toLower = stock.filter((v) => v.advice.action !== "hold").sort((a, b) => b.days - a.days);
  const sold = vehicles.filter((v) => v.status === "sold" && v.soldPrice != null);
  const realized = sold.reduce((s, v) => s + ((v.soldPrice ?? 0) - v.cost), 0);
  const potential = stock.reduce((s, v) => s + ((v.listPrice ?? 0) - v.cost), 0);
  const maxCapital = Math.max(1, ...AGE_BUCKETS.map((b) => summary.byBucket[b].capital));

  const run = (fn: () => Promise<{ error?: string } | { success: true }>, ok: string) =>
    startTransition(async () => {
      const res = await fn();
      if ("error" in res && res.error) return void toast.error(res.error);
      toast.success(ok);
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Capital inmovilizado" value={formatCurrency(summary.capitalTied, currency)} hint={`${summary.units} vehículos`} />
        <Kpi label="Valor de venta del inventario" value={formatCurrency(summary.askingValue, currency)} hint={`Utilidad potencial ${formatCurrency(potential, currency)}`} />
        <Kpi label="Días promedio en inventario" value={`${summary.avgDays}`} hint={`${summary.byBucket["90+"].units} con más de 90 días`} />
        <Kpi label="Utilidad realizada" value={formatCurrency(realized, currency)} hint={`${sold.length} vendidos`} negative={realized < 0} />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Antigüedad del inventario</h2>
        <div className="space-y-2">
          {AGE_BUCKETS.map((b) => {
            const x = summary.byBucket[b];
            return (
              <div key={b} className="grid grid-cols-[8rem_1fr_9rem] items-center gap-3 text-sm">
                <span>{BUCKET_LABEL[b]}</span>
                <div className="h-3 overflow-hidden rounded bg-muted">
                  <div className={`h-full ${b === "90+" ? "bg-destructive" : b === "61-90" ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${(x.capital / maxCapital) * 100}%` }} />
                </div>
                <span className="text-right tabular-nums">{x.units} · {formatCurrency(x.capital, currency)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Rebajas sugeridas</h2>
          <p className="text-xs text-muted-foreground">
            Desde el día {settings.markdownAfterDays}, −{settings.stepPct}% cada {settings.everyDays} días, sin bajar de costo + {settings.minMarginPct}%
          </p>
        </div>
        {toLower.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Ningún vehículo necesita rebaja por ahora.</div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehículo</TableHead>
                  <TableHead className="text-right">Días</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">Precio hoy</TableHead>
                  <TableHead className="text-right">Sugerido</TableHead>
                  <TableHead className="text-right">Margen</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {toLower.map((v) => {
                  const atFloor = v.advice.action === "at_floor";
                  const changes = v.advice.suggestedPrice != null && v.advice.suggestedPrice !== v.listPrice;
                  return (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div className="font-mono text-xs font-semibold">{v.plate}</div>
                        <div>{vehicleTitle(v)}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{v.days}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(v.cost, currency)}</TableCell>
                      <TableCell className="text-right tabular-nums">{v.listPrice ? formatCurrency(v.listPrice, currency) : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {v.advice.suggestedPrice ? formatCurrency(v.advice.suggestedPrice, currency) : "—"}
                        {atFloor && <Badge variant="destructive" className="ml-1">En el piso</Badge>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{v.advice.suggestedPrice ? `${(((v.advice.suggestedPrice - v.cost) / v.advice.suggestedPrice) * 100).toFixed(1)}%` : "—"}</TableCell>
                      <TableCell className="text-right">
                        {changes ? (
                          <Button
                            size="sm"
                            disabled={isPending}
                            onClick={() => run(() => setListPrice(v.id, v.advice.suggestedPrice!, `Rebaja sugerida (${v.days} días en inventario)`), `Precio de ${v.plate} actualizado`)}
                          >
                            Aplicar
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">{atFloor ? "Ya está en el piso: promoción o liquidación" : ""}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Al llegar al piso ya no conviene bajar más: ahí se recupera el capital con la utilidad mínima. Lo que sigue es mover la unidad con una promoción puntual, permuta o venta a otro comerciante.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Política de rebajas</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {([["markdownAfterDays", "Empezar a rebajar (días)"], ["stepPct", "Rebaja por paso (%)"], ["everyDays", "Repetir cada (días)"], ["minMarginPct", "Utilidad mínima (%)"]] as const).map(([k, label]) => (
            <div key={k} className="space-y-1.5">
              <Label htmlFor={`ds-${k}`}>{label}</Label>
              <Input id={`ds-${k}`} type="number" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </div>
          ))}
        </div>
        <Button disabled={isPending} onClick={() => run(() => saveDealerSettings(businessId, {
          markdownAfterDays: Number(form.markdownAfterDays),
          stepPct: Number(form.stepPct),
          everyDays: Number(form.everyDays),
          minMarginPct: Number(form.minMarginPct),
        }), "Política guardada")}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar política
        </Button>
      </section>
    </div>
  );
}

function Kpi({ label, value, hint, negative }: { label: string; value: string; hint?: string; negative?: boolean }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${negative ? "text-destructive" : ""}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
