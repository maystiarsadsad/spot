"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageCircle, MoreHorizontal, RefreshCw, UserPlus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { reminderMessage, STATE_LABELS, type MemberState } from "@/lib/memberships/status";
import { activateMembership, cancelMembership, extendMembership } from "@/lib/actions/members";
import { SellDialog, type PlanOption } from "./sell-dialog";
import type { MemberRow } from "./types";

interface Props {
  businessId: string;
  businessName: string;
  siteUrl: string;
  slug: string;
  currency: string;
  members: MemberRow[];
  plans: PlanOption[];
}

type Filter = "all" | "ok" | "expiring" | "expired" | "pending";
const FILTERS: { key: Filter; label: string; match: (s: MemberState, m: MemberRow) => boolean }[] = [
  { key: "all", label: "Todos", match: () => true },
  { key: "ok", label: "Al día", match: (s) => s === "active" || s === "scheduled" },
  { key: "expiring", label: "Por vencer", match: (s) => s === "expiring" },
  { key: "expired", label: "Vencidos", match: (s) => s === "expired" || s === "no_sessions" },
  { key: "pending", label: "Inscripciones web", match: (_, m) => !!m.pendingId },
];

const VARIANT: Record<MemberState, "default" | "secondary" | "destructive" | "outline"> = {
  active: "secondary", scheduled: "secondary", expiring: "default", no_sessions: "destructive",
  expired: "destructive", pending: "outline", cancelled: "outline", none: "outline",
};

const shortDate = (d: string | null) => (d ? new Date(`${d}T12:00:00Z`).toLocaleDateString("es-CO", { timeZone: "UTC", day: "numeric", month: "short" }) : "—");
const waNumber = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 ? `57${d}` : d;
};

export function MembersTable({ businessId, businessName, siteUrl, slug, currency, members, plans }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sell, setSell] = useState<{ open: boolean; member: MemberRow | null }>({ open: false, member: null });
  const [, startTransition] = useTransition();

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.key, members.filter((m) => f.match(m.state, m)).length])), [members]);
  const rows = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)!;
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => f.match(m.state, m))
      .filter((m) => !q || m.name.toLowerCase().includes(q) || (m.phone ?? "").includes(q) || m.code === q)
      .sort((a, b) => (a.endsOn ?? "").localeCompare(b.endsOn ?? ""));
  }, [members, filter, query]);

  const act = (fn: () => Promise<{ error?: string } | { success: boolean }>, ok: string) =>
    startTransition(async () => {
      const res = await fn();
      if ("error" in res && res.error) return void toast.error(res.error);
      toast.success(ok);
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)}>
            {f.label} <span className="ml-1.5 opacity-70">{counts[f.key]}</span>
          </Button>
        ))}
        <Input className="ml-auto w-56" placeholder="Buscar socio…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar socio" />
        <Button onClick={() => setSell({ open: true, member: null })}><UserPlus className="mr-1 h-4 w-4" /> Nuevo socio</Button>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Socio</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No hay socios en este filtro.</TableCell></TableRow>
            )}
            {rows.map((m) => {
              const remind = m.phone && (m.state === "expiring" || m.state === "expired" || m.state === "no_sessions") && m.planName && m.endsOn;
              return (
                <TableRow key={m.contactId}>
                  <TableCell>
                    <span className="font-medium">{m.name}</span>
                    <span className="block text-xs text-muted-foreground">{m.code ? `#${m.code} · ` : ""}{m.phone}</span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {m.planName ?? "—"}
                    {m.sessionsLeft != null && <span className="block text-xs text-muted-foreground">{m.sessionsLeft}/{m.sessionsTotal} entradas</span>}
                    {m.pendingId && <span className="block text-xs text-[var(--warning)]">Web: {m.pendingPlan} (sin pagar)</span>}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {shortDate(m.endsOn)}
                    {(m.state === "active" || m.state === "expiring") && <span className="block text-xs text-muted-foreground">{m.daysLeft} días</span>}
                  </TableCell>
                  <TableCell><Badge variant={VARIANT[m.state]}>{STATE_LABELS[m.state]}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {remind && (
                        <a
                          className={buttonVariants({ size: "sm", variant: "outline" })}
                          href={`https://wa.me/${waNumber(m.phone!)}?text=${encodeURIComponent(reminderMessage({ name: m.name, businessName, planName: m.planName!, endsOn: m.endsOn!, state: m.state, link: m.token ? `${siteUrl}/${slug}/socio/${m.token}` : undefined }))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Enviar recordatorio por WhatsApp"
                        >
                          <MessageCircle className="mr-1 h-3.5 w-3.5" /> Recordar
                        </a>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setSell({ open: true, member: m })}>
                        <RefreshCw className="mr-1 h-3.5 w-3.5" /> Renovar
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger className={buttonVariants({ size: "icon", variant: "ghost" })} aria-label="Más acciones">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {m.pendingId && (
                            <DropdownMenuItem onClick={() => act(() => activateMembership(businessId, m.pendingId!, "cash"), "Inscripción cobrada y activa")}>
                              Cobrar inscripción web (efectivo)
                            </DropdownMenuItem>
                          )}
                          {m.membershipId && (m.state === "active" || m.state === "expiring" || m.state === "scheduled") && (
                            <DropdownMenuItem
                              onClick={() => {
                                const days = prompt("¿Cuántos días congelar? (se suman al vencimiento)", "7");
                                if (days) act(() => extendMembership(businessId, m.membershipId!, Number(days)), "Plan extendido");
                              }}
                            >
                              Congelar / extender días
                            </DropdownMenuItem>
                          )}
                          {m.membershipId && m.state !== "cancelled" && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => confirm(`¿Cancelar el plan de ${m.name}?`) && act(() => cancelMembership(businessId, m.membershipId!), "Plan cancelado")}
                            >
                              Cancelar plan
                            </DropdownMenuItem>
                          )}
                          {m.pendingId && (
                            <DropdownMenuItem className="text-destructive" onClick={() => act(() => cancelMembership(businessId, m.pendingId!), "Inscripción descartada")}>
                              Descartar inscripción web
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

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
