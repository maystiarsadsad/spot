"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { BookingSettings } from "@/lib/booking/availability";
import { saveBookingSettings } from "@/lib/actions/agenda";

const selectClass = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

export function RulesCard({ businessId, initial, bookingUrl }: { businessId: string; initial: BookingSettings; bookingUrl: string }) {
  const [s, setS] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await saveBookingSettings(businessId, s);
      if ("error" in res && res.error) return void toast.error(res.error);
      toast.success("Reglas guardadas");
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reglas de la agenda en línea</CardTitle>
        <CardDescription>
          Tus clientes agendan en <a className="underline" href={bookingUrl} target="_blank" rel="noopener noreferrer">{bookingUrl}</a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="r-step">Ofrecer horarios cada</Label>
            <select id="r-step" className={selectClass} value={s.slotStep} onChange={(e) => setS({ ...s, slotStep: Number(e.target.value) })}>
              {[5, 10, 15, 20, 30, 60].map((m) => <option key={m} value={m}>{m} minutos</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-notice">Anticipación mínima (minutos)</Label>
            <Input id="r-notice" type="number" min={0} max={10080} value={s.minNoticeMinutes} onChange={(e) => setS({ ...s, minNoticeMinutes: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-ahead">Agendar hasta (días adelante)</Label>
            <Input id="r-ahead" type="number" min={1} max={180} value={s.maxDaysAhead} onChange={(e) => setS({ ...s, maxDaysAhead: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-buffer">Tiempo libre entre citas (minutos)</Label>
            <Input id="r-buffer" type="number" min={0} max={120} value={s.bufferMinutes} onChange={(e) => setS({ ...s, bufferMinutes: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-cancel">Cancelación en línea hasta (horas antes)</Label>
            <Input id="r-cancel" type="number" min={0} max={168} value={s.cancelHours} onChange={(e) => setS({ ...s, cancelHours: Number(e.target.value) })} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <Label>Confirmar automáticamente</Label>
              <p className="text-xs text-muted-foreground">Si lo apagas, las citas web quedan pendientes hasta que las confirmes.</p>
            </div>
            <Switch checked={s.autoConfirm} onCheckedChange={(v) => setS({ ...s, autoConfirm: !!v })} aria-label="Confirmar automáticamente" />
          </div>
        </div>
        <Button onClick={save} disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar reglas
        </Button>
      </CardContent>
    </Card>
  );
}
