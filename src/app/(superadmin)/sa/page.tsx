import { createClient } from "@/lib/supabase/server";
import { 
  Building2, 
  Users, 
  CreditCard, 
  TrendingUp, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function SuperAdminDashboard() {
  const supabase = await createClient();

  // Basic stats
  const { count: businessesCount } = await supabase.from("businesses").select("*", { count: "exact", head: true });
  const { count: usersCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
  const { data: recentBusinesses } = await supabase.from("businesses").select("*").order("created_at", { ascending: false }).limit(5);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight font-display">
            Centro de <em className="italic text-[var(--accent)]">Control</em>
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">Visión global de Spot Platform y sus métricas críticas.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white h-11 px-6 shadow-[var(--shadow-stamp)] hover:shadow-[var(--shadow-stamp-lg)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all" 
            render={<Link href="/sa/businesses/create" />}
            nativeButton={false}
          >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Negocio
          </Button>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Negocios Totales", value: businessesCount || 0, icon: Building2, change: "+12%", trend: "up", color: "var(--accent)" },
          { title: "Usuarios Activos", value: usersCount || 0, icon: Users, change: "+8%", trend: "up", color: "var(--violet)" },
          { title: "MRR Estimado", value: "$4.2k", icon: CreditCard, change: "+15%", trend: "up", color: "var(--success)" },
          { title: "Uptime Sistema", value: "99.9%", icon: Activity, change: "Stable", trend: "neutral", color: "var(--warning)" },
        ].map((stat, i) => (
          <Card key={i} className="stat-card-gradient border-[var(--line)] group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">{stat.title}</CardTitle>
              <div 
                className="p-2 rounded-xl group-hover:scale-110 transition-transform"
                style={{ background: `color-mix(in srgb, ${stat.color} 10%, transparent)`, color: stat.color }}
              >
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight font-display">{stat.value}</div>
              <div className="flex items-center gap-1 mt-2">
                {stat.trend === 'up' ? (
                  <span className="trend-badge trend-up">
                    <ArrowUpRight className="size-3" /> {stat.change}
                  </span>
                ) : stat.trend === 'down' ? (
                  <span className="trend-badge trend-down">
                    <ArrowDownRight className="size-3" /> {stat.change}
                  </span>
                ) : (
                  <span className="trend-badge trend-neutral">{stat.change}</span>
                )}
                <span className="text-xs text-muted-foreground font-mono">vs mes anterior</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Growth Chart Simulation */}
        <Card className="md:col-span-4 card-interactive">
          <CardHeader>
            <CardTitle className="font-display text-lg">Crecimiento de Negocios</CardTitle>
            <CardDescription>Altas netas confirmadas en los últimos 30 días.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full bg-[var(--background-2)] rounded-2xl border-2 border-dashed border-[var(--line)] flex flex-col items-center justify-center p-8 text-center">
               <TrendingUp className="size-12 text-[var(--line)] mb-4" />
               <p className="font-semibold text-muted-foreground font-display">Visualización de Datos</p>
               <p className="text-sm text-muted-foreground max-w-[200px]">Los gráficos de Recharts se integrarán en la siguiente fase.</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="md:col-span-3 card-interactive">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display text-lg">Altas Recientes</CardTitle>
              <CardDescription>Últimos negocios registrados.</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              render={<Link href="/sa/businesses" />}
              nativeButton={false}
            >
              Ver todos
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentBusinesses?.map((biz) => (
              <div key={biz.id} className="activity-row group">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                   <div className="size-10 rounded-xl bg-[var(--background-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                     <Building2 className="size-5" />
                   </div>
                   <div className="min-w-0">
                     <p className="font-bold group-hover:text-[var(--accent)] transition-colors truncate">{biz.name}</p>
                     <p className="text-[10px] text-muted-foreground font-mono">/{biz.slug}</p>
                   </div>
                </div>
                <div className="text-right shrink-0">
                   <p className="text-[10px] text-muted-foreground font-mono mb-1">{new Date(biz.created_at!).toLocaleDateString()}</p>
                   {biz.active ? (
                     <span className="badge-spot success">Activo</span>
                   ) : (
                     <span className="badge-spot">Pendiente</span>
                   )}
                </div>
              </div>
            ))}
            <Link href="/sa/businesses" className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-[var(--line)] group hover:bg-[var(--background-2)] transition-colors text-sm font-bold text-[var(--accent)] mt-3">
               Explorar todos los negocios
               <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
