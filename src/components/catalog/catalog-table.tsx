"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
const CatalogItemDialog = dynamic(
  () => import("./item-dialog").then((mod) => mod.CatalogItemDialog),
  { ssr: false }
);
import { deleteItem, toggleItemActive } from "@/lib/actions/catalog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Package,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cost: number | null;
  compare_price: number | null;
  sku: string | null;
  category_id: string | null;
  type: string | null;
  active: boolean | null;
  image_url: string | null;
  created_at: string | null;
}

interface Props {
  businessId: string;
  businessType: string;
  items: CatalogItem[];
  categories: Category[];
  currency: string;
}

const typeLabels: Record<string, string> = {
  product: "Producto",
  service: "Servicio",
  room: "Habitación",
  membership: "Membresía",
};

export function CatalogTable({ businessId, businessType, items, categories, currency }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currency || "COP",
      minimumFractionDigits: 0,
    }).format(amount);

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null;
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? `${cat.icon || ""} ${cat.name}`.trim() : null;
  };

  const handleDelete = (itemId: string, itemName: string) => {
    if (!confirm(`¿Eliminar "${itemName}"? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const result = await deleteItem(itemId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Producto eliminado");
      }
    });
  };

  const handleToggle = (itemId: string, active: boolean) => {
    startTransition(async () => {
      const result = await toggleItemActive(itemId, active);
      if (result.error) toast.error(result.error);
    });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => {
            setEditingItem(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo producto
        </Button>
      </div>

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-center">Activo</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <div className="flex items-center gap-2">
                          {item.sku && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {item.sku}
                            </span>
                          )}
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {typeLabels[item.type || "product"] || item.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {getCategoryName(item.category_id) || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div>
                      <span className="font-semibold tabular-nums">
                        {formatCurrency(item.price)}
                      </span>
                      {item.compare_price && item.compare_price > item.price && (
                        <span className="text-xs text-muted-foreground line-through ml-2">
                          {formatCurrency(item.compare_price)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={item.active ?? true}
                      onCheckedChange={(checked) => handleToggle(item.id, checked)}
                      disabled={isPending}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon", className: "h-8 w-8" })}>
                          <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingItem(item);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(item.id, item.name)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border rounded-lg border-dashed">
          <Package className="h-12 w-12 mb-4 opacity-30" />
          <p className="font-medium">
            {search ? "Sin resultados" : "Tu catálogo está vacío"}
          </p>
          <p className="text-sm mb-4">
            {search
              ? "Intenta con otro término de búsqueda"
              : "Agrega tu primer producto para comenzar"}
          </p>
          {!search && (
            <Button
              onClick={() => {
                setEditingItem(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo producto
            </Button>
          )}
        </div>
      )}

      {/* Dialog */}
      <CatalogItemDialog
        businessId={businessId}
        businessType={businessType}
        categories={categories}
        item={editingItem}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
