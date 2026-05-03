"use client";

import { formatCurrency } from "@/lib/utils";
import {
  DollarSign, Users, Package, FileText, TrendingUp, TrendingDown,
  ShoppingCart, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface ReportsClientProps {
  businessId: string;
  currency: string;
  stats: {
    totalContacts: number;
    totalExpenses: number;
    totalItems: number;
    totalEmployees: number;
    totalRevenue: number;
    totalTransactions: number;
  };
  expensesByCategory: { name: string; value: number }[];
  weeklyFlow: { name: string; revenue: number; expenses: number }[];
  monthlyRevenue: {
    current: number;
    previous: number;
    percentChange: number;
  };
}

const COLORS = ["#ff5b1f", "#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

export function ReportsClient({
  businessId,
  currency,
  stats,
  expensesByCategory,
  weeklyFlow,
  monthlyRevenue,
}: ReportsClientProps) {
  const fmt = (n: number) => formatCurrency(n, currency);

  const ChangeIcon =
    monthlyRevenue.percentChange > 0 ? ArrowUpRight :
    monthlyRevenue.percentChange < 0 ? ArrowDownRight : Minus;

  const changeColor =
    monthlyRevenue.percentChange > 0 ? "#10b981" :
    monthlyRevenue.percentChange < 0 ? "#ef4444" : "var(--ink-3)";

  const profit = stats.totalRevenue - stats.totalExpenses;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rpt-tooltip">
        <p className="rpt-tooltip-label">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="rpt-tooltip-val">
            {p.name}: {fmt(p.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="rpt-root">
      {/* KPI Cards */}
      <div className="rpt-kpi-grid">
        {/* Monthly Revenue */}
        <div className="rpt-kpi">
          <div className="rpt-kpi-header">
            <span>Ingresos del Mes</span>
            <DollarSign size={15} className="rpt-kpi-icon green" />
          </div>
          <div className="rpt-kpi-value green">{fmt(monthlyRevenue.current)}</div>
          <div className="rpt-kpi-change" style={{ color: changeColor }}>
            <ChangeIcon size={13} />
            {monthlyRevenue.percentChange > 0 ? "+" : ""}{monthlyRevenue.percentChange}% vs mes anterior
          </div>
        </div>

        {/* Total Expenses */}
        <div className="rpt-kpi">
          <div className="rpt-kpi-header">
            <span>Total Gastos</span>
            <TrendingDown size={15} className="rpt-kpi-icon red" />
          </div>
          <div className="rpt-kpi-value">{fmt(stats.totalExpenses)}</div>
          <div className="rpt-kpi-sub">Todas las transacciones registradas</div>
        </div>

        {/* Contacts */}
        <div className="rpt-kpi">
          <div className="rpt-kpi-header">
            <span>Base de Clientes</span>
            <Users size={15} className="rpt-kpi-icon blue" />
          </div>
          <div className="rpt-kpi-value">{stats.totalContacts}</div>
          <div className="rpt-kpi-sub">Perfiles en directorio</div>
        </div>

        {/* Items + Employees */}
        <div className="rpt-kpi">
          <div className="rpt-kpi-header">
            <span>Catálogo y Personal</span>
            <Package size={15} className="rpt-kpi-icon amber" />
          </div>
          <div className="rpt-kpi-split">
            <div>
              <span className="rpt-kpi-val-sm">{stats.totalItems}</span>
              <span className="rpt-kpi-label-sm">Artículos</span>
            </div>
            <div className="rpt-kpi-divider" />
            <div>
              <span className="rpt-kpi-val-sm">{stats.totalEmployees}</span>
              <span className="rpt-kpi-label-sm">Empleados</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profit summary */}
      <div className="rpt-profit-bar">
        <div className="rpt-profit-item">
          <ShoppingCart size={14} />
          <span>{stats.totalTransactions} ventas</span>
        </div>
        <div className="rpt-profit-item">
          <TrendingUp size={14} />
          <span>Ingresos: <strong>{fmt(stats.totalRevenue)}</strong></span>
        </div>
        <div className="rpt-profit-item">
          <TrendingDown size={14} />
          <span>Gastos: <strong>{fmt(stats.totalExpenses)}</strong></span>
        </div>
        <div className={`rpt-profit-item ${profit >= 0 ? "green" : "red"}`}>
          <DollarSign size={14} />
          <span>Balance: <strong>{fmt(profit)}</strong></span>
        </div>
      </div>

      {/* Charts */}
      <div className="rpt-charts">
        {/* Weekly financial flow */}
        <div className="rpt-chart-card main">
          <div className="rpt-chart-header">
            <TrendingUp size={16} />
            <div>
              <h3>Flujo Financiero — Últimos 7 días</h3>
              <p>Ingresos vs gastos por día</p>
            </div>
          </div>
          <div className="rpt-chart-body">
            {weeklyFlow.every((d) => d.revenue === 0 && d.expenses === 0) ? (
              <div className="rpt-chart-empty">
                <TrendingUp size={32} strokeWidth={1} />
                <p>Sin movimientos esta semana</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={weeklyFlow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="var(--ink-3)" />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="var(--ink-3)"
                    tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "var(--background-2)" }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="revenue" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="expenses" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Expenses donut */}
        <div className="rpt-chart-card side">
          <div className="rpt-chart-header">
            <FileText size={16} />
            <div>
              <h3>Distribución de Gastos</h3>
              <p>Clasificación por categoría</p>
            </div>
          </div>
          <div className="rpt-chart-body">
            {expensesByCategory.length === 0 ? (
              <div className="rpt-chart-empty">
                <FileText size={32} strokeWidth={1} />
                <p>No hay gastos registrados</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="45%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {expensesByCategory.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    formatter={(value) => <span className="rpt-legend">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
