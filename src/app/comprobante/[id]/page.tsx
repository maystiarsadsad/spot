import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { describeOptions } from "@/lib/item-options";
import { ReceiptActions } from "@/components/shared/receipt-actions";

export const metadata: Metadata = {
  title: "Comprobante de venta",
  robots: { index: false, follow: false },
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  nequi: "Nequi",
  credit: "Crédito (fiado)",
  pending: "Pendiente",
};

/**
 * Printable sales receipt for the business (members only, RLS). It is NOT a
 * DIAN electronic invoice and says so: delivering something that looks like an
 * invoice without being one is sanctionable.
 */
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: txn } = await supabase
    .from("transactions")
    .select("id, business_id, code, type, status, created_at, customer_name, customer_phone, payment_method, payment_status, subtotal, discount, tax, total, address")
    .eq("id", id)
    .maybeSingle();
  if (!txn) notFound();

  const [{ data: items }, { data: biz }] = await Promise.all([
    supabase.from("transaction_items").select("name, quantity, unit_price, total_price, options, notes").eq("transaction_id", txn.id).order("created_at"),
    supabase.from("businesses").select("name, legal_name, tax_id, address, city, phone, whatsapp, currency, timezone").eq("id", txn.business_id).single(),
  ]);
  if (!biz) notFound();

  const currency = biz.currency || "COP";
  const fmt = (n: number) => formatCurrency(Number(n), currency);
  const when = new Date(txn.created_at as string).toLocaleString("es-CO", {
    timeZone: biz.timezone || "America/Bogota",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const lines = (items ?? []).map((it) => ({
    name: it.name,
    quantity: Number(it.quantity),
    total: Number(it.total_price),
    detail: [...describeOptions(it.options), it.notes].filter(Boolean).join(" · "),
  }));
  const shareText = [
    `${biz.name} — Comprobante ${txn.code ?? ""}`,
    when,
    ...lines.map((l) => `${l.quantity} x ${l.name}: ${fmt(l.total)}`),
    `Total: ${fmt(Number(txn.total))}`,
    "No es factura electrónica de venta.",
  ].join("\n");

  return (
    <main className="receipt-page">
      <ReceiptActions shareText={shareText} phone={txn.customer_phone} />
      <article className="receipt">
        <header>
          <h1>{biz.name}</h1>
          {biz.legal_name && biz.legal_name !== biz.name && <p>{biz.legal_name}</p>}
          {biz.tax_id && <p>NIT / C.C. {biz.tax_id}</p>}
          {(biz.address || biz.city) && <p>{[biz.address, biz.city].filter(Boolean).join(", ")}</p>}
          {(biz.whatsapp || biz.phone) && <p>Tel. {biz.whatsapp || biz.phone}</p>}
        </header>

        <p className="receipt-title">COMPROBANTE DE VENTA</p>
        <div className="receipt-meta">
          <span>N.º {txn.code ?? txn.id.slice(0, 8)}</span>
          <span>{when}</span>
        </div>
        {txn.customer_name && <p className="receipt-meta-line">Cliente: {txn.customer_name}</p>}
        {txn.address && <p className="receipt-meta-line">Entrega: {txn.address}</p>}

        <table>
          <thead>
            <tr>
              <th>Cant.</th>
              <th>Descripción</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td>{l.quantity}</td>
                <td>
                  {l.name}
                  {l.detail && <small>{l.detail}</small>}
                </td>
                <td>{fmt(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="receipt-totals">
          {Number(txn.discount) > 0 && <p><span>Descuento</span><span>−{fmt(Number(txn.discount))}</span></p>}
          {Number(txn.tax) > 0 && <p><span>Impuestos</span><span>{fmt(Number(txn.tax))}</span></p>}
          <p className="receipt-total"><span>TOTAL</span><span>{fmt(Number(txn.total))}</span></p>
          <p><span>Pago</span><span>{PAYMENT_LABELS[txn.payment_method ?? ""] ?? txn.payment_method ?? "—"}{txn.payment_status === "paid" || txn.payment_method === "pending" ? "" : " (por cobrar)"}</span></p>
        </div>

        <footer>
          <p><strong>Este documento no es una factura electrónica de venta</strong> ni un documento equivalente electrónico. Es un comprobante interno de la operación.</p>
          <p>¡Gracias por tu compra!</p>
        </footer>
      </article>
    </main>
  );
}
