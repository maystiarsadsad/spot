"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Edit, Trash2, MoreHorizontal, User, Phone, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { deleteEmployee } from "@/lib/actions/team";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmployeeDialog } from "./employee-dialog";

export function EmployeesTable({ businessId, businessType, employees }: { businessId: string; businessType: string; employees: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este empleado? Esta acción no se puede deshacer.")) return;
    setIsDeleting(id);
    const result = await deleteEmployee(id);
    if (result.success) {
      toast.success("Empleado eliminado");
    } else {
      toast.error(result.error || "Error al eliminar");
    }
    setIsDeleting(null);
  };

  const handleEdit = (emp: any) => {
    setSelectedEmployee(emp);
    setDialogOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedEmployee(null);
    setDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "active":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Activo</Badge>;
      case "inactive":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Inactivo</Badge>;
      case "on_leave":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">De Licencia</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar empleados..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={handleCreateNew} className="w-full sm:w-auto gap-2">
          <PlusCircle className="h-4 w-4" />
          Registrar Empleado
        </Button>
      </div>

      <div className="rounded-md border bg-card/50 overflow-x-auto">
        <Table className="min-w-[580px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Empleado</TableHead>
              <TableHead>Cargo / Dept.</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead className="text-right">Salario Mín / Base</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No hay empleados registrados.
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((emp) => (
                <TableRow key={emp.id} className="group hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div>{emp.full_name}</div>
                        <div className="text-xs text-muted-foreground">ID: {emp.document_id || "N/A"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{emp.position}</div>
                    <div className="text-xs text-muted-foreground">{emp.department || "-"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs">
                      {emp.phone && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" /> {emp.phone}
                        </div>
                      )}
                      {emp.email && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" /> {emp.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">{formatCurrency(emp.salary)}</div>
                    <div className="text-xs text-muted-foreground">
                      {emp.salary_type === "monthly" ? "Mensual" : emp.salary_type === "hourly" ? "Por hora" : "Variable"}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(emp.status)}
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
                        <DropdownMenuItem onClick={() => handleEdit(emp)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar Datos
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(emp.id)}
                          disabled={isDeleting === emp.id}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EmployeeDialog 
        businessId={businessId}
        businessType={businessType}
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        employeeToEdit={selectedEmployee}
      />
    </div>
  );
}
