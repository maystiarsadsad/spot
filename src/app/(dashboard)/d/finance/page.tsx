import { getActiveBusiness } from "@/lib/get-active-business";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FinanceClient } from "@/components/finance/finance-client";
import { getExpenses, getDailyCash, getDailyCashHistory } from "@/lib/actions/finance";
import { getCreditAccounts, getCreditStats } from "@/lib/actions/credits";
import { getContacts } from "@/lib/actions/contacts";
import { format } from "date-fns";

import { DollarSign } from "lucide-react";

export default async function FinancePage() {
  const business = await getActiveBusiness();

  if (!business) {
    redirect("/d/getting-started");
  }

  const supabase = await createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const currency = business.currency || "COP";
  
  // Fetch initial data
  const [expenses, dailyCash, cashHistory, creditAccounts, creditStats, allContacts] = await Promise.all([
    getExpenses(business.id),
    getDailyCash(business.id, today),
    getDailyCashHistory(business.id, 30),
    getCreditAccounts(business.id),
    getCreditStats(business.id),
    getContacts(business.id),
  ]);

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
      if (!e.date) return false;
      const d = new Date(e.date);
      return d >= new Date(monthStart) && d <= new Date(monthEnd);
    })
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // Expense breakdown by category
  const expenseByCategory: Record<string, number> = {};
  for (const e of expenses || []) {
    if (!e.date) continue;
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
    currency,
    monthLabel: now.toLocaleDateString("es-CO", { month: "long", year: "numeric" }),
  };

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <h1 className="flex items-center gap-3">
          <div className="section-header-icon">
            <DollarSign className="h-5 w-5" />
          </div>
          Finanzas
        </h1>
        <p>
          Gestiona los gastos, caja diaria y estado financiero de {business.name}.
        </p>
      </div>
      <FinanceClient 
        businessId={business.id} 
        initialExpenses={expenses || []}
        initialDailyCash={dailyCash || null}
        cashHistory={cashHistory || []}
        todayDate={today}
        financeStats={financeStats}
        currency={currency}
        creditAccounts={creditAccounts || []}
        creditContacts={(allContacts || []).map((c: any) => ({ id: c.id, full_name: c.full_name, phone: c.phone, email: c.email }))}
        creditStats={creditStats}
      />
    </div>
  );
}
