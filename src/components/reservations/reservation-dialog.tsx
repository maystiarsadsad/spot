"use client";

import { useTransition } from "react";
import { createReservation } from "@/lib/actions/reservations";
import { format } from "date-fns";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CatalogItem {
  id: string;
  name: string;
  type: string | null;
}

interface Props {
  businessId: string;
  businessType: string;
  catalogItems: CatalogItem[];
  selectedDate: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReservationDialog({
  businessId,
  businessType,
  catalogItems,
  selectedDate,
  open,
  onOpenChange,
}: Props) {
  const [isPending, startTransition] = useTransition();

  // Prefer items that make sense to reserve (rooms, services, tables)
  const reservableItems = catalogItems.filter(
    (item) => item.type === "room" || item.type === "service" || item.type === "product"
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createReservation(businessId, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Reserva creada exitosamente");
        onOpenChange(false);
      }
    });
  }

  // Formatting date for HTML datetime-local input
  // datetime-local expects YYYY-MM-DDThh:mm
  const defaultDateStr = format(selectedDate, "yyyy-MM-dd'T'10:00");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nueva Reserva</DialogTitle>
          <DialogDescription>
            Registra una nueva reserva para un cliente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer_name">Nombre del cliente *</Label>
            <Input id="customer_name" name="customer_name" placeholder="Ej: Juan Pérez" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="customer_phone">Teléfono</Label>
              <Input id="customer_phone" name="customer_phone" type="tel" placeholder="+57 300..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_email">Correo (Opcional)</Label>
              <Input id="customer_email" name="customer_email" type="email" placeholder="juan@ejemplo.com" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="reservation_time">Fecha y Hora *</Label>
              <Input
                id="reservation_time"
                name="reservation_time"
                type="datetime-local"
                defaultValue={defaultDateStr}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="party_size">
                {businessType === "hotel" ? "Huéspedes" : "Personas"}
              </Label>
              <Input
                id="party_size"
                name="party_size"
                type="number"
                min="1"
                defaultValue="1"
              />
            </div>
          </div>

          {reservableItems.length > 0 && (
            <div className="space-y-2">
              <Label>Servicio / Habitación a reservar (Opcional)</Label>
              <Select name="item_id" defaultValue="none">
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar ítem..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno en específico</SelectItem>
                  {reservableItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notas especiales</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Requerimientos, alergias, etc."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar reserva
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
