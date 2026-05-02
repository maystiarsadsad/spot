"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import {
  createCreditAccount,
  recordCreditPayment,
  updateCreditAccount,
} from "@/lib/actions/credits";
import { toast } from "sonner";
import {
  CreditCard, UserPlus, DollarSign, AlertTriangle,
  ChevronDown, ChevronUp, Plus, Loader2, Search,
  Phone, Mail, Shield, Ban, CheckCircle2,
} from "lucide-react";

interface CreditAccount {
  id: string;
  contact_id: string;
  credit_limit: number;
  current_balance: number;
  status: string;
  guarantor_id: string | null;
  guarantor_name: string | null;
  guarantor_document: string | null;
  guarantor_phone: string | null;
  guarantor_relationship: string | null;
  notes: string | null;
  created_at: string;
  contact: { id: string; full_name: string; phone: string | null; email: string | null; document_number: string | null } | null;
  guarantor: { id: string; full_name: string; phone: string | null } | null;
}

interface Contact {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
}

interface CreditManagerProps {
  businessId: string;
  currency: string;
  accounts: CreditAccount[];
  contacts: Contact[];
  stats: { totalAccounts: number; activeAccounts: number; totalOwed: number; totalLimit: number };
}

export function CreditManager({ businessId, currency, accounts: initial, contacts, stats }: CreditManagerProps) {
  const [accounts, setAccounts] = useState(initial);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPayment, setShowPayment] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Create form
  const [formContactId, setFormContactId] = useState("");
  const [formLimit, setFormLimit] = useState("");
  const [formGuarantorId, setFormGuarantorId] = useState("");
  const [formGuarantorName, setFormGuarantorName] = useState("");
  const [formGuarantorDoc, setFormGuarantorDoc] = useState("");
  const [formGuarantorPhone, setFormGuarantorPhone] = useState("");
  const [formGuarantorRel, setFormGuarantorRel] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Payment form
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNotes, setPayNotes] = useState("");

  const fmt = (n: number) => formatCurrency(n, currency);

  const filtered = accounts.filter((a) =>
    a.contact?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.contact?.phone?.includes(search) ||
    a.contact?.document_number?.includes(search)
  );

  // Contacts without credit accounts
  const availableContacts = contacts.filter(
    (c) => !accounts.some((a) => a.contact_id === c.id)
  );

  const handleCreate = () => {
    if (!formContactId) { toast.error("Selecciona un cliente"); return; }
    if (!formLimit || Number(formLimit) <= 0) { toast.error("Ingresa un límite de crédito válido"); return; }

    startTransition(async () => {
      const result = await createCreditAccount({
        business_id: businessId,
        contact_id: formContactId,
        credit_limit: Number(formLimit),
        guarantor_id: formGuarantorId || undefined,
        guarantor_name: formGuarantorName || undefined,
        guarantor_document: formGuarantorDoc || undefined,
        guarantor_phone: formGuarantorPhone || undefined,
        guarantor_relationship: formGuarantorRel || undefined,
        notes: formNotes || undefined,
      });
      if (result.success) {
        toast.success("Cuenta de crédito creada");
        setShowCreate(false);
        resetCreateForm();
        router.refresh();
      } else {
        toast.error(result.error || "Error");
      }
    });
  };

  const handlePayment = (accountId: string) => {
    if (!payAmount || Number(payAmount) <= 0) { toast.error("Ingresa un monto válido"); return; }

    startTransition(async () => {
      const result = await recordCreditPayment({
        credit_account_id: accountId,
        amount: Number(payAmount),
        payment_method: payMethod,
        notes: payNotes || undefined,
      });
      if (result.success) {
        toast.success("Abono registrado");
        setShowPayment(null);
        setPayAmount("");
        setPayNotes("");
        router.refresh();
      } else {
        toast.error(result.error || "Error");
      }
    });
  };

  const handleSuspend = (accountId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    startTransition(async () => {
      const result = await updateCreditAccount(accountId, { status: newStatus });
      if (result.success) {
        toast.success(newStatus === "active" ? "Cuenta reactivada" : "Cuenta suspendida");
        router.refresh();
      } else {
        toast.error(result.error || "Error");
      }
    });
  };

  const resetCreateForm = () => {
    setFormContactId(""); setFormLimit(""); setFormGuarantorId("");
    setFormGuarantorName(""); setFormGuarantorDoc(""); setFormGuarantorPhone("");
    setFormGuarantorRel(""); setFormNotes("");
  };

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    active: { label: "Activa", color: "#10b981", icon: CheckCircle2 },
    suspended: { label: "Suspendida", color: "#f59e0b", icon: Ban },
    closed: { label: "Cerrada", color: "#6b7280", icon: CheckCircle2 },
    defaulted: { label: "En mora", color: "#ef4444", icon: AlertTriangle },
  };

  return (
    <div className="crd-root">
      {/* Stats */}
      <div className="crd-stats-row">
        <div className="crd-stat">
          <span className="crd-stat-val">{stats.activeAccounts}</span>
          <span className="crd-stat-label">Cuentas activas</span>
        </div>
        <div className="crd-stat">
          <span className="crd-stat-val red">{fmt(stats.totalOwed)}</span>
          <span className="crd-stat-label">Total por cobrar</span>
        </div>
        <div className="crd-stat">
          <span className="crd-stat-val">{fmt(stats.totalLimit)}</span>
          <span className="crd-stat-label">Crédito otorgado</span>
        </div>
        <div className="crd-stat">
          <span className="crd-stat-val">{fmt(stats.totalLimit - stats.totalOwed)}</span>
          <span className="crd-stat-label">Disponible</span>
        </div>
      </div>

      {/* Header */}
      <div className="crd-header">
        <div className="crd-search-wrap">
          <Search size={14} />
          <input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="fin-cash-input"
          />
        </div>
        <button className="fin-cash-btn primary" onClick={() => setShowCreate(!showCreate)}>
          <UserPlus size={15} />
          Nueva Cuenta
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="crd-form-card">
          <div className="crd-form-title">
            <CreditCard size={16} />
            <span>Abrir cuenta de crédito</span>
          </div>
          <div className="acc-invite-form">
            <div className="acc-invite-row">
              <div className="acc-invite-field" style={{ flex: 1 }}>
                <label>Cliente *</label>
                <select value={formContactId} onChange={(e) => setFormContactId(e.target.value)} className="inv-ing-select">
                  <option value="">Seleccionar cliente...</option>
                  {availableContacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name} {c.phone ? `(${c.phone})` : ""}</option>
                  ))}
                </select>
              </div>
              <div className="acc-invite-field" style={{ flex: 1 }}>
                <label>Límite de crédito *</label>
                <input type="number" placeholder="Ej: 500000" value={formLimit}
                  onChange={(e) => setFormLimit(e.target.value)} className="fin-cash-input" min="0" />
              </div>
            </div>

            <div className="crd-guarantor-section">
              <label className="crd-section-label"><Shield size={13} /> Fiador (opcional)</label>
              <div className="acc-invite-row">
                <div className="acc-invite-field" style={{ flex: 1 }}>
                  <label>Fiador registrado</label>
                  <select value={formGuarantorId} onChange={(e) => {
                    setFormGuarantorId(e.target.value);
                    const g = contacts.find((c) => c.id === e.target.value);
                    if (g) { setFormGuarantorName(g.full_name); setFormGuarantorPhone(g.phone || ""); }
                  }} className="inv-ing-select">
                    <option value="">Seleccionar o llenar manual...</option>
                    {contacts.filter((c) => c.id !== formContactId).map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="acc-invite-field" style={{ flex: 1 }}>
                  <label>Nombre del fiador</label>
                  <input placeholder="Nombre completo" value={formGuarantorName}
                    onChange={(e) => setFormGuarantorName(e.target.value)} className="fin-cash-input" />
                </div>
              </div>
              <div className="acc-invite-row">
                <div className="acc-invite-field" style={{ flex: 1 }}>
                  <label>Documento</label>
                  <input placeholder="CC / NIT" value={formGuarantorDoc}
                    onChange={(e) => setFormGuarantorDoc(e.target.value)} className="fin-cash-input" />
                </div>
                <div className="acc-invite-field" style={{ flex: 1 }}>
                  <label>Teléfono</label>
                  <input placeholder="+57 300..." value={formGuarantorPhone}
                    onChange={(e) => setFormGuarantorPhone(e.target.value)} className="fin-cash-input" />
                </div>
                <div className="acc-invite-field" style={{ flex: 1 }}>
                  <label>Relación</label>
                  <select value={formGuarantorRel} onChange={(e) => setFormGuarantorRel(e.target.value)} className="inv-ing-select">
                    <option value="">—</option>
                    <option value="familiar">Familiar</option>
                    <option value="amigo">Amigo</option>
                    <option value="compañero_trabajo">Compañero de trabajo</option>
                    <option value="conocido">Conocido</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="acc-invite-field">
              <label>Notas</label>
              <input placeholder="Observaciones sobre la cuenta..." value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)} className="fin-cash-input" />
            </div>

            <div className="acc-invite-actions">
              <button className="fin-cash-btn secondary" onClick={() => { setShowCreate(false); resetCreateForm(); }}>Cancelar</button>
              <button className="fin-cash-btn primary" onClick={handleCreate} disabled={isPending}>
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                Crear Cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accounts list */}
      <div className="crd-list">
        {filtered.map((acct) => {
          const sc = statusConfig[acct.status] || statusConfig.active;
          const StatusIcon = sc.icon;
          const isExpanded = expandedId === acct.id;
          const usedPct = acct.credit_limit > 0 ? Math.min((acct.current_balance / acct.credit_limit) * 100, 100) : 0;
          const available = Math.max(acct.credit_limit - acct.current_balance, 0);

          return (
            <div key={acct.id} className="crd-account">
              <div className="crd-account-row" onClick={() => setExpandedId(isExpanded ? null : acct.id)}>
                <div className="crd-account-avatar">
                  {acct.contact?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??"}
                </div>
                <div className="crd-account-info">
                  <span className="crd-account-name">{acct.contact?.full_name || "—"}</span>
                  <span className="crd-account-detail">{acct.contact?.phone || acct.contact?.email || ""}</span>
                </div>
                <div className="crd-account-balance">
                  <span className={`crd-balance-val ${acct.current_balance > 0 ? "red" : ""}`}>
                    {fmt(acct.current_balance)}
                  </span>
                  <span className="crd-balance-sub">de {fmt(acct.credit_limit)}</span>
                </div>
                <div className="crd-progress-bar">
                  <div className="crd-progress-fill" style={{
                    width: `${usedPct}%`,
                    background: usedPct > 80 ? "#ef4444" : usedPct > 50 ? "#f59e0b" : "#10b981",
                  }} />
                </div>
                <span className="crd-status-badge" style={{ color: sc.color, borderColor: sc.color }}>
                  <StatusIcon size={11} /> {sc.label}
                </span>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>

              {isExpanded && (
                <div className="crd-account-detail">
                  <div className="crd-detail-grid">
                    <div className="crd-detail-item">
                      <label>Disponible</label>
                      <span className="green">{fmt(available)}</span>
                    </div>
                    <div className="crd-detail-item">
                      <label>Debe</label>
                      <span className="red">{fmt(acct.current_balance)}</span>
                    </div>
                    <div className="crd-detail-item">
                      <label>Límite</label>
                      <span>{fmt(acct.credit_limit)}</span>
                    </div>
                  </div>

                  {/* Guarantor info */}
                  {(acct.guarantor || acct.guarantor_name) && (
                    <div className="crd-guarantor-info">
                      <Shield size={13} />
                      <span>
                        <strong>Fiador:</strong> {acct.guarantor?.full_name || acct.guarantor_name}
                        {acct.guarantor_phone && ` — ${acct.guarantor_phone}`}
                        {acct.guarantor_relationship && ` (${acct.guarantor_relationship})`}
                      </span>
                    </div>
                  )}

                  {/* Payment form */}
                  {showPayment === acct.id ? (
                    <div className="crd-pay-form">
                      <div className="acc-invite-row">
                        <div className="acc-invite-field" style={{ flex: 1 }}>
                          <label>Monto del abono</label>
                          <input type="number" placeholder="0" value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)} className="fin-cash-input"
                            max={acct.current_balance} min="1" />
                        </div>
                        <div className="acc-invite-field" style={{ flex: 1 }}>
                          <label>Método de pago</label>
                          <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="inv-ing-select">
                            <option value="cash">Efectivo</option>
                            <option value="transfer">Transferencia</option>
                            <option value="card">Tarjeta</option>
                            <option value="nequi">Nequi</option>
                            <option value="daviplata">Daviplata</option>
                          </select>
                        </div>
                      </div>
                      <div className="acc-invite-field">
                        <label>Nota (opcional)</label>
                        <input placeholder="Ej: Abono parcial" value={payNotes}
                          onChange={(e) => setPayNotes(e.target.value)} className="fin-cash-input" />
                      </div>
                      <div className="acc-invite-actions">
                        <button className="fin-cash-btn secondary" onClick={() => setShowPayment(null)}>Cancelar</button>
                        <button className="fin-cash-btn primary" onClick={() => handlePayment(acct.id)} disabled={isPending}>
                          {isPending ? <Loader2 size={14} className="animate-spin" /> : <DollarSign size={14} />}
                          Registrar Abono
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="crd-actions">
                      {acct.current_balance > 0 && (
                        <button className="fin-cash-btn primary" onClick={() => { setShowPayment(acct.id); setPayAmount(""); setPayNotes(""); }}>
                          <DollarSign size={14} /> Registrar Abono
                        </button>
                      )}
                      <button className="fin-cash-btn secondary" onClick={() => handleSuspend(acct.id, acct.status)} disabled={isPending}>
                        {acct.status === "active" ? <><Ban size={14} /> Suspender</> : <><CheckCircle2 size={14} /> Reactivar</>}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="fin-empty">
            <CreditCard size={40} strokeWidth={1} />
            <p>{search ? "Sin resultados" : "No hay cuentas de crédito. Crea una para empezar."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
