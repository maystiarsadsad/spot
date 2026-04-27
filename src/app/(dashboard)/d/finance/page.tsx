import { getActiveBusiness } from "@/lib/get-active-business";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FinanceClient } from "@/components/finance/finance-client";
import { getExpenses, getDailyCash } from "@/lib/actions/finance";
import { format } from "date-fns";

export default async function FinancePage() {
  const business = await getActiveBusiness();

  if (!business) {
    redirect("/d/getting-started");
  }

  const supabase = await createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  
  // Fetch initial data
  const expenses = await getExpenses(business.id);
  const dailyCash = await getDailyCash(business.id, today);

  // Month boundaries
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // Revenue this month (from completed transactions)
  const { data: monthTransactions } = await supabase
    .from("transactions")
    .select("total")
    .eq("business_id", business.id)
    .in("status", ["completed", "confirmed"])
    .gte("created_at", monthStart)
    .lte("created_at", monthEnd);

  const monthRevenue = (monthTransactions || []).reduce(
    (sum, t) => sum + Number(t.total || 0), 0
  );

  // Expenses this month
  const monthExpenses = (expenses || [])
    .filter((e) => {
      const d = new Date(e.date);
      return d >= new Date(monthStart) && d <= new Date(monthEnd);
    })
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // Expense breakdown by category
  const expenseByCategory: Record<string, number> = {};
  for (const e of expenses || []) {
    const d = new Date(e.date);
    if (d >= new Date(monthStart) && d <= new Date(monthEnd)) {
      expenseByCategory[e.category] =
        (expenseByCategory[e.category] || 0) + Number(e.amount || 0);
    }
  }

  const financeStats = {
    monthRevenue,
    monthExpenses,
    netProfit: monthRevenue - monthExpenses,
    expenseByCategory,
    currency: business.currency || "COP",
    monthLabel: now.toLocaleDateString("es-CO", { month: "long", year: "numeric" }),
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Finanzas</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona los gastos, caja diaria y estado financiero de {business.name}.
        </p>
      </div>
      <FinanceClient 
        businessId={business.id} 
        initialExpenses={expenses || []}
        initialDailyCash={dailyCash || null}
        todayDate={today}
        financeStats={financeStats}
      />
    </div>
  );
}

