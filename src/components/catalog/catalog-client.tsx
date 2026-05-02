"use client";

import { useState, useTransition, useMemo } from "react";
import dynamic from "next/dynamic";
const CatalogItemDialog = dynamic(
  () => import("./item-dialog").then((mod) => mod.CatalogItemDialog),
  { ssr: false }
);
const CategoryDialog = dynamic(
  () => import("./category-dialog").then((mod) => mod.CategoryDialog),
  { ssr: false }
);
import { deleteItem, toggleItemActive, deleteCategory } from "@/lib/actions/catalog";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Search,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Star,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

/* ── Types ──────────────────────────────────────────── */

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  created_at?: string | null;
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
  featured: boolean | null;
  created_at: string | null;
}

interface Props {
  businessId: string;
  businessType: string;
  items: CatalogItem[];
  categories: Category[];
  inventoryItems?: { id: string; name: string; unit: string | null }[];
  currency: string;
}

const typeLabels: Record<string, string> = {
  product: "Producto",
  service: "Servicio",
  room: "Habitación",
  membership: "Membresía",
};

type Tab = "items" | "categories";

/* ── Component ──────────────────────────────────────── */

export function CatalogClient({ businessId, businessType, items, categories, inventoryItems = [], currency }: Props) {
  const [tab, setTab] = useState<Tab>("items");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Item dialog
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);

  // Category dialog
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const [isPending, startTransition] = useTransition();

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currency || "COP",
      minimumFractionDigits: 0,
    }).format(amount);

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null;
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? `${cat.icon || ""} ${cat.name}`.trim() : null;
  };

  /* Filtered items */
  const filteredItems = useMemo(() => {
    let list = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.sku?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q)
      );
    }
    if (filterCategory !== "all") {
      list = list.filter((i) => i.category_id === filterCategory);
    }
    if (filterStatus === "active") list = list.filter((i) => i.active !== false);
    if (filterStatus === "inactive") list = list.filter((i) => i.active === false);
    return list;
  }, [items, search, filterCategory, filterStatus]);

  /* Filtered categories */
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const activeCount = items.filter((i) => i.active !== false).length;
  const inactiveCount = items.length - activeCount;

  /* Actions */
  function handleDeleteItem(itemId: string, itemName: string) {
    if (!confirm(`¿Eliminar "${itemName}"? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const result = await deleteItem(itemId);
      if (result.error) toast.error(result.error);
      else toast.success("Producto eliminado");
    });
  }

  function handleToggle(itemId: string, active: boolean) {
    startTransition(async () => {
      const result = await toggleItemActive(itemId, active);
      if (result.error) toast.error(result.error);
    });
  }

  function handleDeleteCategory(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}"? Los productos quedarán sin categoría.`)) return;
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (result.error) toast.error(result.error);
      else toast.success("Categoría eliminada");
    });
  }

  return (
    <div className="catalog-page">
      {/* Header */}
      <div className="catalog-header">
        <div className="dash-header" style={{ padding: 0 }}>
          <h1 className="flex items-center gap-3">
            <div className="section-header-icon">
              <Package className="h-5 w-5" />
            </div>
            Catálogo
            <span className="catalog-count-badge">{items.length}</span>
          </h1>
          <p>Gestiona tus productos, servicios y categorías.</p>
        </div>
        <button
          className="catalog-add-btn"
          onClick={() => {
            if (tab === "items") {
              setEditingItem(null);
              setItemDialogOpen(true);
            } else {
              setEditingCat(null);
              setCatDialogOpen(true);
            }
          }}
        >
          <Plus size={16} />
          {tab === "items" ? "Nuevo producto" : "Nueva categoría"}
        </button>
      </div>

      {/* Tabs */}
      <div className="catalog-tabs">
        <button className={`catalog-tab ${tab === "items" ? "active" : ""}`} onClick={() => setTab("items")}>
          <Package size={14} />
          Artículos
          <span className="catalog-tab-count">{items.length}</span>
        </button>
        <button className={`catalog-tab ${tab === "categories" ? "active" : ""}`} onClick={() => setTab("categories")}>
          <FolderOpen size={14} />
          Categorías
          <span className="catalog-tab-count">{categories.length}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="catalog-filters">
        <div className="catalog-search">
          <Search size={16} />
          <input
            type="text"
            placeholder={tab === "items" ? "Buscar por nombre o SKU…" : "Buscar categoría…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {tab === "items" && (
          <>
            <select
              className="catalog-filter-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon || "📦"} {c.name}
                </option>
              ))}
            </select>
            <select
              className="catalog-filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="active">✅ Activos ({activeCount})</option>
              <option value="inactive">⏸️ Inactivos ({inactiveCount})</option>
            </select>
          </>
        )}
      </div>

      {/* ═══ Items Table ═══ */}
      {tab === "items" && (
        <div className="catalog-table-wrap">
          <table className="catalog-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="catalog-hide-mobile">Categoría</th>
                <th>Precio</th>
                <th className="catalog-hide-mobile">Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="catalog-empty">
                    <Package size={32} strokeWidth={1.2} />
                    <span>{search ? "Sin resultados" : "Tu catálogo está vacío"}</span>
                    {!search && (
                      <button
                        className="catalog-empty-btn"
                        onClick={() => { setEditingItem(null); setItemDialogOpen(true); }}
                      >
                        <Plus size={14} /> Agregar producto
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isExpanded = expandedId === item.id;
                  const catName = getCategoryName(item.category_id);
                  const hasDiscount = item.compare_price && item.compare_price > item.price;
                  const margin = item.cost ? ((item.price - item.cost) / item.price * 100).toFixed(0) : null;

                  return (
                    <ItemRow
                      key={item.id}
                      item={item}
                      catName={catName}
                      hasDiscount={!!hasDiscount}
                      margin={margin}
                      formatPrice={formatPrice}
                      isExpanded={isExpanded}
                      isPending={isPending}
                      onToggle={() => setExpandedId(isExpanded ? null : item.id)}
                      onEdit={() => { setEditingItem(item); setItemDialogOpen(true); }}
                      onDelete={() => handleDeleteItem(item.id, item.name)}
                      onToggleActive={(v) => handleToggle(item.id, v)}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ Categories Table ═══ */}
      {tab === "categories" && (
        <div className="catalog-table-wrap">
          <table className="catalog-table">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Descripción</th>
                <th className="catalog-hide-mobile">Productos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="catalog-empty">
                    <FolderOpen size={32} strokeWidth={1.2} />
                    <span>{search ? "Sin resultados" : "No tienes categorías"}</span>
                    {!search && (
                      <button
                        className="catalog-empty-btn"
                        onClick={() => { setEditingCat(null); setCatDialogOpen(true); }}
                      >
                        <Plus size={14} /> Nueva categoría
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => {
                  const itemCount = items.filter((i) => i.category_id === cat.id).length;
                  return (
                    <tr key={cat.id} className="catalog-row">
                      <td>
                        <div className="catalog-cat-cell">
                          <span className="catalog-cat-icon">{cat.icon || "📦"}</span>
                          <span className="catalog-cat-name">{cat.name}</span>
                        </div>
                      </td>
                      <td className="catalog-cat-desc">{cat.description || "—"}</td>
                      <td className="catalog-hide-mobile">
                        <span className="catalog-cat-count">{itemCount}</span>
                      </td>
                      <td>
                        <div className="catalog-row-actions">
                          <button
                            className="catalog-action-icon"
                            onClick={() => { setEditingCat(cat); setCatDialogOpen(true); }}
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="catalog-action-icon danger"
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialogs */}
      <CatalogItemDialog
        businessId={businessId}
        businessType={businessType}
        categories={categories}
        inventoryItems={inventoryItems}
        item={editingItem}
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
      />
      <CategoryDialog
        businessId={businessId}
        category={editingCat}
        open={catDialogOpen}
        onOpenChange={setCatDialogOpen}
      />
    </div>
  );
}

/* ── Item Row (expandable) ──────────────────────────── */

interface ItemRowProps {
  item: CatalogItem;
  catName: string | null;
  hasDiscount: boolean;
  margin: string | null;
  formatPrice: (n: number) => string;
  isExpanded: boolean;
  isPending: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (v: boolean) => void;
}

function ItemRow({
  item, catName, hasDiscount, margin, formatPrice,
  isExpanded, isPending, onToggle, onEdit, onDelete, onToggleActive,
}: ItemRowProps) {
  return (
    <>
      <tr className={`catalog-row ${isExpanded ? "expanded" : ""}`} onClick={onToggle}>
        <td>
          <div className="catalog-product-cell">
            <div className="catalog-product-thumb">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} />
              ) : (
                <Package size={16} />
              )}
            </div>
            <div className="catalog-product-info">
              <span className="catalog-product-name">
                {item.name}
                {item.featured && <Star size={12} className="catalog-star" />}
              </span>
              <div className="catalog-product-meta">
                {item.sku && <span className="catalog-sku">{item.sku}</span>}
                <span className="catalog-type-badge">
                  {typeLabels[item.type || "product"] || item.type}
                </span>
              </div>
            </div>
          </div>
        </td>
        <td className="catalog-hide-mobile catalog-cat-label">
          {catName || <span className="catalog-muted">Sin categoría</span>}
        </td>
        <td>
          <div className="catalog-price-cell">
            <span className="catalog-price">{formatPrice(item.price)}</span>
            {hasDiscount && (
              <span className="catalog-compare-price">{formatPrice(item.compare_price!)}</span>
            )}
          </div>
        </td>
        <td className="catalog-hide-mobile">
          <span className={`catalog-status-dot ${item.active !== false ? "active" : "inactive"}`}>
            {item.active !== false ? (
              <><Eye size={12} /> Activo</>
            ) : (
              <><EyeOff size={12} /> Inactivo</>
            )}
          </span>
        </td>
        <td className="catalog-chevron">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </td>
      </tr>

      {isExpanded && (
        <tr className="catalog-detail-row">
          <td colSpan={5}>
            <div className="catalog-detail">
              {/* Image preview */}
              <div className="catalog-detail-left">
                <div className="catalog-detail-image">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} />
                  ) : (
                    <div className="catalog-detail-no-image">
                      <ImageIcon size={32} strokeWidth={1} />
                      <span>Sin imagen</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info + Actions */}
              <div className="catalog-detail-right">
                <div className="catalog-detail-grid">
                  {item.description && (
                    <div className="catalog-detail-field full">
                      <span className="catalog-detail-label">Descripción</span>
                      <span>{item.description}</span>
                    </div>
                  )}
                  <div className="catalog-detail-field">
                    <span className="catalog-detail-label">Precio</span>
                    <span className="catalog-detail-value-price">{formatPrice(item.price)}</span>
                  </div>
                  {item.cost != null && (
                    <div className="catalog-detail-field">
                      <span className="catalog-detail-label">Costo</span>
                      <span>
                        {formatPrice(item.cost)}
                        {margin && <span className="catalog-margin">({margin}% margen)</span>}
                      </span>
                    </div>
                  )}
                  {catName && (
                    <div className="catalog-detail-field">
                      <span className="catalog-detail-label">Categoría</span>
                      <span>{catName}</span>
                    </div>
                  )}
                  {item.sku && (
                    <div className="catalog-detail-field">
                      <span className="catalog-detail-label">SKU</span>
                      <span className="catalog-sku">{item.sku}</span>
                    </div>
                  )}
                  <div className="catalog-detail-field">
                    <span className="catalog-detail-label">Visible</span>
                    <Switch
                      checked={item.active ?? true}
                      onCheckedChange={onToggleActive}
                      disabled={isPending}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                  </div>
                </div>

                <div className="catalog-detail-actions">
                  <button className="catalog-action-btn edit" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                    <Pencil size={14} /> Editar
                  </button>
                  <button className="catalog-action-btn delete" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
