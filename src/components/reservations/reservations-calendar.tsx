"use client";

import { useState } from "react";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Users, CalendarIcon, MoreHorizontal, CheckCircle2, XCircle } from "lucide-react";
import { ReservationDialog } from "./reservation-dialog";
import { deleteReservation, updateReservationStatus } from "@/lib/actions/reservations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface CatalogItem {
  id: string;
  name: string;
  type: string | null;
}

interface Reservation {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  reservation_time: string;
  end_time: string | null;
  status: string;
  party_size: number | null;
  notes: string | null;
  item_id: string | null;
  catalog_items?: { name: string } | null;
}

interface Props {
  businessId: string;
  businessType: string;
  reservations: Reservation[];
  catalogItems: CatalogItem[];
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" }> = {
  pending: { label: "Pendiente", variant: "secondary" },
  confirmed: { label: "Confirmada", variant: "success" },
  completed: { label: "Completada", variant: "default" },
  cancelled: { label: "Cancelada", variant: "destructive" },
};

export function ReservationsCalendar({ businessId, businessType, reservations, catalogItems }: Props) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter reservations by selected date
  const selectedDateReservations = reservations.filter((r) => {
    if (!date) return false;
    const rDate = new Date(r.reservation_time);
    return isSameDay(rDate, date);
  }).sort((a, b) => new Date(a.reservation_time).getTime() - new Date(b.reservation_time).getTime());

  const handleStatusChange = async (id: string, status: string) => {
    const res = await updateReservationStatus(id, status);
    if (!res.error) toast.success("Estado actualizado");
    else toast.error(res.error);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la reserva de ${name}?`)) return;
    const res = await deleteReservation(id);
    if (!res.error) toast.success("Reserva eliminada");
    else toast.error(res.error);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Calendar Sidebar */}
      <div className="w-full lg:w-[350px] shrink-0 space-y-6">
        <div className="rounded-xl border bg-card p-4">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="w-full mx-auto flex justify-center [&_.rdp-day_button]:w-10 [&_.rdp-day_button]:h-10"
          />
        </div>

        <div className="rounded-xl border bg-muted/30 p-6">
          <h3 className="font-semibold mb-2">Resumen del {date ? format(date, "dd MMM", { locale: es }) : "día"}</h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              <span>{selectedDateReservations.length} reservas</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>
                {selectedDateReservations.reduce((acc, r) => acc + (r.party_size || 0), 0)} px
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Form */}
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {date ? format(date, "EEEE, d 'de' MMMM", { locale: es }) : "Selecciona una fecha"}
            </h2>
            <p className="text-muted-foreground text-sm">
              Agenda del día
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Reserva
          </Button>
        </div>

        {selectedDateReservations.length > 0 ? (
          <div className="space-y-3">
            {selectedDateReservations.map((res) => {
              const statusConfig = statusMap[res.status] || { label: res.status, variant: "outline" };
              return (
                <div key={res.id} className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between group hover:border-primary/50 transition-colors">
                  <div className="flex gap-4 items-start sm:items-center">
                    <div className="w-16 shrink-0 py-1 bg-muted rounded-md flex flex-col items-center justify-center font-semibold text-primary">
                      {format(new Date(res.reservation_time), "HH:mm")}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg leading-tight flex items-center gap-2">
                        {res.customer_name}
                        {statusConfig.variant === "success" ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-200">
                            Confirmada
                          </Badge>
                        ) : (
                          <Badge variant={statusConfig.variant as any}>
                            {statusConfig.label}
                          </Badge>
                        )}
                      </h4>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1.5">
                        {res.party_size && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            <span>{res.party_size} {businessType === "hotel" ? "huéspedes" : "personas"}</span>
                          </div>
                        )}
                        {res.catalog_items && (
                          <div className="flex items-center gap-1">
                           <span>•</span>
                           <span className="font-medium text-foreground">{res.catalog_items.name}</span>
                          </div>
                        )}
                      </div>
                      
                      {(res.customer_phone || res.notes) && (
                        <div className="mt-2 text-sm max-w-lg">
                          {res.customer_phone && <p>📞 {res.customer_phone}</p>}
                          {res.notes && <p className="italic text-muted-foreground mt-1">"{res.notes}"</p>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon" })}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleStatusChange(res.id, "confirmed")}>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                          Marcar Confirmada
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(res.id, "completed")}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Marcar Completada
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(res.id, "cancelled")}>
                          <XCircle className="mr-2 h-4 w-4 text-destructive" />
                          Cancelar Reserva
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(res.id, res.customer_name)}>
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <CalendarIcon className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-xl font-semibold">Sin reservas</h3>
            <p className="text-muted-foreground max-w-sm mt-2 mb-6">
              No hay reservas programadas para este día. ¿Quieres registrar una nueva?
            </p>
            <Button onClick={() => setIsDialogOpen(true)} variant="outline">
              Nueva Reserva
            </Button>
          </div>
        )}
      </div>

      {date && (
        <ReservationDialog
          businessId={businessId}
          businessType={businessType}
          catalogItems={catalogItems}
          selectedDate={date}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      )}
    </div>
  );
}
