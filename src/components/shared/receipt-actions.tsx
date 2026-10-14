"use client";

import { ArrowLeft, MessageCircle, Printer } from "lucide-react";

/** Print / share buttons for the sales receipt (hidden when printing). */
export function ReceiptActions({ shareText, phone }: { shareText: string; phone: string | null }) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  const wa = digits.length === 10 ? `57${digits}` : digits;
  return (
    <div className="receipt-actions">
      <button type="button" onClick={() => history.back()}>
        <ArrowLeft size={16} /> Volver
      </button>
      <button type="button" onClick={() => window.print()}>
        <Printer size={16} /> Imprimir
      </button>
      <a href={`https://wa.me/${wa}?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer">
        <MessageCircle size={16} /> Enviar por WhatsApp
      </a>
    </div>
  );
}
