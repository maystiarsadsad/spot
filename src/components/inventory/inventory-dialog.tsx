"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { createInventoryItem, updateInventoryItem } from "@/lib/actions/inventory";
import { lookupBarcode } from "@/lib/actions/barcode-lookup";
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
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const lookupTimeout = useRef<NodeJS.Timeout | null>(null);

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

  // Barcode lookup with debounce
  const handleBarcodeLookup = useCallback(async (barcode: string) => {
    if (isEditing || !barcode || barcode.length < 8) {
      setLookupStatus("idle");
      return;
    }

    // Only lookup if the name is still empty (don't overwrite user data)
    const currentName = form.getValues("name");
    if (currentName && currentName.length > 0) {
      setLookupStatus("idle");
      return;
    }

    setLookupStatus("loading");
    try {
      const result = await lookupBarcode(barcode);
      if (result.found) {
        form.setValue("name", result.product.name);
        if (result.product.category) form.setValue("category", result.product.category);
        if (result.product.unit) form.setValue("unit", result.product.unit);
        setLookupStatus("found");
        toast.success(`Producto encontrado: ${result.product.name}`);
      } else {
        setLookupStatus("not_found");
      }
    } catch {
      setLookupStatus("not_found");
    }
  }, [isEditing, form]);

  const onBarcodeChange = useCallback((value: string) => {
    if (lookupTimeout.current) clearTimeout(lookupTimeout.current);
    setLookupStatus("idle");
    // Debounce: wait 600ms after last keystroke (or instant for scanner input)
    if (value.length >= 8) {
      lookupTimeout.current = setTimeout(() => handleBarcodeLookup(value), 600);
    }
  }, [handleBarcodeLookup]);

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
              {/* Barcode first — scan-to-fill workflow */}
              {!isEditing && (
                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="flex items-center gap-2">
                        📦 Código de barras
                        {lookupStatus === "loading" && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Buscando...
                          </span>
                        )}
                        {lookupStatus === "found" && (
                          <span className="flex items-center gap-1 text-xs text-green-500">
                            <CheckCircle2 className="h-3 w-3" /> Producto identificado
                          </span>
                        )}
                        {lookupStatus === "not_found" && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <XCircle className="h-3 w-3" /> No encontrado en la base global
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Escanea o escribe el código EAN para auto-llenar" 
                            {...field}
                            autoFocus
                            onChange={(e) => {
                              field.onChange(e);
                              onBarcodeChange(e.target.value);
                            }}
                          />
                          {field.value && field.value.length >= 8 && lookupStatus !== "loading" && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleBarcodeLookup(field.value || "")}
                              title="Buscar producto"
                            >
                              <Search className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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

              {/* Barcode field for edit mode (simple, no lookup) */}
              {isEditing && (
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
              )}
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
