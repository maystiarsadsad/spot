"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CheckCircle2, Loader2, MapPin, MessageCircle, Minus, Package, Plus, Search, Send, Shirt, Store, Truck } from "lucide-react";
import { requestService } from "@/lib/actions/service-orders-public";
import { laundryDeliveryFee, lineTotal, quoteShipment, SIZE_LABELS, type ServiceSettings } from "@/lib/service-orders/flow";
import type { LatLng } from "@/components/maps/leaflet";

// Leaflet touches `window`: load the maps only in the browser
const RoutePicker = dynamic(() => import("@/components/maps/route-picker").then((m) => m.RoutePicker), { ssr: false });
const LocationPicker = dynamic(() => import("@/components/maps/location-picker").then((m) => m.LocationPicker), { ssr: false });

export interface PublicServiceItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  category: string | null;
}

interface Props {
  business: { id: string; slug: string; currency: string; whatsapp: string | null; kind: "laundry" | "shipment"; address: string | null };
  items: PublicServiceItem[];
  settings: ServiceSettings;
}

type Size = "small" | "medium" | "large";
const isKg = (name: string) => /kilo|kg/i.test(name);

export function ServiceRequest({ business, items, settings }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ token: string; code: string; total: number } | null>(null);
  const [person, setPerson] = useState({ name: "", phone: "", email: "", notes: "" });
  const [when, setWhen] = useState<{ mode: "asap" | "scheduled"; at: string }>({ mode: "asap", at: "" });
  const [minAt] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  const fmt = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: business.currency, minimumFractionDigits: 0 }).format(n);
  const wa = business.whatsapp?.replace(/\D/g, "");

  // Shipment
  const [serviceId, setServiceId] = useState(items[0]?.id ?? "");
  const [size, setSize] = useState<Size>("small");
  const [pickup, setPickup] = useState<{ address: string; point: LatLng | null }>({ address: "", point: null });
  const [dropoff, setDropoff] = useState<{ address: string; point: LatLng | null }>({ address: "", point: null });
  const [recipient, setRecipient] = useState({ name: "", phone: "", description: "", value: "" });

  // Laundry
  const [qty, setQty] = useState<Record<string, number>>({});
  const [handoff, setHandoff] = useState<"store" | "pickup">("store");
  const [returnMode, setReturnMode] = useState<"store" | "delivery">("store");
  const [home, setHome] = useState<{ address: string; point: LatLng | null }>({ address: "", point: null });

  const service = items.find((i) => i.id === serviceId);
  const quote = useMemo(() => {
    if (business.kind !== "shipment" || !service || !pickup.point || !dropoff.point) return null;
    return quoteShipment({ from: pickup.point, to: dropoff.point, basePrice: service.price, size, settings });
  }, [business.kind, service, pickup.point, dropoff.point, size, settings]);

  const laundry = useMemo(() => {
    const lines = items.filter((i) => (qty[i.id] ?? 0) > 0).map((i) => ({ item: i, quantity: qty[i.id], total: lineTotal(i.price, qty[i.id]) }));
    const subtotal = lines.reduce((a, l) => a + l.total, 0);
    const fee = laundryDeliveryFee(handoff, returnMode, settings);
    return { lines, subtotal, fee, total: subtotal + fee };
  }, [items, qty, handoff, returnMode, settings]);

  const step = (id: string, delta: number, kg: boolean) =>
    setQty((q) => {
      const next = Math.max(0, Math.round(((q[id] ?? 0) + delta) * 10) / 10);
      return { ...q, [id]: kg && next > 0 && next < 1 ? 1 : next };
    });

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const common = {
        name: person.name,
        phone: person.phone,
        email: person.email,
        notes: person.notes,
        scheduledFor: when.mode === "scheduled" && when.at ? new Date(when.at).toISOString() : null,
      };
      const res =
        business.kind === "shipment"
          ? await requestService(business.id, {
              ...common,
              serviceId,
              size,
              pickup: { address: pickup.address, lat: pickup.point?.lat ?? null, lng: pickup.point?.lng ?? null },
              dropoff: { address: dropoff.address, lat: dropoff.point?.lat ?? null, lng: dropoff.point?.lng ?? null },
              recipientName: recipient.name,
              recipientPhone: recipient.phone,
              description: recipient.description,
              declaredValue: recipient.value ? Number(recipient.value) : null,
            })
          : await requestService(business.id, {
              ...common,
              lines: laundry.lines.map((l) => ({ itemId: l.item.id, quantity: l.quantity })),
              handoff,
              returnMode,
              home: { address: home.address, lat: home.point?.lat ?? null, lng: home.point?.lng ?? null },
            });
      if ("error" in res && res.error) return void setError(res.error);
      if ("token" in res && res.token) setDone({ token: res.token, code: res.code ?? "", total: res.total ?? 0 });
    });
  };

  if (done) {
    return (
      <div className="bk">
        <div className="bk-done">
          <CheckCircle2 size={48} />
          <h3>{business.kind === "shipment" ? "¡Envío solicitado!" : "¡Solicitud recibida!"}</h3>
          <p>
            Tu código es <strong>{done.code}</strong> · {business.kind === "shipment" ? "Total" : "Total estimado"} <strong>{fmt(done.total)}</strong>
          </p>
          <p className="bk-hint">
            {business.kind === "shipment"
              ? "Te avisamos cuando un mensajero tome tu envío. Puedes seguirlo en vivo en el mapa."
              : "Sigue el estado de tu ropa en cualquier momento. El total final se confirma al pesarla."}
          </p>
          <div className="bk-done-actions">
            <Link className="store-checkout-submit" href={`/${business.slug}/servicio/${done.token}`}>
              <Search size={18} /> Seguir mi {business.kind === "shipment" ? "envío" : "orden"}
            </Link>
            {wa && (
              <a className="bk-link" href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hola, acabo de hacer la solicitud ${done.code} desde la página.`)}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={16} /> Escribir por WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  const canSubmit =
    person.name.trim().length > 1 &&
    person.phone.trim().length >= 7 &&
    (business.kind === "shipment"
      ? Boolean(quote && !quote.tooFar && pickup.address.trim() && dropoff.address.trim())
      : laundry.lines.length > 0 && ((handoff === "store" && returnMode === "store") || home.address.trim().length > 4));

  return (
    <form
      className="bk svc"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {business.kind === "shipment" ? (
        <>
          <section className="svc-section">
            <h2 className="bk-title">Pide tu envío</h2>
            <div className="svc-options">
              {items.map((i) => (
                <label key={i.id} className={`svc-option ${serviceId === i.id ? "is-active" : ""}`}>
                  <input type="radio" name="service" value={i.id} checked={serviceId === i.id} onChange={() => setServiceId(i.id)} />
                  <span>
                    <strong>{i.name}</strong>
                    {i.description && <small>{i.description}</small>}
                  </span>
                  <em>desde {fmt(i.price)}</em>
                </label>
              ))}
            </div>
          </section>

          <section className="svc-section">
            <h3 className="svc-h"><MapPin size={16} /> ¿De dónde a dónde?</h3>
            <div className="stay-form-grid">
              <div className="store-checkout-field">
                <label htmlFor="sv-from"><span className="route-dot route-dot-pickup">A</span> Dirección de recogida *</label>
                <input id="sv-from" required value={pickup.address} onChange={(e) => setPickup({ ...pickup, address: e.target.value })} placeholder="Cra 7 # 72-41, Of. 302" />
              </div>
              <div className="store-checkout-field">
                <label htmlFor="sv-to"><span className="route-dot route-dot-dropoff">B</span> Dirección de entrega *</label>
                <input id="sv-to" required value={dropoff.address} onChange={(e) => setDropoff({ ...dropoff, address: e.target.value })} placeholder="Calle 140 # 11-35, Apto 501" />
              </div>
            </div>
            <RoutePicker
              pickup={pickup.point}
              dropoff={dropoff.point}
              onChange={(which, p) => (which === "pickup" ? setPickup((x) => ({ ...x, point: p })) : setDropoff((x) => ({ ...x, point: p })))}
            />
          </section>

          <section className="svc-section">
            <h3 className="svc-h"><Package size={16} /> El paquete</h3>
            <div className="stay-form-grid">
              <div className="store-checkout-field">
                <label htmlFor="sv-size">Tamaño</label>
                <select id="sv-size" value={size} onChange={(e) => setSize(e.target.value as Size)}>
                  {(["small", "medium", "large"] as Size[]).map((s) => (
                    <option key={s} value={s}>{SIZE_LABELS[s]}{settings.sizeFees[s] ? ` · +${fmt(settings.sizeFees[s])}` : ""}</option>
                  ))}
                </select>
              </div>
              <div className="store-checkout-field">
                <label htmlFor="sv-value">Valor declarado (opcional)</label>
                <input id="sv-value" type="number" min={0} value={recipient.value} onChange={(e) => setRecipient({ ...recipient, value: e.target.value })} placeholder="Para el seguro del envío" />
              </div>
              <div className="store-checkout-field">
                <label htmlFor="sv-rname">Quién recibe</label>
                <input id="sv-rname" value={recipient.name} onChange={(e) => setRecipient({ ...recipient, name: e.target.value })} />
              </div>
              <div className="store-checkout-field">
                <label htmlFor="sv-rphone">Celular de quien recibe</label>
                <input id="sv-rphone" type="tel" value={recipient.phone} onChange={(e) => setRecipient({ ...recipient, phone: e.target.value })} />
              </div>
            </div>
            <div className="store-checkout-field">
              <label htmlFor="sv-desc">¿Qué envías?</label>
              <input id="sv-desc" value={recipient.description} onChange={(e) => setRecipient({ ...recipient, description: e.target.value })} placeholder="Documentos, caja con ropa, repuesto…" />
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="svc-section">
            <h2 className="bk-title">Pide tu servicio de lavandería</h2>
            <p className="bk-hint">Elige lo que vas a enviar. El total final se confirma al pesar y revisar la ropa en el local.</p>
            <ul className="svc-items">
              {items.map((i) => {
                const kg = isKg(i.name);
                const q = qty[i.id] ?? 0;
                return (
                  <li key={i.id} className={`svc-item ${q > 0 ? "is-active" : ""}`}>
                    {i.imageUrl ? <img src={i.imageUrl} alt="" loading="lazy" /> : <span className="stay-room-ph"><Shirt size={22} /></span>}
                    <span className="svc-item-body">
                      <strong>{i.name}</strong>
                      {i.description && <small>{i.description}</small>}
                      <em>{fmt(i.price)}{kg ? " / kg" : ""}</em>
                    </span>
                    <span className="svc-stepper">
                      <button type="button" aria-label={`Quitar ${i.name}`} onClick={() => step(i.id, kg ? -0.5 : -1, kg)} disabled={q === 0}><Minus size={14} /></button>
                      <span aria-live="polite">{String(q).replace(".", ",")}{kg && q ? " kg" : ""}</span>
                      <button type="button" aria-label={`Agregar ${i.name}`} onClick={() => step(i.id, kg ? (q ? 0.5 : 3) : 1, kg)}><Plus size={14} /></button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="svc-section">
            <h3 className="svc-h"><Truck size={16} /> Recogida y entrega{settings.homeServiceFee ? ` · domicilio ${fmt(settings.homeServiceFee)}` : " · domicilio gratis"}</h3>
            <div className="svc-choices">
              <div className="store-checkout-field">
                <label htmlFor="sv-handoff">¿Cómo nos entregas la ropa?</label>
                <select id="sv-handoff" value={handoff} onChange={(e) => setHandoff(e.target.value as "store" | "pickup")}>
                  <option value="store">La llevo al local</option>
                  <option value="pickup">Recójanla en mi casa</option>
                </select>
              </div>
              <div className="store-checkout-field">
                <label htmlFor="sv-return">¿Cómo la recibes?</label>
                <select id="sv-return" value={returnMode} onChange={(e) => setReturnMode(e.target.value as "store" | "delivery")}>
                  <option value="store">La recojo en el local</option>
                  <option value="delivery">Tráiganla a mi casa</option>
                </select>
              </div>
            </div>
            {handoff === "store" && returnMode === "store" ? (
              business.address && <p className="bk-hint"><Store size={14} /> {business.address}</p>
            ) : (
              <>
                <div className="store-checkout-field">
                  <label htmlFor="sv-home">Dirección *</label>
                  <input id="sv-home" value={home.address} onChange={(e) => setHome({ ...home, address: e.target.value })} placeholder="Calle 127 # 45-90, Torre 2 Apto 803" />
                </div>
                <LocationPicker value={home.point} onChange={(p) => setHome((h) => ({ ...h, point: p }))} />
              </>
            )}
          </section>
        </>
      )}

      <section className="svc-section">
        <h3 className="svc-h"><Send size={16} /> Tus datos</h3>
        <div className="stay-form-grid">
          <div className="store-checkout-field">
            <label htmlFor="sv-name">Nombre *</label>
            <input id="sv-name" required autoComplete="name" value={person.name} onChange={(e) => setPerson({ ...person, name: e.target.value })} />
          </div>
          <div className="store-checkout-field">
            <label htmlFor="sv-phone">Celular / WhatsApp *</label>
            <input id="sv-phone" required type="tel" autoComplete="tel" value={person.phone} onChange={(e) => setPerson({ ...person, phone: e.target.value })} />
          </div>
          {(business.kind === "shipment" || handoff === "pickup") && (
            <div className="store-checkout-field">
              <label htmlFor="sv-when">¿Cuándo recogemos?</label>
              <select id="sv-when" value={when.mode} onChange={(e) => setWhen({ ...when, mode: e.target.value as "asap" | "scheduled" })}>
                <option value="asap">Lo antes posible</option>
                <option value="scheduled">Programar</option>
              </select>
            </div>
          )}
          {when.mode === "scheduled" && (business.kind === "shipment" || handoff === "pickup") && (
            <div className="store-checkout-field">
              <label htmlFor="sv-at">Fecha y hora</label>
              <input id="sv-at" type="datetime-local" min={minAt} value={when.at} onChange={(e) => setWhen({ ...when, at: e.target.value })} />
            </div>
          )}
        </div>
        <div className="store-checkout-field">
          <label htmlFor="sv-notes">Indicaciones</label>
          <textarea id="sv-notes" rows={2} value={person.notes} onChange={(e) => setPerson({ ...person, notes: e.target.value })} placeholder={business.kind === "shipment" ? "Preguntar por portería, timbre 3…" : "Manchas, prendas delicadas, sin suavizante…"} />
        </div>
      </section>

      <div className="svc-total">
        {business.kind === "shipment" ? (
          quote ? (
            <>
              <span>
                {String(quote.distanceKm).replace(".", ",")} km · {service?.name}
                {quote.distanceFee > 0 && ` + recorrido ${fmt(quote.distanceFee)}`}
                {quote.sizeFee > 0 && ` + tamaño ${fmt(quote.sizeFee)}`}
              </span>
              <strong>{fmt(quote.total)}</strong>
              {quote.tooFar && <span className="bk-error">Cubrimos hasta {settings.maxKm} km. Escríbenos para envíos más lejanos.</span>}
            </>
          ) : (
            <span>Marca los puntos A y B en el mapa para ver el precio.</span>
          )
        ) : laundry.lines.length ? (
          <>
            <span>Estimado · lista en ~{settings.turnaroundHours} h{laundry.fee ? ` · domicilio ${fmt(laundry.fee)}` : ""}</span>
            <strong>{fmt(laundry.total)}</strong>
          </>
        ) : (
          <span>Agrega al menos un servicio.</span>
        )}
      </div>
      {error && <p className="bk-error" role="alert">{error}</p>}
      <button type="submit" className="store-checkout-submit" disabled={isPending || !canSubmit}>
        {isPending ? <Loader2 size={18} className="store-spin" /> : <CheckCircle2 size={18} />}
        {business.kind === "shipment" ? "Solicitar envío" : handoff === "pickup" ? "Solicitar recogida" : "Enviar solicitud"}
      </button>
    </form>
  );
}
