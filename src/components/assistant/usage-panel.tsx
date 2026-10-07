import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatUsd, getClaudeModel } from "@/lib/assistant/models";

export interface UsageRow {
  created_at: string;
  engine: string;
  source: string;
  status: string;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  cost_usd: number;
  question: string | null;
  error: string | null;
}

export interface UsageStats {
  todayUsd: number;
  monthUsd: number;
  dailyCapUsd: number;
  monthlyCapUsd: number | null;
  monthClaude: number;
  monthAutomatic: number;
  monthCapped: number;
  monthErrors: number;
  days: { label: string; claude: number; automatic: number; cost: number }[];
  recent: UsageRow[];
  timeZone: string;
}

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ok: { label: "OK", variant: "secondary" },
  capped: { label: "Tope", variant: "outline" },
  error: { label: "Error", variant: "destructive" },
  refusal: { label: "Rechazada", variant: "outline" },
};

function Meter({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 100;
  const tone = pct >= 100 ? "bg-[var(--destructive)]" : pct >= 80 ? "bg-[var(--warning)]" : "bg-[var(--accent)]";
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted" role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function UsagePanel({ stats }: { stats: UsageStats }) {
  const time = (iso: string) =>
    new Date(iso).toLocaleString("es-CO", { timeZone: stats.timeZone, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gasto de hoy en Claude</CardDescription>
            <CardTitle className="text-2xl">
              {formatUsd(stats.todayUsd)} <span className="text-sm font-normal text-muted-foreground">de {formatUsd(stats.dailyCapUsd)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Meter value={stats.todayUsd} max={stats.dailyCapUsd} />
            <p className="mt-2 text-xs text-muted-foreground">Al llegar al tope responde el asistente automático hasta mañana.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gasto del mes</CardDescription>
            <CardTitle className="text-2xl">
              {formatUsd(stats.monthUsd)}
              {stats.monthlyCapUsd != null && <span className="text-sm font-normal text-muted-foreground"> de {formatUsd(stats.monthlyCapUsd)}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.monthlyCapUsd != null ? (
              <Meter value={stats.monthUsd} max={stats.monthlyCapUsd} />
            ) : (
              <p className="text-xs text-muted-foreground">Sin tope mensual. Lo cobra Anthropic directamente a tu cuenta.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Preguntas respondidas este mes</CardDescription>
            <CardTitle className="text-2xl">{stats.monthClaude + stats.monthAutomatic}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-0.5">
            <p>{stats.monthClaude} con Claude · {stats.monthAutomatic} automáticas</p>
            {(stats.monthCapped > 0 || stats.monthErrors > 0) && (
              <p>{stats.monthCapped} por tope · {stats.monthErrors} con error de Claude</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos 14 días</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Día</TableHead>
                <TableHead className="text-right">Con Claude</TableHead>
                <TableHead className="text-right">Automáticas</TableHead>
                <TableHead className="text-right">Costo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.days.map((d) => (
                <TableRow key={d.label}>
                  <TableCell>{d.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.claude}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.automatic}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.cost > 0 ? formatUsd(d.cost, 3) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimas preguntas</CardTitle>
          <CardDescription>Qué te preguntan tus clientes y cuánto costó cada respuesta.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay preguntas. Prueba el asistente en la pestaña “Probar”.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Pregunta</TableHead>
                  <TableHead>Respondió</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recent.map((r, i) => {
                  const st = STATUS[r.status] ?? STATUS.ok;
                  const tokensIn = r.input_tokens + r.cache_read_tokens + r.cache_write_tokens;
                  return (
                    <TableRow key={`${r.created_at}-${i}`}>
                      <TableCell className="whitespace-nowrap text-xs">{time(r.created_at)}</TableCell>
                      <TableCell className="max-w-[320px] truncate text-sm" title={r.error ?? r.question ?? ""}>
                        {r.question}
                        {r.source === "playground" && <span className="ml-1 text-xs text-muted-foreground">(prueba)</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="text-xs">{r.engine === "claude" ? getClaudeModel(r.model).label : "Automático"}</span>{" "}
                        {r.status !== "ok" && <Badge variant={st.variant}>{st.label}</Badge>}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {r.engine === "claude" ? `${tokensIn.toLocaleString("es-CO")} / ${r.output_tokens.toLocaleString("es-CO")}` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{r.cost_usd > 0 ? formatUsd(r.cost_usd, 4) : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
