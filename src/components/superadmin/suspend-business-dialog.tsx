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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { suspendBusiness, reactivateBusiness } from "@/lib/actions/superadmin";

interface SuspendBusinessDialogProps {
  businessId: string;
  businessName: string;
  suspended: boolean;
}

export function SuspendBusinessDialog({ businessId, businessName, suspended }: SuspendBusinessDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (suspended) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-7"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await reactivateBusiness(businessId);
            if (result?.error) toast.error(result.error);
            else toast.success(`${businessName} reactivado`);
          });
        }}
      >
        {isPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <ShieldCheck className="size-3.5 mr-1.5" />}
        Reactivar
      </Button>
    );
  }

  const handleSubmit = (formData: FormData) => {
    setError(null);
    const reason = formData.get("reason") as string;
    startTransition(async () => {
      const result = await suspendBusiness(businessId, reason);
      if (result?.error) {
        setError(result.error);
      } else {
        toast.success(`${businessName} suspendido`);
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="h-7 text-destructive hover:text-destructive" />}>
        <ShieldAlert className="size-3.5 mr-1.5" />
        Suspender
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Suspender negocio</DialogTitle>
          <DialogDescription>
            <strong>{businessName}</strong> dejará de estar disponible para su equipo y su
            página pública hasta que lo reactives.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Motivo (queda en el log de auditoría)
            </Label>
            <Textarea id="reason" name="reason" rows={3} required className="focus-visible:ring-accent resize-none" />
          </div>
          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                  Suspendiendo…
                </>
              ) : (
                "Suspender"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
