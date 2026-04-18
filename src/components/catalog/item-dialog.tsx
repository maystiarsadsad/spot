"use client";

import { useState, useTransition } from "react";
import { createItem, updateItem } from "@/lib/actions/catalog";
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

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cost: number | null;
  compare_price: number | null;
  sku: string | null;
  category_id: string | null;
  type: string | null;
  active: boolean | null;
}

interface Props {
  businessId: string;
  businessType: string;
  categories: Category[];
  item?: CatalogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CatalogItemDialog({
  businessId,
  businessType,
  categories,
  item,
  open,
  onOpenChange,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!item;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = isEditing
        ? await updateItem(item!.id, formData)
        : await createItem(businessId, formData);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isEditing ? "Producto actualizado" : "Producto creado");
        onOpenChange(false);
      }
    });
  }

  const getPlaceholders = () => {
    switch (businessType) {
      case "restaurant":
        return { name: "Ej: Hamburguesa clásica", sku: "HAM-001" };
      case "hotel":
        return { name: "Ej: Habitación Doble Superior", sku: "HAB-201" };
      case "retail":
        return { name: "Ej: Camiseta Básica Blanca", sku: "CAM-001" };
      case "services":
        return { name: "Ej: Corte de cabello", sku: "SER-001" };
      case "agency":
        return { name: "Ej: Creación de página web", sku: "WEB-001" };
      default:
        return { name: "Ej: Producto o Servicio", sku: "ABC-001" };
    }
  };

  const pl = getPlaceholders();

  const getTypes = () => {
    switch (businessType) {
      case "restaurant":
      case "cafe":
      case "bar":
        return [{ value: "product", label: "Platillo / Bebida" }];
      case "hotel":
      case "hostel":
        return [{ value: "room", label: "Habitación" }, { value: "service", label: "Servicio / Extra" }];
      case "retail":
      case "boutique":
      case "grocery":
      case "pharmacy":
        return [{ value: "product", label: "Producto" }];
      case "services":
      case "agency":
      case "consulting":
        return [{ value: "service", label: "Servicio" }];
      case "gym":
      case "spa":
        return [{ value: "membership", label: "Membresía" }, { value: "service", label: "Servicio" }, { value: "product", label: "Producto" }];
      default:
        return [
          { value: "product", label: "Producto" },
          { value: "service", label: "Servicio" },
          { value: "room", label: "Habitación" },
          { value: "membership", label: "Membresía" },
        ];
    }
  };

  const types = getTypes();

  const [categoryId, setCategoryId] = useState(item?.category_id || "none");
  const [typeId, setTypeId] = useState(item?.type || types[0].value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del producto."
              : "Completa los datos para agregar un producto al catálogo."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="item-name">Nombre *</Label>
            <Input
              id="item-name"
              name="name"
              placeholder={pl.name}
              defaultValue={item?.name || ""}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="item-desc">Descripción</Label>
            <Textarea
              id="item-desc"
              name="description"
              placeholder="Descripción opcional del producto"
              defaultValue={item?.description || ""}
              rows={2}
            />
          </div>

          {/* Price + Cost row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="item-price">Precio *</Label>
              <Input
                id="item-price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                defaultValue={item?.price ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-cost">Costo</Label>
              <Input
                id="item-cost"
                name="cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                defaultValue={item?.cost ?? ""}
              />
            </div>
          </div>

          {/* Compare price + SKU */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="item-compare">Precio anterior</Label>
              <Input
                id="item-compare"
                name="compare_price"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ej: 15000"
                defaultValue={item?.compare_price ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-sku">SKU</Label>
              <Input
                id="item-sku"
                name="sku"
                placeholder={pl.sku}
                defaultValue={item?.sku || ""}
              />
            </div>
          </div>

          {/* Category + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                name="category_id"
                value={categoryId}
                onValueChange={(val) => setCategoryId(val || "none")}
              >
                <SelectTrigger>
                  <span className="flex flex-1 text-left truncate">
                    {categoryId === "none"
                      ? "Sin categoría"
                      : categories.find((c) => c.id === categoryId)?.name || "Sin categoría"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select 
                name="type" 
                value={typeId} 
                onValueChange={(val) => setTypeId(val || typeId)}
              >
                <SelectTrigger>
                  <span className="flex flex-1 text-left truncate">
                    {types.find((t) => t.value === typeId)?.label || "Producto"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {types.map((typeOption) => (
                    <SelectItem key={typeOption.value} value={typeOption.value}>
                      {typeOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isEditing && (
            <input type="hidden" name="active" value={String(item?.active ?? true)} />
          )}

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
              {isEditing ? "Guardar cambios" : "Crear producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
