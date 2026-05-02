"use client";

import { useState, useTransition, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { updateOrderStatus } from "@/lib/actions/orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShoppingCart,
  Search,
  ChevronDown,
  ChevronUp,
  Phone,
  MapPin,
  Clock,
  Check,
  X,
  Loader2,
  Globe,
  Monitor,
  CreditCard,
  MessageCircle,
  Package,
  Truck,
  Store,
  FileText,
  CircleDot,
  CheckCircle2,
  XCircle,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

/* ── Types ──────────────────────────────────────────── */

interface TransactionItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
}

interface Transaction {
  id: string;
  code: string | null;
  type: string;
  status: string | null;
  total: number;
  subtotal: number | null;
  discount: number | null;
  tax: number | null;
  payment_method: string | null;
  payment_status: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  address: string | null;
  notes: string | null;
  admin_notes: string | null;
  created_at: string | null;
  completed_at: string | null;
  transaction_items: TransactionItem[];
}

interface Props {
  transactions: Transaction[];
  currency: string;
}

/* ── Status config ──────────────────────────────────── */

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pending:     { label: "Pendiente",  variant: "secondary",    icon: Clock },
  confirmed:   { label: "Confirmado", variant: "default",      icon: Check },
  in_progress: { label: "En Proceso", variant: "default",      icon: Package },
  completed:   { label: "Completado", variant: "outline",      icon: CheckCircle2 },
  cancelled:   { label: "Cancelado",  variant: "destructive",  icon: XCircle },
};

const paymentConfig: Record<string, { label: string; className: string }> = {
  pending:  { label: "Pendiente",    className: "badge-payment-pending" },
  paid:     { label: "Pagado",       className: "badge-payment-paid" },
  refunded: { label: "Reembolsado",  className: "badge-payment-refunded" },
};

/* ── Helpers ────────────────────────────────────────── */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function getOrigin(code: string | null): { label: string; icon: typeof Globe } {
  if (!code) return { label: "POS", icon: Monitor };
  if (code.startsWith("WEB")) return { label: "Web", icon: Globe };
  return { label: "POS", icon: Monitor };
}

function getDeliveryType(notes: string | null): { label: string; icon: typeof Truck } | null {
  if (!notes) return null;
  if (notes.includes("Domicilio")) return { label: "Domicilio", icon: Truck };
  if (notes.includes("Recoge")) return { label: "Recoge", icon: Store };
  return null;
}

function whatsappUrl(phone: string, msg?: string): string {
  const clean = phone.replace(/\D/g, "");
  const num = clean.startsWith("57") ? clean : `57${clean}`;
  const text = msg ? `&text=${encodeURIComponent(msg)}` : "";
  return `https://wa.me/${num}?${text}`;
}

type Tab = "active" | "history" | "all";

/* ── Component ──────────────────────────────────────── */

export function OrdersTable({ transactions, currency }: Props) {
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("active");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  /* Derived data */
  const filtered = useMemo(() => {
    let list = transactions;

    // Tab filter
    if (tab === "active") {
      list = list.filter((t) => ["pending", "confirmed", "in_progress"].includes(t.status || ""));
    } else if (tab === "history") {
      list = list.filter((t) => ["completed", "cancelled"].includes(t.status || ""));
    }

    // Type filter
    if (filterType !== "all") {
      list = list.filter((t) => {
        if (filterType === "web") return t.code?.startsWith("WEB");
        if (filterType === "pos") return !t.code?.startsWith("WEB");
        return true;
      });
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.code?.toLowerCase().includes(q) ||
          t.customer_name?.toLowerCase().includes(q) ||
          t.customer_phone?.includes(q)
      );
    }

    return list;
  }, [transactions, tab, filterType, search]);

  const activeCount = transactions.filter((t) => ["pending", "confirmed", "in_progress"].includes(t.status || "")).length;

  /* Actions */
  function handleStatus(id: string, newStatus: string, paymentStatus?: string) {
    startTransition(async () => {
      const result = await updateOrderStatus(id, newStatus, paymentStatus);
      if (result.error) {
        toast.error("Error al actualizar");
      } else {
        toast.success("Estado actualizado");
        if (expandedId === id && (newStatus === "cancelled")) setExpandedId(null);
      }
    });
  }

  return (
    <div className="orders-page">
      {/* Header */}
      <div className="orders-header">
        <div className="dash-header" style={{ padding: 0 }}>
          <h1 className="flex items-center gap-3">
            <div className="section-header-icon">
              <ShoppingCart className="h-5 w-5" />
            </div>
            Pedidos
            {activeCount > 0 && (
              <span className="orders-active-badge">{activeCount}</span>
            )}
          </h1>
          <p>Gestiona pedidos web y ventas del punto de venta.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="orders-tabs">
        <button className={`orders-tab ${tab === "active" ? "active" : ""}`} onClick={() => setTab("active")}>
          <CircleDot size={14} />
          Activos
          {activeCount > 0 && <span className="orders-tab-count">{activeCount}</span>}
        </button>
        <button className={`orders-tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
          <CheckCircle2 size={14} />
          Historial
        </button>
        <button className={`orders-tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>
          <FileText size={14} />
          Todos
          <span className="orders-tab-count">{transactions.length}</span>
        </button>
      </div>

      {/* Filters bar */}
      <div className="orders-filters">
        <div className="orders-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por código, nombre o teléfono…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="orders-filter-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">Todos los orígenes</option>
          <option value="web">🌐 Web</option>
          <option value="pos">🖥️ POS</option>
        </select>
      </div>

      {/* Table */}
      <div className="orders-table-wrap">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Origen</th>
              <th>Orden</th>
              <th>Cliente</th>
              <th className="orders-hide-mobile">Tiempo</th>
              <th>Total</th>
              <th className="orders-hide-mobile">Pago</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="orders-empty">
                  <ShoppingCart size={32} strokeWidth={1.2} />
                  <span>No hay pedidos{tab === "active" ? " activos" : ""}</span>
                </td>
              </tr>
            ) : (
              filtered.map((txn) => {
                const s = statusConfig[txn.status || "pending"] || statusConfig.pending;
                const ps = paymentConfig[txn.payment_status || "pending"] || paymentConfig.pending;
                const origin = getOrigin(txn.code);
                const OriginIcon = origin.icon;
                const isExpanded = expandedId === txn.id;
                const delivery = getDeliveryType(txn.notes);
                const StatusIcon = s.icon;

                return (
                  <OrderRow
                    key={txn.id}
                    txn={txn}
                    currency={currency}
                    s={s}
                    ps={ps}
                    origin={origin}
                    OriginIcon={OriginIcon}
                    StatusIcon={StatusIcon}
                    isExpanded={isExpanded}
                    delivery={delivery}
                    isPending={isPending}
                    onToggle={() => setExpandedId(isExpanded ? null : txn.id)}
                    onStatus={handleStatus}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Order Row (with expandable detail) ─────────────── */

interface OrderRowProps {
  txn: Transaction;
  currency: string;
  s: typeof statusConfig[string];
  ps: typeof paymentConfig[string];
  origin: { label: string; icon: typeof Globe };
  OriginIcon: typeof Globe;
  StatusIcon: typeof Clock;
  isExpanded: boolean;
  delivery: { label: string; icon: typeof Truck } | null;
  isPending: boolean;
  onToggle: () => void;
  onStatus: (id: string, status: string, paymentStatus?: string) => void;
}

function OrderRow({ txn, currency, s, ps, origin, OriginIcon, StatusIcon, isExpanded, delivery, isPending, onToggle, onStatus }: OrderRowProps) {
  const DeliveryIcon = delivery?.icon || Package;

  return (
    <>
      <tr className={`orders-row ${isExpanded ? "expanded" : ""}`} onClick={onToggle}>
        <td>
          <span className={`orders-origin ${origin.label === "Web" ? "web" : "pos"}`}>
            <OriginIcon size={13} />
            {origin.label}
          </span>
        </td>
        <td className="orders-code">{txn.code || "—"}</td>
        <td>
          <div className="orders-customer">
            <span className="orders-customer-name">{txn.customer_name || "Consumidor Final"}</span>
            {txn.customer_phone && (
              <span className="orders-customer-phone">
                <Phone size={11} />
                {txn.customer_phone}
              </span>
            )}
          </div>
        </td>
        <td className="orders-hide-mobile orders-time">
          {txn.created_at ? (
            ["pending", "confirmed", "in_progress"].includes(txn.status || "")
              ? timeAgo(txn.created_at)
              : new Date(txn.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })
          ) : "—"}
        </td>
        <td className="orders-total">{formatCurrency(txn.total, currency)}</td>
        <td className="orders-hide-mobile">
          <span className={`orders-payment-badge ${ps.className}`}>
            {ps.label}
          </span>
        </td>
        <td>
          <span className={`orders-status-badge status-${txn.status || "pending"}`}>
            <StatusIcon size={12} />
            {s.label}
          </span>
        </td>
        <td className="orders-chevron">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </td>
      </tr>

      {/* Expanded detail */}
      {isExpanded && (
        <tr className="orders-detail-row">
          <td colSpan={8}>
            <div className="orders-detail">
              {/* Left: Items */}
              <div className="orders-detail-items">
                <h4>Productos</h4>
                <div className="orders-items-list">
                  {txn.transaction_items && txn.transaction_items.length > 0 ? (
                    txn.transaction_items.map((item) => (
                      <div key={item.id} className="orders-item-row">
                        <span className="orders-item-qty">{item.quantity}x</span>
                        <span className="orders-item-name">{item.name}</span>
                        <span className="orders-item-price">{formatCurrency(item.total_price, currency)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="orders-no-items">Sin detalle de productos</p>
                  )}
                </div>
                {(txn.discount && txn.discount > 0) ? (
                  <div className="orders-item-row orders-item-discount">
                    <span className="orders-item-qty">—</span>
                    <span className="orders-item-name">Descuento</span>
                    <span className="orders-item-price">-{formatCurrency(txn.discount, currency)}</span>
                  </div>
                ) : null}
                <div className="orders-items-total">
                  <span>Total</span>
                  <span>{formatCurrency(txn.total, currency)}</span>
                </div>
              </div>

              {/* Right: Customer + Actions */}
              <div className="orders-detail-info">
                <h4>Datos del cliente</h4>
                <div className="orders-info-grid">
                  {txn.customer_name && (
                    <div className="orders-info-item">
                      <span className="orders-info-label">Nombre</span>
                      <span>{txn.customer_name}</span>
                    </div>
                  )}
                  {txn.customer_phone && (
                    <div className="orders-info-item">
                      <span className="orders-info-label">Teléfono</span>
                      <span className="orders-info-phone">
                        {txn.customer_phone}
                        <a
                          href={whatsappUrl(txn.customer_phone, `Hola ${txn.customer_name || ""}, sobre tu pedido ${txn.code || ""}…`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="orders-whatsapp-btn"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageCircle size={14} />
                          WhatsApp
                        </a>
                      </span>
                    </div>
                  )}
                  {delivery && (
                    <div className="orders-info-item">
                      <span className="orders-info-label">Entrega</span>
                      <span className="orders-info-delivery">
                        <DeliveryIcon size={14} />
                        {delivery.label}
                      </span>
                    </div>
                  )}
                  {txn.address && (
                    <div className="orders-info-item">
                      <span className="orders-info-label">Dirección</span>
                      <span className="orders-info-address">
                        <MapPin size={14} />
                        {txn.address}
                      </span>
                    </div>
                  )}
                  {txn.notes && (
                    <div className="orders-info-item full">
                      <span className="orders-info-label">Notas</span>
                      <span>{txn.notes}</span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="orders-actions">
                  {txn.status === "pending" && (
                    <>
                      <button
                        className="orders-action-btn confirm"
                        onClick={(e) => { e.stopPropagation(); onStatus(txn.id, "confirmed"); }}
                        disabled={isPending}
                      >
                        <Check size={16} /> Confirmar
                      </button>
                      <button
                        className="orders-action-btn cancel"
                        onClick={(e) => { e.stopPropagation(); onStatus(txn.id, "cancelled"); }}
                        disabled={isPending}
                      >
                        <Ban size={16} /> Rechazar
                      </button>
                    </>
                  )}
                  {txn.status === "confirmed" && (
                    <>
                      <button
                        className="orders-action-btn progress"
                        onClick={(e) => { e.stopPropagation(); onStatus(txn.id, "in_progress"); }}
                        disabled={isPending}
                      >
                        <Package size={16} /> En Preparación
                      </button>
                      <button
                        className="orders-action-btn cancel"
                        onClick={(e) => { e.stopPropagation(); onStatus(txn.id, "cancelled"); }}
                        disabled={isPending}
                      >
                        <Ban size={16} /> Cancelar
                      </button>
                    </>
                  )}
                  {txn.status === "in_progress" && (
                    <button
                      className="orders-action-btn complete"
                      onClick={(e) => { e.stopPropagation(); onStatus(txn.id, "completed", "paid"); }}
                      disabled={isPending}
                    >
                      <CheckCircle2 size={16} /> Completar y Cobrar
                    </button>
                  )}
                  {txn.payment_status === "pending" && txn.status !== "cancelled" && (
                    <button
                      className="orders-action-btn pay"
                      onClick={(e) => { e.stopPropagation(); onStatus(txn.id, txn.status || "pending", "paid"); }}
                      disabled={isPending}
                    >
                      <CreditCard size={16} /> Marcar Pagado
                    </button>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
