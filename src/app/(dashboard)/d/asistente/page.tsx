import type { Metadata } from "next";
import { Bot } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/get-active-business";
import { NoBusinessSelected } from "@/components/dashboard/no-business-selected";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ConnectionCard } from "@/components/assistant/connection-card";
import { TrainingCard } from "@/components/assistant/training-card";
import { Playground } from "@/components/assistant/playground";
import { UsagePanel, type UsageRow, type UsageStats } from "@/components/assistant/usage-panel";
import { periodStartUtc, toSettings } from "@/lib/assistant/context";
import { PLAN_LABELS, planIncludesClaude, type PlanKey } from "@/lib/assistant/models";

export const metadata: Metadata = {
  title: "Asistente IA",
};

export default async function AssistantPage() {
  const business = await getActiveBusiness();
  if (!business) return <NoBusinessSelected />;

  const supabase = await createClient();
  const timeZone = business.timezone || "America/Bogota";
  const since = daysAgo(31);

  const [{ data: biz }, { data: settingsRow }, { data: usage }, { data: firstItem }] = await Promise.all([
    supabase.from("businesses").select("subscription_plan, ai_agent_greeting").eq("id", business.id).single(),
    supabase.from("business_ai_settings").select("*").eq("business_id", business.id).maybeSingle(),
    supabase
      .from("ai_usage")
      .select("created_at, engine, source, status, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd, question, error")
      .eq("business_id", business.id)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("catalog_items")
      .select("name, options")
      .eq("business_id", business.id)
      .eq("active", true)
      .not("options", "eq", "[]")
      .limit(1)
      .maybeSingle(),
  ]);

  const plan = (biz?.subscription_plan ?? "free") as PlanKey;
  const includesClaude = planIncludesClaude(plan);
  const settings = toSettings(settingsRow);

  const stats = buildUsageStats((usage ?? []) as unknown as UsageRow[], settings, timeZone);

  const engineNow = includesClaude && settings.claudeEnabled && settings.hasKey ? "Claude" : "Automático";

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <h1 className="flex items-center gap-3">
          <div className="section-header-icon">
            <Bot className="h-5 w-5" />
          </div>
          Asistente IA
        </h1>
        <p className="flex flex-wrap items-center gap-2">
          El chat de tu página responde a tus clientes las 24 horas.
          <Badge variant="secondary">Plan {PLAN_LABELS[plan] ?? plan}</Badge>
          <Badge variant={engineNow === "Claude" ? "default" : "outline"}>Responde: {engineNow}</Badge>
        </p>
      </div>

      <Tabs defaultValue={includesClaude ? "connection" : "training"}>
        <TabsList>
          <TabsTrigger value="connection">Conexión</TabsTrigger>
          <TabsTrigger value="training">Entrenamiento</TabsTrigger>
          <TabsTrigger value="usage">Uso</TabsTrigger>
          <TabsTrigger value="test">Probar</TabsTrigger>
        </TabsList>
        <TabsContent value="connection" className="pt-4">
          <ConnectionCard
            businessId={business.id}
            includesClaude={includesClaude}
            settings={{
              claudeEnabled: settings.claudeEnabled,
              model: settings.model,
              dailyCapUsd: settings.dailyCapUsd,
              monthlyCapUsd: settings.monthlyCapUsd,
              hasKey: settings.hasKey,
              keyLast4: settings.keyLast4,
              keyVerifiedAt: settings.keyVerifiedAt,
            }}
          />
        </TabsContent>
        <TabsContent value="training" className="pt-4">
          <TrainingCard
            businessId={business.id}
            includesClaude={includesClaude}
            initial={{
              greeting: settings.greeting ?? biz?.ai_agent_greeting ?? "",
              instructions: settings.instructions ?? "",
              extraInfo: settings.extraInfo ?? "",
              faqs: settings.faqs,
            }}
          />
        </TabsContent>
        <TabsContent value="usage" className="pt-4">
          <UsagePanel stats={stats} />
        </TabsContent>
        <TabsContent value="test" className="pt-4">
          <Playground businessId={business.id} sampleItem={firstItem?.name ?? null} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 3600 * 1000);

/** Today / month spend, monthly counters and the last 14 days, in the business time zone. */
function buildUsageStats(rawRows: UsageRow[], settings: ReturnType<typeof toSettings>, timeZone: string): UsageStats {
  const rows = rawRows.map((r) => ({ ...r, cost_usd: Number(r.cost_usd) }));
  const dayStart = periodStartUtc(timeZone, "day");
  const monthStart = periodStartUtc(timeZone, "month");
  const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone });
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = daysAgo(i);
    return {
      key: dayKey(d),
      label: i === 0 ? "Hoy" : d.toLocaleDateString("es-CO", { timeZone, weekday: "short", day: "numeric", month: "short" }),
      claude: 0,
      automatic: 0,
      cost: 0,
    };
  });
  const byKey = new Map(days.map((d) => [d.key, d]));
  const stats: UsageStats = {
    todayUsd: 0,
    monthUsd: 0,
    dailyCapUsd: settings.dailyCapUsd,
    monthlyCapUsd: settings.monthlyCapUsd,
    monthClaude: 0,
    monthAutomatic: 0,
    monthCapped: 0,
    monthErrors: 0,
    days: [],
    recent: rows.slice(0, 25),
    timeZone,
  };
  for (const r of rows) {
    const at = new Date(r.created_at);
    const isClaude = r.engine === "claude";
    if (isClaude && at >= dayStart) stats.todayUsd += r.cost_usd;
    if (at >= monthStart) {
      if (isClaude) stats.monthUsd += r.cost_usd;
      if (isClaude && r.status === "ok") stats.monthClaude++;
      if (!isClaude) stats.monthAutomatic++;
      if (r.status === "capped") stats.monthCapped++;
      if (isClaude && r.status === "error") stats.monthErrors++;
    }
    const day = byKey.get(dayKey(at));
    if (day) {
      if (isClaude && r.status === "ok") day.claude++;
      if (!isClaude) day.automatic++;
      day.cost += r.cost_usd;
    }
  }
  stats.days = days.map(({ label, claude, automatic, cost }) => ({ label, claude, automatic, cost }));

  return stats;
}
