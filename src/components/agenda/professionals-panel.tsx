"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DAY_KEYS, DAY_LABELS, type DayKey, type WeeklySchedule } from "@/lib/booking/availability";
import { addTimeOff, removeTimeOff, saveProfessional } from "@/lib/actions/agenda";

export interface PanelEmployee {
  id: string;
  name: string;
  position: string;
  bookable: boolean;
  bio: string | null;
  schedule: WeeklySchedule;
  serviceIds: string[];
  timeOff: { id: string; startsAt: string; endsAt: string; reason: string | null }[];
}

interface Props {
  businessId: string;
  timeZone: string;
  employees: PanelEmployee[];
  services: { id: string; name: string }[];
  terms: { professional: string; professionals: string };
}

const DEFAULT_DAY = [{ start: "09:00", end: "18:00" }];

export function ProfessionalsPanel({ businessId, timeZone, employees, services, terms }: Props) {
  if (employees.length === 0) {
    return (
      <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
        Primero agrega a tu equipo en la sección Equipo; luego activa aquí a quienes atienden citas.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Activa a los {terms.professionals} que atienden citas, define qué servicios hace cada uno y su horario semanal.
        Solo ellos aparecen en tu página para agendar.
      </p>
      {employees.map((e) => (
        <ProfessionalCard key={e.id} businessId={businessId} timeZone={timeZone} employee={e} services={services} />
      ))}
    </div>
  );
}

function ProfessionalCard({ businessId, timeZone, employee, services }: { businessId: string; timeZone: string; employee: PanelEmployee; services: { id: string; name: string }[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bookable, setBookable] = useState(employee.bookable);
  const [bio, setBio] = useState(employee.bio ?? "");
  const [schedule, setSchedule] = useState<WeeklySchedule>(employee.schedule);
  const [serviceIds, setServiceIds] = useState<string[]>(employee.serviceIds);
  const [off, setOff] = useState({ from: "", to: "", reason: "" });

  const setDay = (day: DayKey, ranges: { start: string; end: string }[]) => setSchedule({ ...schedule, [day]: ranges });
  const allServices = serviceIds.length === 0;

  const save = () =>
    startTransition(async () => {
      const res = await saveProfessional(businessId, employee.id, { bookable, bio, schedule, serviceIds });
      if ("error" in res && res.error) return void toast.error(res.error);
      toast.success(`${employee.name} guardado`);
      router.refresh();
    });

  const addOff = () =>
    startTransition(async () => {
      const res = await addTimeOff(businessId, employee.id, new Date(off.from).toISOString(), new Date(off.to).toISOString(), off.reason);
      if ("error" in res && res.error) return void toast.error(res.error);
      setOff({ from: "", to: "", reason: "" });
      toast.success("Ausencia guardada");
      router.refresh();
    });

  const fmtRange = (a: string, b: string) =>
    `${new Date(a).toLocaleString("es-CO", { timeZone, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} → ${new Date(b).toLocaleString("es-CO", { timeZone, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            {employee.name}
            {bookable ? <Badge>Atiende citas</Badge> : <Badge variant="outline">No agenda</Badge>}
          </CardTitle>
          <CardDescription>{employee.position}</CardDescription>
        </div>
        <Switch checked={bookable} onCheckedChange={(v) => setBookable(!!v)} aria-label={`${employee.name} atiende citas`} />
      </CardHeader>
      {bookable && (
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor={`bio-${employee.id}`}>Presentación (se ve en tu página)</Label>
            <Input id={`bio-${employee.id}`} maxLength={300} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Ej: Especialista en fades y diseños a navaja." />
          </div>

          <div className="space-y-2">
            <Label>Servicios que realiza</Label>
            <div className="flex flex-wrap gap-2">
              {services.map((sv) => {
                const on = allServices || serviceIds.includes(sv.id);
                return (
                  <button
                    key={sv.id}
                    type="button"
                    onClick={() => {
                      const base = allServices ? services.map((x) => x.id) : serviceIds;
                      setServiceIds(on ? base.filter((id) => id !== sv.id) : [...base, sv.id]);
                    }}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${on ? "border-[var(--accent)] bg-[var(--accent)]/15" : "text-muted-foreground"}`}
                    aria-pressed={on}
                  >
                    {sv.name}
                  </button>
                );
              })}
            </div>
            {allServices && <p className="text-xs text-muted-foreground">Sin selección: realiza todos los servicios.</p>}
          </div>

          <div className="space-y-2">
            <Label>Horario semanal</Label>
            <div className="divide-y rounded-lg border">
              {DAY_KEYS.map((d) => {
                const ranges = schedule[d];
                return (
                  <div key={d} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                    <label className="flex w-28 items-center gap-2">
                      <input type="checkbox" checked={ranges.length > 0} onChange={(e) => setDay(d, e.target.checked ? DEFAULT_DAY : [])} />
                      {DAY_LABELS[d]}
                    </label>
                    {ranges.length === 0 && <span className="text-xs text-muted-foreground">Descansa</span>}
                    {ranges.map((r, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <Input type="time" step={900} className="h-8 w-[110px]" value={r.start} aria-label={`${DAY_LABELS[d]} desde`} onChange={(e) => setDay(d, ranges.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} />
                        –
                        <Input type="time" step={900} className="h-8 w-[110px]" value={r.end} aria-label={`${DAY_LABELS[d]} hasta`} onChange={(e) => setDay(d, ranges.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} />
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDay(d, ranges.filter((_, j) => j !== i))} aria-label="Quitar franja">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </span>
                    ))}
                    {ranges.length > 0 && ranges.length < 4 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setDay(d, [...ranges, { start: "14:00", end: "18:00" }])}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> Franja
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">Usa dos franjas para dejar el almuerzo libre (ej. 9:00–13:00 y 14:00–19:00).</p>
          </div>

          <Button onClick={save} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
          </Button>

          <div className="space-y-2 border-t pt-4">
            <Label>Ausencias y bloqueos</Label>
            {employee.timeOff.length === 0 && <p className="text-xs text-muted-foreground">Sin ausencias próximas.</p>}
            {employee.timeOff.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-1.5 text-sm">
                <span>{fmtRange(t.startsAt, t.endsAt)}{t.reason ? ` · ${t.reason}` : ""}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Eliminar ausencia"
                  onClick={() =>
                    startTransition(async () => {
                      await removeTimeOff(businessId, t.id);
                      router.refresh();
                    })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <Input type="datetime-local" value={off.from} onChange={(e) => setOff({ ...off, from: e.target.value })} aria-label="Desde" />
              <Input type="datetime-local" value={off.to} onChange={(e) => setOff({ ...off, to: e.target.value })} aria-label="Hasta" />
              <Input placeholder="Motivo (opcional)" value={off.reason} onChange={(e) => setOff({ ...off, reason: e.target.value })} />
              <Button variant="outline" onClick={addOff} disabled={isPending || !off.from || !off.to}>Bloquear</Button>
            </div>
          </div>
        </CardContent>
      )}
      {!bookable && employee.bookable !== bookable && (
        <CardContent>
          <Button onClick={save} disabled={isPending}>Guardar</Button>
        </CardContent>
      )}
    </Card>
  );
}
