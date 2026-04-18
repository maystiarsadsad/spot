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
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">Centro de Control</h1>
          <p className="text-muted-foreground mt-1 text-lg">Visión global de Spot Platform y sus métricas críticas.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            className="bg-orange-600 hover:bg-orange-700 h-11 px-6 shadow-lg shadow-orange-500/20" 
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
          { title: "Negocios Totales", value: businessesCount || 0, icon: Building2, change: "+12%", trend: "up" },
          { title: "Usuarios Activos", value: usersCount || 0, icon: Users, change: "+8%", trend: "up" },
          { title: "MRR Estimado", value: "$4.2k", icon: CreditCard, change: "+15%", trend: "up" },
          { title: "Uptime Sistema", value: "99.9%", icon: Activity, change: "Stable", trend: "neutral" },
        ].map((stat, i) => (
          <Card key={i} className="border-orange-100 dark:border-orange-950/50 shadow-sm hover:shadow-md transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold tracking-tight">{stat.value}</div>
              <div className="flex items-center gap-1 mt-2">
                {stat.trend === 'up' ? (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-none px-1.5 py-0 h-5">
                    <ArrowUpRight className="size-3 mr-0.5" /> {stat.change}
                  </Badge>
                ) : stat.trend === 'down' ? (
                  <Badge variant="destructive" className="bg-red-100 text-red-700 border-none px-1.5 py-0 h-5">
                    <ArrowDownRight className="size-3 mr-0.5" /> {stat.change}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">{stat.change}</span>
                )}
                <span className="text-xs text-muted-foreground">vs mes anterior</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Growth Chart Simulation */}
        <Card className="md:col-span-4 border-orange-100 dark:border-orange-950/50">
          <CardHeader>
            <CardTitle>Crecimiento de Negocios</CardTitle>
            <CardDescription>Altas netas confirmadas en los últimos 30 días.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full bg-muted/20 rounded-2xl border-2 border-dashed border-muted/50 flex flex-col items-center justify-center p-8 text-center">
               <TrendingUp className="size-12 text-orange-200 mb-4" />
               <p className="font-semibold text-muted-foreground">Visualización de Datos</p>
               <p className="text-sm text-muted-foreground max-w-[200px]">Los gráficos de Chart.js/Recharts se integrarán en la siguiente fase.</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="md:col-span-3 border-orange-100 dark:border-orange-950/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Altas Recientes</CardTitle>
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
          <CardContent className="space-y-6">
            {recentBusinesses?.map((biz) => (
              <div key={biz.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                   <div className="size-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                     <Building2 className="size-5" />
                   </div>
                   <div>
                     <p className="font-bold group-hover:text-orange-600 transition-colors">{biz.name}</p>
                     <p className="text-xs text-muted-foreground">/{biz.slug}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-xs text-muted-foreground mb-1">{new Date(biz.created_at!).toLocaleDateString()}</p>
                   {biz.active ? (
                     <Badge className="bg-emerald-500/10 text-emerald-600 border-none h-5 px-1.5 shadow-none">Activo</Badge>
                   ) : (
                     <Badge variant="secondary" className="h-5 px-1.5">Pendiente</Badge>
                   )}
                </div>
              </div>
            ))}
            <Link href="/sa/businesses" className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-orange-200 dark:border-orange-900 group hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors text-sm font-medium text-orange-600">
               Explorar todos los negocios
               <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
