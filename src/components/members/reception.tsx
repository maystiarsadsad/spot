"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, LogIn, Search, ShieldAlert, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { canEnter, STATE_LABELS } from "@/lib/memberships/status";
import { checkInMember } from "@/lib/actions/members";
import { SellDialog, type PlanOption } from "./sell-dialog";
import type { MemberRow } from "./types";

interface Props {
  businessId: string;
  currency: string;
  members: MemberRow[];
  plans: PlanOption[];
  todayCheckIns: { name: string; time: string }[];
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const shortDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("es-CO", { timeZone: "UTC", day: "numeric", month: "short" });

export function Reception({ businessId, currency, members, plans, todayCheckIns }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MemberRow | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [sell, setSell] = useState<{ open: boolean; member: MemberRow | null }>({ open: false, member: null });
  const [isPending, startTransition] = useTransition();

  const results = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return [];
    const digits = q.replace(/\D/g, "");
    return members
      .filter((m) => norm(m.name).includes(q) || (digits.length >= 3 && ((m.phone ?? "").includes(digits) || m.code === digits)))
      .slice(0, 8);
  }, [query, members]);

  const pick = (m: MemberRow) => {
    setSelected(m);
    setBlocked(null);
    setQuery("");
  };

  const checkIn = (override = false) => {
    if (!selected) return;
    startTransition(async () => {
      const res = await checkInMember(businessId, selected.contactId, override);
      if ("error" in res && res.error) return void toast.error(res.error);
      if ("blocked" in res && res.blocked) return void setBlocked(res.label ?? "No puede ingresar");
      if ("already" in res && res.already) toast.info(`${selected.name} ya registró entrada hace poco`);
      else toast.success(`Entrada registrada: ${selected.name}${"sessionsLeft" in res && res.sessionsLeft != null ? ` · le quedan ${res.sessionsLeft} entradas` : ""}`);
      setSelected(null);
      setBlocked(null);
      router.refresh();
    });
  };

  const ok = selected ? canEnter(selected.state) : false;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Registrar entrada</CardTitle>
          <CardDescription>Busca por nombre, celular o código de socio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input autoFocus className="pl-9 h-10 text-base" placeholder="Ej: Laura, 3001234567 o 482913" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar socio" />
          </div>
          {results.length > 0 && (
            <ul className="divide-y rounded-lg border">
              {results.map((m) => (
                <li key={m.contactId}>
                  <button type="button" className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-accent/40" onClick={() => pick(m)}>
                    <span>
                      <span className="font-medium">{m.name}</span>
                      <span className="block text-xs text-muted-foreground">{m.code ? `#${m.code} · ` : ""}{m.phone}</span>
                    </span>
                    <Badge variant={canEnter(m.state) ? "secondary" : "destructive"}>{STATE_LABELS[m.state]}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.trim() && results.length === 0 && <p className="text-sm text-muted-foreground">Sin resultados.</p>}

          {selected && (
            <div className={`rounded-xl border-2 p-4 space-y-3 ${ok ? "border-[var(--success)] bg-[var(--success)]/8" : "border-[var(--destructive)] bg-[var(--destructive)]/8"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">{selected.name}</p>
                  <p className="text-sm text-muted-foreground">{selected.code ? `#${selected.code}` : ""} {selected.phone}</p>
                </div>
                <Badge variant={ok ? "secondary" : "destructive"} className="text-sm">{STATE_LABELS[selected.state]}</Badge>
              </div>
              {selected.planName && (
                <p className="text-sm">
                  {selected.planName}
                  {selected.endsOn && ` · ${selected.state === "expired" ? "venció" : "vence"} ${shortDate(selected.endsOn)}`}
                  {ok && ` · ${selected.daysLeft} días`}
                  {selected.sessionsLeft != null && ` · ${selected.sessionsLeft} entradas`}
                </p>
              )}
              {selected.pendingId && <p className="text-sm text-[var(--warning)]">Tiene una inscripción web pendiente de pago ({selected.pendingPlan}).</p>}
              {blocked && (
                <p className="flex items-center gap-2 text-sm font-medium text-[var(--destructive)]">
                  <ShieldAlert className="h-4 w-4" /> {blocked}: no puede ingresar.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="lg" onClick={() => checkIn(false)} disabled={isPending}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />} Registrar entrada
                </Button>
                {!ok && (
                  <>
                    <Button size="lg" variant="outline" onClick={() => setSell({ open: true, member: selected })}>Renovar</Button>
                    {blocked && <Button size="lg" variant="ghost" onClick={() => checkIn(true)} disabled={isPending}>Dejar pasar igual</Button>}
                  </>
                )}
              </div>
            </div>
          )}

          <Button variant="outline" onClick={() => setSell({ open: true, member: null })}>
            <UserPlus className="mr-2 h-4 w-4" /> Nuevo socio
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Entradas de hoy · {todayCheckIns.length}</CardTitle>
        </CardHeader>
        <CardContent>
          {todayCheckIns.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún nadie ha llegado hoy.</p>
          ) : (
            <ul className="space-y-1.5 text-sm max-h-[420px] overflow-y-auto">
              {todayCheckIns.map((c, i) => (
                <li key={i} className="flex justify-between gap-3"><span>{c.name}</span><span className="tabular-nums text-muted-foreground">{c.time}</span></li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <SellDialog
        open={sell.open}
        onOpenChange={(open) => setSell((s) => ({ ...s, open }))}
        businessId={businessId}
        currency={currency}
        plans={plans}
        member={sell.member ? { contactId: sell.member.contactId, name: sell.member.name, planId: sell.member.planId } : null}
        key={sell.member?.contactId ?? "new"}
      />
    </div>
  );
}
