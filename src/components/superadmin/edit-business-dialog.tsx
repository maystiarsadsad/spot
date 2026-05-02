"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Loader2 } from "lucide-react";
import { updateBusinessAsSuperadmin } from "@/lib/actions/superadmin";

interface EditBusinessDialogProps {
  business: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    type: string;
  };
}

export function EditBusinessDialog({ business }: EditBusinessDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await updateBusinessAsSuperadmin(business.id, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" />}
      >
        <Pencil className="size-3.5 mr-1.5" />
        Editar
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Editar Negocio
          </DialogTitle>
          <DialogDescription>
            Modifica los datos básicos de este negocio.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nombre
            </Label>
            <Input
              id="name"
              name="name"
              defaultValue={business.name}
              required
              className="focus-visible:ring-accent"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Slug (URL)
            </Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={business.slug}
              required
              pattern="[a-z0-9-]+"
              title="Solo letras minúsculas, números y guiones"
              className="font-mono text-sm focus-visible:ring-accent"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Descripción
            </Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={business.description ?? ""}
              rows={3}
              className="focus-visible:ring-accent resize-none"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                  Guardando…
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
