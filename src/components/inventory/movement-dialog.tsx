"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { recordMovement } from "@/lib/actions/inventory";
import { Textarea } from "@/components/ui/textarea";

const movementSchema = z.object({
  inventory_id: z.string().min(1, "Debe seleccionar un producto"),
  type: z.enum(["in", "out", "adjust"]),
  quantity: z.coerce.number().refine(val => val !== 0, "La cantidad no puede ser 0"),
  unit_cost: z.coerce.number().min(0).optional(),
  notes: z.string().optional()
});

type MovementFormValues = z.infer<typeof movementSchema>;

interface MovementDialogProps {
  businessId: string;
  inventoryItems: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedItemId?: string;
}

export function MovementDialog({ businessId, inventoryItems, open, onOpenChange, preSelectedItemId }: MovementDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema) as any,
    defaultValues: {
      inventory_id: "",
      type: "in",
      quantity: 0,
      unit_cost: 0,
      notes: ""
    },
  });

  // When opening with a pre-selected item (from barcode scan)
  useEffect(() => {
    if (open && preSelectedItemId) {
      form.setValue("inventory_id", preSelectedItemId);
    }
  }, [open, preSelectedItemId, form]);

  const onSubmit = async (values: MovementFormValues) => {
    setIsLoading(true);

    // Some basic validation: If "out", quantity should be positive (it gets subtracted in the backend or we pass the delta)
    // Actually, backend expects absolute quantity to subtract if "out", or delta if "adjust"
    // For safety, let's pass Math.abs(quantity) to backend for 'in' and 'out', and raw for 'adjust'.
    let submitQuantity = values.quantity;
    if (values.type === 'in' || values.type === 'out') {
      submitQuantity = Math.abs(values.quantity);
    }

    try {
      const result = await recordMovement({
        business_id: businessId,
        inventory_id: values.inventory_id,
        type: values.type,
        quantity: submitQuantity,
        unit_cost: values.unit_cost,
        notes: values.notes,
      });

      if (result.success) {
        toast.success("Movimiento registrado con éxito");
        onOpenChange(false);
        form.reset();
      } else {
        toast.error(result.error || "Error al registrar");
      }
    } catch (error) {
       toast.error("Ocurrió un error inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedItemId = form.watch("inventory_id");
  const selectedItem = inventoryItems.find((i) => i.id === selectedItemId);

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) form.reset();
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Movimiento de Inventario</DialogTitle>
          <DialogDescription>
            Agrega stock, registra mermas, salidas o realiza ajustes a un producto.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="inventory_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Producto *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un producto..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {inventoryItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} {item.current_stock > 0 ? `(Stock: ${item.current_stock} ${item.unit || ''})` : '(Agotado)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Movimiento *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="in">Suministro (Entrada)</SelectItem>
                        <SelectItem value="out">Merma / Consumo (Salida)</SelectItem>
                        <SelectItem value="adjust">Ajuste de Diferencia</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="unit_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Costo Unitario (Opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder={selectedItem ? String(selectedItem.cost_per_unit || 0) : "0.00"} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concepto / Notas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Razón del movimiento, proveedor, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="gap-2">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Registrar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
