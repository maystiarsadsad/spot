"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Dumbbell, Loader2, MessageCircle, User, Users } from "lucide-react";
import { bookClass, requestMembership } from "@/lib/actions/gym";

export interface GymPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  days: number;
  sessions: number | null;
  featured: boolean;
}

export interface GymSession {
  classId: string;
  date: string;
  start: string;
  name: string;
  instructor: string | null;
  durationMinutes: number;
  capacity: number;
  booked: number;
}

interface Props {
  business: { id: string; slug: string; currency: string; whatsapp: string | null };
  plans: GymPlan[];
  sessions: GymSession[];
}

const dayLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("es-CO", { timeZone: "UTC", weekday: "short", day: "numeric" }).replace(".", "");

const planLength = (p: GymPlan) => {
  const span = p.days % 30 === 0 ? `${p.days / 30} ${p.days === 30 ? "mes" : "meses"}` : p.days % 7 === 0 ? `${p.days / 7} semanas` : `${p.days} días`;
  return p.sessions ? `${p.sessions} entradas · válido ${span}` : `Acceso ilimitado · ${span}`;
};

export function GymPage({ business, plans, sessions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [signup, setSignup] = useState<GymPlan | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [signupDone, setSignupDone] = useState<{ token: string; planName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dates = useMemo(() => [...new Set(sessions.map((s) => s.date))], [sessions]);
  const [day, setDay] = useState<string | null>(dates[0] ?? null);
  const [booking, setBooking] = useState<GymSession | null>(null);
  const [phone, setPhone] = useState("");
  const [booked, setBooked] = useState<{ key: string; token: string } | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);

  // Only one plan can be "the most chosen"
  const highlighted = plans.find((p) => p.featured)?.id ?? null;
  const fmt = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: business.currency, minimumFractionDigits: 0 }).format(n);
  const wa = business.whatsapp?.replace(/\D/g, "");

  const submitSignup = () => {
    if (!signup) return;
    setError(null);
    startTransition(async () => {
      const res = await requestMembership(business.id, { planId: signup.id, ...form });
      if ("error" in res && res.error) return void setError(res.error);
      if ("token" in res && res.token) setSignupDone({ token: res.token, planName: res.planName ?? signup.name });
    });
  };

  const submitBooking = () => {
    if (!booking) return;
    setBookError(null);
    startTransition(async () => {
      const res = await bookClass(business.id, booking.classId, booking.date, phone);
      if ("error" in res && res.error) return void setBookError(res.error);
      if ("token" in res && res.token) {
        setBooked({ key: `${booking.classId}|${booking.date}`, token: res.token });
        setBooking(null);
        router.refresh(); // fresh spot counts from the server
      }
    });
  };

  return (
    <div className="gym">
      {/* Plans */}
      <section>
        <h2 className="bk-title">Planes</h2>
        {plans.length === 0 ? (
          <p className="bk-empty">Pronto publicaremos nuestros planes.</p>
        ) : (
          <div className="gym-plans">
            {plans.map((p) => (
              <article key={p.id} className={`gym-plan ${p.id === highlighted ? "is-featured" : ""}`}>
                {p.id === highlighted && <span className="gym-plan-badge">Más elegido</span>}
                <h3>{p.name}</h3>
                <p className="gym-plan-price">{fmt(p.price)}</p>
                <p className="gym-plan-length">{planLength(p)}</p>
                {p.description && <p className="gym-plan-desc">{p.description}</p>}
                <button type="button" className="store-checkout-submit" onClick={() => { setSignup(p); setSignupDone(null); setError(null); }}>
                  <Dumbbell size={18} /> Inscribirme
                </button>
              </article>
            ))}
          </div>
        )}

        {signup && (
          <div className="gym-panel" role="dialog" aria-label={`Inscripción a ${signup.name}`}>
            {signupDone ? (
              <div className="bk-done">
                <CheckCircle2 size={44} />
                <h3>¡Listo! Te esperamos</h3>
                <p>Separamos tu <strong>{signupDone.planName}</strong>. Paga en recepción (o escríbenos) y queda activo de inmediato.</p>
                <div className="bk-done-actions">
                  {wa && (
                    <a className="store-checkout-submit" href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hola, me inscribí al ${signupDone.planName} desde la página. ¿Cómo pago?`)}`} target="_blank" rel="noopener noreferrer">
                      <MessageCircle size={18} /> Pagar / preguntar por WhatsApp
                    </a>
                  )}
                  <Link className="bk-link" href={`/${business.slug}/socio/${signupDone.token}`}><User size={16} /> Ver mi plan</Link>
                  <button type="button" className="bk-link" onClick={() => setSignup(null)}>Cerrar</button>
                </div>
              </div>
            ) : (
              <form
                className="bk-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitSignup();
                }}
              >
                <p className="gym-panel-title">Inscripción · <strong>{signup.name}</strong> · {fmt(signup.price)}</p>
                {error && <p className="bk-error" role="alert">{error}</p>}
                <div className="store-checkout-field">
                  <label htmlFor="gym-name">Nombre *</label>
                  <input id="gym-name" required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="store-checkout-field">
                  <label htmlFor="gym-phone">Celular / WhatsApp *</label>
                  <input id="gym-phone" required type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="store-checkout-field">
                  <label htmlFor="gym-email">Correo (opcional)</label>
                  <input id="gym-email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="gym-panel-actions">
                  <button type="button" className="bk-link" onClick={() => setSignup(null)}>Cancelar</button>
                  <button type="submit" className="store-checkout-submit" disabled={isPending}>
                    {isPending ? <Loader2 size={18} className="store-spin" /> : <CheckCircle2 size={18} />} Inscribirme
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>

      {/* Classes */}
      <section>
        <h2 className="bk-title">Clases de la semana</h2>
        <p className="bk-hint">Reserva tu cupo con el celular con el que te inscribiste.</p>
        {dates.length === 0 ? (
          <p className="bk-empty">No hay clases programadas esta semana.</p>
        ) : (
          <>
            <div className="bk-dates" role="tablist" aria-label="Día">
              {dates.map((d) => (
                <button key={d} type="button" role="tab" aria-selected={day === d} className={`bk-date gym-date ${day === d ? "is-active" : ""}`} onClick={() => setDay(d)}>
                  {dayLabel(d)}
                </button>
              ))}
            </div>
            <ul className="gym-classes">
              {sessions.filter((s) => s.date === day).map((s) => {
                const key = `${s.classId}|${s.date}`;
                const left = Math.max(0, s.capacity - s.booked);
                const open = booking && `${booking.classId}|${booking.date}` === key;
                return (
                  <li key={key} className="gym-class">
                    <div className="gym-class-main">
                      <span className="gym-class-time">{s.start}</span>
                      <span>
                        <strong>{s.name}</strong>
                        <span className="gym-class-meta">
                          <Clock size={12} /> {s.durationMinutes} min{s.instructor ? ` · ${s.instructor}` : ""}
                        </span>
                      </span>
                      <span className={`gym-class-spots ${left === 0 ? "is-full" : left <= 3 ? "is-low" : ""}`}>
                        <Users size={13} /> {left === 0 ? "Lleno" : `${left} cupos`}
                      </span>
                      {booked?.key === key ? (
                        <Link className="gym-class-btn is-done" href={`/${business.slug}/socio/${booked.token}`}><CheckCircle2 size={14} /> Reservado</Link>
                      ) : (
                        <button type="button" className="gym-class-btn" disabled={left === 0} onClick={() => { setBooking(s); setBookError(null); }}>
                          Reservar
                        </button>
                      )}
                    </div>
                    {open && (
                      <form
                        className="gym-class-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          submitBooking();
                        }}
                      >
                        <input type="tel" required autoComplete="tel" placeholder="Tu celular" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Tu celular" />
                        <button type="submit" className="store-checkout-submit" disabled={isPending}>
                          {isPending ? <Loader2 size={16} className="store-spin" /> : "Confirmar"}
                        </button>
                        {bookError && <p className="bk-error" role="alert">{bookError}</p>}
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
