"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BedDouble, LogIn, LogOut, Moon, Sparkles, Wrench } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils";
import { HOUSEKEEPING_LABELS, nightsCount } from "@/lib/stays/pricing";
import { setHousekeeping } from "@/lib/actions/stays";
import { balanceOf, shortDate, type RoomRow, type RoomTypeRow, type StayRow } from "./types";

interface Props {
  stays: StayRow[];
  rooms: RoomRow[];
  roomTypes: RoomTypeRow[];
  currency: string;
  today: string;
  onOpen: (stay: StayRow) => void;
}

const HK_STYLE: Record<string, string> = {
  clean: "border-emerald-500/40 bg-emerald-500/10",
  inspected: "border-sky-500/40 bg-sky-500/10",
  dirty: "border-amber-500/50 bg-amber-500/15",
  maintenance: "border-zinc-500/40 bg-zinc-500/15 opacity-70",
};

export function FrontDesk({ stays, rooms, roomTypes, currency, today, onOpen }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const roomName = (id: string | null) => rooms.find((r) => r.id === id)?.name ?? null;
  const typeName = (id: string | null) => roomTypes.find((t) => t.id === id)?.name ?? "Habitación";

  const arrivals = stays.filter((s) => ["pending", "confirmed"].includes(s.status) && s.checkIn <= today).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const departures = stays.filter((s) => s.status === "checked_in" && s.checkOut <= today);
  const inHouse = stays.filter((s) => s.status === "checked_in" && s.checkOut > today).sort((a, b) => (roomName(a.roomId) ?? "").localeCompare(roomName(b.roomId) ?? "", "es", { numeric: true }));
  const occupantOf = new Map(stays.filter((s) => s.status === "checked_in").map((s) => [s.roomId, s]));
  const arrivingRoom = new Set(arrivals.map((s) => s.roomId));

  const setHk = (roomId: string, status: "clean" | "dirty" | "inspected" | "maintenance") =>
    startTransition(async () => {
      const res = await setHousekeeping(roomId, status);
      if ("error" in res && res.error) return void toast.error(res.error);
      router.refresh();
    });

  const row = (s: StayRow, hint: React.ReactNode) => {
    const balance = balanceOf(s);
    return (
      <button key={s.id} type="button" onClick={() => onOpen(s)} className="flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-muted">
        <span className="flex h-9 min-w-9 items-center justify-center rounded-md bg-muted px-1.5 text-xs font-semibold">{roomName(s.roomId) ?? "—"}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{s.guestName}</span>
          <span className="block truncate text-xs text-muted-foreground">{typeName(s.itemId)} · {hint}</span>
        </span>
        {balance > 0 ? <Badge variant="outline" className="border-amber-500/50 text-amber-600">{formatCurrency(balance, currency)}</Badge> : <Badge variant="secondary">Pagado</Badge>}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><LogIn className="h-4 w-4" /> Llegadas ({arrivals.length})</CardTitle>
            <CardDescription>Confirma documento y entrega la llave.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {arrivals.length === 0 && <p className="text-sm text-muted-foreground">No hay llegadas pendientes hoy.</p>}
            {arrivals.map((s) => (
              row(s, 
                  s.checkIn < today ? (
                    <span className="text-destructive">debía llegar el {shortDate(s.checkIn)}</span>
                  ) : (
                    <>
                      {nightsCount(s.checkIn, s.checkOut)} noches{s.arrivalTime ? ` · llega ${s.arrivalTime}` : ""}{s.status === "pending" ? " · por confirmar" : ""}
                    </>
                  )
              )
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><LogOut className="h-4 w-4" /> Salidas ({departures.length})</CardTitle>
            <CardDescription>Cobra el saldo y libera la habitación.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {departures.length === 0 && <p className="text-sm text-muted-foreground">No hay salidas pendientes.</p>}
            {departures.map((s) => (
              row(s, s.checkOut < today ? <span className="text-destructive">debía salir el {shortDate(s.checkOut)}</span> : `llegó el ${shortDate(s.checkIn)}`)
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Moon className="h-4 w-4" /> En casa ({inHouse.length})</CardTitle>
            <CardDescription>Huéspedes que siguen esta noche.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[420px] space-y-2 overflow-y-auto">
            {inHouse.length === 0 && <p className="text-sm text-muted-foreground">No hay huéspedes en casa.</p>}
            {inHouse.map((s) => (
              row(s, `sale el ${shortDate(s.checkOut)}`)
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> Habitaciones y limpieza</CardTitle>
          <CardDescription>
            Toca una habitación para cambiar su estado. Al hacer check-out queda &quot;por limpiar&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            {Object.entries(HOUSEKEEPING_LABELS).map(([k, v]) => (
              <span key={k} className={`rounded-full border px-2 py-0.5 ${HK_STYLE[k]}`}>{v} · {rooms.filter((r) => r.active && r.housekeeping === k).length}</span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {rooms.filter((r) => r.active).map((r) => {
              const guest = occupantOf.get(r.id);
              return (
                <DropdownMenu key={r.id}>
                  <DropdownMenuTrigger disabled={isPending} className={`rounded-md border p-2 text-left text-xs transition-colors hover:ring-1 hover:ring-ring ${HK_STYLE[r.housekeeping] ?? ""}`}>
                    <span className="flex items-center justify-between gap-1">
                      <strong className="text-sm">{r.name}</strong>
                      {r.housekeeping === "maintenance" ? <Wrench className="h-3.5 w-3.5" /> : guest ? <BedDouble className="h-3.5 w-3.5" /> : null}
                    </span>
                    <span className="block truncate text-muted-foreground">{typeName(r.itemId)}</span>
                    <span className="block truncate">{guest ? guest.guestName : arrivingRoom.has(r.id) ? "Llega hoy" : "Libre"}</span>
                    <span className="block font-medium">{HOUSEKEEPING_LABELS[r.housekeeping]}</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Habitación {r.name}</DropdownMenuLabel>
                    {(["clean", "inspected", "dirty", "maintenance"] as const).map((k) => (
                      <DropdownMenuItem key={k} disabled={r.housekeeping === k} onClick={() => setHk(r.id, k)}>
                        {HOUSEKEEPING_LABELS[k]}
                      </DropdownMenuItem>
                    ))}
                    {guest && <DropdownMenuItem onClick={() => onOpen(guest)}>Ver cuenta de {guest.guestName.split(" ")[0]}</DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
