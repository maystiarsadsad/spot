"use client";

import { useState } from "react";
import { Database } from "@/types/database";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ExpenseDialog } from "./expense-dialog";
import { deleteExpense } from "@/lib/actions/finance";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Expense = Database["public"]["Tables"]["expenses"]["Row"];

interface ExpensesTableProps {
  businessId: string;
  initialData: Expense[];
}

export function ExpensesTable({ businessId, initialData }: ExpensesTableProps) {
  const [data, setData] = useState<Expense[]>(initialData);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este gasto?")) return;
    
    setIsDeleting(id);
    const result = await deleteExpense(id);
    setIsDeleting(null);
    
    if (result.success) {
      toast.success("Gasto eliminado exitosamente");
      setData(data.filter((e) => e.id !== id));
    } else {
      toast.error("Error al eliminar: " + result.error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold tracking-tight">Registro de Gastos</h2>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Registrar Gasto
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Medio de Pago</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No hay gastos registrados.
                </TableCell>
              </TableRow>
            ) : (
              data.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    {expense.date ? format(new Date(expense.date), "MMM d, yyyy", { locale: es }) : "N/A"}
                  </TableCell>
                  <TableCell className="font-medium">{expense.description}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{expense.category}</Badge>
                  </TableCell>
                  <TableCell className="capitalize">{expense.payment_method || "Efectivo"}</TableCell>
                  <TableCell className="text-right font-semibold text-red-600">
                    -{formatCurrency(expense.amount)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
                        <span className="sr-only">Abrir menú</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                         <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(expense.id)}
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

      <ExpenseDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        businessId={businessId}
        onSuccess={() => {
          setIsDialogOpen(false);
          // Opcional: Recargar página o app context (actualmente se hace fetch via revalidatePath en la action)
          window.location.reload(); 
        }}
      />
    </div>
  );
}
