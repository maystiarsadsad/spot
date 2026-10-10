import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, MessageCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDate } from "@/lib/booking/availability";
import { loadStayBusiness } from "@/lib/stays/data";
import { canCancelOnline, depositFor, folio, nightsCount, STAY_STATUS_LABELS } from "@/lib/stays/pricing";
import { CancelStayButton } from "@/components/public/cancel-stay-button";

interface PageProps {
  params: Promise<{ slug: string; token: string }>;
}

export const metadata: Metadata = {
  title: "Mi reserva",
  robots: { index: false, follow: false },
};

const longDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("es-CO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

const todayFor = (timeZone: string) => localDate(new Date(), timeZone);

export default async function StayPage({ params }: PageProps) {
  const { slug, token } = await params;
  if (!/^[a-f0-9]{32}$/.test(token)) notFound();

  // Private link → service role, filtered by the token
  const admin = createAdminClient();
  const { data: stays } = await admin
    .from("stays")
    .select("id, business_id, code, item_id, guest_name, adults, children, check_in, check_out, status, room_total, catalog_items(name), rooms(name)")
    .eq("manage_token", token)
    .order("created_at");
  if (!stays?.length) notFound();
  const business = await loadStayBusiness(stays[0].business_id, admin);
  if (!business || business.slug !== slug) notFound();

  const ids = stays.map((s) => s.id);
  const [{ data: charges }, { data: payments }, { data: biz }] = await Promise.all([
    admin.from("stay_charges").select("amount").in("stay_id", ids),
    admin.from("stay_payments").select("amount").in("stay_id", ids),
    admin.from("businesses").select("address, city").eq("id", business.id).single(),
  ]);

  const first = stays[0];
  const live = stays.filter((s) => s.status !== "cancelled" && s.status !== "no_show");
  const account = folio(live.reduce((a, s) => a + Number(s.room_total), 0), charges ?? [], payments ?? []);
  const status = live[0]?.status ?? first.status;
  const nights = nightsCount(first.check_in, first.check_out);
  const today = todayFor(business.timeZone);
  const cancellable = ["pending", "confirmed"].includes(status) && canCancelOnline(first.check_in, today, business.settings);
  const deposit = depositFor(account.total, business.settings);
  const typeName = (first.catalog_items as unknown as { name: string } | null)?.name ?? "Habitación";
  const roomNames = live.map((s) => (s.rooms as unknown as { name: string } | null)?.name).filter(Boolean);
  const wa = business.whatsapp?.replace(/\D/g, "");
  const fmt = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: business.currency, minimumFractionDigits: 0 }).format(n);
  const statusClass = ["confirmed", "checked_in"].includes(status) ? "is-confirmed" : ["cancelled", "no_show"].includes(status) ? "is-cancelled" : "";
  const address = [biz?.address, biz?.city].filter(Boolean).join(", ");

  return (
    <div className="public-store">
      <div className="bk-appt">
        <Link href={`/${business.slug}`} className="bk-link" style={{ alignSelf: "flex-start" }}>
          <ArrowLeft size={16} /> {business.name}
        </Link>
        <h1 className="bk-title">Hola, {first.guest_name.split(" ")[0]} 🛎️</h1>

        <div className="bk-appt-card">
          <span className={`bk-status ${statusClass}`}>{STAY_STATUS_LABELS[status] ?? status}</span>
          <div className="bk-appt-row"><span>Reserva</span><strong>{first.code}</strong></div>
          <div className="bk-appt-row"><span>{live.length > 1 ? `${live.length} ×` : "Habitación"}</span><strong>{typeName}{roomNames.length && status === "checked_in" ? ` · ${roomNames.join(", ")}` : ""}</strong></div>
          <div className="bk-appt-row"><span>Llegada</span><strong>{longDate(first.check_in)} · desde {business.settings.checkInTime}</strong></div>
          <div className="bk-appt-row"><span>Salida</span><strong>{longDate(first.check_out)} · hasta {business.settings.checkOutTime}</strong></div>
          <div className="bk-appt-row"><span>Huéspedes</span><strong>{first.adults * live.length} adultos{first.children ? ` · ${first.children * live.length} niños` : ""}</strong></div>
          <div className="bk-appt-row"><span>{nights} {nights === 1 ? "noche" : "noches"}</span><strong>{fmt(account.room)}</strong></div>
          {account.extras > 0 && <div className="bk-appt-row"><span>Consumos</span><strong>{fmt(account.extras)}</strong></div>}
          {account.paid > 0 && <div className="bk-appt-row"><span>Pagado</span><strong>{fmt(account.paid)}</strong></div>}
          <div className="bk-appt-row"><span>{account.paid > 0 ? "Saldo" : "Total"}</span><strong>{fmt(Math.max(0, account.balance))}</strong></div>
          {status === "pending" && <p className="bk-hint">El hotel te confirmará la disponibilidad muy pronto.</p>}
          {["pending", "confirmed"].includes(status) && account.paid === 0 && deposit > 0 && (
            <p className="bk-hint">Para garantizar tu reserva te pedimos un anticipo de {fmt(deposit)}.</p>
          )}
        </div>

        {address && (
          <p className="bk-hint"><MapPin size={14} /> {address}</p>
        )}

        {wa && (
          <a
            className="store-checkout-submit"
            href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hola, soy ${first.guest_name}. Tengo la reserva ${first.code} (${longDate(first.check_in)}).${account.paid === 0 && deposit > 0 && ["pending", "confirmed"].includes(status) ? ` Quiero pagar el anticipo de ${fmt(deposit)}.` : ""}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            <MessageCircle size={18} /> {account.paid === 0 && deposit > 0 && ["pending", "confirmed"].includes(status) ? "Pagar anticipo por WhatsApp" : "Escribir al hotel"}
          </a>
        )}

        {cancellable ? (
          <CancelStayButton token={token} />
        ) : ["pending", "confirmed"].includes(status) ? (
          <p className="bk-hint">La cancelación en línea es hasta {business.settings.cancelDays} {business.settings.cancelDays === 1 ? "día" : "días"} antes de la llegada. Para cambios, escríbenos.</p>
        ) : null}
      </div>
    </div>
  );
}
