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
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { transferBusinessOwnership } from "@/lib/actions/superadmin";

interface TransferOwnershipDialogProps {
  businessId: string;
  businessName: string;
  currentOwnerEmail: string | null;
}

export function TransferOwnershipDialog({
  businessId,
  businessName,
  currentOwnerEmail,
}: TransferOwnershipDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    const email = formData.get("newOwnerEmail") as string;
    startTransition(async () => {
      const result = await transferBusinessOwnership(businessId, email);
      if (result?.error) {
        setError(result.error);
      } else {
        toast.success(`Propiedad transferida a ${result.newOwnerName}`);
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="w-full text-xs h-8" />}>
        <ArrowRightLeft className="size-3.5 mr-1.5" />
        Transferir propiedad
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Transferir propiedad</DialogTitle>
          <DialogDescription>
            El nuevo propietario debe estar ya registrado en la plataforma. El propietario
            actual ({currentOwnerEmail || "sin email"}) pasará a ser administrador de{" "}
            <strong>{businessName}</strong>, no pierde acceso.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newOwnerEmail" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email del nuevo propietario
            </Label>
            <Input
              id="newOwnerEmail"
              name="newOwnerEmail"
              type="email"
              placeholder="usuario@ejemplo.com"
              required
              className="focus-visible:ring-accent"
            />
          </div>
          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                  Transfiriendo…
                </>
              ) : (
                "Transferir"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
