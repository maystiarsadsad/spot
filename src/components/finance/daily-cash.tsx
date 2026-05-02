"use client";

import { useState } from "react";
import { Database } from "@/types/database";
import { openDailyCash, closeDailyCash } from "@/lib/actions/finance";
import { toast } from "sonner";
import { Coins, AlertCircle, CheckCircle2, Lock, Unlock } from "lucide-react";

type DailyCashRow = Database["public"]["Tables"]["daily_cash"]["Row"];

interface DailyCashProps {
  businessId: string;
  initialData: DailyCashRow | null;
  todayDate: string;
  currency: string;
}

function fmtCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function DailyCash({ businessId, initialData, todayDate, currency }: DailyCashProps) {
  const [openingBalance, setOpeningBalance] = useState<string>("");
  const [closingBalance, setClosingBalance] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [closeResult, setCloseResult] = useState<{ expectedCash: number; difference: number } | null>(null);

  const handleOpenCash = async () => {
    if (!openingBalance || isNaN(Number(openingBalance))) {
      toast.error("Ingresa un balance de apertura válido");
      return;
    }

    setIsLoading(true);
    const result = await openDailyCash({
      business_id: businessId,
      date: todayDate,
      opening_balance: Number(openingBalance),
    });

    setIsLoading(false);
    if (result.success) {
      toast.success("Caja abierta exitosamente");
    } else {
      toast.error("Error al abrir caja: " + result.error);
    }
  };

  const handleCloseCash = async () => {
    if (!initialData) return;
    
    if (!closingBalance || isNaN(Number(closingBalance))) {
      toast.error("Ingresa un balance de cierre válido");
      return;
    }

    setIsLoading(true);
    const result = await closeDailyCash(
      initialData.id,
      Number(closingBalance),
      notes
    );

    setIsLoading(false);
    if (result.success) {
      if (result.expectedCash !== undefined) {
        setCloseResult({
          expectedCash: result.expectedCash,
          difference: result.difference!,
        });
      }
      toast.success("Caja cerrada exitosamente");
    } else {
      toast.error("Error al cerrar caja: " + result.error);
    }
  };

  // ── No cash register opened yet ──
  if (!initialData) {
    return (
      <div className="fin-cash-empty">
        <div className="fin-cash-empty-icon">
          <Unlock size={28} />
        </div>
        <h3>Caja del día sin abrir</h3>
        <p>Abre la caja registradora para comenzar a registrar el movimiento del día <strong>{todayDate}</strong>.</p>
        <div className="fin-cash-open-form">
          <label>Base inicial de apertura</label>
          <div className="fin-cash-input-row">
            <span className="fin-cash-currency">$</span>
            <input
              type="number"
              placeholder="Ej: 150.000"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="fin-cash-input"
            />
            <button
              className="fin-cash-btn primary"
              onClick={handleOpenCash}
              disabled={isLoading}
            >
              <Coins size={16} />
              {isLoading ? "Abriendo..." : "Abrir Caja"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Cash register is open or closed ──
  const isClosed = initialData.status === "closed";
  const expectedCash =
    (initialData.opening_balance || 0) +
    (initialData.total_cash_in || 0) -
    (initialData.total_expenses || 0);

  const totalIncome = (initialData.total_cash_in || 0) + (initialData.total_digital_in || 0);

  return (
    <div className="fin-cash">
      {/* Header bar */}
      <div className={`fin-cash-header ${isClosed ? "closed" : "open"}`}>
        {isClosed ? <Lock size={16} /> : <Coins size={16} />}
        <span>{isClosed ? "Caja cerrada" : "Caja abierta"} — {todayDate}</span>
        {isClosed && <CheckCircle2 size={16} className="fin-cash-check" />}
      </div>

      <div className="fin-cash-grid">
        {/* Summary card */}
        <div className="fin-cash-summary">
          <div className="fin-cash-row header">
            <span>Base de Apertura</span>
            <span className="fin-cash-amount">{fmtCurrency(initialData.opening_balance || 0, currency)}</span>
          </div>

          <div className="fin-cash-divider" />

          <div className="fin-cash-row">
            <span>💰 Ventas totales</span>
            <span className="fin-cash-amount green">{fmtCurrency(initialData.total_sales || 0, currency)}</span>
          </div>
          <div className="fin-cash-row sub">
            <span>↳ Efectivo</span>
            <span>{fmtCurrency(initialData.total_cash_in || 0, currency)}</span>
          </div>
          <div className="fin-cash-row sub">
            <span>↳ Digital / Tarjeta</span>
            <span>{fmtCurrency(initialData.total_digital_in || 0, currency)}</span>
          </div>

          <div className="fin-cash-divider" />

          <div className="fin-cash-row">
            <span>📤 Gastos del día</span>
            <span className="fin-cash-amount red">-{fmtCurrency(initialData.total_expenses || 0, currency)}</span>
          </div>

          <div className="fin-cash-divider thick" />

          <div className="fin-cash-row total">
            <span>Efectivo esperado en caja</span>
            <span className="fin-cash-amount">{fmtCurrency(expectedCash, currency)}</span>
          </div>

          {isClosed && initialData.closing_balance != null && (
            <>
              <div className="fin-cash-row total">
                <span>Efectivo real (arqueo)</span>
                <span className="fin-cash-amount">{fmtCurrency(initialData.closing_balance, currency)}</span>
              </div>
              {(() => {
                const diff = initialData.closing_balance - expectedCash;
                if (diff === 0) return (
                  <div className="fin-cash-diff neutral">✅ Sin diferencias — cuadre perfecto</div>
                );
                return (
                  <div className={`fin-cash-diff ${diff > 0 ? "positive" : "negative"}`}>
                    {diff > 0
                      ? `⬆️ Sobrante de ${fmtCurrency(diff, currency)}`
                      : `⬇️ Faltante de ${fmtCurrency(Math.abs(diff), currency)}`}
                  </div>
                );
              })()}
            </>
          )}

          {initialData.notes && (
            <div className="fin-cash-notes">
              <strong>Notas:</strong> {initialData.notes}
            </div>
          )}
        </div>

        {/* Close cash form */}
        {!isClosed && (
          <div className="fin-cash-close">
            <h4>Cerrar Caja</h4>
            <p>Cuenta el efectivo real en la caja y registra el arqueo.</p>

            <label>Efectivo real contado</label>
            <div className="fin-cash-input-row">
              <span className="fin-cash-currency">$</span>
              <input
                type="number"
                placeholder="Ej: 250.000"
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
                className="fin-cash-input"
              />
            </div>

            {closingBalance && !isNaN(Number(closingBalance)) && (
              <div className="fin-cash-preview">
                {(() => {
                  const diff = Number(closingBalance) - expectedCash;
                  if (diff === 0) return <span className="neutral">✅ Cuadra perfecto</span>;
                  return (
                    <span className={diff > 0 ? "positive" : "negative"}>
                      {diff > 0
                        ? `⬆️ Sobrante: ${fmtCurrency(diff, currency)}`
                        : `⬇️ Faltante: ${fmtCurrency(Math.abs(diff), currency)}`}
                    </span>
                  );
                })()}
              </div>
            )}

            <label>Notas (opcional)</label>
            <input
              placeholder="Razón si hay descuadres..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="fin-cash-input"
            />

            <button
              className="fin-cash-btn secondary"
              onClick={handleCloseCash}
              disabled={isLoading}
            >
              <Lock size={16} />
              {isLoading ? "Cerrando..." : "Registrar Cierre"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
