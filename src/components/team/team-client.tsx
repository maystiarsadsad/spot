"use client";

import { useState } from "react";
import { Users, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { EmployeesTable } from "./employees-table";
import { PayrollTable } from "./payroll-table";
import { AccessManager } from "./access-manager";

interface TeamClientProps {
  businessId: string;
  businessType: string;
  initialEmployees: any[];
  initialPayroll: any[];
  initialMembers: any[];
}

export function TeamClient({
  businessId,
  businessType,
  initialEmployees,
  initialPayroll,
  initialMembers,
}: TeamClientProps) {
  const [activeTab, setActiveTab] = useState("employees");

  const tabs = [
    { id: "employees", label: "Empleados", icon: Users },
    { id: "payroll", label: "Nómina", icon: FileSpreadsheet },
    { id: "access", label: "Accesos", icon: ShieldCheck },
  ];

  return (
    <div className="team-root">
      <div className="fin-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`fin-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "employees" && (
        <EmployeesTable businessId={businessId} businessType={businessType} employees={initialEmployees} />
      )}

      {activeTab === "payroll" && (
        <PayrollTable businessId={businessId} payroll={initialPayroll} employees={initialEmployees} />
      )}

      {activeTab === "access" && (
        <AccessManager businessId={businessId} businessType={businessType} members={initialMembers} />
      )}
    </div>
  );
}
