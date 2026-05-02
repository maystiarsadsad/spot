import { getActiveBusiness } from "@/lib/get-active-business";
import { redirect } from "next/navigation";
import { getEmployees, getPayrollRecords, getBusinessMembers } from "@/lib/actions/team";
import { TeamClient } from "@/components/team/team-client";
import { Users } from "lucide-react";

export default async function TeamPage() {
  const business = await getActiveBusiness();

  if (!business) {
    redirect("/d/getting-started");
  }

  const [employees, payroll, members] = await Promise.all([
    getEmployees(business.id),
    getPayrollRecords(business.id),
    getBusinessMembers(business.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <h1 className="flex items-center gap-3">
          <div className="section-header-icon">
            <Users className="h-5 w-5" />
          </div>
          Equipo
        </h1>
        <p>
          Gestiona el personal, nómina y accesos de {business.name}.
        </p>
      </div>
      
      <TeamClient 
        businessId={business.id}
        businessType={business.type}
        initialEmployees={employees || []}
        initialPayroll={payroll || []}
        initialMembers={members || []}
      />
    </div>
  );
}
