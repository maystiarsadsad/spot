import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/get-active-business";
import { NoBusinessSelected } from "@/components/dashboard/no-business-selected";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  DollarSign,
  Users,
  TrendingUp,
  Package,
  Clock,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user!.id)
    .single<{ display_name: string | null }>();

  const business = await getActiveBusiness();

  if (!business) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {getGreeting()}, {profile?.display_name ?? "Usuario"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Aquí tienes un resumen de tu negocio
          </p>
        </div>
        <NoBusinessSelected />
      </div>
    );
  }

  // ── All queries filtered by business_id ──────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = yesterday.toISOString();

  // Orders today
  const { count: ordersToday } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.id)
    .gte("created_at", todayISO);

  // Orders yesterday (for comparison)
  const { count: ordersYesterday } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.id)
    .gte("created_at", yesterdayISO)
    .lt("created_at", todayISO);

  // Revenue today
  const { data: revenueData } = await supabase
    .from("transactions")
    .select("total")
    .eq("business_id", business.id)
    .in("status", ["completed", "confirmed", "in_progress"])
    .gte("created_at", todayISO);

  const revenueToday = (revenueData || []).reduce(
    (sum, t) => sum + Number(t.total || 0),
    0
  );

  // Revenue yesterday
  const { data: revenueYesterdayData } = await supabase
    .from("transactions")
    .select("total")
    .eq("business_id", business.id)
    .in("status", ["completed", "confirmed", "in_progress"])
    .gte("created_at", yesterdayISO)
    .lt("created_at", todayISO);

  const revenueYesterday = (revenueYesterdayData || []).reduce(
    (sum, t) => sum + Number(t.total || 0),
    0
  );

  // New contacts today
  const { count: contactsToday } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.id)
    .gte("created_at", todayISO);

  const { count: contactsYesterday } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.id)
    .gte("created_at", yesterdayISO)
    .lt("created_at", todayISO);

  // Catalog items count
  const { count: catalogCount } = await supabase
    .from("catalog_items")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("active", true);

  // Recent orders (last 5)
  const { data: recentOrders } = await supabase
    .from("transactions")
    .select("id, code, status, total, customer_name, type, created_at")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // ── 7-day sales data for chart ──────────────────────────────
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const { data: weekTransactions } = await supabase
    .from("transactions")
    .select("total, created_at, status")
    .eq("business_id", business.id)
    .in("status", ["completed", "confirmed", "in_progress"])
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const salesByDay: Record<string, { revenue: number; orders: number }> = {};

  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split("T")[0];
    const label = `${dayNames[d.getDay()]} ${d.getDate()}`;
    salesByDay[key] = { revenue: 0, orders: 0 };
  }

  for (const t of weekTransactions || []) {
    const key = new Date(t.created_at!).toISOString().split("T")[0];
    if (salesByDay[key]) {
      salesByDay[key].revenue += Number(t.total || 0);
      salesByDay[key].orders += 1;
    }
  }

  const salesData = Object.entries(salesByDay).map(([dateKey, data]) => {
    const d = new Date(dateKey + "T12:00:00");
    return {
      day: `${dayNames[d.getDay()]} ${d.getDate()}`,
      revenue: data.revenue,
      orders: data.orders,
    };
  });

  // ── Category breakdown ──────────────────────────────────────
  // Step 1: Get all completed transaction items for this business
  const { data: bizTransactions } = await supabase
    .from("transactions")
    .select("id")
    .eq("business_id", business.id)
    .in("status", ["completed", "confirmed", "in_progress"]);

  const txIds = (bizTransactions || []).map((t) => t.id);

  let categoryData: { name: string; value: number; color: string }[] = [];

  if (txIds.length > 0) {
    const { data: txItems } = await supabase
      .from("transaction_items")
      .select("catalog_item_id, total_price")
      .in("transaction_id", txIds);

    // Step 2: Get catalog items with their categories
    const { data: catalogItems } = await supabase
      .from("catalog_items")
      .select("id, category_id, catalog_categories(name)")
      .eq("business_id", business.id);

    // Build item -> category map
    const itemCatMap: Record<string, string> = {};
    for (const ci of catalogItems || []) {
      const catName = (ci as any).catalog_categories?.name || "Sin categoría";
      itemCatMap[ci.id] = catName;
    }

    // Aggregate revenue by category
    const catMap: Record<string, number> = {};
    for (const item of txItems || []) {
      const catName = itemCatMap[item.catalog_item_id] || "Sin categoría";
      catMap[catName] = (catMap[catName] || 0) + Number(item.total_price || 0);
    }

    categoryData = Object.entries(catMap)
      .map(([name, value]) => ({ name, value, color: "" }))
      .sort((a, b) => b.value - a.value);
  }

  // ── Helpers ──────────────────────────────────────────────────
  const greeting = getGreeting();
  const name = profile?.display_name ?? "Usuario";

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: business.currency || "COP",
      minimumFractionDigits: 0,
    }).format(amount);

  const calcChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "+100%" : "0%";
    const pct = Math.round(((current - previous) / previous) * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  };

  const getTrend = (current: number, previous: number): "up" | "down" | "neutral" => {
    if (current > previous) return "up";
    if (current < previous) return "down";
    return "neutral";
  };

  const statusLabels: Record<string, string> = {
    pending: "Pendiente",
    confirmed: "Confirmado",
    in_progress: "En curso",
    completed: "Completado",
    cancelled: "Cancelado",
  };

  const statusVariant = (s: string) => {
    if (s === "completed") return "default" as const;
    if (s === "cancelled") return "destructive" as const;
    if (s === "pending") return "secondary" as const;
    return "outline" as const;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {greeting}, {name} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Resumen de <span className="font-semibold text-foreground">{business.name}</span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pedidos hoy"
          value={String(ordersToday ?? 0)}
          change={calcChange(ordersToday ?? 0, ordersYesterday ?? 0)}
          icon={ShoppingCart}
          trend={getTrend(ordersToday ?? 0, ordersYesterday ?? 0)}
        />
        <StatCard
          title="Ingresos hoy"
          value={formatCurrency(revenueToday)}
          change={calcChange(revenueToday, revenueYesterday)}
          icon={DollarSign}
          trend={getTrend(revenueToday, revenueYesterday)}
        />
        <StatCard
          title="Clientes nuevos"
          value={String(contactsToday ?? 0)}
          change={calcChange(contactsToday ?? 0, contactsYesterday ?? 0)}
          icon={Users}
          trend={getTrend(contactsToday ?? 0, contactsYesterday ?? 0)}
        />
        <StatCard
          title="Productos activos"
          value={String(catalogCount ?? 0)}
          change=""
          icon={Package}
          trend="neutral"
        />
      </div>

      {/* Charts */}
      <DashboardCharts
        salesData={salesData}
        categoryData={categoryData}
        currency={business.currency || "COP"}
      />

      {/* Recent Orders + Quick Info */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pedidos recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {order.customer_name || order.code || "Sin nombre"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(order.created_at ?? Date.now()).toLocaleString("es-CO", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "short",
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={statusVariant(order.status ?? "pending")}>
                        {statusLabels[order.status ?? "pending"] || order.status}
                      </Badge>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatCurrency(Number(order.total))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mb-3 opacity-30" />
                <p>No hay pedidos aún</p>
                <p className="text-sm">Los pedidos aparecerán aquí</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Info del negocio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase font-semibold mb-1">Tipo</p>
                <p className="font-medium capitalize">{business.type.replace("_", " ")}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase font-semibold mb-1">Slug</p>
                <Badge variant="secondary" className="font-mono text-xs">/{business.slug}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase font-semibold mb-1">Moneda</p>
                <p className="font-medium">{business.currency || "COP"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase font-semibold mb-1">Zona horaria</p>
                <p className="font-medium text-xs">{business.timezone || "America/Bogota"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        {change && (
          <div className="mt-3">
            <Badge
              variant={
                trend === "up"
                  ? "default"
                  : trend === "down"
                  ? "destructive"
                  : "secondary"
              }
              className="text-xs"
            >
              {change} vs ayer
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}
