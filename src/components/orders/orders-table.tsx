"use client";

import { useState, useTransition } from "react";
import { formatCurrency } from "@/lib/utils";
import { updateOrderStatus } from "@/lib/actions/orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Loader2, RefreshCw, FileText } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";

interface Transaction {
  id: string;
  code: string | null;
  type: string | null;
  status: string | null;
  total: number;
  payment_method: string | null;
  payment_status: string | null;
  customer_name: string | null;
  created_at: string | null;
  completed_at: string | null;
}

interface Props {
  transactions: Transaction[];
  currency: string;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendiente", variant: "secondary" },
  confirmed: { label: "Confirmado", variant: "default" },
  in_progress: { label: "En Proceso", variant: "default" },
  completed: { label: "Completado", variant: "outline" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

const paymentStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "text-amber-500" },
  paid: { label: "Pagado", color: "text-green-500" },
  refunded: { label: "Reembolsado", color: "text-red-500" },
};

export function OrdersTable({ transactions, currency }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(id: string, newStatus: string) {
    startTransition(async () => {
      const result = await updateOrderStatus(id, newStatus);
      if (result.error) {
        toast.error("Error al actualizar estado");
      } else {
        toast.success("Estado actualizado");
      }
    });
  }

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
      <ScrollArea className="w-full">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Orden</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden sm:table-cell">Fecha</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="hidden md:table-cell">Estado Pago</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No hay pedidos registrados
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((txn) => {
                const s = statusMap[txn.status || 'pending'] || { label: txn.status, variant: "outline" };
                const ps = paymentStatusMap[txn.payment_status || 'pending'] || { label: txn.payment_status, color: "text-muted-foreground" };
                
                return (
                  <TableRow key={txn.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {txn.code || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>{txn.customer_name || <span className="text-muted-foreground italic">Consumidor Final</span>}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {txn.created_at ? new Date(txn.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short" }) : "N/A"}
                    </TableCell>
                    <TableCell className="font-semibold">{formatCurrency(txn.total, currency)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className={`text-sm font-medium ${ps.color}`}>
                        {ps.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon", className: "h-8 w-8" })}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actualizar Estado</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleStatusChange(txn.id, 'confirmed')} disabled={txn.status === 'confirmed' || txn.status === 'completed' || isPending}>
                            Confirmar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(txn.id, 'completed')} disabled={txn.status === 'completed' || isPending}>
                            Marcar Completado
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleStatusChange(txn.id, 'cancelled')} disabled={txn.status === 'cancelled' || isPending} className="text-red-600">
                            Cancelar Orden
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
      </ScrollArea>
    </div>
  );
}
