import { getActiveBusiness } from "@/lib/get-active-business";
import { redirect } from "next/navigation";
import { FinanceClient } from "@/components/finance/finance-client";
import { getExpenses, getDailyCash } from "@/lib/actions/finance";
import { format } from "date-fns";

export default async function FinancePage() {
  const business = await getActiveBusiness();

  if (!business) {
    redirect("/d/getting-started");
  }

  const today = format(new Date(), "yyyy-MM-dd");
  
  // Fetch initial data
  const expenses = await getExpenses(business.id);
  const dailyCash = await getDailyCash(business.id, today);

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
      />
    </div>
  );
}
