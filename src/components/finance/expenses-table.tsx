"use client";

import { useState } from "react";
import { Database } from "@/types/database";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ExpenseDialog } from "./expense-dialog";
import { deleteExpense } from "@/lib/actions/finance";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Trash2, MoreHorizontal, Search } from "lucide-react";

type Expense = Database["public"]["Tables"]["expenses"]["Row"];

interface ExpensesTableProps {
  businessId: string;
  initialData: Expense[];
  currency: string;
}

function fmtCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

const categoryLabels: Record<string, string> = {
  operation: "Operación",
  supplies: "Insumos",
  payroll: "Nómina",
  utilities: "Servicios Públicos",
  maintenance: "Mantenimiento",
  marketing: "Marketing",
  other: "Otro",
};

export function ExpensesTable({ businessId, initialData, currency }: ExpensesTableProps) {
  const [data, setData] = useState<Expense[]>(initialData);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const filteredData = data.filter((e) =>
    e.description.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    
    setIsDeleting(id);
    const result = await deleteExpense(id);
    setIsDeleting(null);
    
    if (result.success) {
      toast.success("Gasto eliminado");
      setData(data.filter((e) => e.id !== id));
      router.refresh(); // Refresh server data instead of full reload
    } else {
      toast.error("Error al eliminar: " + result.error);
    }
  };

  return (
    <div className="fin-expenses">
      <div className="fin-expenses-header">
        <div>
          <h3>Registro de Gastos</h3>
          <p>{data.length} gasto{data.length !== 1 ? "s" : ""} registrado{data.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="fin-expenses-actions">
          <div className="fin-expenses-search">
            <Search size={14} />
            <input
              placeholder="Buscar gastos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="fin-cash-btn primary" onClick={() => setIsDialogOpen(true)}>
            <Plus size={15} />
            Registrar Gasto
          </button>
        </div>
      </div>

      <div className="fin-expenses-table-wrap">
        <table className="fin-expenses-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th>Categoría</th>
              <th>Medio</th>
              <th className="text-right">Monto</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="fin-expenses-empty">
                  No hay gastos registrados.
                </td>
              </tr>
            ) : (
              filteredData.map((expense) => (
                <tr key={expense.id}>
                  <td className="fin-exp-date">
                    {expense.date
                      ? format(new Date(expense.date + "T12:00:00"), "d MMM yyyy", { locale: es })
                      : "N/A"}
                  </td>
                  <td className="fin-exp-desc">{expense.description}</td>
                  <td>
                    <span className="fin-exp-badge">{categoryLabels[expense.category] || expense.category}</span>
                  </td>
                  <td className="fin-exp-method">
                    {expense.payment_method === "cash" ? "💵 Efectivo"
                      : expense.payment_method === "card" ? "💳 Tarjeta"
                      : expense.payment_method === "transfer" ? "📲 Transfer."
                      : expense.payment_method || "Efectivo"}
                  </td>
                  <td className="fin-exp-amount">
                    -{fmtCurrency(expense.amount, currency)}
                  </td>
                  <td>
                    <button
                      className="fin-exp-delete"
                      onClick={() => handleDelete(expense.id)}
                      disabled={isDeleting === expense.id}
                      title="Eliminar gasto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ExpenseDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        businessId={businessId}
        onSuccess={() => {
          setIsDialogOpen(false);
          router.refresh(); // Server revalidation instead of window.location.reload()
        }}
      />
    </div>
  );
}
