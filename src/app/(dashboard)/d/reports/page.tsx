import { getActiveBusiness } from "@/lib/get-active-business";
import { redirect } from "next/navigation";
import { getOverviewStats, getExpensesByCategory, getRevenueMockData } from "@/lib/actions/reports";
import { ReportsClient } from "@/components/reports/reports-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reportes y Analíticas",
};

export default async function ReportsPage() {
  const business = await getActiveBusiness();

  if (!business) {
    redirect("/d/getting-started");
  }

  const [stats, expensesByCategory, revenueData] = await Promise.all([
    getOverviewStats(business.id),
    getExpensesByCategory(business.id),
    getRevenueMockData()
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes y Analíticas</h1>
        <p className="text-muted-foreground mt-1">
          Métricas clave, comportamiento financiero y rendimiento operativo de {business.name}.
        </p>
      </div>
      
      <ReportsClient 
        businessId={business.id}
        stats={stats}
        expensesByCategory={expensesByCategory}
        revenueData={revenueData}
      />
    </div>
  );
}
