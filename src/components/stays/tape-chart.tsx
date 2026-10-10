"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { addDays, weekdayOf } from "@/lib/booking/availability";
import { occupancyPct } from "@/lib/stays/pricing";
import { balanceOf, type RoomRow, type RoomTypeRow, type StayRow } from "./types";
import type { NewStayPrefill } from "./new-stay-dialog";

interface Props {
  stays: StayRow[];
  rooms: RoomRow[];
  roomTypes: RoomTypeRow[];
  from: string;
  days: number;
  today: string;
  onOpen: (stay: StayRow) => void;
  onNew: (prefill: NewStayPrefill) => void;
}

const BAR: Record<string, string> = {
  pending: "border border-dashed border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-200",
  confirmed: "bg-primary/85 text-primary-foreground",
  checked_in: "bg-emerald-600 text-white",
  checked_out: "bg-muted text-muted-foreground",
};

const SHOWN = ["pending", "confirmed", "checked_in", "checked_out"];
const DOW = { mon: "lun", tue: "mar", wed: "mié", thu: "jue", fri: "vie", sat: "sáb", sun: "dom" } as const;

export function TapeChart({ stays, rooms, roomTypes, from, days, today, onOpen, onNew }: Props) {
  const dates = Array.from({ length: days }, (_, i) => addDays(from, i));
  const end = addDays(from, days);
  const active = rooms.filter((r) => r.active);
  const visible = stays.filter((s) => s.roomId && SHOWN.includes(s.status) && s.checkIn < end && s.checkOut > from);
  const columns = `minmax(92px, 120px) repeat(${days}, minmax(44px, 1fr))`;

  const occupied = (date: string) =>
    new Set(visible.filter((s) => s.status !== "checked_out" || s.checkOut > date).filter((s) => s.checkIn <= date && date < s.checkOut).map((s) => s.roomId)).size;

  const nav = (date: string) => `?tab=calendario&desde=${date}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={nav(addDays(from, -7))} className={buttonVariants({ variant: "outline", size: "sm" })} aria-label="Semana anterior"><ChevronLeft className="h-4 w-4" /></Link>
        <Link href={nav(addDays(today, -1))} className={buttonVariants({ variant: "outline", size: "sm" })}>Hoy</Link>
        <Link href={nav(addDays(from, 7))} className={buttonVariants({ variant: "outline", size: "sm" })} aria-label="Semana siguiente"><ChevronRight className="h-4 w-4" /></Link>
        <span className="ml-2 text-sm text-muted-foreground">Toca un espacio libre para crear una reserva, o una barra para ver la cuenta.</span>
        <span className="ml-auto flex flex-wrap gap-2 text-xs">
          <span className="rounded px-2 py-0.5 bg-emerald-600 text-white">En casa</span>
          <span className="rounded px-2 py-0.5 bg-primary/85 text-primary-foreground">Confirmada</span>
          <span className="rounded border border-dashed border-amber-500 px-2 py-0.5">Por confirmar</span>
          <span className="rounded bg-muted px-2 py-0.5">Salió</span>
        </span>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <div className="min-w-[760px] text-xs">
          {/* Header: dates + occupancy */}
          <div className="sticky top-0 z-20 grid border-b bg-background" style={{ gridTemplateColumns: columns }}>
            <div className="sticky left-0 z-10 border-r bg-background px-2 py-1.5 font-semibold">Habitación</div>
            {dates.map((d) => {
              const pct = occupancyPct(occupied(d), active.length);
              const wd = weekdayOf(d);
              return (
                <div key={d} className={`border-r px-1 py-1 text-center ${d === today ? "bg-primary/10" : wd === "fri" || wd === "sat" ? "bg-muted/50" : ""}`}>
                  <div className="font-semibold">{DOW[wd]} {Number(d.slice(8))}</div>
                  <div className={pct >= 85 ? "text-emerald-600" : pct < 40 ? "text-muted-foreground" : ""}>{pct}%</div>
                </div>
              );
            })}
          </div>

          {roomTypes.map((t) => {
            const typeRooms = active.filter((r) => r.itemId === t.id);
            if (!typeRooms.length) return null;
            return (
              <div key={t.id}>
                <div className="sticky left-0 border-b bg-muted/60 px-2 py-1 font-semibold">{t.name} · {typeRooms.length}</div>
                {typeRooms.map((r) => {
                  const bars = visible.filter((s) => s.roomId === r.id);
                  const busy = new Set(bars.flatMap((s) => dates.filter((d) => s.checkIn <= d && d < s.checkOut)));
                  return (
                    <div key={r.id} className="grid border-b" style={{ gridTemplateColumns: columns, gridTemplateRows: "34px" }}>
                      <div className="sticky left-0 z-10 flex items-center gap-1 border-r bg-background px-2 font-medium" style={{ gridRow: 1, gridColumn: 1 }}>
                        {r.name}
                        {r.housekeeping === "dirty" && <span title="Por limpiar" className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                        {r.housekeeping === "maintenance" && <span className="text-[10px] text-muted-foreground">mant.</span>}
                      </div>
                      {dates.map((d, i) =>
                        busy.has(d) || r.housekeeping === "maintenance" ? (
                          <div key={d} className={`border-r ${d === today ? "bg-primary/5" : ""}`} style={{ gridRow: 1, gridColumn: i + 2 }} />
                        ) : (
                          <button
                            key={d}
                            type="button"
                            aria-label={`Nueva reserva en ${r.name} el ${d}`}
                            className={`border-r transition-colors hover:bg-primary/10 ${d === today ? "bg-primary/5" : ""} ${d < today ? "cursor-default" : ""}`}
                            disabled={d < today}
                            style={{ gridRow: 1, gridColumn: i + 2 }}
                            onClick={() => onNew({ roomId: r.id, checkIn: d })}
                          />
                        )
                      )}
                      {bars.map((s) => {
                        const startIdx = Math.max(0, dates.indexOf(s.checkIn < from ? from : s.checkIn));
                        const last = s.checkOut > end ? days : dates.indexOf(s.checkOut) === -1 ? days : dates.indexOf(s.checkOut);
                        const span = Math.max(1, last - startIdx);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => onOpen(s)}
                            title={`${s.guestName} · ${s.checkIn} → ${s.checkOut}`}
                            className={`z-[1] m-[3px] flex items-center gap-1 overflow-hidden rounded px-1.5 text-left font-medium ${BAR[s.status] ?? ""} ${s.checkIn < from ? "rounded-l-none" : ""} ${s.checkOut > end ? "rounded-r-none" : ""}`}
                            style={{ gridRow: 1, gridColumn: `${startIdx + 2} / span ${span}` }}
                          >
                            <span className="truncate">{s.guestName}</span>
                            {balanceOf(s) > 0 && s.status !== "checked_out" && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" title="Saldo pendiente" />}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
