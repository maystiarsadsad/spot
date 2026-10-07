import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBookingBusiness } from "@/lib/booking/data";
import { localDate } from "@/lib/booking/availability";
import { canEnter, currentMembership, daysLeft, membershipState, sessionsLeft, STATE_LABELS } from "@/lib/memberships/status";
import { CancelClassButton } from "@/components/public/cancel-class-button";

interface PageProps {
  params: Promise<{ slug: string; token: string }>;
}

export const metadata: Metadata = {
  title: "Mi plan",
  robots: { index: false, follow: false },
};

const longDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("es-CO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

const todayFor = (timeZone: string) => localDate(new Date(), timeZone);

export default async function MemberPage({ params }: PageProps) {
  const { slug, token } = await params;
  if (!/^[a-f0-9]{32}$/.test(token)) notFound();

  // Private link → service role, filtered by the token's contact and business
  const admin = createAdminClient();
  const { data: contact } = await admin
    .from("contacts")
    .select("id, business_id, full_name, member_code")
    .eq("portal_token", token)
    .maybeSingle();
  if (!contact) notFound();
  const business = await loadBookingBusiness(contact.business_id);
  if (!business || business.slug !== slug) notFound();

  const today = todayFor(business.timeZone);
  const [{ data: memberships }, { data: bookings }, { data: checkIns }] = await Promise.all([
    admin
      .from("memberships")
      .select("plan_name, status, starts_on, ends_on, sessions_total, sessions_used")
      .eq("business_id", business.id)
      .eq("contact_id", contact.id)
      .order("ends_on", { ascending: false }),
    admin
      .from("class_bookings")
      .select("id, class_date, status, gym_classes(name, start_time)")
      .eq("business_id", business.id)
      .eq("contact_id", contact.id)
      .eq("status", "booked")
      .gte("class_date", today)
      .order("class_date"),
    admin
      .from("check_ins")
      .select("checked_at")
      .eq("business_id", business.id)
      .eq("contact_id", contact.id)
      .order("checked_at", { ascending: false })
      .limit(5),
  ]);

  const current = currentMembership(memberships ?? [], today);
  const state = membershipState(current, today);
  const left = current ? daysLeft(current, today) : 0;
  const sessions = current ? sessionsLeft(current) : null;
  const wa = business.whatsapp?.replace(/\D/g, "");
  const statusClass = canEnter(state) ? "is-confirmed" : state === "expired" || state === "no_sessions" ? "is-cancelled" : "";

  return (
    <div className="public-store">
      <div className="bk-appt">
        <Link href={`/${business.slug}`} className="bk-link" style={{ alignSelf: "flex-start" }}>
          <ArrowLeft size={16} /> {business.name}
        </Link>
        <h1 className="bk-title">Hola, {contact.full_name.split(" ")[0]} 💪</h1>

        <div className="bk-appt-card">
          <span className={`bk-status ${statusClass}`}>{STATE_LABELS[state]}</span>
          {current && state === "pending" ? (
            <>
              <div className="bk-appt-row"><span>Plan</span><strong>{current.plan_name}</strong></div>
              <p className="bk-hint">Se activa apenas pagues en recepción o por WhatsApp.</p>
            </>
          ) : current ? (
            <>
              <div className="bk-appt-row"><span>Plan</span><strong>{current.plan_name}</strong></div>
              {state === "scheduled" ? (
                <div className="bk-appt-row"><span>Empieza</span><strong>{longDate(current.starts_on)}</strong></div>
              ) : (
                <div className="bk-appt-row"><span>{state === "expired" ? "Venció" : "Vence"}</span><strong>{longDate(current.ends_on)}</strong></div>
              )}
              {canEnter(state) && <div className="bk-appt-row"><span>Días restantes</span><strong>{left}</strong></div>}
              {sessions != null && current.sessions_total != null && (
                <>
                  <div className="bk-appt-row"><span>Entradas</span><strong>{sessions} de {current.sessions_total}</strong></div>
                  <div className="gym-meter"><span style={{ width: `${(sessions / current.sessions_total) * 100}%` }} /></div>
                </>
              )}
            </>
          ) : (
            <p className="bk-hint">Aún no tienes un plan activo.</p>
          )}
        </div>

        {contact.member_code && (
          <div className="bk-appt-card">
            <span className="bk-hint" style={{ justifyContent: "center" }}>Tu código para recepción</span>
            <p className="gym-code">{contact.member_code}</p>
          </div>
        )}

        <div className="bk-appt-card">
          <strong>Mis clases</strong>
          {(bookings ?? []).length === 0 ? (
            <p className="bk-hint">No tienes clases reservadas. <Link className="underline" href={`/${business.slug}`}>Ver horario</Link></p>
          ) : (
            [...(bookings ?? [])]
              .sort((a, b) =>
                `${a.class_date} ${(a.gym_classes as unknown as { start_time: string } | null)?.start_time ?? ""}`.localeCompare(
                  `${b.class_date} ${(b.gym_classes as unknown as { start_time: string } | null)?.start_time ?? ""}`
                )
              )
              .map((b) => {
              const cls = b.gym_classes as unknown as { name: string; start_time: string } | null;
              return (
                <div key={b.id} className="bk-appt-row" style={{ alignItems: "center" }}>
                  <span>{longDate(b.class_date)} · {String(cls?.start_time ?? "").slice(0, 5)}</span>
                  <strong style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {cls?.name}
                    <CancelClassButton token={token} bookingId={b.id} />
                  </strong>
                </div>
              );
            })
          )}
        </div>

        {(checkIns ?? []).length > 0 && (
          <p className="bk-hint">
            Última visita: {new Date(checkIns![0].checked_at).toLocaleString("es-CO", { timeZone: business.timeZone, weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}
          </p>
        )}

        {wa && (
          <a
            className="store-checkout-submit"
            href={`https://wa.me/${wa}?text=${encodeURIComponent(state === "pending" ? `Hola, soy ${contact.full_name}. Me inscribí al ${current?.plan_name ?? "plan"} desde la página, ¿cómo pago?` : `Hola, soy ${contact.full_name}. Quiero renovar mi plan en ${business.name}.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            <MessageCircle size={18} /> {state === "pending" ? "Pagar por WhatsApp" : "Renovar por WhatsApp"}
          </a>
        )}
      </div>
    </div>
  );
}
