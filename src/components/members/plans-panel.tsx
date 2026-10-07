"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { savePlanRules } from "@/lib/actions/members";
import type { PlanOption } from "./sell-dialog";

export function PlansPanel({ businessId, currency, plans }: { businessId: string; currency: string; plans: PlanOption[] }) {
  if (plans.length === 0) {
    return (
      <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
        Crea tus planes en <Link className="underline" href="/d/catalog">Catálogo</Link> con el tipo “Membresía”; aquí defines su duración y entradas.
      </p>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {plans.map((p) => <PlanCard key={p.id} businessId={businessId} currency={currency} plan={p} />)}
      <p className="text-xs text-muted-foreground md:col-span-2">
        El nombre, el precio y la descripción se editan en <Link className="underline" href="/d/catalog">Catálogo</Link>.
      </p>
    </div>
  );
}

function PlanCard({ businessId, currency, plan }: { businessId: string; currency: string; plan: PlanOption }) {
  const [days, setDays] = useState(String(plan.days));
  const [sessions, setSessions] = useState(plan.sessions == null ? "" : String(plan.sessions));
  const [isPending, startTransition] = useTransition();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>{formatCurrency(plan.price, currency)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`pd-${plan.id}`}>Duración (días)</Label>
            <Input id={`pd-${plan.id}`} type="number" min={1} max={3660} value={days} onChange={(e) => setDays(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`ps-${plan.id}`}>Entradas (tiquetera)</Label>
            <Input id={`ps-${plan.id}`} type="number" min={1} max={1000} placeholder="Ilimitadas" value={sessions} onChange={(e) => setSessions(e.target.value)} />
          </div>
        </div>
        <Button
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const res = await savePlanRules(businessId, plan.id, Number(days), sessions.trim() === "" ? null : Number(sessions));
              if ("error" in res && res.error) toast.error(res.error);
              else toast.success("Plan guardado");
            })
          }
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
        </Button>
      </CardContent>
    </Card>
  );
}
