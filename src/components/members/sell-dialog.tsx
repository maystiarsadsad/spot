"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { formatCurrency } from "@/lib/utils";
import { sellMembership } from "@/lib/actions/members";

export interface PlanOption {
  id: string;
  name: string;
  price: number;
  days: number;
  sessions: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  currency: string;
  plans: PlanOption[];
  /** Renewal for an existing member; otherwise a new member form */
  member?: { contactId: string; name: string; planId?: string | null } | null;
}

const selectClass = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

export function SellDialog({ open, onOpenChange, businessId, currency, plans, member }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [planId, setPlanId] = useState(member?.planId ?? plans[0]?.id ?? "");
  const [payment, setPayment] = useState("cash");
  const [person, setPerson] = useState({ name: "", phone: "", email: "" });
  const plan = plans.find((p) => p.id === planId);

  const submit = () =>
    startTransition(async () => {
      const res = await sellMembership(businessId, {
        planId,
        paymentMethod: payment,
        ...(member ? { contactId: member.contactId } : person),
      });
      if ("error" in res && res.error) return void toast.error(res.error);
      if ("endsOn" in res) {
        const d = new Date(`${res.endsOn}T12:00:00Z`).toLocaleDateString("es-CO", { timeZone: "UTC", day: "numeric", month: "long" });
        toast.success(`Plan activo hasta el ${d}`);
      }
      setPerson({ name: "", phone: "", email: "" });
      onOpenChange(false);
      router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{member ? `Renovar a ${member.name}` : "Nuevo socio"}</DialogTitle>
          <DialogDescription>
            {member ? "Si su plan sigue vigente, el nuevo empieza cuando termine el actual." : "Se registra el cobro en caja y el plan queda activo desde hoy."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!member && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="sd-name">Nombre</Label>
                <Input id="sd-name" value={person.name} onChange={(e) => setPerson({ ...person, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sd-phone">Celular</Label>
                  <Input id="sd-phone" type="tel" value={person.phone} onChange={(e) => setPerson({ ...person, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sd-email">Correo (opcional)</Label>
                  <Input id="sd-email" type="email" value={person.email} onChange={(e) => setPerson({ ...person, email: e.target.value })} />
                </div>
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="sd-plan">Plan</Label>
            <select id="sd-plan" className={selectClass} value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {formatCurrency(p.price, currency)} · {p.sessions ? `${p.sessions} entradas, ` : ""}{p.days} días
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sd-pay">Pago</Label>
            <select id="sd-pay" className={selectClass} value={payment} onChange={(e) => setPayment(e.target.value)}>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia / Nequi</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={isPending || !planId || (!member && (!person.name.trim() || !person.phone.trim()))}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Cobrar {plan ? formatCurrency(plan.price, currency) : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
