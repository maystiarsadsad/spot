"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteGymClass, saveGymClass, setClassBookingStatus, type GymClassInput } from "@/lib/actions/members";

export interface ClassRow {
  id: string;
  name: string;
  itemId: string | null;
  instructorId: string | null;
  instructor: string | null;
  weekday: number;
  startTime: string;
  durationMinutes: number;
  capacity: number;
}

export interface SessionRow {
  classId: string;
  date: string;
  start: string;
  name: string;
  capacity: number;
  attendees: { bookingId: string; name: string; status: string }[];
}

interface Props {
  businessId: string;
  classes: ClassRow[];
  sessions: SessionRow[];
  instructors: { id: string; name: string }[];
  services: { id: string; name: string }[];
}

const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const selectClass = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";
const empty: GymClassInput = { name: "", weekday: 1, startTime: "18:00", durationMinutes: 60, capacity: 20, itemId: null, instructorId: null };
const dayLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("es-CO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "short" });

export function ClassesPanel({ businessId, classes, sessions, instructors, services }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<GymClassInput | null>(null);
  const [openSession, setOpenSession] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ error?: string } | { success: boolean }>, ok?: string) =>
    startTransition(async () => {
      const res = await fn();
      if ("error" in res && res.error) return void toast.error(res.error);
      if (ok) toast.success(ok);
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Horario semanal</CardTitle>
          <Button onClick={() => setEditing({ ...empty })}><Plus className="mr-1 h-4 w-4" /> Nueva clase</Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {WEEKDAYS.map((label, i) => {
              const list = classes.filter((c) => c.weekday === i + 1);
              return (
                <div key={label} className="rounded-lg border p-2">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                  {list.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                  <ul className="space-y-1.5">
                    {list.map((c) => (
                      <li key={c.id} className="group rounded-md bg-muted/60 px-2 py-1.5 text-xs">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold tabular-nums">{c.startTime}</span>
                          <span className="flex gap-0.5 opacity-60 group-hover:opacity-100">
                            <button type="button" aria-label={`Editar ${c.name}`} onClick={() => setEditing({ id: c.id, name: c.name, itemId: c.itemId, instructorId: c.instructorId, weekday: c.weekday, startTime: c.startTime, durationMinutes: c.durationMinutes, capacity: c.capacity })}>
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button type="button" aria-label={`Quitar ${c.name}`} onClick={() => confirm(`¿Quitar ${c.name} del horario?`) && run(() => deleteGymClass(businessId, c.id), "Clase quitada")}>
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </span>
                        </div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-muted-foreground">{c.durationMinutes} min · {c.capacity} cupos{c.instructor ? ` · ${c.instructor}` : ""}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Próximas clases y asistencia</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {sessions.length === 0 && <p className="text-sm text-muted-foreground">No hay clases en los próximos días.</p>}
          {sessions.map((s) => {
            const key = `${s.classId}|${s.date}`;
            const taken = s.attendees.filter((a) => a.status === "booked" || a.status === "attended").length;
            const open = openSession === key;
            return (
              <div key={key} className="rounded-lg border">
                <button type="button" className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm" onClick={() => setOpenSession(open ? null : key)} aria-expanded={open}>
                  <span><span className="font-semibold first-letter:uppercase">{dayLabel(s.date)}</span> · {s.start} · {s.name}</span>
                  <Badge variant={taken >= s.capacity ? "destructive" : "secondary"}>{taken}/{s.capacity}</Badge>
                </button>
                {open && (
                  <ul className="divide-y border-t text-sm">
                    {s.attendees.length === 0 && <li className="px-3 py-2 text-muted-foreground">Nadie ha reservado.</li>}
                    {s.attendees.map((a) => (
                      <li key={a.bookingId} className="flex items-center justify-between gap-2 px-3 py-1.5">
                        <span className={a.status === "cancelled" ? "line-through text-muted-foreground" : ""}>{a.name}</span>
                        <span className="flex items-center gap-1">
                          {a.status === "attended" && <Badge variant="secondary">Asistió</Badge>}
                          {a.status === "no_show" && <Badge variant="destructive">No vino</Badge>}
                          {a.status === "booked" && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => run(() => setClassBookingStatus(businessId, a.bookingId, "attended"))} aria-label={`${a.name} asistió`}><Check className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => run(() => setClassBookingStatus(businessId, a.bookingId, "no_show"))} aria-label={`${a.name} no vino`}><X className="h-4 w-4" /></Button>
                            </>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar clase" : "Nueva clase"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="gc-name">Nombre</Label>
                <Input id="gc-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Ej: Spinning" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="gc-day">Día</Label>
                  <select id="gc-day" className={selectClass} value={editing.weekday} onChange={(e) => setEditing({ ...editing, weekday: Number(e.target.value) })}>
                    {WEEKDAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gc-time">Hora</Label>
                  <Input id="gc-time" type="time" step={300} value={editing.startTime} onChange={(e) => setEditing({ ...editing, startTime: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gc-dur">Duración (min)</Label>
                  <Input id="gc-dur" type="number" min={10} max={480} value={editing.durationMinutes} onChange={(e) => setEditing({ ...editing, durationMinutes: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gc-cap">Cupos</Label>
                  <Input id="gc-cap" type="number" min={1} max={500} value={editing.capacity} onChange={(e) => setEditing({ ...editing, capacity: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gc-inst">Instructor</Label>
                <select id="gc-inst" className={selectClass} value={editing.instructorId ?? ""} onChange={(e) => setEditing({ ...editing, instructorId: e.target.value || null })}>
                  <option value="">Sin asignar</option>
                  {instructors.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {services.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="gc-item">Servicio del catálogo (opcional)</Label>
                  <select id="gc-item" className={selectClass} value={editing.itemId ?? ""} onChange={(e) => setEditing({ ...editing, itemId: e.target.value || null })}>
                    <option value="">Ninguno</option>
                    {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button
              disabled={isPending || !editing?.name.trim()}
              onClick={() => editing && run(async () => {
                const res = await saveGymClass(businessId, editing);
                if ("success" in res) setEditing(null);
                return res;
              }, "Clase guardada")}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
