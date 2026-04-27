import { getActiveBusiness } from "@/lib/get-active-business";
import { redirect } from "next/navigation";
import { getOverviewStats, getExpensesByCategory, getRevenueMockData } from "@/lib/actions/reports";
import { ReportsClient } from "@/components/reports/reports-client";
import { Metadata } from "next";
import { BarChart3 } from "lucide-react";

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
    <div className="space-y-6">
      <div className="dash-header">
        <h1 className="flex items-center gap-3">
          <div className="section-header-icon">
            <BarChart3 className="h-5 w-5" />
          </div>
          Reportes y Analíticas
        </h1>
        <p>
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
