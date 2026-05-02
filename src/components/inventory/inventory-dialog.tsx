"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createInventoryItem, updateInventoryItem } from "@/lib/actions/inventory";
import { Textarea } from "@/components/ui/textarea";

const inventorySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  category: z.string().optional(),
  current_stock: z.coerce.number().min(0, "El stock no puede ser negativo"),
  min_stock: z.coerce.number().min(0).optional(),
  cost_per_unit: z.coerce.number().min(0).optional(),
  unit: z.string().optional(),
  barcode: z.string().optional(),
  supplier: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional()
});

type InventoryFormValues = z.infer<typeof inventorySchema>;

interface InventoryDialogProps {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemToEdit?: any;
}

export function InventoryDialog({ businessId, open, onOpenChange, itemToEdit }: InventoryDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!itemToEdit;

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventorySchema) as any,
    defaultValues: {
      name: "",
      category: "",
      current_stock: 0,
      min_stock: 0,
      cost_per_unit: 0,
      unit: "Unidades",
      barcode: "",
      supplier: "",
      location: "",
      notes: ""
    },
  });

  useEffect(() => {
    if (open) {
      if (isEditing && itemToEdit) {
        form.reset({
          name: itemToEdit.name,
          category: itemToEdit.category || "",
          current_stock: itemToEdit.current_stock || 0,
          min_stock: itemToEdit.min_stock || 0,
          cost_per_unit: itemToEdit.cost_per_unit || 0,
          unit: itemToEdit.unit || "Unidades",
          barcode: itemToEdit.barcode || "",
          supplier: itemToEdit.supplier || "",
          location: itemToEdit.location || "",
          notes: itemToEdit.notes || ""
        });
      } else {
        form.reset({
          name: "",
          category: "",
          current_stock: 0,
          min_stock: 0,
          cost_per_unit: 0,
          unit: "Unidades",
          barcode: "",
          supplier: "",
          location: "",
          notes: ""
        });
      }
    }
  }, [open, isEditing, itemToEdit, form]);

  const onSubmit = async (values: InventoryFormValues) => {
    setIsLoading(true);

    try {
      if (isEditing) {
        const result = await updateInventoryItem(itemToEdit.id, values);
        if (result.success) {
          toast.success("Producto actualizado exitosamente");
          onOpenChange(false);
        } else {
          toast.error(result.error || "Error al actualizar");
        }
      } else {
        const result = await createInventoryItem({
          business_id: businessId,
          ...values
        });
        if (result.success) {
          toast.success("Producto registrado exitosamente");
          onOpenChange(false);
          form.reset();
        } else {
          toast.error(result.error || "Error al registrar");
        }
      }
    } catch (error) {
       toast.error("Ocurrió un error inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Modifica los detalles del producto en el inventario." 
              : "Añade un nuevo producto o materia prima al inventario de tu negocio."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nombre del Producto *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Harina de Trigo, Limpiasuelos..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Materia Prima, Aseo..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad de Medida</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Kg, Litros, Unidades..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="current_stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Actual (Inicial) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        {...field} 
                        disabled={isEditing} 
                        className={isEditing ? "bg-muted/50 text-muted-foreground" : ""}
                        title={isEditing ? "Para modificar el stock actual ve a 'Movimientos' > 'Ajuste'" : undefined}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="min_stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Mínimo (Alerta)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cost_per_unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo Base Unitario ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor principal</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Distribuidora S.A." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de barras</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. 7702004001214" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Información adicional del producto..." {...field} />
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
                {isEditing ? "Actualizar Producto" : "Registrar Producto"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
