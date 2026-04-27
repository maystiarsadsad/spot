"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileSpreadsheet } from "lucide-react";
import { EmployeesTable } from "./employees-table";
import { PayrollTable } from "./payroll-table";

interface TeamClientProps {
  businessId: string;
  businessType: string;
  initialEmployees: any[];
  initialPayroll: any[];
}

export function TeamClient({ businessId, businessType, initialEmployees, initialPayroll }: TeamClientProps) {
  return (
    <Tabs defaultValue="employees" className="space-y-6">
      <TabsList className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-1 border">
        <TabsTrigger value="employees" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Directorio de Empleados
        </TabsTrigger>
        <TabsTrigger value="payroll" className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Nómina y Pagos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="employees" className="animate-in fade-in-50 zoom-in-95 duration-300">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Plantilla de Personal</CardTitle>
            <CardDescription>
              Gestiona a los miembros de tu equipo, sus salarios y cargos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeesTable businessId={businessId} businessType={businessType} employees={initialEmployees} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="payroll" className="animate-in fade-in-50 zoom-in-95 duration-300">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Historial de Nómina</CardTitle>
            <CardDescription>
              Control de salarios pagados, bonos, horas extra y deducciones.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <PayrollTable businessId={businessId} payroll={initialPayroll} employees={initialEmployees} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
