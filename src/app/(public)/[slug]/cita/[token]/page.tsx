import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBookingBusiness } from "@/lib/booking/data";
import { CancelAppointmentButton } from "@/components/public/cancel-appointment-button";

interface PageProps {
  params: Promise<{ slug: string; token: string }>;
}

export const metadata: Metadata = {
  title: "Tu cita",
  robots: { index: false, follow: false },
};

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendiente de confirmación", className: "" },
  confirmed: { label: "Confirmada", className: "is-confirmed" },
  completed: { label: "Atendida", className: "is-confirmed" },
  cancelled: { label: "Cancelada", className: "is-cancelled" },
};

export default async function AppointmentPage({ params }: PageProps) {
  const { slug, token } = await params;
  if (!/^[a-f0-9]{32}$/.test(token)) notFound();

  // Anonymous page reached by the secret link → service role, filtered by token
  const admin = createAdminClient();
  const { data: appt } = await admin
    .from("reservations")
    .select("business_id, status, reservation_time, end_time, customer_name, price, item_id, employee_id")
    .eq("manage_token", token)
    .maybeSingle();
  if (!appt) notFound();

  const business = await loadBookingBusiness(appt.business_id);
  if (!business || business.slug !== slug) notFound();

  const [{ data: service }, { data: person }] = await Promise.all([
    appt.item_id ? admin.from("catalog_items").select("name").eq("id", appt.item_id).eq("business_id", business.id).maybeSingle() : Promise.resolve({ data: null }),
    appt.employee_id ? admin.from("employees").select("full_name").eq("id", appt.employee_id).eq("business_id", business.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const start = new Date(appt.reservation_time);
  const whenRaw = start.toLocaleString("es-CO", { timeZone: business.timeZone, weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });
  const when = whenRaw.charAt(0).toUpperCase() + whenRaw.slice(1);
  const status = STATUS[appt.status] ?? STATUS.pending;
  const active = appt.status === "pending" || appt.status === "confirmed";
  const upcoming = start.getTime() > Date.now();
  const price = appt.price != null
    ? new Intl.NumberFormat("es-CO", { style: "currency", currency: business.currency, minimumFractionDigits: 0 }).format(Number(appt.price))
    : null;

  return (
    <div className="public-store">
      <div className="bk-appt">
        <Link href={`/${business.slug}`} className="bk-link" style={{ alignSelf: "flex-start" }}>
          <ArrowLeft size={16} /> {business.name}
        </Link>
        <h1 className="bk-title">Hola, {appt.customer_name.split(" ")[0]}</h1>
        <div className="bk-appt-card">
          <span className={`bk-status ${status.className}`}>{status.label}</span>
          <div className="bk-appt-row"><span>Servicio</span><strong>{service?.name ?? "—"}</strong></div>
          {person && <div className="bk-appt-row"><span>Con</span><strong>{person.full_name}</strong></div>}
          <div className="bk-appt-row"><span>Cuándo</span><strong>{when}</strong></div>
          {price && <div className="bk-appt-row"><span>Valor</span><strong>{price}</strong></div>}
        </div>
        {active && upcoming && <CancelAppointmentButton token={token} />}
        {business.whatsapp && (
          <a className="bk-link" href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={16} /> Escribir a {business.name}
          </a>
        )}
        {active && upcoming && (
          <p className="bk-hint">
            Puedes cancelar en línea hasta {business.settings.cancelHours} h antes de la cita. Guarda este enlace.
          </p>
        )}
      </div>
    </div>
  );
}
