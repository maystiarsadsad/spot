"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CalendarSync, Copy, Link2, Loader2, Plus, RefreshCw, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addRoomCalendar, addRoomsBulk, deleteRoom, removeRoomCalendar, saveRoomTypeRate, syncChannelsNow } from "@/lib/actions/stays";
import { CHANNEL_LABELS } from "@/lib/stays/ical";
import { selectClass, type CalendarLink, type RoomRow, type RoomTypeRow } from "./types";

interface Props {
  businessId: string;
  roomTypes: RoomTypeRow[];
  rooms: RoomRow[];
  isHostel: boolean;
  calendars: CalendarLink[];
  siteUrl: string;
}

export function RoomsPanel({ businessId, roomTypes, rooms, isHostel, calendars, siteUrl }: Props) {
  const [channelRoomId, setChannelRoomId] = useState<string | null>(null);
  const channelRoom = rooms.find((r) => r.id === channelRoomId) ?? null;
  if (roomTypes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Primero crea tus tipos de habitación</CardTitle>
          <CardDescription>
            En <Link className="underline" href="/d/catalog">Catálogo</Link> agrega cada tipo (Estándar, Suite, Cama en dormitorio…) con tipo &quot;Habitación&quot;, su precio por noche y capacidad. Luego vuelve aquí para crear las habitaciones físicas.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      <ChannelsSummary businessId={businessId} calendars={calendars} rooms={rooms} />
      <div className="grid gap-4 lg:grid-cols-2">
        {roomTypes.map((t) => (
          <TypeCard
            key={t.id}
            businessId={businessId}
            type={t}
            rooms={rooms.filter((r) => r.itemId === t.id)}
            isHostel={isHostel}
            calendars={calendars}
            onChannels={setChannelRoomId}
          />
        ))}
      </div>
      <ChannelsDialog room={channelRoom} calendars={calendars.filter((c) => c.roomId === channelRoomId)} siteUrl={siteUrl} onClose={() => setChannelRoomId(null)} />
    </div>
  );
}

const ago = (iso: string | null) => {
  if (!iso) return "nunca";
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return min < 1 ? "hace un momento" : min < 60 ? `hace ${min} min` : min < 1440 ? `hace ${Math.round(min / 60)} h` : `hace ${Math.round(min / 1440)} días`;
};

/** Airbnb / Booking.com connection status for the whole property. */
function ChannelsSummary({ businessId, calendars, rooms }: { businessId: string; calendars: CalendarLink[]; rooms: RoomRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const problems = calendars.filter((c) => c.lastError);
  const connectedRooms = new Set(calendars.map((c) => c.roomId)).size;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><CalendarSync className="h-4 w-4" /> Airbnb y Booking.com</CardTitle>
        <CardDescription>
          Sincroniza la disponibilidad de cada habitación por calendario (iCal): lo que se reserve allá se bloquea aquí, y lo que se reserve aquí se bloquea allá.
          Toca una habitación para conectarla. Se actualiza cada vez que alguien abre tu página o este panel (máximo cada 10 min) y una vez al día.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>{connectedRooms} de {rooms.filter((r) => r.active).length} habitaciones conectadas · {calendars.length} calendarios</span>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending || calendars.length === 0}
            onClick={() =>
              startTransition(async () => {
                const res = await syncChannelsNow(businessId);
                if ("error" in res && res.error) return void toast.error(res.error);
                if ("added" in res) toast.success(`Sincronizado: ${res.added} nuevas, ${res.cancelled} canceladas${res.problems ? ` · ${res.problems} con problemas` : ""}`);
                router.refresh();
              })
            }
          >
            {isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />} Sincronizar ahora
          </Button>
        </div>
        {problems.map((c) => (
          <p key={c.id} className="flex items-start gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span><strong>{rooms.find((r) => r.id === c.roomId)?.name} · {CHANNEL_LABELS[c.channel]}:</strong> {c.lastError}</span>
          </p>
        ))}
        <p className="text-xs text-muted-foreground">
          La sincronización por calendario puede tardar en llegar a Airbnb y Booking (ellos la leen cada cierto tiempo), así que existe un pequeño riesgo de sobreventa. Booking.com solo la ofrece cuando cada tipo de habitación tiene una unidad.
        </p>
      </CardContent>
    </Card>
  );
}

function ChannelsDialog({ room, calendars, siteUrl, onClose }: { room: RoomRow | null; calendars: CalendarLink[]; siteUrl: string; onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState("");
  const [channel, setChannel] = useState<"auto" | "airbnb" | "booking" | "other">("auto");
  const exportUrl = room ? `${siteUrl}/api/ical/${room.icalToken}.ics` : "";

  return (
    <Dialog open={Boolean(room)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Canales · {room?.name}</DialogTitle>
          <DialogDescription>Conecta esta habitación con su anuncio en Airbnb o Booking.com.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="space-y-1.5">
            <p className="font-medium">1. Pega este enlace en Airbnb / Booking (importar calendario)</p>
            <div className="flex gap-2">
              <Input readOnly value={exportUrl} aria-label="Enlace de exportación" onFocus={(e) => e.target.select()} />
              <Button variant="outline" size="icon" aria-label="Copiar enlace" onClick={() => navigator.clipboard.writeText(exportUrl).then(() => toast.success("Enlace copiado"))}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Airbnb: Calendario → Disponibilidad → Conectar calendarios → Importar. Booking.com: Tarifas y disponibilidad → Sincronizar calendarios → Importar.
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-medium">2. Trae aquí el calendario de Airbnb / Booking (exportar calendario)</p>
            {calendars.length === 0 && <p className="text-xs text-muted-foreground">Aún no hay calendarios conectados a esta habitación.</p>}
            {calendars.map((c) => (
              <div key={c.id} className="flex items-start gap-2 rounded-md border px-3 py-2">
                <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{CHANNEL_LABELS[c.channel]}</p>
                  <p className="truncate text-xs text-muted-foreground" title={c.url}>{c.url}</p>
                  <p className={`text-xs ${c.lastError ? "text-amber-600" : "text-muted-foreground"}`}>
                    Última sincronización {ago(c.lastSyncedAt)}{c.lastError ? ` · ${c.lastError}` : ""}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Desconectar ${CHANNEL_LABELS[c.channel]}`}
                  disabled={isPending}
                  onClick={() =>
                    confirm(`¿Desconectar ${CHANNEL_LABELS[c.channel]}? Las noches futuras que traía se liberan.`) &&
                    startTransition(async () => {
                      const res = await removeRoomCalendar(c.id);
                      if ("error" in res && res.error) return void toast.error(res.error);
                      toast.success("Canal desconectado");
                      router.refresh();
                    })
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Input className="min-w-[220px] flex-1" placeholder="https://www.airbnb.com/calendar/ical/…" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Enlace del calendario del canal" />
              <select className={`${selectClass} w-36`} value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)} aria-label="Canal">
                <option value="auto">Detectar</option>
                <option value="airbnb">Airbnb</option>
                <option value="booking">Booking.com</option>
                <option value="other">Otro</option>
              </select>
              <Button
                disabled={isPending || !url.trim() || !room}
                onClick={() =>
                  room &&
                  startTransition(async () => {
                    const res = await addRoomCalendar(room.id, url, channel === "auto" ? undefined : channel);
                    if ("error" in res && res.error) return void toast.error(res.error);
                    if ("warning" in res && res.warning) toast.warning(res.warning);
                    else toast.success(`Conectado: ${"added" in res ? res.added : 0} reservas importadas`);
                    setUrl("");
                    router.refresh();
                  })
                }
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conectar"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TypeCard({
  businessId,
  type,
  rooms,
  isHostel,
  calendars,
  onChannels,
}: {
  businessId: string;
  type: RoomTypeRow;
  rooms: RoomRow[];
  isHostel: boolean;
  calendars: CalendarLink[];
  onChannels: (roomId: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rate, setRate] = useState({ price: String(type.price), capacity: String(type.capacity) });
  const [bulk, setBulk] = useState({ spec: "", floor: "" });
  const active = rooms.filter((r) => r.active);

  const run = (fn: () => Promise<{ error?: string } | { success: boolean }>, ok: string) =>
    startTransition(async () => {
      const res = await fn();
      if ("error" in res && res.error) return void toast.error(res.error);
      toast.success(ok);
      router.refresh();
    });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{type.name}</CardTitle>
        <CardDescription>{active.length} {isHostel ? "camas / habitaciones" : "habitaciones"} activas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor={`p-${type.id}`}>Tarifa base por noche</Label>
            <Input id={`p-${type.id}`} type="number" min={0} className="w-36" value={rate.price} onChange={(e) => setRate({ ...rate, price: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`c-${type.id}`}>Capacidad</Label>
            <Input id={`c-${type.id}`} type="number" min={1} max={30} className="w-20" value={rate.capacity} onChange={(e) => setRate({ ...rate, capacity: e.target.value })} />
          </div>
          <Button
            variant="outline"
            disabled={isPending || (rate.price === String(type.price) && rate.capacity === String(type.capacity))}
            onClick={() => run(() => saveRoomTypeRate(businessId, type.id, Number(rate.price), Number(rate.capacity)), "Tarifa guardada")}
          >
            Guardar
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {active.length === 0 && <p className="text-sm text-muted-foreground">Sin habitaciones. Agrégalas abajo.</p>}
          {active.map((r) => (
            <span key={r.id} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
              <button type="button" className="inline-flex items-center gap-1 hover:underline" title="Conectar con Airbnb / Booking" onClick={() => onChannels(r.id)}>
                {r.name}
                {calendars.some((c) => c.roomId === r.id) && (
                  <CalendarSync className={`h-3 w-3 ${calendars.some((c) => c.roomId === r.id && c.lastError) ? "text-amber-500" : "text-emerald-600"}`} />
                )}
              </button>
              {r.floor && <span className="text-muted-foreground">· {r.floor}</span>}
              <button
                type="button"
                aria-label={`Quitar ${r.name}`}
                className="text-muted-foreground hover:text-destructive"
                disabled={isPending}
                onClick={() =>
                  confirm(`¿Quitar ${r.name}? Si tiene reservas en el historial solo se desactiva.`) &&
                  run(() => deleteRoom(r.id), `${r.name} quitada`)
                }
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[160px] flex-1 space-y-1.5">
            <Label htmlFor={`b-${type.id}`}>Agregar</Label>
            <Input id={`b-${type.id}`} placeholder={isHostel ? "Cama 1-8 o 1-8" : "201-210 o 301, 302"} value={bulk.spec} onChange={(e) => setBulk({ ...bulk, spec: e.target.value })} />
          </div>
          <div className="w-28 space-y-1.5">
            <Label htmlFor={`f-${type.id}`}>Piso</Label>
            <Input id={`f-${type.id}`} placeholder="Opcional" value={bulk.floor} onChange={(e) => setBulk({ ...bulk, floor: e.target.value })} />
          </div>
          <Button
            disabled={isPending || !bulk.spec.trim()}
            onClick={() =>
              startTransition(async () => {
                const res = await addRoomsBulk(businessId, type.id, bulk.spec, bulk.floor);
                if ("error" in res && res.error) return void toast.error(res.error);
                toast.success(`${"count" in res ? res.count : ""} agregadas`);
                setBulk({ spec: "", floor: "" });
                router.refresh();
              })
            }
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
