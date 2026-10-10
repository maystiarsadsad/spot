"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { nightsCount, STAY_STATUS_LABELS } from "@/lib/stays/pricing";
import { balanceOf, shortDate, SOURCE_LABELS, type RoomRow, type RoomTypeRow, type StayRow } from "./types";

type Filter = "upcoming" | "pending" | "in_house" | "history" | "all";

interface Props {
  stays: StayRow[];
  rooms: RoomRow[];
  roomTypes: RoomTypeRow[];
  currency: string;
  today: string;
  onOpen: (stay: StayRow) => void;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function StaysList({ stays, rooms, roomTypes, currency, today, onOpen }: Props) {
  const pendingCount = stays.filter((s) => s.status === "pending").length;
  const [filter, setFilter] = useState<Filter>(pendingCount ? "pending" : "upcoming");
  const [query, setQuery] = useState("");
  const roomName = (id: string | null) => rooms.find((r) => r.id === id)?.name ?? "Sin asignar";
  const typeName = (id: string | null) => roomTypes.find((t) => t.id === id)?.name ?? "—";

  const list = useMemo(() => {
    const q = norm(query.trim());
    return stays
      .filter((s) => {
        if (filter === "upcoming") return ["pending", "confirmed"].includes(s.status) && s.checkIn >= today;
        if (filter === "pending") return s.status === "pending";
        if (filter === "in_house") return s.status === "checked_in";
        if (filter === "history") return ["checked_out", "cancelled", "no_show"].includes(s.status);
        return true;
      })
      .filter((s) => !q || norm(`${s.guestName} ${s.code} ${s.guestPhone ?? ""} ${s.guestDocument ?? ""}`).includes(q))
      .sort((a, b) => (filter === "history" ? b.checkIn.localeCompare(a.checkIn) : a.checkIn.localeCompare(b.checkIn)))
      .slice(0, 200);
  }, [stays, filter, query, today]);

  const chips: [Filter, string][] = [
    ["upcoming", "Próximas"],
    ["pending", `Por confirmar${pendingCount ? ` (${pendingCount})` : ""}`],
    ["in_house", "En casa"],
    ["history", "Historial"],
    ["all", "Todas"],
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map(([k, label]) => (
          <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>{label}</Button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Nombre, código, documento…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar reserva" />
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Huésped</TableHead>
              <TableHead>Habitación</TableHead>
              <TableHead>Fechas</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No hay reservas en esta vista.</TableCell></TableRow>
            )}
            {list.map((s) => {
              const balance = balanceOf(s);
              const closed = ["cancelled", "no_show"].includes(s.status);
              return (
                <TableRow key={s.id} className="cursor-pointer" onClick={() => onOpen(s)}>
                  <TableCell>
                    <div className="font-medium">{s.guestName}</div>
                    <div className="text-xs text-muted-foreground">{s.code}{s.guestPhone ? ` · ${s.guestPhone}` : ""}</div>
                  </TableCell>
                  <TableCell>
                    <div>{roomName(s.roomId)}</div>
                    <div className="text-xs text-muted-foreground">{typeName(s.itemId)}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {shortDate(s.checkIn)} → {shortDate(s.checkOut)}
                    <div className="text-xs text-muted-foreground">{nightsCount(s.checkIn, s.checkOut)} noches · {s.adults + s.children} pers.</div>
                  </TableCell>
                  <TableCell className="text-xs">{SOURCE_LABELS[s.source] ?? s.source}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === "pending" ? "outline" : s.status === "checked_in" ? "default" : closed ? "destructive" : "secondary"}>
                      {STAY_STATUS_LABELS[s.status] ?? s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(s.roomTotal + s.extras, currency)}</TableCell>
                  <TableCell className={`text-right ${balance > 0 && !closed ? "font-medium text-amber-600" : "text-muted-foreground"}`}>
                    {closed ? "—" : balance > 0 ? formatCurrency(balance, currency) : "Pagado"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
