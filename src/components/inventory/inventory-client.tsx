"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
const InventoryDialog = dynamic(
  () => import("./inventory-dialog").then((mod) => mod.InventoryDialog),
  { ssr: false }
);
const MovementDialog = dynamic(
  () => import("./movement-dialog").then((mod) => mod.MovementDialog),
  { ssr: false }
);
import { formatCurrency } from "@/lib/utils";
import { deleteInventoryItem } from "@/lib/actions/inventory";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { CameraScanner } from "@/components/pos/camera-scanner";
import {
  Warehouse,
  PackageSearch,
  ArrowLeftRight,
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRightLeft,
  Package,
  Camera,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────── */

type Tab = "stock" | "movements";

interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  current_stock: number | null;
  min_stock: number | null;
  cost_per_unit: number | null;
  barcode: string | null;
  created_at: string | null;
}

interface Movement {
  id: string;
  type: string;
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  notes: string | null;
  created_at: string;
  inventory: { name: string; unit: string | null } | null;
}

interface Props {
  businessId: string;
  initialItems: InventoryItem[];
  initialMovements: Movement[];
}

/* ── Helpers ────────────────────────────────────────── */

function getStockStatus(stock: number, minStock: number) {
  if (stock <= 0) return { label: "Agotado", className: "inv-status-danger" };
  if (stock <= minStock) return { label: `Bajo (mín ${minStock})`, className: "inv-status-warn" };
  return { label: "Ok", className: "inv-status-ok" };
}

const movementTypeConfig: Record<string, { label: string; className: string; icon: typeof ArrowDownRight }> = {
  in:     { label: "Entrada",  className: "inv-mov-in",     icon: ArrowDownRight },
  out:    { label: "Salida",   className: "inv-mov-out",    icon: ArrowUpRight },
  adjust: { label: "Ajuste",   className: "inv-mov-adjust", icon: ArrowRightLeft },
};

/* ── Component ──────────────────────────────────────── */

export function InventoryClient({ businessId, initialItems, initialMovements }: Props) {
  const [tab, setTab] = useState<Tab>("stock");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Item dialog
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Movement dialog
  const [movDialogOpen, setMovDialogOpen] = useState(false);
  const [preSelectedItemId, setPreSelectedItemId] = useState<string | undefined>();

  // Camera scanner
  const [cameraScanOpen, setCameraScanOpen] = useState(false);

  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // ── Barcode scanner ──
  const handleBarcodeScan = useCallback((barcode: string) => {
    const found = initialItems.find(
      (it) => it.barcode && it.barcode.toLowerCase() === barcode.toLowerCase()
    );
    if (found) {
      toast.success(`📦 ${found.name} encontrado`, { duration: 1500 });
      // Open movement dialog pre-selected to this item
      setPreSelectedItemId(found.id);
      setMovDialogOpen(true);
      // Haptic + beep
      try {
        if (navigator.vibrate) navigator.vibrate(100);
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 1200; gain.gain.value = 0.1;
        osc.start(); osc.stop(ctx.currentTime + 0.08);
      } catch {}
    } else {
      toast.error(`Código "${barcode}" no encontrado en inventario`, { duration: 2000 });
    }
  }, [initialItems]);

  useBarcodeScanner({
    onScan: handleBarcodeScan,
    enabled: !movDialogOpen && !itemDialogOpen && !cameraScanOpen,
  });

  /* Derived */
  const lowStockCount = initialItems.filter((i) => {
    const s = i.current_stock || 0;
    const m = i.min_stock || 0;
    return s <= m;
  }).length;

  const totalValue = initialItems.reduce(
    (sum, i) => sum + (i.cost_per_unit || 0) * (i.current_stock || 0), 0
  );

  const filteredItems = useMemo(() => {
    let list = initialItems;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) => i.name.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q)
      );
    }
    if (filterStatus === "low") {
      list = list.filter((i) => {
        const s = i.current_stock || 0;
        const m = i.min_stock || 0;
        return s <= m && s > 0;
      });
    } else if (filterStatus === "out") {
      list = list.filter((i) => (i.current_stock || 0) <= 0);
    } else if (filterStatus === "ok") {
      list = list.filter((i) => (i.current_stock || 0) > (i.min_stock || 0));
    }
    return list;
  }, [initialItems, search, filterStatus]);

  const filteredMovements = useMemo(() => {
    if (!search.trim()) return initialMovements;
    const q = search.toLowerCase();
    return initialMovements.filter(
      (m) =>
        m.inventory?.name?.toLowerCase().includes(q) ||
        m.type.toLowerCase().includes(q) ||
        m.notes?.toLowerCase().includes(q)
    );
  }, [initialMovements, search]);

  /* Actions */
  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este producto del inventario?")) return;
    setIsDeleting(id);
    const result = await deleteInventoryItem(id);
    if (result.success) toast.success("Producto eliminado");
    else toast.error(result.error || "Error al eliminar");
    setIsDeleting(null);
  }

  return (
    <div className="inv-page">
      {/* Header */}
      <div className="inv-header">
        <div className="dash-header" style={{ padding: 0 }}>
          <h1 className="flex items-center gap-3">
            <div className="section-header-icon">
              <Warehouse className="h-5 w-5" />
            </div>
            Inventario
            {lowStockCount > 0 && (
              <span className="inv-alert-badge">
                <AlertTriangle size={12} />
                {lowStockCount} bajo
              </span>
            )}
          </h1>
          <p>Controla existencias, costos y movimientos de stock.</p>
        </div>
        <button
          className="inv-add-btn"
          onClick={() => {
            if (tab === "stock") {
              setEditingItem(null);
              setItemDialogOpen(true);
            } else {
              setMovDialogOpen(true);
            }
          }}
        >
          <Plus size={16} />
          {tab === "stock" ? "Nuevo producto" : "Registrar movimiento"}
        </button>
      </div>

      {/* Stats row */}
      <div className="inv-stats">
        <div className="inv-stat">
          <span className="inv-stat-label">Productos</span>
          <span className="inv-stat-value">{initialItems.length}</span>
        </div>
        <div className="inv-stat">
          <span className="inv-stat-label">Valor total</span>
          <span className="inv-stat-value">{formatCurrency(totalValue)}</span>
        </div>
        <div className="inv-stat">
          <span className="inv-stat-label">Stock bajo</span>
          <span className={`inv-stat-value ${lowStockCount > 0 ? "warn" : ""}`}>{lowStockCount}</span>
        </div>
        <div className="inv-stat">
          <span className="inv-stat-label">Movimientos</span>
          <span className="inv-stat-value">{initialMovements.length}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="inv-tabs">
        <button className={`inv-tab ${tab === "stock" ? "active" : ""}`} onClick={() => setTab("stock")}>
          <PackageSearch size={14} />
          Stock Actual
          <span className="inv-tab-count">{initialItems.length}</span>
        </button>
        <button className={`inv-tab ${tab === "movements" ? "active" : ""}`} onClick={() => setTab("movements")}>
          <ArrowLeftRight size={14} />
          Movimientos
          <span className="inv-tab-count">{initialMovements.length}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="inv-filters">
        <div className="inv-search">
          <Search size={16} />
          <input
            type="text"
            placeholder={tab === "stock" ? "Buscar producto o categoría…" : "Buscar por producto o concepto…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="pos-scan-btn"
          onClick={() => setCameraScanOpen(true)}
          title="Escanear código de barras"
        >
          <Camera size={16} />
          <span className="hidden sm:inline">Escanear</span>
        </button>
        {tab === "stock" && (
          <select
            className="inv-filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="ok">✅ En stock</option>
            <option value="low">⚠️ Stock bajo</option>
            <option value="out">🚫 Agotado</option>
          </select>
        )}
      </div>

      {/* ═══ Stock Table ═══ */}
      {tab === "stock" && (
        <div className="inv-table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="inv-hide-mobile">Categoría</th>
                <th className="inv-align-right">Stock</th>
                <th className="inv-hide-mobile inv-align-right">Costo Unit.</th>
                <th className="inv-hide-mobile inv-align-right">Valor Total</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="inv-empty">
                    <Package size={32} strokeWidth={1.2} />
                    <span>{search ? "Sin resultados" : "Tu inventario está vacío"}</span>
                    {!search && (
                      <button className="inv-empty-btn" onClick={() => { setEditingItem(null); setItemDialogOpen(true); }}>
                        <Plus size={14} /> Agregar producto
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const stock = item.current_stock || 0;
                  const minStock = item.min_stock || 0;
                  const cost = item.cost_per_unit || 0;
                  const status = getStockStatus(stock, minStock);
                  const isExpanded = expandedId === item.id;

                  return (
                    <StockRow
                      key={item.id}
                      item={item}
                      stock={stock}
                      cost={cost}
                      status={status}
                      isExpanded={isExpanded}
                      isDeleting={isDeleting === item.id}
                      onToggle={() => setExpandedId(isExpanded ? null : item.id)}
                      onEdit={() => { setEditingItem(item); setItemDialogOpen(true); }}
                      onDelete={() => handleDelete(item.id)}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ Movements Table ═══ */}
      {tab === "movements" && (
        <div className="inv-table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th className="inv-align-right">Cantidad</th>
                <th className="inv-hide-mobile inv-align-right">Costo</th>
                <th className="inv-hide-mobile">Notas</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="inv-empty">
                    <ArrowLeftRight size={32} strokeWidth={1.2} />
                    <span>{search ? "Sin resultados" : "No hay movimientos registrados"}</span>
                  </td>
                </tr>
              ) : (
                filteredMovements.map((mov) => {
                  const cfg = movementTypeConfig[mov.type] || movementTypeConfig.adjust;
                  const Icon = cfg.icon;
                  const isPositive = mov.type === "in" || (mov.type === "adjust" && mov.quantity > 0);
                  const isNegative = mov.type === "out" || (mov.type === "adjust" && mov.quantity < 0);

                  return (
                    <tr key={mov.id} className="inv-row">
                      <td className="inv-mov-date">
                        {format(new Date(mov.created_at), "dd MMM yy, HH:mm", { locale: es })}
                      </td>
                      <td className="inv-mov-product">{mov.inventory?.name || "Desconocido"}</td>
                      <td>
                        <span className={`inv-mov-badge ${cfg.className}`}>
                          <Icon size={12} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className={`inv-align-right inv-mov-qty ${isPositive ? "positive" : ""} ${isNegative ? "negative" : ""}`}>
                        {isPositive ? "+" : isNegative ? "−" : ""}
                        {Math.abs(mov.quantity)} {mov.inventory?.unit || ""}
                      </td>
                      <td className="inv-hide-mobile inv-align-right">
                        {(mov.total_cost || 0) > 0 ? (
                          <div className="inv-mov-cost">
                            <span className="inv-mov-cost-unit">{formatCurrency(mov.unit_cost || 0)}</span>
                            <span className="inv-mov-cost-total">{formatCurrency(mov.total_cost || 0)}</span>
                          </div>
                        ) : (
                          <span className="inv-muted">—</span>
                        )}
                      </td>
                      <td className="inv-hide-mobile inv-mov-notes">{mov.notes || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialogs */}
      <InventoryDialog
        businessId={businessId}
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        itemToEdit={editingItem}
      />
      <MovementDialog
        businessId={businessId}
        inventoryItems={initialItems}
        open={movDialogOpen}
        onOpenChange={(open) => {
          setMovDialogOpen(open);
          if (!open) setPreSelectedItemId(undefined);
        }}
        preSelectedItemId={preSelectedItemId}
      />

      {/* Camera barcode scanner */}
      <CameraScanner
        open={cameraScanOpen}
        onClose={() => setCameraScanOpen(false)}
        onScan={handleBarcodeScan}
      />
    </div>
  );
}

/* ── Stock Row (expandable) ─────────────────────────── */

interface StockRowProps {
  item: InventoryItem;
  stock: number;
  cost: number;
  status: { label: string; className: string };
  isExpanded: boolean;
  isDeleting: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function StockRow({ item, stock, cost, status, isExpanded, isDeleting, onToggle, onEdit, onDelete }: StockRowProps) {
  return (
    <>
      <tr className={`inv-row ${isExpanded ? "expanded" : ""}`} onClick={onToggle}>
        <td>
          <div className="inv-product-cell">
            <span className="inv-product-name">{item.name}</span>
            {item.unit && <span className="inv-product-unit">{item.unit}</span>}
          </div>
        </td>
        <td className="inv-hide-mobile inv-cat">
          {item.category || <span className="inv-muted">—</span>}
        </td>
        <td className="inv-align-right inv-stock-value">
          {stock} <span className="inv-stock-unit">{item.unit || ""}</span>
        </td>
        <td className="inv-hide-mobile inv-align-right inv-cost">
          {formatCurrency(cost)}
        </td>
        <td className="inv-hide-mobile inv-align-right inv-total-value">
          {formatCurrency(cost * stock)}
        </td>
        <td>
          <span className={`inv-status-badge ${status.className}`}>
            {status.className === "inv-status-danger" && <AlertTriangle size={11} />}
            {status.className === "inv-status-ok" && <CheckCircle2 size={11} />}
            {status.label}
          </span>
        </td>
        <td className="inv-chevron">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </td>
      </tr>

      {isExpanded && (
        <tr className="inv-detail-row">
          <td colSpan={7}>
            <div className="inv-detail">
              <div className="inv-detail-grid">
                <div className="inv-detail-field">
                  <span className="inv-detail-label">Stock actual</span>
                  <span className="inv-detail-big">{stock} {item.unit || ""}</span>
                </div>
                <div className="inv-detail-field">
                  <span className="inv-detail-label">Stock mínimo</span>
                  <span>{item.min_stock || 0} {item.unit || ""}</span>
                </div>
                <div className="inv-detail-field">
                  <span className="inv-detail-label">Costo unitario</span>
                  <span className="inv-detail-price">{formatCurrency(cost)}</span>
                </div>
                <div className="inv-detail-field">
                  <span className="inv-detail-label">Valor en inventario</span>
                  <span className="inv-detail-price">{formatCurrency(cost * stock)}</span>
                </div>
                {item.category && (
                  <div className="inv-detail-field">
                    <span className="inv-detail-label">Categoría</span>
                    <span>{item.category}</span>
                  </div>
                )}
              </div>

              <div className="inv-detail-actions">
                <button className="inv-action-btn edit" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <Pencil size={14} /> Editar
                </button>
                <button
                  className="inv-action-btn delete"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  disabled={isDeleting}
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
