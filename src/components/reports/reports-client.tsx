"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, Users, Package, FileText, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

interface ReportsClientProps {
  businessId: string;
  stats: {
    totalContacts: number;
    totalExpenses: number;
    totalItems: number;
    totalEmployees: number;
  };
  expensesByCategory: { name: string; value: number }[];
  revenueData: any[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff7300'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border p-3 rounded-lg shadow-xl">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm" style={{ color: p.color }}>
            {p.name}: {p.name === 'Ingresos' || p.name === 'Gastos' || p.name === 'Valor' || p.name.includes('revenue') ? formatCurrency(p.value) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function ReportsClient({ businessId, stats, expensesByCategory, revenueData }: ReportsClientProps) {
  return (
    <div className="space-y-6">
      
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Proyectados</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{formatCurrency(12450.00)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +20.1% respecto al mes anterior (*Demo)
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gastos (Registrados)</CardTitle>
            <TrendingUp className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Basado en transacciones del módulo financiero
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Base de Clientes</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContacts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Perfiles registrados en directorio
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Artículos y Personal</CardTitle>
            <Package className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
             <div className="flex justify-between items-center mt-2">
                 <div className="flex flex-col">
                     <span className="text-xl font-bold">{stats.totalItems}</span>
                     <span className="text-xs text-muted-foreground">En Catálogo</span>
                 </div>
                 <div className="w-[1px] h-8 bg-border"></div>
                 <div className="flex flex-col items-end">
                     <span className="text-xl font-bold">{stats.totalEmployees}</span>
                     <span className="text-xs text-muted-foreground">Empleados</span>
                 </div>
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Main Chart */}
        <Card className="col-span-full lg:col-span-4 border-border/50 shadow-sm">
          <CardHeader>
             <div className="flex items-center gap-2 mb-1">
                 <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-primary" />
                 </div>
                 <CardTitle>Flujo Financiero Semanal</CardTitle>
             </div>
             <CardDescription>
              Comparativa de ingresos y gastos operativos
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{fill: 'hsl(var(--muted)/0.4)'}} />
                <Legend iconType="circle" />
                <Bar dataKey="revenue" name="Ingresos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expenses" name="Gastos" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Donut Chart */}
        <Card className="col-span-full md:col-span-2 lg:col-span-3 border-border/50 shadow-sm">
          <CardHeader>
             <div className="flex items-center gap-2 mb-1">
                 <div className="p-2 bg-amber-500/10 rounded-lg">
                    <FileText className="h-4 w-4 text-amber-500" />
                 </div>
                 <CardTitle>Distribución de Gastos</CardTitle>
             </div>
             <CardDescription>
               Clasificación estructural de egresos
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] flex items-center justify-center relative">
            {expensesByCategory.length === 0 ? (
               <div className="text-center text-muted-foreground flex flex-col items-center gap-2">
                 <FileText className="h-8 w-8 opacity-20" />
                 <p className="text-sm">No hay gastos registrados para analizar.</p>
               </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    iconType="circle"
                    formatter={(value) => <span className="text-xs text-foreground font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
