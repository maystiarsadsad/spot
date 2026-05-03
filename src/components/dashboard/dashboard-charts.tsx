"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, PieChart as PieChartIcon } from "lucide-react";

interface SalesChartData {
  day: string;
  revenue: number;
  orders: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface DashboardChartsProps {
  salesData: SalesChartData[];
  categoryData: CategoryData[];
  currency: string;
}

const CATEGORY_COLORS = [
  "hsl(24, 95%, 53%)",   // orange
  "hsl(262, 83%, 58%)",  // purple
  "hsl(199, 89%, 48%)",  // cyan
  "hsl(142, 71%, 45%)",  // green
  "hsl(346, 77%, 50%)",  // rose
  "hsl(48, 96%, 53%)",   // amber
  "hsl(213, 94%, 58%)",  // blue
  "hsl(330, 81%, 60%)",  // pink
];

function formatCurrencyShort(value: number, currency: string) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function CustomTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string }[];
  label?: string;
  currency: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-xl">
      <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-6 text-sm">
          <span className="text-muted-foreground">
            {p.dataKey === "revenue" ? "Ingresos" : "Pedidos"}
          </span>
          <span className="font-bold tabular-nums">
            {p.dataKey === "revenue"
              ? new Intl.NumberFormat("es-CO", {
                  style: "currency",
                  currency,
                  minimumFractionDigits: 0,
                }).format(p.value)
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function CategoryTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { name: string } }[];
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0];

  return (
    <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-xl">
      <p className="text-sm font-semibold">{data.payload.name}</p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency,
          minimumFractionDigits: 0,
        }).format(data.value)}
      </p>
    </div>
  );
}

export function DashboardCharts({
  salesData,
  categoryData,
  currency,
}: DashboardChartsProps) {
  const totalRevenue = salesData.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = salesData.reduce((sum, d) => sum + d.orders, 0);

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
      {/* Sales Area Chart - 2/3 width */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Ventas últimos 7 días
              </CardTitle>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-2xl font-bold">
                  {formatCurrencyShort(totalRevenue, currency)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {totalOrders} pedidos
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={salesData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCurrencyShort(v, currency)}
                  width={55}
                />
                <Tooltip
                  content={<CustomTooltip currency={currency} />}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(24, 95%, 53%)"
                  strokeWidth={2.5}
                  fill="url(#revenueGradient)"
                  dot={{ fill: "hsl(24, 95%, 53%)", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, stroke: "hsl(24, 95%, 53%)", strokeWidth: 2, fill: "white" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown - 1/3 width */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-primary" />
            Por categoría
          </CardTitle>
          <p className="text-sm text-muted-foreground">Distribución de ventas</p>
        </CardHeader>
        <CardContent>
          {categoryData.length > 0 ? (
            <>
              <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<CategoryTooltip currency={currency} />}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {categoryData.slice(0, 5).map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                      />
                      <span className="text-muted-foreground truncate max-w-[120px]">
                        {cat.name}
                      </span>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {formatCurrencyShort(cat.value, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <PieChartIcon className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm">Sin datos de ventas</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
