"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
const CategoryDialog = dynamic(
  () => import("./category-dialog").then((mod) => mod.CategoryDialog),
  { ssr: false }
);
import { deleteCategory } from "@/lib/actions/catalog";
import { Button, buttonVariants } from "@/components/ui/button";
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
  FolderOpen,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  created_at?: string | null;
}

interface Props {
  businessId: string;
  categories: Category[];
}

export function CategoriesTable({ businessId, categories }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Category | null>(null);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`¿Eliminar la categoría "${name}"? Esta acción no se puede deshacer y los productos quedarán "Sin categoría".`)) return;
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Categoría eliminada");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar categoría..."
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
          Nueva categoría
        </Button>
      </div>

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 text-xl rounded-lg bg-muted flex items-center justify-center shrink-0">
                        {cat.icon || "📦"}
                      </div>
                      <p className="font-medium">{cat.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {cat.description || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon", className: "h-8 w-8" })}>
                          <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingItem(cat);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(cat.id, cat.name)}
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
          <FolderOpen className="h-12 w-12 mb-4 opacity-30" />
          <p className="font-medium">
            {search ? "Sin resultados" : "No tienes categorías"}
          </p>
          <p className="text-sm mb-4">
            {search
              ? "Intenta con otro nombre"
              : "Crea una categoría para organizar tus productos"}
          </p>
          {!search && (
            <Button
              onClick={() => {
                setEditingItem(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva categoría
            </Button>
          )}
        </div>
      )}

      {/* Dialog */}
      <CategoryDialog
        businessId={businessId}
        category={editingItem}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
