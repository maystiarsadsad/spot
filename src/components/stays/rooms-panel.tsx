"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addRoomsBulk, deleteRoom, saveRoomTypeRate } from "@/lib/actions/stays";
import type { RoomRow, RoomTypeRow } from "./types";

interface Props {
  businessId: string;
  roomTypes: RoomTypeRow[];
  rooms: RoomRow[];
  isHostel: boolean;
}

export function RoomsPanel({ businessId, roomTypes, rooms, isHostel }: Props) {
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
    <div className="grid gap-4 lg:grid-cols-2">
      {roomTypes.map((t) => (
        <TypeCard key={t.id} businessId={businessId} type={t} rooms={rooms.filter((r) => r.itemId === t.id)} isHostel={isHostel} />
      ))}
    </div>
  );
}

function TypeCard({ businessId, type, rooms, isHostel }: { businessId: string; type: RoomTypeRow; rooms: RoomRow[]; isHostel: boolean }) {
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
              {r.name}
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
