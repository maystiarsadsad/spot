/**
 * Automatic store assistant (Esencial plan): answers from the business data —
 * catalog, option groups, hours, address, owner FAQs — without any language
 * model. Free, instant, and it never invents a price. Pure module.
 */
import type { OptionGroup, OptionSelection } from "@/lib/item-options";

export interface KbItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  featured: boolean;
  groups: OptionGroup[];
}

export interface KbFaq {
  q: string;
  a: string;
}

export interface KbContext {
  businessName: string;
  address: string | null;
  city: string | null;
  whatsapp: string | null;
  /** businesses.business_hours: { mon: { open, close, closed } , … } */
  hours: unknown;
  greeting: string | null;
  faqs: KbFaq[];
  extraInfo: string | null;
  items: KbItem[];
  categories: string[];
  /** Short text description of the customer's cart, if any */
  cart?: string | null;
  /** Appointment businesses: customers book on the page instead of ordering */
  booking?: boolean;
  /** Gyms: plans are bought/signed up on the page; weekly class timetable */
  gym?: { classes: { name: string; day: string; time: string }[] };
}

export interface AssistantAction {
  label: string;
  itemId: string;
  selection?: OptionSelection;
}

export interface AssistantReply {
  text: string;
  action?: AssistantAction;
}

/* ── text helpers ────────────────────────────────────── */

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const STOPWORDS = new Set(
  "a al algo alguna alguno con cual cuales de del el ella en es esa ese esta este hay la las le lo los me mi mis o para pero por puede puedo que quiero se si sin su sus te tiene tienen tu un una unas uno unos y ya yo usted ustedes favor hola buenas buenos dias tardes noches gracias porfa porfavor me podrian podria quisiera tienes vende venden".split(" ")
);

const tokens = (s: string) => normalize(s).split(" ").filter(Boolean);
const contentTokens = (s: string) => tokens(s).filter((t) => t.length > 2 && !STOPWORDS.has(t));

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Tolerates typos: "amburguesa" ≈ "hamburguesa", "sebolla" ≈ "cebolla". */
function similar(a: string, b: string) {
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  const max = Math.max(a.length, b.length);
  if (max < 4) return false;
  return levenshtein(a, b) <= (max >= 8 ? 2 : 1);
}

/** Intent keywords: exact, or a single typo on longer words (stricter than item matching). */
const intentMatch = (t: string, w: string) => t === w || (w.length >= 5 && t.length >= 5 && levenshtein(t, w) <= 1);
const hasAny = (q: string[], words: string[]) => q.some((t) => words.some((w) => intentMatch(t, w)));
const mentions = (qNorm: string, phrases: string[]) => phrases.some((p) => qNorm.includes(p));

/* ── matching ────────────────────────────────────────── */

function scoreText(qTokens: string[], text: string) {
  const tt = contentTokens(text);
  if (tt.length === 0) return 0;
  let hits = 0;
  for (const t of tt) if (qTokens.some((q) => similar(q, t))) hits++;
  return hits / tt.length;
}

function bestItem(qTokens: string[], items: KbItem[]) {
  let best: KbItem | null = null;
  let bestScore = 0;
  for (const it of items) {
    const s = scoreText(qTokens, it.name);
    if (s > bestScore) {
      best = it;
      bestScore = s;
    }
  }
  return bestScore >= 0.5 ? best : null;
}

function bestFaq(qTokens: string[], faqs: KbFaq[]) {
  let best: KbFaq | null = null;
  let bestScore = 0;
  for (const f of faqs) {
    const ft = contentTokens(f.q);
    if (ft.length === 0) continue;
    const hits = ft.filter((t) => qTokens.some((q) => similar(q, t))).length;
    const score = hits / Math.max(ft.length, Math.min(qTokens.length, 4));
    if (score > bestScore) {
      best = f;
      bestScore = score;
    }
  }
  return bestScore >= 0.6 ? best : null;
}

/** Finds a choice in any group whose name contains the given term (e.g. "cebolla" → "Sin cebolla"). */
function findChoice(item: KbItem, term: string[]) {
  for (const g of item.groups) {
    for (const c of g.choices) {
      if (!c.available) continue;
      const ct = contentTokens(c.name);
      if (term.length && term.every((t) => ct.some((c2) => similar(t, c2)))) return { group: g, choice: c };
    }
  }
  return null;
}

/* ── formatting ──────────────────────────────────────── */

const DAYS: [string, string][] = [
  ["mon", "Lunes"], ["tue", "Martes"], ["wed", "Miércoles"], ["thu", "Jueves"],
  ["fri", "Viernes"], ["sat", "Sábado"], ["sun", "Domingo"],
];

function formatHours(hours: unknown) {
  if (!hours || typeof hours !== "object") return null;
  const h = hours as Record<string, { open?: string; close?: string; closed?: boolean }>;
  const rows = DAYS.filter(([k]) => h[k]).map(([k, label]) =>
    h[k].closed ? `${label}: cerrado` : `${label}: ${h[k].open ?? "?"} a ${h[k].close ?? "?"}`
  );
  if (rows.length === 0) return null;
  // Collapse identical schedules ("Lunes a Domingo: 12:00 a 23:00")
  const values = rows.map((r) => r.split(": ")[1]);
  if (values.every((v) => v === values[0]) && rows.length === 7) return `Todos los días: ${values[0]}`;
  return rows.join("\n");
}

function describeGroups(item: KbItem, fmt: (n: number) => string) {
  return item.groups
    .map((g) => {
      const choices = g.choices
        .filter((c) => c.available)
        .map((c) => (c.price > 0 ? `${c.name} (+${fmt(c.price)})` : c.name))
        .join(", ");
      return `• ${g.name}${g.min > 0 ? " (obligatorio)" : ""}: ${choices}`;
    })
    .join("\n");
}

const addAction = (item: KbItem, selection?: OptionSelection): AssistantAction => ({
  label: item.groups.length ? `Personalizar ${item.name}` : `Agregar ${item.name}`,
  itemId: item.id,
  selection,
});

/* ── engine ──────────────────────────────────────────── */

export function keywordAnswer(question: string, ctx: KbContext, fmt: (n: number) => string): AssistantReply {
  const qNorm = normalize(question);
  const q = tokens(question);
  const qc = contentTokens(question);
  const contact = ctx.whatsapp ? " Si quieres, escríbenos por WhatsApp y te ayudamos." : "";

  // 1. Owner FAQs win: they are the business's own words
  const faq = bestFaq(qc, ctx.faqs);
  if (faq) return { text: faq.a };

  // 2. Small talk
  if (qc.length === 0 && hasAny(q, ["hola", "buenas", "buenos", "hey"])) {
    return { text: ctx.greeting || `¡Hola! 👋 Soy el asistente de ${ctx.businessName}. Pregúntame por precios, opciones de los productos, horarios o domicilios.` };
  }
  if (hasAny(q, ["gracias", "listo", "perfecto"]) && qc.length <= 1) {
    return { text: "¡Con gusto! Si necesitas algo más, aquí estoy. 😊" };
  }

  const item = bestItem(qc, ctx.items);

  // 3. Product-specific questions
  if (item) {
    const wantsRemove = mentions(qNorm, ["sin ", "quitar", "quita", "no le pongan", "no le echen", "no lleve"]);
    const wantsAdd = mentions(qNorm, ["con ", "agregar", "agregale", "adicion", "extra", "ponerle", "poner "]);
    const asksOptions = hasAny(q, ["opciones", "opcion", "personalizar", "cambiar", "proteina", "termino", "acompanamiento", "adiciones", "sabor", "tamano", "elegir", "escoger"]);
    const asksPrice = hasAny(q, ["precio", "cuanto", "vale", "cuesta", "valor"]);
    const asksContent = mentions(qNorm, ["que trae", "que tiene", "que lleva", "ingredientes", "de que es", "como es", "viene con"]);
    const nameTokens = contentTokens(item.name);
    const leftover = qc.filter((t) => !nameTokens.some((n) => similar(t, n)) && !["sin", "con", "extra", "puede", "pedir", "quitar", "agregar"].includes(t));

    if ((wantsRemove || wantsAdd) && leftover.length > 0) {
      const term = leftover.slice(-2);
      const hit = findChoice(item, term) ?? findChoice(item, term.slice(-1));
      if (hit) {
        const extra = hit.choice.price > 0 ? ` por +${fmt(hit.choice.price)}` : "";
        return {
          text: `¡Sí! ${item.name} se puede pedir con la opción "${hit.choice.name}"${extra}. ¿Te la dejo lista así?`,
          action: addAction(item, { [hit.group.id]: [hit.choice.id] }),
        };
      }
      return {
        text: `No tengo registrada esa opción para ${item.name}, pero al agregarlo puedes escribirla en "Instrucciones especiales" y el negocio la tendrá en cuenta.${contact}`,
        action: addAction(item),
      };
    }

    if (asksOptions || ((wantsRemove || wantsAdd) && item.groups.length)) {
      if (item.groups.length === 0) {
        return { text: `${item.name} no tiene opciones para elegir, pero puedes dejar instrucciones especiales al pedirlo. Cuesta ${fmt(item.price)}.`, action: addAction(item) };
      }
      return { text: `${item.name} (${fmt(item.price)}) se puede personalizar así:\n${describeGroups(item, fmt)}`, action: addAction(item) };
    }

    if (asksPrice) {
      const extras = item.groups.flatMap((g) => g.choices.filter((c) => c.available && c.price > 0).map((c) => c.price));
      const extraNote = extras.length ? ` Las opciones adicionales van desde +${fmt(Math.min(...extras))}.` : "";
      return { text: `${item.name} cuesta ${fmt(item.price)}.${extraNote}`, action: addAction(item) };
    }

    if (asksContent && item.description) {
      const opts = item.groups.length ? `\n\nPuedes elegir:\n${describeGroups(item, fmt)}` : "";
      return { text: `${item.name}: ${item.description}${opts}`, action: addAction(item) };
    }

    const opts = item.groups.length ? `\n\nOpciones:\n${describeGroups(item, fmt)}` : "";
    return {
      text: `Sí, tenemos ${item.name} a ${fmt(item.price)}.${item.description ? ` ${item.description}` : ""}${opts}`,
      action: addAction(item),
    };
  }

  // 4. Gyms: class timetable, plans and sign-up
  if (ctx.gym) {
    const classNames = [...new Set(ctx.gym.classes.map((c) => c.name))];
    const named = classNames.filter((n) => contentTokens(n).some((t) => qc.some((w) => similar(w, t))));
    if (named.length || hasAny(q, ["clase", "clases", "grupales"]) || mentions(qNorm, ["horario de clases"])) {
      const pickNames = named.length ? named : classNames;
      const lines = pickNames.map((n) => {
        const slots = ctx.gym!.classes.filter((c) => c.name === n).map((c) => `${c.day} ${c.time}`);
        return `• ${n}: ${slots.join(", ")}`;
      });
      return {
        text: lines.length
          ? `Horario de clases:\n${lines.join("\n")}\n\nReserva tu cupo en esta página con el celular con el que te inscribiste. 💪`
          : "Por ahora no tenemos clases grupales publicadas.",
      };
    }
    if (hasAny(q, ["inscribir", "inscribirme", "inscribo", "inscribe", "inscripcion", "matricula", "planes", "plan", "mensualidad", "afiliarme", "afilio", "afiliacion", "membresia", "entrenar"])) {
      const plans = ctx.items.filter((i) => /plan|tiquetera|membres/i.test(i.name)).slice(0, 5);
      const list = (plans.length ? plans : ctx.items.slice(0, 3)).map((p) => `• ${p.name} — ${fmt(p.price)}`).join("\n");
      return { text: `Nuestros planes:\n${list}\n\nInscríbete aquí en la página (botón “Inscribirme”) y paga en recepción o por WhatsApp. ¡Sin matrícula! 🏋️` };
    }
  }

  // 5. Booking (appointment businesses)
  if (ctx.booking && hasAny(q, ["cita", "citas", "turno", "turnos", "agendar", "agenda", "reservar", "reserva", "disponibilidad", "cupo", "cupos"])) {
    return { text: "Puedes agendar tu cita aquí mismo en la página: eliges el servicio, el profesional (o el primero disponible) y ves los horarios libres en tiempo real. 📅" };
  }

  // 6. Business info
  if (hasAny(q, ["horario", "horarios", "abren", "abierto", "abiertos", "cierran", "cierra", "atienden"]) || mentions(qNorm, ["a que hora", "que hora"])) {
    const hours = formatHours(ctx.hours);
    return { text: hours ? `Nuestro horario es:\n${hours}` : `No tengo el horario cargado todavía.${contact}` };
  }
  if (hasAny(q, ["direccion", "ubicados", "ubicacion", "donde", "queda", "llegar", "local"])) {
    const where = [ctx.address, ctx.city].filter(Boolean).join(", ");
    return { text: where ? `Estamos en ${where}. 📍` : `No tengo la dirección cargada.${contact}` };
  }
  if (hasAny(q, ["domicilio", "domicilios", "envio", "envios", "delivery", "llevan", "despachan"])) {
    return { text: "¡Sí! Arma tu pedido, abre el carrito y elige “Envío a domicilio”. Marcas tu ubicación en el mapa y después puedes seguir tu pedido en tiempo real. 🛵" };
  }
  if (hasAny(q, ["carrito", "pedido", "total", "llevo"]) && ctx.cart) {
    return { text: `Esto es lo que llevas:\n${ctx.cart}\n\nPara confirmarlo, abre el carrito 🛒` };
  }

  // 5. An option/ingredient without a product: "¿tienen algo con tocineta?", "¿algo vegetariano?"
  if (qc.length > 0) {
    const matches = ctx.items.filter((it) =>
      qc.some((t) =>
        [it.name, it.description ?? "", ...it.groups.flatMap((g) => g.choices.filter((c) => c.available).map((c) => c.name))]
          .some((txt) => contentTokens(txt).some((w) => similar(t, w)))
      )
    );
    if (matches.length > 0 && matches.length <= 6 && !hasAny(q, ["menu", "carta", "productos", "catalogo"])) {
      const list = matches.slice(0, 5).map((m) => `• ${m.name} — ${fmt(m.price)}`).join("\n");
      return { text: `Esto es lo que encontré:\n${list}`, action: matches.length === 1 ? addAction(matches[0]) : undefined };
    }
  }

  // 6. Menu / recommendations
  if (hasAny(q, ["menu", "carta", "productos", "catalogo", "venden", "ofrecen", "recomiendas", "recomienda", "recomendacion", "mejor", "favorito"])) {
    const featured = ctx.items.filter((i) => i.featured).slice(0, 3);
    const recs = (featured.length ? featured : ctx.items.slice(0, 3)).map((i) => `• ${i.name} — ${fmt(i.price)}`).join("\n");
    const cats = ctx.categories.length ? `Tenemos: ${ctx.categories.join(", ")}.\n\n` : "";
    return { text: `${cats}Los más pedidos:\n${recs}` };
  }

  // 7. Free-form info written by the owner (policies, payment methods, zones…)
  if (ctx.extraInfo && qc.length > 0) {
    const sentences = ctx.extraInfo.split(/(?<=[.!?\n])\s+/).map((s) => s.trim()).filter(Boolean);
    let best = "";
    let bestScore = 0;
    for (const s of sentences) {
      const score = scoreText(qc, s) * contentTokens(s).length;
      if (score > bestScore) {
        best = s;
        bestScore = score;
      }
    }
    if (bestScore >= 1) return { text: best };
  }

  if (hasAny(q, ["pago", "pagar", "tarjeta", "nequi", "daviplata", "efectivo", "transferencia"])) {
    return { text: `El pago se coordina al confirmar tu pedido.${contact}` };
  }

  return {
    text: `Puedo ayudarte con:\n• 💰 Precios de los productos\n• 🍔 Opciones (adiciones, quitar ingredientes, proteína…)\n• 🕒 Horarios y dirección\n• 🛵 Domicilios\n\nPor ejemplo: “¿la ${ctx.items[0]?.name.toLowerCase() ?? "hamburguesa"} se puede sin cebolla?”${contact}`,
  };
}
