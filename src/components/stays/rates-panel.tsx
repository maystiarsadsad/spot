"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { deleteSeason, saveSeason, saveStaySettings } from "@/lib/actions/stays";
import type { StaySettings } from "@/lib/stays/pricing";
import { selectClass, shortDate, type RoomTypeRow, type SeasonRow } from "./types";

interface Props {
  businessId: string;
  settings: StaySettings;
  seasons: SeasonRow[];
  roomTypes: RoomTypeRow[];
}

const emptySeason = { id: "", name: "", itemId: "", startsOn: "", endsOn: "", adjustmentPct: "20", minNights: "" };

export function RatesPanel({ businessId, settings, seasons, roomTypes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [s, setS] = useState(settings);
  const [season, setSeason] = useState(emptySeason);
  const num = (v: string) => Number(v) || 0;

  const run = (fn: () => Promise<{ error?: string } | { success: boolean }>, ok: string, after?: () => void) =>
    startTransition(async () => {
      const res = await fn();
      if ("error" in res && res.error) return void toast.error(res.error);
      toast.success(ok);
      after?.();
      router.refresh();
    });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reglas de la estadía</CardTitle>
          <CardDescription>Se muestran al huésped y se aplican a las reservas web.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="r-in">Check-in desde</Label>
              <Input id="r-in" type="time" value={s.checkInTime} onChange={(e) => setS({ ...s, checkInTime: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-out">Check-out hasta</Label>
              <Input id="r-out" type="time" value={s.checkOutTime} onChange={(e) => setS({ ...s, checkOutTime: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-wk">Ajuste viernes y sábado (%)</Label>
              <Input id="r-wk" type="number" min={-90} max={300} value={s.weekendPct} onChange={(e) => setS({ ...s, weekendPct: num(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-min">Mínimo de noches</Label>
              <Input id="r-min" type="number" min={1} max={30} value={s.minNights} onChange={(e) => setS({ ...s, minNights: num(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-dep">Anticipo sugerido (%)</Label>
              <Input id="r-dep" type="number" min={0} max={100} value={s.depositPct} onChange={(e) => setS({ ...s, depositPct: num(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-can">Cancelación gratis hasta (días antes)</Label>
              <Input id="r-can" type="number" min={0} max={60} value={s.cancelDays} onChange={(e) => setS({ ...s, cancelDays: num(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-ahead">Reservas web hasta (días)</Label>
              <Input id="r-ahead" type="number" min={7} max={730} value={s.maxDaysAhead} onChange={(e) => setS({ ...s, maxDaysAhead: num(e.target.value) })} />
            </div>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
            <span>
              <span className="font-medium">Confirmar reservas web automáticamente</span>
              <span className="block text-xs text-muted-foreground">Si lo apagas, quedan &quot;por confirmar&quot; hasta que recepción las revise.</span>
            </span>
            <Switch checked={s.autoConfirm} onCheckedChange={(v) => setS({ ...s, autoConfirm: v })} />
          </label>
          <Button disabled={isPending} onClick={() => run(() => saveStaySettings(businessId, s), "Reglas guardadas")}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar reglas
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Temporadas</CardTitle>
          <CardDescription>Sube o baja la tarifa base en fechas especiales (festivos, fin de año, Semana Santa) y exige un mínimo de noches.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {seasons.length === 0 && <p className="text-sm text-muted-foreground">Sin temporadas: se cobra la tarifa base.</p>}
          {seasons.map((x) => (
            <div key={x.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{x.name} <span className={x.adjustmentPct >= 0 ? "text-emerald-600" : "text-amber-600"}>{x.adjustmentPct >= 0 ? "+" : ""}{x.adjustmentPct}%</span></div>
                <div className="text-xs text-muted-foreground">
                  {shortDate(x.startsOn)} → {shortDate(x.endsOn)}
                  {x.minNights ? ` · mínimo ${x.minNights} noches` : ""}
                  {x.itemId ? ` · solo ${roomTypes.find((t) => t.id === x.itemId)?.name ?? "un tipo"}` : " · todas las habitaciones"}
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Editar ${x.name}`}
                onClick={() => setSeason({ id: x.id, name: x.name, itemId: x.itemId ?? "", startsOn: x.startsOn, endsOn: x.endsOn, adjustmentPct: String(x.adjustmentPct), minNights: x.minNights ? String(x.minNights) : "" })}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" aria-label={`Eliminar ${x.name}`} disabled={isPending} onClick={() => confirm(`¿Eliminar "${x.name}"?`) && run(() => deleteSeason(x.id), "Temporada eliminada")}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="space-y-2 rounded-md border border-dashed p-3">
            <p className="text-sm font-medium">{season.id ? "Editar temporada" : "Nueva temporada"}</p>
            <Input placeholder="Nombre (p. ej. Puente festivo)" aria-label="Nombre de la temporada" value={season.name} onChange={(e) => setSeason({ ...season, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" aria-label="Desde" value={season.startsOn} onChange={(e) => setSeason({ ...season, startsOn: e.target.value })} />
              <Input type="date" aria-label="Hasta (incluida)" value={season.endsOn} onChange={(e) => setSeason({ ...season, endsOn: e.target.value })} />
              <div className="space-y-1">
                <Label htmlFor="s-pct" className="text-xs">Ajuste (%)</Label>
                <Input id="s-pct" type="number" value={season.adjustmentPct} onChange={(e) => setSeason({ ...season, adjustmentPct: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="s-min" className="text-xs">Mínimo de noches</Label>
                <Input id="s-min" type="number" min={1} placeholder="—" value={season.minNights} onChange={(e) => setSeason({ ...season, minNights: e.target.value })} />
              </div>
            </div>
            <select className={selectClass} aria-label="Aplica a" value={season.itemId} onChange={(e) => setSeason({ ...season, itemId: e.target.value })}>
              <option value="">Todas las habitaciones</option>
              {roomTypes.map((t) => <option key={t.id} value={t.id}>Solo {t.name}</option>)}
            </select>
            <div className="flex gap-2">
              {season.id && <Button variant="outline" onClick={() => setSeason(emptySeason)}>Cancelar</Button>}
              <Button
                disabled={isPending || !season.name.trim() || !season.startsOn || !season.endsOn}
                onClick={() =>
                  run(
                    () =>
                      saveSeason(businessId, {
                        id: season.id || undefined,
                        name: season.name,
                        itemId: season.itemId || null,
                        startsOn: season.startsOn,
                        endsOn: season.endsOn,
                        adjustmentPct: Number(season.adjustmentPct),
                        minNights: season.minNights ? Number(season.minNights) : null,
                      }),
                    "Temporada guardada",
                    () => setSeason(emptySeason)
                  )
                }
              >
                Guardar temporada
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
