"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyCash } from "./daily-cash";
import { ExpensesTable } from "./expenses-table";
import { Database } from "@/types/database";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  MinusCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Expense = Database["public"]["Tables"]["expenses"]["Row"];
type DailyCashRow = Database["public"]["Tables"]["daily_cash"]["Row"];

interface FinanceStats {
  monthRevenue: number;
  monthExpenses: number;
  netProfit: number;
  expenseByCategory: Record<string, number>;
  currency: string;
  monthLabel: string;
}

interface FinanceClientProps {
  businessId: string;
  initialExpenses: Expense[];
  initialDailyCash: DailyCashRow | null;
  todayDate: string;
  financeStats: FinanceStats;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function FinanceClient({
  businessId,
  initialExpenses,
  initialDailyCash,
  todayDate,
  financeStats,
}: FinanceClientProps) {
  const [activeTab, setActiveTab] = useState("daily-cash");
  const { monthRevenue, monthExpenses, netProfit, expenseByCategory, currency, monthLabel } = financeStats;

  const sortedCategories = Object.entries(expenseByCategory)
    .sort(([, a], [, b]) => b - a);

  const maxCategoryValue = sortedCategories.length > 0 ? sortedCategories[0][1] : 1;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList>
        <TabsTrigger value="daily-cash">Caja Diaria</TabsTrigger>
        <TabsTrigger value="expenses">Gastos</TabsTrigger>
        <TabsTrigger value="overview">Resumen</TabsTrigger>
      </TabsList>

      <TabsContent value="daily-cash" className="mt-0 space-y-4">
        <DailyCash 
          businessId={businessId} 
          initialData={initialDailyCash} 
          todayDate={todayDate} 
        />
      </TabsContent>

      <TabsContent value="expenses" className="mt-0 space-y-4">
        <ExpensesTable 
          businessId={businessId} 
          initialData={initialExpenses} 
        />
      </TabsContent>

      <TabsContent value="overview" className="mt-0 space-y-6">
        {/* Month label */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm capitalize">
            📅 {monthLabel}
          </Badge>
        </div>

        {/* Financial Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card className="border-green-200 dark:border-green-900 bg-green-50/30 dark:bg-green-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Ingresos del mes</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {formatCurrency(monthRevenue, currency)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <ArrowUpCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Gastos del mes</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                    {formatCurrency(monthExpenses, currency)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                  <ArrowDownCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-${netProfit >= 0 ? 'blue' : 'orange'}-200 dark:border-${netProfit >= 0 ? 'blue' : 'orange'}-900`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Resultado neto</p>
                  <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>
                    {formatCurrency(netProfit, currency)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center">
                  {netProfit >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {netProfit >= 0 ? "✅ El negocio genera ganancias" : "⚠️ Los gastos superan los ingresos"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Expense Breakdown by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Gastos por categoría
            </CardTitle>
            <CardDescription>Distribución de gastos del mes actual</CardDescription>
          </CardHeader>
          <CardContent>
            {sortedCategories.length > 0 ? (
              <div className="space-y-4">
                {sortedCategories.map(([category, amount]) => (
                  <div key={category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{category}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {formatCurrency(amount, currency)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500"
                        style={{ width: `${Math.max((amount / maxCategoryValue) * 100, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MinusCircle className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm">No hay gastos registrados este mes</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

