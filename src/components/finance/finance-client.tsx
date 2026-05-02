"use client";

import { useState } from "react";
import { DailyCash } from "./daily-cash";
import { ExpensesTable } from "./expenses-table";
import { CreditManager } from "./credit-manager";
import { Database } from "@/types/database";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  MinusCircle,
  History,
  CalendarDays,
  Receipt,
  BarChart3,
  CreditCard,
} from "lucide-react";

type Expense = Database["public"]["Tables"]["expenses"]["Row"];
type DailyCashRow = Database["public"]["Tables"]["daily_cash"]["Row"];

interface FinanceStats {
  monthRevenue: number;
  monthExpenses: number;
  netProfit: number;
  expenseByCategory: Record<string, number>;
  currency: string;
  monthLabel: string;
}

interface FinanceClientProps {
  businessId: string;
  initialExpenses: Expense[];
  initialDailyCash: DailyCashRow | null;
  cashHistory: DailyCashRow[];
  todayDate: string;
  financeStats: FinanceStats;
  currency: string;
  creditAccounts?: any[];
  creditContacts?: any[];
  creditStats?: { totalAccounts: number; activeAccounts: number; totalOwed: number; totalLimit: number };
}

function fmtCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function FinanceClient({
  businessId,
  initialExpenses,
  initialDailyCash,
  cashHistory,
  todayDate,
  financeStats,
  currency,
  creditAccounts,
  creditContacts,
  creditStats,
}: FinanceClientProps) {
  const [activeTab, setActiveTab] = useState("daily-cash");
  const { monthRevenue, monthExpenses, netProfit, expenseByCategory, monthLabel } = financeStats;

  const sortedCategories = Object.entries(expenseByCategory)
    .sort(([, a], [, b]) => b - a);
  const maxCategoryValue = sortedCategories.length > 0 ? sortedCategories[0][1] : 1;

  const tabs = [
    { id: "daily-cash", label: "Caja del Día", icon: CalendarDays },
    { id: "expenses", label: "Gastos", icon: Receipt },
    { id: "credits", label: "Créditos", icon: CreditCard },
    { id: "history", label: "Historial", icon: History },
    { id: "overview", label: "Resumen", icon: BarChart3 },
  ];

  return (
    <div className="fin-root">
      {/* Tabs */}
      <div className="fin-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`fin-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Caja del Día */}
      {activeTab === "daily-cash" && (
        <DailyCash 
          businessId={businessId} 
          initialData={initialDailyCash} 
          todayDate={todayDate}
          currency={currency}
        />
      )}

      {/* Gastos */}
      {activeTab === "expenses" && (
        <ExpensesTable 
          businessId={businessId} 
          initialData={initialExpenses}
          currency={currency}
        />
      )}

      {/* Créditos */}
      {activeTab === "credits" && (
        <CreditManager
          businessId={businessId}
          currency={currency}
          accounts={creditAccounts || []}
          contacts={creditContacts || []}
          stats={creditStats || { totalAccounts: 0, activeAccounts: 0, totalOwed: 0, totalLimit: 0 }}
        />
      )}

      {/* Historial de Cajas */}
      {activeTab === "history" && (
        <div className="fin-history">
          <div className="fin-history-header">
            <h3>Historial de Cajas</h3>
            <p>Últimos 30 registros de apertura y cierre de caja.</p>
          </div>
          {cashHistory.length === 0 ? (
            <div className="fin-empty">
              <History size={40} strokeWidth={1} />
              <p>No hay registros de caja anteriores.</p>
            </div>
          ) : (
            <div className="fin-history-table-wrap">
              <table className="fin-history-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Apertura</th>
                    <th>Ventas</th>
                    <th>Efectivo</th>
                    <th>Digital</th>
                    <th>Gastos</th>
                    <th>Cierre</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {cashHistory.map((row) => {
                    const expectedCash = (row.opening_balance || 0)
                      + (row.total_cash_in || 0)
                      - (row.total_expenses || 0);
                    const diff = row.closing_balance != null
                      ? (row.closing_balance - expectedCash)
                      : null;

                    return (
                      <tr key={row.id}>
                        <td className="fin-hist-date">{row.date}</td>
                        <td>{fmtCurrency(row.opening_balance || 0, currency)}</td>
                        <td className="fin-hist-green">{fmtCurrency(row.total_sales || 0, currency)}</td>
                        <td>{fmtCurrency(row.total_cash_in || 0, currency)}</td>
                        <td>{fmtCurrency(row.total_digital_in || 0, currency)}</td>
                        <td className="fin-hist-red">{fmtCurrency(row.total_expenses || 0, currency)}</td>
                        <td>
                          {row.closing_balance != null ? (
                            <span>
                              {fmtCurrency(row.closing_balance, currency)}
                              {diff != null && diff !== 0 && (
                                <span className={`fin-hist-diff ${diff > 0 ? "positive" : "negative"}`}>
                                  {diff > 0 ? "+" : ""}{fmtCurrency(diff, currency)}
                                </span>
                              )}
                            </span>
                          ) : "—"}
                        </td>
                        <td>
                          <span className={`fin-hist-badge ${row.status}`}>
                            {row.status === "closed" ? "Cerrada" : "Abierta"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Resumen Mensual */}
      {activeTab === "overview" && (
        <div className="fin-overview">
          <span className="fin-month-badge">📅 {monthLabel}</span>

          <div className="fin-stats-grid">
            <div className="fin-stat-card green">
              <div className="fin-stat-info">
                <span className="fin-stat-label">Ingresos del mes</span>
                <span className="fin-stat-value">{fmtCurrency(monthRevenue, currency)}</span>
              </div>
              <div className="fin-stat-icon green"><ArrowUpCircle size={20} /></div>
            </div>

            <div className="fin-stat-card red">
              <div className="fin-stat-info">
                <span className="fin-stat-label">Gastos del mes</span>
                <span className="fin-stat-value">{fmtCurrency(monthExpenses, currency)}</span>
              </div>
              <div className="fin-stat-icon red"><ArrowDownCircle size={20} /></div>
            </div>

            <div className={`fin-stat-card ${netProfit >= 0 ? "blue" : "orange"}`}>
              <div className="fin-stat-info">
                <span className="fin-stat-label">Resultado neto</span>
                <span className="fin-stat-value">{fmtCurrency(netProfit, currency)}</span>
                <span className="fin-stat-hint">
                  {netProfit >= 0 ? "✅ Genera ganancias" : "⚠️ Los gastos superan ingresos"}
                </span>
              </div>
              <div className={`fin-stat-icon ${netProfit >= 0 ? "blue" : "orange"}`}>
                {netProfit >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="fin-categories">
            <div className="fin-categories-header">
              <Wallet size={18} />
              <div>
                <h3>Gastos por categoría</h3>
                <p>Distribución de gastos del mes actual</p>
              </div>
            </div>
            {sortedCategories.length > 0 ? (
              <div className="fin-categories-list">
                {sortedCategories.map(([category, amount]) => (
                  <div key={category} className="fin-cat-row">
                    <div className="fin-cat-row-header">
                      <span className="fin-cat-name">{category}</span>
                      <span className="fin-cat-amount">{fmtCurrency(amount, currency)}</span>
                    </div>
                    <div className="fin-cat-bar">
                      <div
                        className="fin-cat-bar-fill"
                        style={{ width: `${Math.max((amount / maxCategoryValue) * 100, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="fin-empty">
                <MinusCircle size={40} strokeWidth={1} />
                <p>No hay gastos registrados este mes</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
