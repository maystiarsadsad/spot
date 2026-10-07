"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarPlus, CheckCircle2, Clock, Loader2, MessageCircle, Sparkles, User } from "lucide-react";
import { bookAppointment, getAvailableSlots } from "@/lib/actions/booking";
import { weekdayOf, type WeeklySchedule } from "@/lib/booking/availability";

export interface BookingService {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
  imageUrl: string | null;
  category: string | null;
}

export interface BookingStaff {
  id: string;
  name: string;
  position: string;
  bio: string | null;
  avatarUrl: string | null;
  serviceIds: string[];
  schedule: WeeklySchedule;
}

interface Props {
  business: { id: string; name: string; slug: string; currency: string; whatsapp: string | null; address: string | null };
  services: BookingService[];
  staff: BookingStaff[];
  dates: string[];
  terms: { professional: string; professionals: string; cta: string };
}

type Step = "service" | "staff" | "time" | "details" | "done";
const ANY = "any";

const dayLabel = (date: string) => {
  const d = new Date(`${date}T12:00:00Z`);
  return {
    weekday: d.toLocaleDateString("es-CO", { timeZone: "UTC", weekday: "short" }).replace(".", ""),
    day: d.getUTCDate(),
    month: d.toLocaleDateString("es-CO", { timeZone: "UTC", month: "short" }).replace(".", ""),
    long: d.toLocaleDateString("es-CO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }),
  };
};

const initials = (name: string) => name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
const duration = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`);
const gcalStamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function BookingFlow({ business, services, staff, dates, terms }: Props) {
  const [step, setStep] = useState<Step>("service");
  const [service, setService] = useState<BookingService | null>(null);
  const [staffId, setStaffId] = useState<string>(ANY);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<{ start: string; label: string }[] | null>(null);
  const [slot, setSlot] = useState<{ start: string; label: string } | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ token: string; status: string; professional: string | null } | null>(null);
  const [isPending, startTransition] = useTransition();

  const fmt = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: business.currency, minimumFractionDigits: 0 }).format(n);

  const configured = staff.some((s) => s.serviceIds.length > 0);
  const eligible = useMemo(
    () => (service ? staff.filter((s) => !configured || s.serviceIds.includes(service.id)) : []),
    [service, staff, configured]
  );
  const chosen = staffId === ANY ? null : staff.find((s) => s.id === staffId) ?? null;

  // Only days somebody (or the chosen professional) works
  const availableDates = useMemo(() => {
    const people = chosen ? [chosen] : eligible;
    return dates.filter((d) => people.some((p) => p.schedule[weekdayOf(d)].length > 0));
  }, [dates, chosen, eligible]);

  const grouped = useMemo(() => {
    const map = new Map<string, BookingService[]>();
    for (const s of services) map.set(s.category ?? "Servicios", [...(map.get(s.category ?? "Servicios") ?? []), s]);
    return [...map.entries()];
  }, [services]);

  const loadSlots = (d: string, who = staffId) => {
    if (!service) return;
    setDate(d);
    setSlot(null);
    setSlots(null);
    setError(null);
    startTransition(async () => {
      const res = await getAvailableSlots(business.id, service.id, who === ANY ? null : who, d);
      if ("error" in res && res.error) setError(res.error);
      else if ("slots" in res && res.slots) setSlots(res.slots);
    });
  };

  const chooseService = (s: BookingService) => {
    setService(s);
    setDate(null);
    setSlots(null);
    const people = staff.filter((p) => !configured || p.serviceIds.includes(s.id));
    if (people.length <= 1) {
      setStaffId(people[0]?.id ?? ANY);
      setStep("time");
    } else setStep("staff");
  };

  const chooseStaff = (id: string) => {
    setStaffId(id);
    setDate(null);
    setSlots(null);
    setStep("time");
  };

  const submit = () => {
    if (!service || !slot) return;
    setError(null);
    startTransition(async () => {
      const res = await bookAppointment(business.id, {
        serviceId: service.id,
        employeeId: staffId === ANY ? null : staffId,
        start: slot.start,
        ...form,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        if ("taken" in res && res.taken && date) {
          setStep("time");
          loadSlots(date);
        }
        return;
      }
      if ("token" in res && res.token) {
        setResult({ token: res.token, status: res.status ?? "confirmed", professional: res.professional ?? null });
        setStep("done");
      }
    });
  };

  const back = () => {
    setError(null);
    if (step === "details") setStep("time");
    else if (step === "time") setStep(eligible.length > 1 ? "staff" : "service");
    else if (step === "staff") setStep("service");
  };

  if (services.length === 0) {
    return <div className="bk-empty">Este negocio todavía no tiene servicios para agendar en línea.</div>;
  }

  const steps: { key: Step; label: string }[] = [
    { key: "service", label: "Servicio" },
    { key: "staff", label: terms.professional[0].toUpperCase() + terms.professional.slice(1) },
    { key: "time", label: "Horario" },
    { key: "details", label: "Tus datos" },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  return (
    <section className="bk" aria-live="polite">
      <header className="bk-head">
        <h2 className="bk-title">{terms.cta}</h2>
        {step !== "done" && (
          <ol className="bk-steps">
            {steps.map((s, i) => (
              <li key={s.key} className={i < stepIndex ? "is-done" : i === stepIndex ? "is-current" : ""}>
                <span>{i + 1}</span> {s.label}
              </li>
            ))}
          </ol>
        )}
      </header>

      {step !== "service" && step !== "done" && service && (
        <div className="bk-summary">
          <button type="button" className="bk-back" onClick={back} aria-label="Volver">
            <ArrowLeft size={16} />
          </button>
          <div>
            <strong>{service.name}</strong>
            <span>
              {duration(service.durationMinutes)} · {fmt(service.price)}
              {step !== "staff" && ` · ${chosen ? chosen.name : `cualquier ${terms.professional}`}`}
              {step === "details" && slot && date && ` · ${dayLabel(date).long}, ${slot.label}`}
            </span>
          </div>
        </div>
      )}

      {error && <p className="bk-error" role="alert">{error}</p>}

      {step === "service" && (
        <div className="bk-groups">
          {grouped.map(([cat, list]) => (
            <div key={cat}>
              <h3 className="bk-group-title">{cat}</h3>
              <div className="bk-services">
                {list.map((s) => (
                  <button key={s.id} type="button" className="bk-service" onClick={() => chooseService(s)}>
                    {s.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.imageUrl} alt="" loading="lazy" />
                    )}
                    <span className="bk-service-body">
                      <span className="bk-service-name">{s.name}</span>
                      {s.description && <span className="bk-service-desc">{s.description}</span>}
                      <span className="bk-service-meta">
                        <Clock size={13} /> {duration(s.durationMinutes)}
                        <strong>{fmt(s.price)}</strong>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {step === "staff" && (
        <div className="bk-staff">
          <button type="button" className="bk-person is-any" onClick={() => chooseStaff(ANY)}>
            <span className="bk-avatar"><Sparkles size={20} /></span>
            <span>
              <span className="bk-person-name">Cualquiera disponible</span>
              <span className="bk-person-role">Te mostramos el primer horario libre</span>
            </span>
          </button>
          {eligible.map((p) => (
            <button key={p.id} type="button" className="bk-person" onClick={() => chooseStaff(p.id)}>
              <span className="bk-avatar">
                {p.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatarUrl} alt="" />
                ) : (
                  initials(p.name)
                )}
              </span>
              <span>
                <span className="bk-person-name">{p.name}</span>
                <span className="bk-person-role">{p.position}</span>
                {p.bio && <span className="bk-person-bio">{p.bio}</span>}
              </span>
            </button>
          ))}
        </div>
      )}

      {step === "time" && (
        <div className="bk-time">
          {availableDates.length === 0 ? (
            <p className="bk-empty">No hay días disponibles para agendar en línea.</p>
          ) : (
            <div className="bk-dates" role="listbox" aria-label="Elige el día">
              {availableDates.map((d) => {
                const l = dayLabel(d);
                return (
                  <button key={d} type="button" role="option" aria-selected={date === d} className={`bk-date ${date === d ? "is-active" : ""}`} onClick={() => loadSlots(d)}>
                    <span>{l.weekday}</span>
                    <strong>{l.day}</strong>
                    <span>{l.month}</span>
                  </button>
                );
              })}
            </div>
          )}

          {!date && availableDates.length > 0 && <p className="bk-hint">Elige un día para ver los horarios libres.</p>}
          {date && isPending && !slots && (
            <p className="bk-hint"><Loader2 size={16} className="store-spin" /> Buscando horarios…</p>
          )}
          {date && slots && slots.length === 0 && (
            <p className="bk-hint">No quedan horarios libres este día. Prueba con otro{chosen ? ` o con cualquier ${terms.professional}` : ""}.</p>
          )}
          {date && slots && slots.length > 0 && (
            <div className="bk-slots">
              {slots.map((s) => (
                <button
                  key={s.start}
                  type="button"
                  className={`bk-slot ${slot?.start === s.start ? "is-active" : ""}`}
                  onClick={() => {
                    setSlot(s);
                    setStep("details");
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === "details" && (
        <form
          className="bk-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="store-checkout-field">
            <label htmlFor="bk-name">Nombre *</label>
            <input id="bk-name" required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tu nombre completo" />
          </div>
          <div className="store-checkout-field">
            <label htmlFor="bk-phone">Celular / WhatsApp *</label>
            <input id="bk-phone" required type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="300 123 4567" />
          </div>
          <div className="store-checkout-field">
            <label htmlFor="bk-email">Correo (opcional)</label>
            <input id="bk-email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="tucorreo@ejemplo.com" />
          </div>
          <div className="store-checkout-field">
            <label htmlFor="bk-notes">Comentarios (opcional)</label>
            <textarea id="bk-notes" className="opt-note" maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ej: es mi primera vez, quiero un degradado bajo…" />
          </div>
          <button type="submit" className="store-checkout-submit" disabled={isPending}>
            {isPending ? <Loader2 size={18} className="store-spin" /> : <CheckCircle2 size={18} />}
            Confirmar {slot ? `cita a las ${slot.label}` : "cita"}
          </button>
        </form>
      )}

      {step === "done" && result && service && slot && date && (
        <div className="bk-done">
          <CheckCircle2 size={48} />
          <h3>{result.status === "confirmed" ? "¡Tu cita está confirmada!" : "¡Recibimos tu solicitud!"}</h3>
          <p>
            <strong>{service.name}</strong>
            {result.professional ? ` con ${result.professional}` : ""}
            <br />
            {dayLabel(date).long} a las {slot.label}
          </p>
          {result.status !== "confirmed" && <p className="bk-hint">El negocio la confirmará pronto por WhatsApp.</p>}
          <div className="bk-done-actions">
            <a
              className="store-checkout-submit"
              href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${service.name} — ${business.name}`)}&dates=${gcalStamp(slot.start)}/${gcalStamp(new Date(new Date(slot.start).getTime() + service.durationMinutes * 60_000).toISOString())}&location=${encodeURIComponent(business.address ?? "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <CalendarPlus size={18} /> Agregar a mi calendario
            </a>
            <Link className="bk-link" href={`/${business.slug}/cita/${result.token}`}>
              <User size={16} /> Ver o cancelar mi cita
            </Link>
            {business.whatsapp && (
              <a className="bk-link" href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={16} /> Escribir al negocio
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
