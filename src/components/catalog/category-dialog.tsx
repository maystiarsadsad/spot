"use client";

import { useState, useTransition } from "react";
import { createCategory, updateCategory } from "@/lib/actions/catalog";
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

interface Props {
  businessId: string;
  category?: Category | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryDialog({ businessId, category, open, onOpenChange }: Props) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!category;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = isEditing
        ? await updateCategory(category.id, formData)
        : await createCategory(businessId, formData);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isEditing ? "Categoría actualizada" : "Categoría creada");
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar categoría" : "Nueva categoría"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos de la categoría."
              : "Crea una categoría para organizar tu catálogo."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Nombre *</Label>
              <Input
                id="cat-name"
                name="name"
                placeholder="Ej: Bebidas"
                defaultValue={category?.name || ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-icon">Icono</Label>
              <Input
                id="cat-icon"
                name="icon"
                placeholder="🍕"
                defaultValue={category?.icon || "📦"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cat-desc">Descripción</Label>
            <Textarea
              id="cat-desc"
              name="description"
              placeholder="Descripción opcional"
              defaultValue={category?.description || ""}
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
              {isEditing ? "Guardar cambios" : "Crear categoría"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
