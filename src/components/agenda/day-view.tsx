"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarCheck, ChevronLeft, ChevronRight, Globe, Loader2, MessageCircle, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { addDays, localTime, weekdayOf, zonedToUtc, type WeeklySchedule } from "@/lib/booking/availability";
import { createDashboardAppointment, setAppointmentStatus } from "@/lib/actions/agenda";

export interface AgendaStaff {
  id: string;
  name: string;
  schedule: WeeklySchedule;
  serviceIds: string[];
}

export interface AgendaAppointment {
  id: string;
  employeeId: string | null;
  start: string;
  end: string;
  status: string;
  customerName: string;
  customerPhone: string | null;
  serviceName: string | null;
  price: number | null;
  notes: string | null;
  source: string;
}

export interface AgendaService {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
}

interface Props {
  businessId: string;
  date: string;
  today: string;
  timeZone: string;
  currency: string;
  staff: AgendaStaff[];
  services: AgendaService[];
  appointments: AgendaAppointment[];
  terms: { professional: string; professionals: string };
}

const PX_PER_MIN = 1.3;
const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const selectClass = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Confirmada", className: "border-[var(--accent)] bg-[var(--accent)]/15" },
  pending: { label: "Pendiente", className: "border-dashed border-[var(--warning)] bg-[var(--warning)]/10" },
  completed: { label: "Atendida", className: "border-[var(--success)] bg-[var(--success)]/12 opacity-80" },
  cancelled: { label: "Cancelada", className: "border-muted bg-muted line-through opacity-60" },
};

export function DayView({ businessId, date, today, timeZone, currency, staff, services, appointments, terms }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<AgendaAppointment | null>(null);
  const [payment, setPayment] = useState("cash");
  const [creating, setCreating] = useState<{ employeeId: string; time: string } | null>(null);
  const [form, setForm] = useState({ serviceId: services[0]?.id ?? "", name: "", phone: "", notes: "" });
  const [showCancelled, setShowCancelled] = useState(false);

  const day = weekdayOf(date);
  const fmt = (n: number) => formatCurrency(n, currency);

  // Visible hours: union of everyone's hours (and any appointment outside them)
  const { startMin, endMin } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const s of staff) for (const r of s.schedule[day]) {
      lo = Math.min(lo, toMin(r.start));
      hi = Math.max(hi, toMin(r.end));
    }
    for (const a of appointments) {
      lo = Math.min(lo, toMin(localTime(new Date(a.start), timeZone)));
      hi = Math.max(hi, toMin(localTime(new Date(a.end), timeZone)));
    }
    if (!Number.isFinite(lo)) [lo, hi] = [8 * 60, 20 * 60];
    return { startMin: Math.floor(lo / 60) * 60, endMin: Math.ceil(hi / 60) * 60 };
  }, [staff, appointments, day, timeZone]);

  const height = (endMin - startMin) * PX_PER_MIN;
  const visible = appointments.filter((a) => showCancelled || a.status !== "cancelled");
  const active = appointments.filter((a) => a.status === "confirmed" || a.status === "pending" || a.status === "completed");
  const expected = active.reduce((sum, a) => sum + (a.price ?? 0), 0);
  const nowMin = date === today ? toMin(localTime(new Date(), timeZone)) : null;

  const go = (d: string) => router.push(`/d/agenda?date=${d}`);

  const runStatus = (status: "confirmed" | "completed" | "cancelled" | "no_show", withPayment = false) => {
    if (!selected) return;
    startTransition(async () => {
      const res = await setAppointmentStatus(businessId, selected.id, status, withPayment ? payment : undefined);
      if ("error" in res && res.error) return void toast.error(res.error);
      toast.success(status === "completed" ? (withPayment ? "Cita atendida y cobrada" : "Cita atendida") : "Cita actualizada");
      setSelected(null);
      router.refresh();
    });
  };

  const create = () => {
    if (!creating) return;
    startTransition(async () => {
      const res = await createDashboardAppointment(businessId, {
        serviceId: form.serviceId,
        employeeId: creating.employeeId,
        start: zonedToUtc(date, creating.time, timeZone).toISOString(),
        name: form.name,
        phone: form.phone,
        notes: form.notes,
      });
      if ("error" in res && res.error) return void toast.error(res.error);
      toast.success("Cita creada");
      setCreating(null);
      setForm({ ...form, name: "", phone: "", notes: "" });
      router.refresh();
    });
  };

  const dateTitle = new Date(`${date}T12:00:00Z`).toLocaleDateString("es-CO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

  if (staff.length === 0) {
    return (
      <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
        Aún no hay {terms.professionals} que atiendan citas. Actívalos en la pestaña “{terms.professionals[0].toUpperCase() + terms.professionals.slice(1)}”.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => go(addDays(date, -1))} aria-label="Día anterior"><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" onClick={() => go(today)} disabled={date === today}>Hoy</Button>
        <Button variant="outline" size="icon" onClick={() => go(addDays(date, 1))} aria-label="Día siguiente"><ChevronRight className="h-4 w-4" /></Button>
        <Input type="date" value={date} onChange={(e) => e.target.value && go(e.target.value)} className="w-auto" aria-label="Ir a fecha" />
        <h2 className="ml-1 text-lg font-semibold first-letter:uppercase">{dateTitle}</h2>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">{active.length} citas</Badge>
          <Badge variant="secondary">{fmt(expected)} esperado</Badge>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} /> Ver canceladas
          </label>
          <Button onClick={() => setCreating({ employeeId: staff[0].id, time: "10:00" })}>
            <Plus className="mr-1 h-4 w-4" /> Nueva cita
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <div className="grid min-w-[640px]" style={{ gridTemplateColumns: `56px repeat(${staff.length}, minmax(160px, 1fr))` }}>
          <div className="sticky left-0 z-10 border-b bg-card" />
          {staff.map((s) => (
            <div key={s.id} className="border-b border-l px-3 py-2 text-sm font-semibold truncate">{s.name}</div>
          ))}

          {/* Hour labels */}
          <div className="relative sticky left-0 z-10 bg-card" style={{ height }}>
            {Array.from({ length: (endMin - startMin) / 60 + 1 }, (_, i) => (
              <span key={i} className="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums" style={{ top: i * 60 * PX_PER_MIN }}>
                {String((startMin / 60) + i).padStart(2, "0")}:00
              </span>
            ))}
          </div>

          {staff.map((s) => (
            <div key={s.id} className="relative border-l bg-muted/40" style={{ height }}>
              {/* Working hours (lighter) — click to book there */}
              {s.schedule[day].map((r) => (
                <button
                  key={r.start}
                  type="button"
                  aria-label={`Crear cita con ${s.name}`}
                  className="absolute inset-x-0 bg-card hover:bg-accent/30 transition-colors"
                  style={{ top: (toMin(r.start) - startMin) * PX_PER_MIN, height: (toMin(r.end) - toMin(r.start)) * PX_PER_MIN }}
                  onClick={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const minutes = toMin(r.start) + Math.floor((e.clientY - rect.top) / PX_PER_MIN / 15) * 15;
                    setCreating({ employeeId: s.id, time: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}` });
                  }}
                />
              ))}
              {/* Hour lines */}
              {Array.from({ length: (endMin - startMin) / 60 }, (_, i) => (
                <div key={i} className="pointer-events-none absolute inset-x-0 border-t border-border/60" style={{ top: i * 60 * PX_PER_MIN }} />
              ))}
              {visible.filter((a) => a.employeeId === s.id).map((a) => {
                const top = (toMin(localTime(new Date(a.start), timeZone)) - startMin) * PX_PER_MIN;
                const h = Math.max(22, ((new Date(a.end).getTime() - new Date(a.start).getTime()) / 60000) * PX_PER_MIN - 2);
                const st = STATUS_STYLE[a.status] ?? STATUS_STYLE.confirmed;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelected(a)}
                    className={`absolute inset-x-1 overflow-hidden rounded-md border-l-4 px-2 py-1 text-left text-xs shadow-sm ${st.className}`}
                    style={{ top: top + 1, height: h }}
                  >
                    <span className="block font-semibold truncate">{localTime(new Date(a.start), timeZone)} · {a.customerName}</span>
                    {h > 34 && <span className="block truncate text-muted-foreground">{a.serviceName}</span>}
                    {a.source === "web" && h > 50 && <Globe className="absolute right-1.5 top-1.5 h-3 w-3 opacity-60" aria-label="Agendada en línea" />}
                  </button>
                );
              })}
              {nowMin != null && nowMin >= startMin && nowMin <= endMin && (
                <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-[var(--destructive)]" style={{ top: (nowMin - startMin) * PX_PER_MIN }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Appointment detail */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-[440px]">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.customerName}</DialogTitle>
                <DialogDescription>
                  {selected.serviceName} · {localTime(new Date(selected.start), timeZone)}–{localTime(new Date(selected.end), timeZone)}
                  {selected.price != null && ` · ${fmt(selected.price)}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{(STATUS_STYLE[selected.status] ?? STATUS_STYLE.confirmed).label}</Badge>
                  {selected.source === "web" && <Badge variant="outline"><Globe className="mr-1 h-3 w-3" /> Agendada en línea</Badge>}
                </div>
                {selected.notes && <p className="rounded-md bg-muted p-2 text-muted-foreground">“{selected.notes}”</p>}
                {selected.customerPhone && (
                  <a
                    className="inline-flex items-center gap-1.5 text-[var(--accent)] font-medium"
                    href={`https://wa.me/${selected.customerPhone.replace(/\D/g, "").replace(/^(?!57)(\d{10})$/, "57$1")}?text=${encodeURIComponent(`Hola ${selected.customerName.split(" ")[0]}, te recordamos tu cita de ${selected.serviceName ?? ""} el ${dateTitle} a las ${localTime(new Date(selected.start), timeZone)}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-4 w-4" /> Recordar por WhatsApp ({selected.customerPhone})
                  </a>
                )}
              </div>
              {(selected.status === "confirmed" || selected.status === "pending") && (
                <div className="space-y-2 rounded-lg border p-3">
                  <Label htmlFor="pay-method">Atender y cobrar</Label>
                  <div className="flex gap-2">
                    <select id="pay-method" className={selectClass} value={payment} onChange={(e) => setPayment(e.target.value)}>
                      <option value="cash">Efectivo</option>
                      <option value="card">Tarjeta</option>
                      <option value="transfer">Transferencia</option>
                    </select>
                    <Button onClick={() => runStatus("completed", true)} disabled={isPending}>
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="mr-1 h-4 w-4" />} Cobrar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Registra la venta en caja y en el historial del cliente.</p>
                </div>
              )}
              <DialogFooter className="flex-wrap gap-2 sm:justify-start">
                {selected.status === "pending" && <Button variant="outline" onClick={() => runStatus("confirmed")} disabled={isPending}>Confirmar</Button>}
                {(selected.status === "confirmed" || selected.status === "pending") && (
                  <>
                    <Button variant="outline" onClick={() => runStatus("completed")} disabled={isPending}>Atendida sin cobro</Button>
                    <Button variant="outline" onClick={() => runStatus("no_show")} disabled={isPending}>No asistió</Button>
                    <Button variant="destructive" onClick={() => runStatus("cancelled")} disabled={isPending}>Cancelar cita</Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New appointment */}
      <Dialog open={!!creating} onOpenChange={(o) => !o && setCreating(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Nueva cita</DialogTitle>
            <DialogDescription className="first-letter:uppercase">{dateTitle}</DialogDescription>
          </DialogHeader>
          {creating && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="na-service">Servicio</Label>
                <select id="na-service" className={selectClass} value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
                  {services.map((sv) => (
                    <option key={sv.id} value={sv.id}>{sv.name} · {sv.durationMinutes} min · {fmt(sv.price)}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="na-staff">{terms.professional[0].toUpperCase() + terms.professional.slice(1)}</Label>
                  <select id="na-staff" className={selectClass} value={creating.employeeId} onChange={(e) => setCreating({ ...creating, employeeId: e.target.value })}>
                    {staff.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="na-time">Hora</Label>
                  <Input id="na-time" type="time" step={300} value={creating.time} onChange={(e) => setCreating({ ...creating, time: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="na-name">Cliente</Label>
                <Input id="na-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre del cliente" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="na-phone">Celular (opcional)</Label>
                <Input id="na-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="na-notes">Nota (opcional)</Label>
                <Input id="na-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(null)}>Cancelar</Button>
            <Button onClick={create} disabled={isPending || !form.name.trim() || !form.serviceId}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Crear cita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
