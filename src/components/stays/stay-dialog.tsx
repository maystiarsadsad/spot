"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BedDouble, Loader2, LogIn, LogOut, MessageCircle, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { nightsCount, STAY_STATUS_LABELS } from "@/lib/stays/pricing";
import {
  addStayCharge,
  addStayPayment,
  assignStayRoom,
  changeStayDates,
  checkInStay,
  checkOutStay,
  getStayFolio,
  removeStayCharge,
  setStayStatus,
} from "@/lib/actions/stays";
import { balanceOf, PAYMENT_LABELS, selectClass, shortDate, SOURCE_LABELS, type RoomRow, type RoomTypeRow, type ServiceOption, type StayRow } from "./types";

interface Props {
  stay: StayRow | null;
  onClose: () => void;
  stays: StayRow[];
  rooms: RoomRow[];
  roomTypes: RoomTypeRow[];
  services: ServiceOption[];
  currency: string;
  today: string;
  siteUrl: string;
  slug: string;
}

type Folio = Awaited<ReturnType<typeof getStayFolio>>;

const LIVE = ["pending", "confirmed", "checked_in"];

export function StayDialog(props: Props) {
  const { stay, onClose } = props;
  return (
    <Dialog open={Boolean(stay)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        {/* Remount on new data so every field starts from the fresh stay */}
        {stay && <StayBody key={`${stay.id}|${stay.paid}|${stay.extras}|${stay.status}|${stay.roomId}|${stay.checkOut}`} {...props} stay={stay} />}
      </DialogContent>
    </Dialog>
  );
}

function StayBody({ stay, onClose, stays, rooms, roomTypes, services, currency, today, siteUrl, slug }: Props & { stay: StayRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [folioData, setFolioData] = useState<Folio | null>(null);
  const [dates, setDates] = useState({ checkIn: stay.checkIn, checkOut: stay.checkOut, reprice: false });
  const [guest, setGuest] = useState({ document: stay.guestDocument ?? "", nationality: stay.guestNationality ?? "Colombia", phone: stay.guestPhone ?? "" });
  const [charge, setCharge] = useState({ itemId: "", description: "", price: "", quantity: "1" });
  const [payment, setPayment] = useState({ amount: String(Math.max(0, balanceOf(stay))), method: "card" });
  const [checkoutMethod, setCheckoutMethod] = useState("card");
  const fmt = (n: number) => formatCurrency(n, currency);

  useEffect(() => {
    let alive = true;
    getStayFolio(stay.id).then((f) => alive && setFolioData(f));
    return () => {
      alive = false;
    };
  }, [stay.id]);

  // Rooms free for this stay's nights (other live stays block them)
  const freeRooms = useMemo(() => {
    const busy = new Set(
      stays.filter((s) => s.id !== stay.id && s.roomId && LIVE.includes(s.status) && s.checkIn < stay.checkOut && s.checkOut > stay.checkIn).map((s) => s.roomId)
    );
    return rooms.filter((r) => r.active && r.housekeeping !== "maintenance" && !busy.has(r.id));
  }, [stay, stays, rooms]);

  const typeName = roomTypes.find((t) => t.id === stay.itemId)?.name ?? "Habitación";
  const roomName = rooms.find((r) => r.id === stay.roomId)?.name ?? null;
  const balance = balanceOf(stay);
  const nights = nightsCount(stay.checkIn, stay.checkOut);
  const live = LIVE.includes(stay.status);
  const wa = stay.guestPhone?.replace(/\D/g, "");
  const waNumber = wa && wa.length === 10 ? `57${wa}` : wa;
  const link = `${siteUrl}/${slug}/estadia/${stay.token}`;

  const run = (fn: () => Promise<{ error?: string } | { success: boolean }>, ok: string, close = false) =>
    startTransition(async () => {
      const res = await fn();
      if ("error" in res && res.error) return void toast.error(res.error);
      toast.success(ok);
      router.refresh();
      if (close) onClose();
      else getStayFolio(stay.id).then(setFolioData);
    });

  const pickService = (id: string) => {
    const s = services.find((x) => x.id === id);
    setCharge({ ...charge, itemId: id, description: s?.name ?? "", price: s ? String(s.price) : "" });
  };

  return (
    <>
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {stay.guestName}
            <Badge variant={stay.status === "checked_in" ? "default" : stay.status === "pending" ? "outline" : ["cancelled", "no_show"].includes(stay.status) ? "destructive" : "secondary"}>
              {STAY_STATUS_LABELS[stay.status] ?? stay.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {stay.code} · {typeName}{roomName ? ` · ${roomName}` : ""} · {SOURCE_LABELS[stay.source] ?? stay.source}
          </DialogDescription>
        </DialogHeader>

        {/* Stay */}
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Fechas</p>
            <p className="font-medium">{shortDate(stay.checkIn)} → {shortDate(stay.checkOut)} · {nights} {nights === 1 ? "noche" : "noches"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Huéspedes</p>
            <p className="font-medium">{stay.adults} {stay.adults === 1 ? "adulto" : "adultos"}{stay.children ? ` · ${stay.children} niños` : ""}{stay.arrivalTime ? ` · llega ${stay.arrivalTime}` : ""}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Contacto</p>
            <p className="font-medium">
              {stay.guestPhone ?? "Sin teléfono"}
              {waNumber && (
                <a className="ml-2 inline-flex items-center gap-1 text-xs text-primary underline" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hola ${stay.guestName.split(" ")[0]}, te escribimos sobre tu reserva ${stay.code} (${shortDate(stay.checkIn)} → ${shortDate(stay.checkOut)}). Aquí puedes verla: ${link}`)}`}>
                  <MessageCircle className="h-3 w-3" /> WhatsApp
                </a>
              )}
            </p>
            {stay.guestEmail && <p className="text-xs text-muted-foreground">{stay.guestEmail}</p>}
          </div>
          <div>
            <p className="text-muted-foreground">Documento</p>
            <p className="font-medium">{stay.guestDocument ? `${stay.guestDocument}${stay.guestNationality ? ` · ${stay.guestNationality}` : ""}` : "Se pide en el check-in"}</p>
          </div>
          {stay.notes && <p className="rounded-md bg-muted px-3 py-2 sm:col-span-2">📝 {stay.notes}</p>}
        </div>

        {live && (
          <>
            <Separator />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sd-room">{stay.roomId ? "Mover a habitación" : "Asignar habitación"}</Label>
                <select
                  id="sd-room"
                  className={selectClass}
                  value=""
                  disabled={isPending}
                  onChange={(e) => e.target.value && run(() => assignStayRoom(stay.id, e.target.value), "Habitación actualizada")}
                >
                  <option value="">{roomName ? `${roomName} (actual)` : "Elegir…"}</option>
                  {roomTypes.map((t) => {
                    const list = freeRooms.filter((r) => r.itemId === t.id && r.id !== stay.roomId);
                    if (!list.length) return null;
                    return (
                      <optgroup key={t.id} label={t.name}>
                        {list.map((r) => <option key={r.id} value={r.id}>{r.name}{r.housekeeping === "dirty" ? " · por limpiar" : ""}</option>)}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Cambiar fechas</Label>
                <div className="flex gap-2">
                  <Input type="date" aria-label="Llegada" value={dates.checkIn} disabled={stay.status === "checked_in"} onChange={(e) => setDates({ ...dates, checkIn: e.target.value })} />
                  <Input type="date" aria-label="Salida" value={dates.checkOut} onChange={(e) => setDates({ ...dates, checkOut: e.target.value })} />
                </div>
                {(dates.checkIn !== stay.checkIn || dates.checkOut !== stay.checkOut) && (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" checked={dates.reprice} onChange={(e) => setDates({ ...dates, reprice: e.target.checked })} />
                      Recalcular tarifa
                    </label>
                    <Button size="sm" disabled={isPending} onClick={() => run(() => changeStayDates(stay.id, dates.checkIn, dates.checkOut, dates.reprice), "Fechas actualizadas")}>
                      Guardar fechas
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Folio */}
        <Separator />
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Cuenta del huésped</p>
          <div className="flex justify-between"><span>Alojamiento · {nights} {nights === 1 ? "noche" : "noches"}</span><span>{fmt(stay.roomTotal)}</span></div>
          {folioData?.charges?.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2">
              <span>{c.quantity > 1 ? `${c.quantity} × ` : ""}{c.description}</span>
              <span className="flex items-center gap-1">
                {fmt(c.amount)}
                {live && (
                  <button type="button" aria-label={`Quitar ${c.description}`} className="text-muted-foreground hover:text-destructive" onClick={() => run(() => removeStayCharge(c.id), "Consumo eliminado")}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
            </div>
          ))}
          {folioData?.payments?.map((p) => (
            <div key={p.id} className="flex justify-between text-emerald-700 dark:text-emerald-400">
              <span>{p.note ?? "Pago"} · {PAYMENT_LABELS[p.method] ?? p.method} · {new Date(p.at).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</span>
              <span>− {fmt(p.amount)}</span>
            </div>
          ))}
          {!folioData && <p className="text-xs text-muted-foreground"><Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Cargando cuenta…</p>}
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>{balance > 0 ? "Saldo pendiente" : balance < 0 ? "Saldo a favor" : "Cuenta saldada"}</span>
            <span className={balance > 0 ? "text-amber-600" : ""}>{fmt(Math.abs(balance))}</span>
          </div>
        </div>

        {(live || stay.status === "checked_out") && (
          <div className="grid gap-3 sm:grid-cols-2">
            {live && (
              <div className="space-y-1.5 rounded-md border p-3">
                <p className="text-sm font-medium">Agregar consumo</p>
                <select className={selectClass} value={charge.itemId} onChange={(e) => pickService(e.target.value)} aria-label="Servicio">
                  <option value="">Otro (minibar, lavandería…)</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name} · {fmt(s.price)}</option>)}
                </select>
                {!charge.itemId && <Input placeholder="Descripción" value={charge.description} onChange={(e) => setCharge({ ...charge, description: e.target.value })} />}
                <div className="flex gap-2">
                  <Input type="number" min={0} placeholder="Precio" value={charge.price} onChange={(e) => setCharge({ ...charge, price: e.target.value })} aria-label="Precio unitario" />
                  <Input type="number" min={1} className="w-20" value={charge.quantity} onChange={(e) => setCharge({ ...charge, quantity: e.target.value })} aria-label="Cantidad" />
                  <Button
                    size="icon"
                    aria-label="Agregar consumo"
                    disabled={isPending || !charge.price || (!charge.itemId && charge.description.trim().length < 2)}
                    onClick={() =>
                      run(
                        () => addStayCharge(stay.id, { itemId: charge.itemId || null, description: charge.description, unitPrice: Number(charge.price), quantity: Number(charge.quantity) }),
                        "Consumo agregado"
                      )
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-1.5 rounded-md border p-3">
              <p className="text-sm font-medium">Registrar pago</p>
              <Input type="number" min={0} value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} aria-label="Monto" />
              <div className="flex gap-2">
                <select className={selectClass} value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })} aria-label="Medio de pago">
                  {Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <Button
                  disabled={isPending || !(Number(payment.amount) > 0)}
                  onClick={() => run(() => addStayPayment(stay.id, Number(payment.amount), payment.method, stay.status === "checked_in" ? "Abono" : stay.status === "checked_out" ? "Pago posterior" : "Anticipo"), "Pago registrado")}
                >
                  Cobrar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main actions */}
        {stay.status === "pending" || stay.status === "confirmed" ? (
          <div className="space-y-3 rounded-md border border-primary/40 p-3">
            {stay.checkIn <= today ? (
              <>
                <p className="text-sm font-medium">Check-in · tarjeta de registro hotelero</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input placeholder="Documento *" value={guest.document} onChange={(e) => setGuest({ ...guest, document: e.target.value })} aria-label="Documento" />
                  <Input placeholder="Nacionalidad" value={guest.nationality} onChange={(e) => setGuest({ ...guest, nationality: e.target.value })} aria-label="Nacionalidad" />
                  <Input placeholder="Celular" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} aria-label="Celular" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={isPending || guest.document.trim().length < 4 || !stay.roomId} onClick={() => run(() => checkInStay(stay.id, guest), `Check-in de ${stay.guestName} listo`, true)}>
                    <LogIn className="mr-2 h-4 w-4" /> Hacer check-in{roomName ? ` en ${roomName}` : ""}
                  </Button>
                  <Button variant="outline" disabled={isPending} onClick={() => run(() => setStayStatus(stay.id, "no_show"), "Marcada como no llegó", true)}>No llegó</Button>
                </div>
                {!stay.roomId && <p className="text-xs text-amber-600">Asigna una habitación para hacer el check-in.</p>}
              </>
            ) : (
              <p className="text-sm text-muted-foreground"><BedDouble className="mr-1 inline h-4 w-4" /> Llega el {shortDate(stay.checkIn)}.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {stay.status === "pending" && (
                <Button variant="secondary" disabled={isPending} onClick={() => run(() => setStayStatus(stay.id, "confirmed"), "Reserva confirmada")}>Confirmar reserva</Button>
              )}
              <Button
                variant="ghost"
                className="text-destructive"
                disabled={isPending}
                onClick={() => confirm("¿Cancelar esta reserva? La habitación queda libre.") && run(() => setStayStatus(stay.id, "cancelled"), "Reserva cancelada", true)}
              >
                Cancelar reserva
              </Button>
            </div>
          </div>
        ) : stay.status === "checked_in" ? (
          <div className="flex flex-wrap items-end gap-2 rounded-md border border-primary/40 p-3">
            {balance > 0 && (
              <div className="min-w-[200px] flex-1 space-y-1.5">
                <Label htmlFor="sd-co">Cobrar saldo de {fmt(balance)} con</Label>
                <select id="sd-co" className={selectClass} value={checkoutMethod} onChange={(e) => setCheckoutMethod(e.target.value)}>
                  {Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            )}
            <Button disabled={isPending} onClick={() => run(() => checkOutStay(stay.id, balance > 0 ? checkoutMethod : null), `Check-out de ${stay.guestName} listo`, true)}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
              {balance > 0 ? `Cobrar y hacer check-out` : "Hacer check-out"}
            </Button>
          </div>
        ) : null}
    </>
  );
}
