"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, ArrowDownRight, ArrowUpRight, ArrowRightLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MovementDialog } from "./movement-dialog";

export function MovementsTable({ 
  businessId, 
  movements,
  inventoryItems
}: { 
  businessId: string; 
  movements: any[];
  inventoryItems: any[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredMovements = movements.filter(
    (mov) =>
      mov.inventory?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "in": return <ArrowDownRight className="h-4 w-4 text-emerald-500" />;
      case "out": return <ArrowUpRight className="h-4 w-4 text-destructive" />;
      case "adjust": return <ArrowRightLeft className="h-4 w-4 text-amber-500" />;
      default: return null;
    }
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case "in": return <span className="text-emerald-500 font-medium">Entrada</span>;
      case "out": return <span className="text-destructive font-medium">Salida</span>;
      case "adjust": return <span className="text-amber-500 font-medium">Ajuste</span>;
      default: return type;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por producto, concepto..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto gap-2" variant="secondary">
          <PlusCircle className="h-4 w-4" />
          Registrar Movimiento
        </Button>
      </div>

      <div className="rounded-md border bg-card/50">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Fecha</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-center">Tipo</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Costo Unit / Val Total</TableHead>
              <TableHead>Concepto / Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMovements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No hay historial de movimientos.
                </TableCell>
              </TableRow>
            ) : (
              filteredMovements.map((mov) => {
                const isPositive = mov.type === "in" || (mov.type === "adjust" && mov.quantity > 0);
                const isNegative = mov.type === "out" || (mov.type === "adjust" && mov.quantity < 0);
                
                return (
                  <TableRow key={mov.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium whitespace-nowrap">
                      {format(new Date(mov.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">{mov.inventory?.name || "Desconocido"}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="gap-1 px-2 py-0.5 rounded-full bg-background">
                        {getMovementIcon(mov.type)}
                        {getMovementLabel(mov.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold font-mono">
                      <span className={isPositive ? "text-emerald-500" : isNegative ? "text-destructive" : ""}>
                        {isPositive ? "+" : isNegative ? "-" : ""}
                        {Math.abs(mov.quantity)} {mov.inventory?.unit}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {mov.total_cost > 0 ? (
                        <>
                          <div className="text-xs text-muted-foreground">{formatCurrency(mov.unit_cost || 0)}</div>
                          <div className="font-medium">{formatCurrency(mov.total_cost)}</div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate" title={mov.notes || ""}>
                      {mov.notes || "-"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <MovementDialog 
        businessId={businessId}
        inventoryItems={inventoryItems}
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
