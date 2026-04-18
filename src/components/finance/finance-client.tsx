"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyCash } from "./daily-cash";
import { ExpensesTable } from "./expenses-table";
import { Database } from "@/types/database";

type Expense = Database["public"]["Tables"]["expenses"]["Row"];
type DailyCashRow = Database["public"]["Tables"]["daily_cash"]["Row"];

interface FinanceClientProps {
  businessId: string;
  initialExpenses: Expense[];
  initialDailyCash: DailyCashRow | null;
  todayDate: string;
}

export function FinanceClient({
  businessId,
  initialExpenses,
  initialDailyCash,
  todayDate,
}: FinanceClientProps) {
  const [activeTab, setActiveTab] = useState("daily-cash");

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

      <TabsContent value="overview" className="mt-0 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Resumen Financiero</CardTitle>
            <CardDescription>Estadísticas y reportes de ingresos y gastos.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground">
            Módulo de gráficas y reportes en construcción...
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
