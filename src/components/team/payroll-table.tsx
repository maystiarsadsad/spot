"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Trash2, MoreHorizontal, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { deletePayrollRecord } from "@/lib/actions/team";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PayrollDialog } from "./payroll-dialog";

export function PayrollTable({ 
  businessId, 
  payroll,
  employees
}: { 
  businessId: string; 
  payroll: any[];
  employees: any[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredPayroll = payroll.filter(
    (record) =>
      record.employee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este registro de nómina?")) return;
    setIsDeleting(id);
    const result = await deletePayrollRecord(id);
    if (result.success) {
      toast.success("Registro de pago eliminado");
    } else {
      toast.error(result.error || "Error al eliminar");
    }
    setIsDeleting(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por empleado..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto gap-2" variant="secondary">
          <PlusCircle className="h-4 w-4" />
          Liquidar Pago
        </Button>
      </div>

      <div className="rounded-md border bg-card/50">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Período / Fecha Pago</TableHead>
              <TableHead>Empleado</TableHead>
              <TableHead className="text-right">Salario Base</TableHead>
              <TableHead className="text-right">Bonos / Extras</TableHead>
              <TableHead className="text-right">Deducciones</TableHead>
              <TableHead className="text-right text-primary font-bold">Total Pagado</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayroll.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No hay registros de pagos de nómina aún.
                </TableCell>
              </TableRow>
            ) : (
              filteredPayroll.map((record) => {
                const totalExtras = (record.bonuses || 0) + (record.overtime_pay || 0);
                const totalDeductions = (record.deductions || 0) + (record.tax || 0);
                
                return (
                  <TableRow key={record.id} className="group hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium whitespace-nowrap">
                      {format(new Date(record.period_start), "dd MMM")} - {format(new Date(record.period_end), "dd MMM yyyy", { locale: es })}
                      {record.paid_at && (
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <FileText className="h-3 w-3"/> Pagado: {format(new Date(record.paid_at), "dd MMM")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{record.employee?.full_name || "Desconocido"}</div>
                      <div className="text-xs text-muted-foreground">{record.employee?.position}</div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(record.base_salary)}
                    </TableCell>
                    <TableCell className="text-right text-emerald-500 text-sm">
                      {totalExtras > 0 ? `+ ${formatCurrency(totalExtras)}` : "-"}
                    </TableCell>
                    <TableCell className="text-right text-destructive text-sm">
                      {totalDeductions > 0 ? `- ${formatCurrency(totalDeductions)}` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatCurrency(record.net_pay)}
                    </TableCell>
                    <TableCell className="text-center">
                       <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Pagado</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                         <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(record.id)}
                            disabled={isDeleting === record.id}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar Registro
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <PayrollDialog 
        businessId={businessId}
        employees={employees}
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
