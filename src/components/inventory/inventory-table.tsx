"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, MoreHorizontal, AlertTriangle, Trash2, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { deleteInventoryItem } from "@/lib/actions/inventory";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InventoryDialog } from "./inventory-dialog";

export function InventoryTable({ businessId, items }: { businessId: string; items: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este producto del inventario? Perderá el historial asocidado si se elimina por completo.")) return;
    setIsDeleting(id);
    const result = await deleteInventoryItem(id);
    if (result.success) {
      toast.success("Producto eliminado del inventario");
    } else {
      toast.error(result.error || "Error al eliminar");
    }
    setIsDeleting(null);
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedItem(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar productos..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={handleCreateNew} className="w-full sm:w-auto gap-2">
          <PlusCircle className="h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      <div className="rounded-md border bg-card/50">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Producto</TableHead>
              <TableHead className="hidden sm:table-cell">Categoría</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="hidden md:table-cell text-right">Costo Unit</TableHead>
              <TableHead className="hidden md:table-cell text-right">Valor Total</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No hay productos en tu inventario.
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => {
                const stockVal = item.current_stock || 0;
                const minStock = item.min_stock || 0;
                const isLowStock = stockVal <= minStock && stockVal > 0;
                const isOutOfStock = stockVal <= 0;

                return (
                  <TableRow key={item.id} className="group hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">
                      {item.name}
                      <div className="text-xs text-muted-foreground">{item.unit || "N/A"}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {item.category ? (
                        <Badge variant="outline" className="font-normal opacity-80">{item.category}</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {stockVal} {item.unit}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right">
                      {formatCurrency(item.cost_per_unit || 0)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right font-medium">
                      {formatCurrency((item.cost_per_unit || 0) * stockVal)}
                    </TableCell>
                    <TableCell className="text-center">
                      {isOutOfStock ? (
                        <div className="inline-flex items-center text-xs font-semibold text-destructive gap-1 px-2 py-0.5 rounded-full bg-destructive/10 border border-destructive/20">
                          <AlertTriangle className="h-3 w-3" />
                          Agotado
                        </div>
                      ) : isLowStock ? (
                        <div className="inline-flex items-center text-xs font-semibold text-amber-500 gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                          Bajo ({minStock})
                        </div>
                      ) : (
                        <div className="inline-flex items-center text-xs font-semibold text-emerald-500 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                          Ok
                        </div>
                      )}
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
                          <DropdownMenuItem onClick={() => handleEdit(item)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar producto
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(item.id)}
                            disabled={isDeleting === item.id}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
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

      <InventoryDialog 
        businessId={businessId}
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        itemToEdit={selectedItem}
      />
    </div>
  );
}
