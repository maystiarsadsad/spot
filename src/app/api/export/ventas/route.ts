import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/get-active-business";

const TYPE_LABELS: Record<string, string> = { sale: "Venta POS", order: "Pedido", reservation: "Reserva/estadía", appointment: "Cita" };
const STATUS_LABELS: Record<string, string> = { pending: "Pendiente", confirmed: "Confirmado", in_progress: "En curso", completed: "Completado", cancelled: "Anulado" };
const PAYMENT_LABELS: Record<string, string> = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", nequi: "Nequi", credit: "Crédito", pending: "Pendiente" };

/** CSV cell for Excel in Spanish locale (";" separator, quoted text). */
const cell = (v: unknown) => {
  if (v == null) return "";
  if (typeof v === "number") return String(v).replace(".", ",");
  const s = String(v).replace(/"/g, '""').replace(/\r?\n/g, " ");
  return /[;"]/.test(s) || s !== s.trim() ? `"${s}"` : s;
};

/**
 * Monthly sales export for the accountant (members only). It is an operations
 * report, not an electronic invoice: it can't be "sent later" to the DIAN.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("No autorizado", { status: 401 });
  const business = await getActiveBusiness();
  if (!business) return new Response("Sin negocio activo", { status: 400 });

  const month = new URL(req.url).searchParams.get("mes") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return new Response("Mes inválido (AAAA-MM)", { status: 400 });
  const [y, m] = month.split("-").map(Number);
  // Month boundaries in Colombia time (UTC-5, no DST)
  const from = new Date(Date.UTC(y, m - 1, 1, 5)).toISOString();
  const to = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1, 5)).toISOString();
  const tz = business.timezone || "America/Bogota";

  const { data: txns, error } = await supabase
    .from("transactions")
    .select("id, code, type, status, created_at, customer_name, customer_phone, payment_method, payment_status, subtotal, discount, tax, total, transaction_items(name, quantity, total_price)")
    .eq("business_id", business.id)
    .gte("created_at", from)
    .lt("created_at", to)
    .order("created_at")
    .limit(20000);
  if (error) return new Response("No se pudo exportar", { status: 500 });

  const header = ["Fecha", "Hora", "Código", "Tipo", "Estado", "Cliente", "Teléfono", "Medio de pago", "Pagado", "Subtotal", "Descuento", "Impuestos", "Total", "Detalle"];
  const rows = (txns ?? []).map((t) => {
    const at = new Date(t.created_at as string);
    const items = (t.transaction_items as unknown as { name: string; quantity: number; total_price: number }[]) ?? [];
    return [
      at.toLocaleDateString("es-CO", { timeZone: tz, day: "2-digit", month: "2-digit", year: "numeric" }),
      at.toLocaleTimeString("es-CO", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }),
      t.code,
      TYPE_LABELS[t.type] ?? t.type,
      STATUS_LABELS[t.status ?? ""] ?? t.status,
      t.customer_name,
      t.customer_phone,
      PAYMENT_LABELS[t.payment_method ?? ""] ?? t.payment_method,
      t.payment_status === "paid" ? "Sí" : "No",
      Number(t.subtotal ?? 0),
      Number(t.discount ?? 0),
      Number(t.tax ?? 0),
      Number(t.total ?? 0),
      items.map((i) => `${i.quantity} x ${i.name}`).join(" | "),
    ].map(cell).join(";");
  });

  const valid = (txns ?? []).filter((t) => t.status === "completed");
  const footer = ["", "", "", "", "", "", "", "", "", "", "", "Total completado", cell(valid.reduce((a, t) => a + Number(t.total ?? 0), 0)), ""].join(";");
  // BOM so Excel opens accents correctly; "sep=" is not used because it breaks the BOM
  const csv = "﻿" + [header.join(";"), ...rows, "", footer].join("\r\n") + "\r\n";
  const slug = business.slug ?? "negocio";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ventas-${slug}-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
