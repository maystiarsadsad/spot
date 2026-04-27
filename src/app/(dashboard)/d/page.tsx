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
      if (!item.catalog_item_id) continue;
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
    <div className="space-y-6">
      {/* Header */}
      <div className="dash-header">
        <h1>
          {greeting}, {name} 👋
        </h1>
        <p>
          Resumen de <span className="font-semibold text-foreground">{business.name}</span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="stat-card-gradient stat-purple">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Pedidos hoy</p>
                <p className="text-3xl font-extrabold tracking-tight">{ordersToday ?? 0}</p>
              </div>
              <div className="stat-icon-ring ring-purple">
                <ShoppingCart className="h-5 w-5" />
              </div>
            </div>
            {(ordersYesterday ?? 0) > 0 || (ordersToday ?? 0) > 0 ? (
              <div className="mt-3">
                <span className={`trend-badge ${getTrend(ordersToday ?? 0, ordersYesterday ?? 0) === 'up' ? 'trend-up' : getTrend(ordersToday ?? 0, ordersYesterday ?? 0) === 'down' ? 'trend-down' : 'trend-neutral'}`}>
                  <TrendingUp className="h-3 w-3" />
                  {calcChange(ordersToday ?? 0, ordersYesterday ?? 0)} vs ayer
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="stat-card-gradient stat-green">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Ingresos hoy</p>
                <p className="text-3xl font-extrabold tracking-tight">{formatCurrency(revenueToday)}</p>
              </div>
              <div className="stat-icon-ring ring-green">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            {revenueYesterday > 0 || revenueToday > 0 ? (
              <div className="mt-3">
                <span className={`trend-badge ${getTrend(revenueToday, revenueYesterday) === 'up' ? 'trend-up' : getTrend(revenueToday, revenueYesterday) === 'down' ? 'trend-down' : 'trend-neutral'}`}>
                  <TrendingUp className="h-3 w-3" />
                  {calcChange(revenueToday, revenueYesterday)} vs ayer
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="stat-card-gradient stat-blue">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Clientes nuevos</p>
                <p className="text-3xl font-extrabold tracking-tight">{contactsToday ?? 0}</p>
              </div>
              <div className="stat-icon-ring ring-blue">
                <Users className="h-5 w-5" />
              </div>
            </div>
            {(contactsYesterday ?? 0) > 0 || (contactsToday ?? 0) > 0 ? (
              <div className="mt-3">
                <span className={`trend-badge ${getTrend(contactsToday ?? 0, contactsYesterday ?? 0) === 'up' ? 'trend-up' : getTrend(contactsToday ?? 0, contactsYesterday ?? 0) === 'down' ? 'trend-down' : 'trend-neutral'}`}>
                  <TrendingUp className="h-3 w-3" />
                  {calcChange(contactsToday ?? 0, contactsYesterday ?? 0)} vs ayer
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="stat-card-gradient stat-amber">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Productos activos</p>
                <p className="text-3xl font-extrabold tracking-tight">{catalogCount ?? 0}</p>
              </div>
              <div className="stat-icon-ring ring-amber">
                <Package className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <DashboardCharts
        salesData={salesData}
        categoryData={categoryData}
        currency={business.currency || "COP"}
      />

      {/* Recent Orders + Quick Info */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="card-interactive">
          <CardHeader className="pb-3">
            <div className="section-header">
              <div className="section-header-title">
                <div className="section-header-icon">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                Pedidos recientes
              </div>
              <Badge variant="secondary" className="text-xs">{recentOrders?.length ?? 0}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-1">
                {recentOrders.map((order) => {
                  const statusDot = order.status === 'completed' ? 'dot-green'
                    : order.status === 'cancelled' ? 'dot-red'
                    : order.status === 'pending' ? 'dot-yellow'
                    : 'dot-blue';
                  return (
                    <div key={order.id} className="activity-row">
                      <div className={`activity-dot ${statusDot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {order.customer_name || order.code || "Sin nombre"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          {new Date(order.created_at ?? Date.now()).toLocaleString("es-CO", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "short",
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant(order.status ?? "pending")} className="text-[10px] px-2">
                          {statusLabels[order.status ?? "pending"] || order.status}
                        </Badge>
                        <span className="text-sm font-bold tabular-nums whitespace-nowrap">
                          {formatCurrency(Number(order.total))}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <ShoppingCart className="h-7 w-7" />
                </div>
                <h3>No hay pedidos aún</h3>
                <p>Los pedidos aparecerán aquí</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardHeader className="pb-3">
            <div className="section-header">
              <div className="section-header-title">
                <div className="section-header-icon">
                  <TrendingUp className="h-4 w-4" />
                </div>
                Info del negocio
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-accent/50">
                <p className="text-muted-foreground text-xs uppercase font-semibold mb-1.5">Tipo</p>
                <p className="font-semibold capitalize">{business.type.replace("_", " ")}</p>
              </div>
              <div className="p-3 rounded-lg bg-accent/50">
                <p className="text-muted-foreground text-xs uppercase font-semibold mb-1.5">Slug</p>
                <Badge variant="secondary" className="font-mono text-xs">/{business.slug}</Badge>
              </div>
              <div className="p-3 rounded-lg bg-accent/50">
                <p className="text-muted-foreground text-xs uppercase font-semibold mb-1.5">Moneda</p>
                <p className="font-semibold">{business.currency || "COP"}</p>
              </div>
              <div className="p-3 rounded-lg bg-accent/50">
                <p className="text-muted-foreground text-xs uppercase font-semibold mb-1.5">Zona horaria</p>
                <p className="font-semibold text-xs">{business.timezone || "America/Bogota"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

