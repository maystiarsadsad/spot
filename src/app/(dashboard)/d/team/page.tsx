import { getActiveBusiness } from "@/lib/get-active-business";
import { redirect } from "next/navigation";
import { getEmployees, getPayrollRecords } from "@/lib/actions/team";
import { TeamClient } from "@/components/team/team-client";

export default async function TeamPage() {
  const business = await getActiveBusiness();

  if (!business) {
    redirect("/d/getting-started");
  }

  const employees = await getEmployees(business.id);
  const payroll = await getPayrollRecords(business.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Equipo y Nómina</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona el personal de {business.name}, sus cargos y liquidaciones de pago.
        </p>
      </div>
      
      <TeamClient 
        businessId={business.id}
        initialEmployees={employees || []}
        initialPayroll={payroll || []}
      />
    </div>
  );
}
