"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BedDouble, CalendarCheck, CheckCircle2, Loader2, MessageCircle, Search, Users } from "lucide-react";
import { bookStay, searchStays } from "@/lib/actions/stays-public";

export interface PublicRoomType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  capacity: number;
  imageUrl: string | null;
  units: number;
}

interface Props {
  business: {
    id: string;
    slug: string;
    currency: string;
    whatsapp: string | null;
    checkInTime: string;
    checkOutTime: string;
    cancelDays: number;
    isHostel: boolean;
  };
  roomTypes: PublicRoomType[];
  today: string;
  tomorrow: string;
  maxDate: string;
}

interface Result {
  id: string;
  free: number;
  total: number;
  nights: number;
  minNights: number;
  season: string | null;
  roomsNeeded: number;
}

const dateLabel = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("es-CO", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "");

const plusDays = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

export function StaySearch({ business, roomTypes, today, tomorrow, maxDate }: Props) {
  const [isPending, startTransition] = useTransition();
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [results, setResults] = useState<Map<string, Result> | null>(null);
  const [searched, setSearched] = useState<{ checkIn: string; checkOut: string; adults: number; children: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<{ type: PublicRoomType; result: Result; rooms: number } | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", document: "", arrivalTime: "", notes: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<{ token: string; status: string; total: number; deposit: number; typeName: string } | null>(null);

  const fmt = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: business.currency, minimumFractionDigits: 0 }).format(n);
  const wa = business.whatsapp?.replace(/\D/g, "");
  const unitWord = business.isHostel ? "cama" : "habitación";

  const search = () => {
    setError(null);
    setSelected(null);
    startTransition(async () => {
      const res = await searchStays(business.id, checkIn, checkOut, adults + children);
      if ("error" in res && res.error) {
        setResults(null);
        return void setError(res.error);
      }
      if ("results" in res && res.results) {
        setResults(new Map(res.results.map((r) => [r.id, r])));
        setSearched({ checkIn, checkOut, adults, children });
      }
    });
  };

  const book = () => {
    if (!selected || !searched) return;
    setFormError(null);
    startTransition(async () => {
      const res = await bookStay(business.id, {
        itemId: selected.type.id,
        rooms: selected.rooms,
        checkIn: searched.checkIn,
        checkOut: searched.checkOut,
        adults: searched.adults,
        children: searched.children,
        ...form,
      });
      if ("error" in res && res.error) {
        setFormError(res.error);
        if ("taken" in res && res.taken) search();
        return;
      }
      if ("token" in res && res.token) {
        setDone({ token: res.token, status: res.status ?? "confirmed", total: res.total ?? 0, deposit: res.deposit ?? 0, typeName: selected.type.name });
      }
    });
  };

  if (done && searched) {
    const msg = `Hola, hice una reserva desde la página: ${done.typeName}, del ${dateLabel(searched.checkIn)} al ${dateLabel(searched.checkOut)}. ${done.deposit > 0 ? `Quiero pagar el anticipo de ${fmt(done.deposit)}.` : ""}`;
    return (
      <div className="bk">
        <div className="bk-done">
          <CheckCircle2 size={48} />
          <h3>{done.status === "confirmed" ? "¡Reserva confirmada!" : "¡Recibimos tu reserva!"}</h3>
          <p>
            {done.typeName} · {dateLabel(searched.checkIn)} → {dateLabel(searched.checkOut)} · <strong>{fmt(done.total)}</strong>
          </p>
          {done.status !== "confirmed" && <p className="bk-hint">El hotel te confirmará la disponibilidad muy pronto.</p>}
          {done.deposit > 0 && <p className="bk-hint">Para garantizarla te pedimos un anticipo de {fmt(done.deposit)}; el resto lo pagas al llegar.</p>}
          <p className="bk-hint">Check-in desde las {business.checkInTime} · check-out hasta las {business.checkOutTime}</p>
          <div className="bk-done-actions">
            {wa && (
              <a className="store-checkout-submit" href={`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={18} /> {done.deposit > 0 ? "Pagar anticipo por WhatsApp" : "Escribir por WhatsApp"}
              </a>
            )}
            <Link className="bk-link" href={`/${business.slug}/estadia/${done.token}`}>
              <CalendarCheck size={16} /> Ver mi reserva
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bk stay">
      <div className="bk-head">
        <h2 className="bk-title">Reserva tu estadía</h2>
        <form
          className="stay-search"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <div className="store-checkout-field">
            <label htmlFor="stay-in">Llegada</label>
            <input
              id="stay-in"
              type="date"
              min={today}
              max={maxDate}
              value={checkIn}
              onChange={(e) => {
                setCheckIn(e.target.value);
                if (e.target.value && checkOut <= e.target.value) setCheckOut(plusDays(e.target.value, 1));
              }}
              required
            />
          </div>
          <div className="store-checkout-field">
            <label htmlFor="stay-out">Salida</label>
            <input id="stay-out" type="date" min={plusDays(checkIn || today, 1)} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required />
          </div>
          <div className="store-checkout-field">
            <label htmlFor="stay-adults">Adultos</label>
            <select id="stay-adults" value={adults} onChange={(e) => setAdults(Number(e.target.value))}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="store-checkout-field">
            <label htmlFor="stay-children">Niños</label>
            <select id="stay-children" value={children} onChange={(e) => setChildren(Number(e.target.value))}>
              {Array.from({ length: 7 }, (_, i) => i).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button type="submit" className="store-checkout-submit" disabled={isPending}>
            {isPending && !selected ? <Loader2 size={18} className="store-spin" /> : <Search size={18} />} Ver disponibilidad
          </button>
        </form>
        {error && <p className="bk-error" role="alert">{error}</p>}
        <p className="bk-hint">Check-in desde las {business.checkInTime} · check-out hasta las {business.checkOutTime} · cancelación gratis hasta {business.cancelDays} {business.cancelDays === 1 ? "día" : "días"} antes</p>
      </div>

      {roomTypes.length === 0 ? (
        <p className="bk-empty">Pronto publicaremos nuestras habitaciones.</p>
      ) : (
        <ul className="stay-rooms">
          {roomTypes.map((t) => {
            const r = results?.get(t.id);
            const nights = r?.nights ?? 0;
            const enough = r ? r.free >= r.roomsNeeded : false;
            const shortStay = r ? nights < r.minNights : false;
            const isOpen = selected?.type.id === t.id;
            return (
              <li key={t.id} className={`stay-room ${isOpen ? "is-open" : ""}`}>
                <div className="stay-room-main">
                  {t.imageUrl ? <img src={t.imageUrl} alt="" loading="lazy" /> : <span className="stay-room-ph"><BedDouble size={28} /></span>}
                  <div className="stay-room-body">
                    <h3>{t.name}</h3>
                    {t.description && <p className="bk-service-desc">{t.description}</p>}
                    <span className="gym-class-meta"><Users size={13} /> Hasta {t.capacity} {t.capacity === 1 ? "persona" : "personas"}</span>
                  </div>
                  <div className="stay-room-price">
                    {r ? (
                      <>
                        <strong>{fmt(r.total * Math.max(1, r.roomsNeeded))}</strong>
                        <span>
                          {nights} {nights === 1 ? "noche" : "noches"}
                          {r.roomsNeeded > 1 ? ` · ${r.roomsNeeded} ${business.isHostel ? "camas" : "habitaciones"}` : ""}
                        </span>
                        {r.season && <span className="stay-season">{r.season}</span>}
                        {shortStay ? (
                          <span className="gym-class-spots is-full">Mínimo {r.minNights} noches</span>
                        ) : r.free === 0 ? (
                          <span className="gym-class-spots is-full">Sin disponibilidad</span>
                        ) : !enough ? (
                          <span className="gym-class-spots is-low">Solo {r.free} disponible{r.free === 1 ? "" : "s"}</span>
                        ) : (
                          <span className={`gym-class-spots ${r.free <= 2 ? "is-low" : ""}`}>{r.free <= 2 ? `¡Quedan ${r.free}!` : "Disponible"}</span>
                        )}
                        <button
                          type="button"
                          className="gym-class-btn"
                          disabled={shortStay || r.free === 0 || !enough}
                          onClick={() => {
                            setSelected({ type: t, result: r, rooms: Math.max(1, r.roomsNeeded) });
                            setFormError(null);
                          }}
                        >
                          Reservar
                        </button>
                      </>
                    ) : (
                      <>
                        <span>Desde</span>
                        <strong>{fmt(t.price)}</strong>
                        <span>por noche</span>
                      </>
                    )}
                  </div>
                </div>

                {isOpen && selected && searched && (
                  <form
                    className="bk-form stay-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      book();
                    }}
                  >
                    <p className="gym-panel-title">
                      {selected.rooms > 1 ? `${selected.rooms} × ` : ""}
                      <strong>{t.name}</strong> · {dateLabel(searched.checkIn)} → {dateLabel(searched.checkOut)} · <strong>{fmt(selected.result.total * selected.rooms)}</strong>
                    </p>
                    {formError && <p className="bk-error" role="alert">{formError}</p>}
                    <div className="stay-form-grid">
                      <div className="store-checkout-field">
                        <label htmlFor="st-name">Nombre completo *</label>
                        <input id="st-name" required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      </div>
                      <div className="store-checkout-field">
                        <label htmlFor="st-phone">Celular / WhatsApp *</label>
                        <input id="st-phone" required type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                      </div>
                      <div className="store-checkout-field">
                        <label htmlFor="st-email">Correo</label>
                        <input id="st-email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </div>
                      <div className="store-checkout-field">
                        <label htmlFor="st-arrival">Hora aproximada de llegada</label>
                        <select id="st-arrival" value={form.arrivalTime} onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })}>
                          <option value="">No sé aún</option>
                          {["Antes de las 12:00", "12:00 – 15:00", "15:00 – 18:00", "18:00 – 21:00", "Después de las 21:00"].map((o) => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="store-checkout-field">
                      <label htmlFor="st-notes">Peticiones especiales</label>
                      <textarea id="st-notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={business.isHostel ? "Litera de abajo, llegada tarde…" : "Cama extra, aniversario, piso alto…"} />
                    </div>
                    {selected.result.free > 1 && (
                      <div className="store-checkout-field">
                        <label htmlFor="st-rooms">¿Cuántas {business.isHostel ? "camas" : "habitaciones"}?</label>
                        <select id="st-rooms" value={selected.rooms} onChange={(e) => setSelected({ ...selected, rooms: Number(e.target.value) })}>
                          {Array.from({ length: Math.min(selected.result.free, 10) }, (_, i) => i + 1)
                            .filter((n) => n >= selected.result.roomsNeeded)
                            .map((n) => <option key={n} value={n}>{n} {n === 1 ? unitWord : business.isHostel ? "camas" : "habitaciones"}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="gym-panel-actions">
                      <button type="button" className="bk-link" onClick={() => setSelected(null)}>Cancelar</button>
                      <button type="submit" className="store-checkout-submit" disabled={isPending}>
                        {isPending ? <Loader2 size={18} className="store-spin" /> : <CheckCircle2 size={18} />} Confirmar reserva
                      </button>
                    </div>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
