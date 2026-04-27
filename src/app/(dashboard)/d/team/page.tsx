import { getActiveBusiness } from "@/lib/get-active-business";
import { redirect } from "next/navigation";
import { getEmployees, getPayrollRecords } from "@/lib/actions/team";
import { TeamClient } from "@/components/team/team-client";
import { Users } from "lucide-react";

export default async function TeamPage() {
  const business = await getActiveBusiness();

  if (!business) {
    redirect("/d/getting-started");
  }

  const employees = await getEmployees(business.id);
  const payroll = await getPayrollRecords(business.id);

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <h1 className="flex items-center gap-3">
          <div className="section-header-icon">
            <Users className="h-5 w-5" />
          </div>
          Equipo y Nómina
        </h1>
        <p>
          Gestiona el personal de {business.name}, sus cargos y liquidaciones de pago.
        </p>
      </div>
      
      <TeamClient 
        businessId={business.id}
        businessType={business.type}
        initialEmployees={employees || []}
        initialPayroll={payroll || []}
      />
    </div>
  );
}
