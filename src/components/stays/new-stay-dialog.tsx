"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { addDays } from "@/lib/booking/availability";
import { nightlyRates, nightsCount, sumNights, type StaySettings } from "@/lib/stays/pricing";
import { createDeskStay } from "@/lib/actions/stays";
import { PAYMENT_LABELS, selectClass, type RoomRow, type RoomTypeRow, type SeasonRow, type StayRow } from "./types";

export interface NewStayPrefill {
  itemId?: string;
  roomId?: string;
  checkIn?: string;
}

interface Props {
  prefill: NewStayPrefill | null;
  onClose: () => void;
  businessId: string;
  currency: string;
  today: string;
  roomTypes: RoomTypeRow[];
  rooms: RoomRow[];
  stays: StayRow[];
  seasons: SeasonRow[];
  settings: StaySettings;
}

export function NewStayDialog(props: Props) {
  return (
    <Dialog open={Boolean(props.prefill)} onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        {props.prefill && <NewStayForm key={JSON.stringify(props.prefill)} {...props} prefill={props.prefill} />}
      </DialogContent>
    </Dialog>
  );
}

function NewStayForm({ prefill, onClose, businessId, currency, today, roomTypes, rooms, stays, seasons, settings }: Props & { prefill: NewStayPrefill }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const presetRoom = rooms.find((r) => r.id === prefill.roomId);
  const checkIn0 = prefill.checkIn ?? today;
  const [form, setForm] = useState({
    itemId: presetRoom?.itemId ?? prefill.itemId ?? roomTypes[0]?.id ?? "",
    roomId: presetRoom?.id ?? "",
    checkIn: checkIn0,
    checkOut: addDays(checkIn0, 1),
    name: "",
    phone: "",
    email: "",
    adults: "2",
    children: "0",
    source: "desk" as "desk" | "phone" | "ota",
    agreed: "",
    deposit: "",
    method: "transfer",
    notes: "",
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const fmt = (n: number) => formatCurrency(n, currency);
  const type = roomTypes.find((t) => t.id === form.itemId);
  const nights = nightsCount(form.checkIn, form.checkOut);

  const quote = useMemo(() => {
    if (!type || nights === 0) return null;
    const rates = nightlyRates({ basePrice: type.price, itemId: type.id, checkIn: form.checkIn, checkOut: form.checkOut, seasons, settings });
    return { total: sumNights(rates), season: rates.find((r) => r.season)?.season ?? null };
  }, [type, nights, form.checkIn, form.checkOut, seasons, settings]);

  const freeRooms = useMemo(() => {
    if (nights === 0) return [];
    const busy = new Set(
      stays
        .filter((s) => s.roomId && ["pending", "confirmed", "checked_in"].includes(s.status) && s.checkIn < form.checkOut && s.checkOut > form.checkIn)
        .map((s) => s.roomId)
    );
    return rooms.filter((r) => r.itemId === form.itemId && r.active && r.housekeeping !== "maintenance" && !busy.has(r.id));
  }, [rooms, stays, form.itemId, form.checkIn, form.checkOut, nights]);

  const submit = () =>
    startTransition(async () => {
      const res = await createDeskStay(businessId, {
        itemId: form.itemId,
        roomId: form.roomId || null,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        name: form.name,
        phone: form.phone,
        email: form.email,
        adults: Number(form.adults),
        children: Number(form.children),
        source: form.source,
        notes: form.notes,
        totalOverride: form.agreed ? Number(form.agreed) : null,
        deposit: Number(form.deposit) > 0 ? { amount: Number(form.deposit), method: form.method } : null,
      });
      if ("error" in res && res.error) return void toast.error(res.error);
      toast.success(`Reserva creada para ${form.name}`);
      onClose();
      router.refresh();
    });

  const roomStillFree = !form.roomId || freeRooms.some((r) => r.id === form.roomId);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nueva reserva</DialogTitle>
        <DialogDescription>Para reservas por teléfono, WhatsApp, Booking o clientes en recepción.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ns-in">Llegada</Label>
            <Input id="ns-in" type="date" value={form.checkIn} onChange={(e) => set({ checkIn: e.target.value, ...(e.target.value >= form.checkOut ? { checkOut: addDays(e.target.value, 1) } : {}) })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ns-out">Salida</Label>
            <Input id="ns-out" type="date" min={addDays(form.checkIn, 1)} value={form.checkOut} onChange={(e) => set({ checkOut: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ns-type">Tipo</Label>
            <select id="ns-type" className={selectClass} value={form.itemId} onChange={(e) => set({ itemId: e.target.value, roomId: "" })}>
              {roomTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ns-room">Habitación</Label>
            <select id="ns-room" className={selectClass} value={form.roomId} onChange={(e) => set({ roomId: e.target.value })}>
              <option value="">Automática ({freeRooms.length} libres)</option>
              {freeRooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              {form.roomId && !roomStillFree && <option value={form.roomId}>{rooms.find((r) => r.id === form.roomId)?.name} (ocupada)</option>}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ns-name">Huésped</Label>
          <Input id="ns-name" placeholder="Nombre completo" value={form.name} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input type="tel" placeholder="Celular" aria-label="Celular" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
          <Input type="email" placeholder="Correo (opcional)" aria-label="Correo" value={form.email} onChange={(e) => set({ email: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ns-ad">Adultos</Label>
            <Input id="ns-ad" type="number" min={1} max={type?.capacity ?? 10} value={form.adults} onChange={(e) => set({ adults: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ns-ch">Niños</Label>
            <Input id="ns-ch" type="number" min={0} value={form.children} onChange={(e) => set({ children: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ns-src">Canal</Label>
            <select id="ns-src" className={selectClass} value={form.source} onChange={(e) => set({ source: e.target.value as typeof form.source })}>
              <option value="desk">Recepción</option>
              <option value="phone">Teléfono / WhatsApp</option>
              <option value="ota">Booking / Airbnb</option>
            </select>
          </div>
        </div>
        <div className="rounded-md bg-muted px-3 py-2 text-sm">
          {quote ? (
            <>
              Tarifa: <strong>{fmt(quote.total)}</strong> por {nights} {nights === 1 ? "noche" : "noches"}
              {quote.season && <span className="text-muted-foreground"> · {quote.season}</span>}
            </>
          ) : (
            "Elige fechas válidas"
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ns-agreed">Precio acordado (opcional)</Label>
            <Input id="ns-agreed" type="number" min={0} placeholder={quote ? String(quote.total) : ""} value={form.agreed} onChange={(e) => set({ agreed: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ns-dep">Anticipo recibido</Label>
            <div className="flex gap-2">
              <Input id="ns-dep" type="number" min={0} placeholder="0" value={form.deposit} onChange={(e) => set({ deposit: e.target.value })} />
              {Number(form.deposit) > 0 && (
                <select className={selectClass} value={form.method} onChange={(e) => set({ method: e.target.value })} aria-label="Medio del anticipo">
                  {Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              )}
            </div>
          </div>
        </div>
        <Input placeholder="Notas (peticiones, empresa para factura…)" aria-label="Notas" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
        {type && Number(form.adults) + Number(form.children) > type.capacity && (
          <p className="text-xs text-amber-600">{type.name} es para máximo {type.capacity} personas.</p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit} disabled={isPending || form.name.trim().length < 2 || !quote || freeRooms.length === 0 || !roomStillFree}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {freeRooms.length === 0 && quote ? "Sin habitaciones libres" : "Crear reserva"}
        </Button>
      </DialogFooter>
    </>
  );
}
