// One generic demo script for every demo business. Usage:
//   node demos.mjs <root> <slug> [out.mp4] [music.mp3]
// Captured from the live app; zooms, captions, sound and pacing are added in post.
import { Recorder } from "./studio.mjs";
import { join } from "node:path";
import { readFileSync } from "node:fs";

const [root, slug, outName, music] = process.argv.slice(2);
const ids = JSON.parse(readFileSync(join(root, "demo-ids.json"), "utf8"));
const biz = ids[slug];
if (!biz) throw new Error(`unknown demo ${slug}`);
const base = "https://spot-pi-olive.vercel.app";
const CLIENT = "TU CLIENTE", OWNER = "TÚ, EL DUEÑO";
const FOOT = "Hablas directo con quienes lo construimos · WhatsApp +57 304 404 7382";

// ── Per-business copy ──
const CFG = {
  "demo-restaurante": { kind: "orders", options: true, sub: "Así se vería tu restaurante con Spot", chips: ["Pedidos en línea", "Caja", "Inventario", "Finanzas"], outro: "Pedidos, caja e inventario de tu restaurante en un solo sistema" },
  "demo-comidas-rapidas": { kind: "orders", options: true, sub: "Así se vería tu negocio de comidas rápidas con Spot", chips: ["Pedidos web", "Domicilios", "Caja", "Inventario"], outro: "Pedidos, domicilios y caja de tu negocio en un solo sistema" },
  "demo-supermercado": { kind: "orders", sub: "Así se vería tu supermercado con Spot", chips: ["Pedidos en línea", "Caja con escáner", "Inventario", "Finanzas"], outro: "Tienda en línea, caja con escáner e inventario en un solo sistema" },
  "demo-cafe": { kind: "orders", options: true, sub: "Así se vería tu café con Spot", chips: ["Pedidos en línea", "Bebidas personalizables", "Caja", "Inventario"], outro: "Pedidos, caja e inventario de tu café en un solo sistema" },
  "demo-bar": { kind: "orders", options: true, sub: "Así se vería tu bar con Spot", chips: ["Pedidos", "Caja", "Inventario", "Finanzas"], outro: "Pedidos, caja e inventario de tu bar en un solo sistema" },
  "demo-tienda-ropa": { kind: "orders", sub: "Así se vería tu tienda de ropa con Spot", chips: ["Tienda en línea", "Caja", "Inventario", "Reportes"], outro: "Tienda en línea, caja e inventario en un solo sistema" },
  "demo-barberia": { kind: "appointments", sub: "Así se vería tu barbería con Spot", chips: ["Citas en línea", "Agenda por barbero", "Clientes", "Caja"], outro: "Citas en línea, agenda y clientes de tu barbería en un solo sistema" },
  "demo-tattoo": { kind: "appointments", sub: "Así se vería tu estudio de tatuajes con Spot", chips: ["Citas en línea", "Agenda por artista", "Clientes", "Caja"], outro: "Citas en línea, agenda y clientes de tu estudio en un solo sistema" },
  "demo-veterinaria": { kind: "appointments", sub: "Así se vería tu veterinaria con Spot", chips: ["Citas en línea", "Agenda por veterinario", "Clientes", "Caja"], outro: "Citas en línea, agenda y clientes de tu veterinaria en un solo sistema" },
  "demo-estudio-creativo": { kind: "appointments", sub: "Así se vería tu estudio con Spot", chips: ["Reservas en línea", "Agenda", "Clientes", "Caja"], outro: "Reservas en línea, agenda y clientes de tu estudio en un solo sistema" },
  "demo-gimnasio": { kind: "gym", sub: "Así se vería tu gimnasio con Spot", chips: ["Planes y socios", "Control de entradas", "Clases", "Caja"], outro: "Planes, socios, clases y entradas de tu gimnasio en un solo sistema" },
  "demo-hotel": { kind: "stays", sub: "Así se vería tu hotel con Spot", chips: ["Reservas en línea", "Calendario de habitaciones", "Tarifas", "Caja"], outro: "Reservas, habitaciones y tarifas de tu hotel en un solo sistema" },
  "demo-hostal": { kind: "stays", sub: "Así se vería tu hostal con Spot", chips: ["Reservas en línea", "Calendario de camas", "Tarifas", "Caja"], outro: "Reservas, habitaciones y tarifas de tu hostal en un solo sistema" },
  "demo-lavanderia": { kind: "laundry", sub: "Así se vería tu lavandería con Spot", chips: ["Pedidos en línea", "Tablero por etapas", "Recogida y entrega", "Cobros"], outro: "Pedidos, etapas y cobros de tu lavandería en un solo sistema" },
  "demo-vehiculos": { kind: "dealer", sub: "Así se vería tu compraventa con Spot", chips: ["Catálogo público", "Inventario por placa", "Rebajas sugeridas", "Documentos"], outro: "Inventario, rebajas y documentos de tu compraventa en un solo sistema" },
};
const cfg = CFG[slug];
if (!cfg) throw new Error(`no copy for ${slug}`);

const r = new Recorder({ profileDir: join(root, "profile-owner"), outDir: join(root, "out"), port: 9370 + Object.keys(CFG).indexOf(slug) });
await r.launch();
const soft = async (fn) => { try { await fn(); } catch (e) { console.warn("skipped:", e.message.slice(0, 120)); } };
const spot = (t, o) => soft(() => r.spotlight(t, o));
const ring = (t, o) => soft(() => r.ring(t, o));
const click = (t, o) => soft(() => r.click(t, o));
const typeIn = (t, text, o) => soft(() => r.type(t, text, o));
const dash = (path, settle = 1800) => r.goto(base + path, settle);
const kpis = () => spot({ x: 280, y: 140, w: 980, h: 128 }, { scale: 1.45, hold: 2300 });

// The options dialog (POS and storefront) confirms with "Agregar · $ …"; it may not be role=dialog
const confirmOptions = async () => {
  const has = await r.eval("[...document.querySelectorAll('button')].some((b) => b.innerText.trim().indexOf('Agregar ·') === 0)").catch(() => false);
  if (!has) return;
  await spot({ x: 380, y: 40, w: 520, h: 640 }, { scale: 1.12, hold: 1500 });
  await click({ css: "button", text: "Agregar ·" });
  await r.hold(500);
};
// Number shown on the cart button of the storefront (items added so far)
const cartCount = () => r.eval("(() => { const b = [...document.querySelectorAll('button')].find((x) => /^[0-9]+$/.test(x.innerText.trim())); return b ? b.innerText.trim() : ''; })()");

await r.setCookie("spot-business-id", biz.id, base);
await r.goto(`${base}/${slug}`, 2000, { dip: false }); // warm up
await r.startRecording();

await r.card({ kind: "intro", title: biz.name, subtitle: cfg.sub, chips: cfg.chips, ms: 4200 });

const scenes = {
  // ───────────── orders (restaurants, shops, cafés, bars)
  async orders() {
    await r.goto(`${base}/${slug}`, 1500);
    await r.caption("Tu tienda en línea, con *tu marca* y tu catálogo", { tag: CLIENT, ms: 2300 });
    await r.scroll(650, 1400);
    await r.scroll(-650, 800);
    if (cfg.options) {
      await r.caption("Cada pedido se *personaliza*: opciones, extras y notas", { tag: CLIENT });
      await click({ css: "button", text: "Elegir", nth: 0 });
      await r.hold(700);
      await confirmOptions();
    }
    await r.caption("Agrega al carrito y *pide sin llamarte*", { tag: CLIENT });
    await click({ css: "button", text: "Agregar", exact: true, nth: 0 });
    await click({ css: "button", text: "Agregar", exact: true, nth: 0 });
    const n = await cartCount();
    await click({ css: "button", text: n, exact: true });
    await r.hold(800);
    await spot({ x: 880, y: 0, w: 400, h: 300 }, { scale: 1.5, hold: 1700 });
    await click({ css: "button", text: "Confirmar pedido" });
    await typeIn({ css: "input", text: "Tu nombre completo" }, "Jorge Ramírez");
    await typeIn({ css: "input", text: "Tu número de teléfono" }, "3105550148");
    await click({ css: "button", text: "Enviar pedido" });
    await r.sfx("success");
    await r.caption("¡Pedido enviado! Llega a tu panel *al instante*", { tag: CLIENT });
    await r.hold(1200);
    await spot({ css: "h1,h2,h3,div,p,span", text: "Pedido enviado" }, { scale: 1.5, hold: 1900 });
    await r.caption("");

    await dash("/d", 2200);
    await r.caption("Tu negocio de un *vistazo*: ventas, pedidos y productos", { tag: OWNER, ms: 1200 });
    await kpis();
    await r.scroll(420, 1300);
    await r.hold(800);

    await dash("/d/orders");
    await r.caption("El pedido web ya está aquí, *en tiempo real*", { tag: OWNER });
    await ring({ css: "div,span", text: "WEB-", nth: 0, row: true }, { label: "Pedido nuevo", ms: 2600 });
    await r.hold(400);

    await dash("/d/pos");
    await r.caption("Vende en el mostrador y *descuenta el inventario solo*", { tag: OWNER });
    for (const i of [0, 1]) {
      await click({ css: "button", text: "$", nth: i, dom: true });
      await r.hold(500);
      await confirmOptions();
      await r.hold(300);
    }
    await spot({ x: 950, y: 140, w: 310, h: 560 }, { scale: 1.5, hold: 1700 });
    await click({ css: "button", text: "Cobrar Orden" });
    await typeIn({ css: "input", text: "Nombre del cliente" }, "Sebastián Castro");
    await click({ css: "button", text: "Confirmar Pago" });
    await r.sfx("success");
    await r.caption("Cobras en segundos y *queda registrado*", { tag: OWNER });
    await r.hold(2200);

    await dash("/d/inventory");
    await r.caption("Controla el *inventario* y recibe alertas de stock bajo", { tag: OWNER });
    await ring({ css: "span,div", text: "bajo", nth: 0 }, { label: "Reponer", ms: 2200 });
    await spot({ x: 280, y: 370, w: 980, h: 280 }, { scale: 1.35, hold: 2100 });

    await dash("/d/finance");
    await click({ css: "button, [role=tab]", text: "Gastos" });
    await r.hold(900);
    await r.caption("Caja diaria y *gastos* en un solo lugar", { tag: OWNER });
    await spot({ x: 280, y: 190, w: 980, h: 330 }, { scale: 1.3, hold: 2200 });

    await dash("/d/reports", 2000);
    await r.caption("Reportes claros para *decidir mejor*", { tag: OWNER });
    await spot({ x: 280, y: 280, w: 980, h: 420 }, { scale: 1.3, hold: 2200 });
  },

  // ───────────── appointments (barbershop, tattoo, vet, studio)
  async appointments() {
    await r.goto(`${base}/${slug}`, 1500);
    await r.caption("Tus clientes *agendan solos*, a cualquier hora", { tag: CLIENT, ms: 2300 });
    await r.scroll(450, 1200);
    await r.scroll(-450, 700);
    await click({ css: "button", text: "min", nth: 0, dom: true });
    await r.caption("Eligen el servicio, el profesional y *el horario libre*", { tag: CLIENT });
    await click({ css: "button", text: "Cualquiera disponible" });
    // today if it still has free slots, otherwise tomorrow
    const dayLabels = await r.eval("[...document.querySelectorAll('button')].map((b) => b.innerText.trim().split(String.fromCharCode(10))).filter((p) => p.length === 3 && /^[0-9]+$/.test(p[1])).slice(0, 3).map((p) => p[0])");
    await click({ css: "button", text: dayLabels[0], nth: 0, dom: true });
    await r.hold(900);
    let times = await r.eval("[...document.querySelectorAll('button')].filter((b) => b.innerText.indexOf(':') > 0 && b.innerText.length < 8).length");
    let dayIndex = 0;
    if (!times && dayLabels[1]) {
      await click({ css: "button", text: dayLabels[1], nth: 0, dom: true });
      dayIndex = 1;
      await r.hold(900);
    }
    await spot({ x: 260, y: 400, w: 760, h: 300 }, { scale: 1.3, hold: 1700 });
    await click({ css: "button", text: ":", nth: 1, dom: true });
    await r.hold(700);
    await typeIn({ css: "input", text: "Tu nombre completo" }, "Jorge Ramírez");
    await typeIn({ css: "input", text: "300 123 4567" }, "3105550148");
    await click({ css: "button", text: "Confirmar cita" });
    await r.sfx("success");
    await r.caption("¡Cita confirmada! Aparece en tu agenda *al instante*", { tag: CLIENT });
    await r.hold(1500);
    await spot({ x: 260, y: 200, w: 760, h: 420 }, { scale: 1.35, hold: 1900 });
    await r.caption("");

    await dash("/d/agenda", 2200);
    if (dayIndex === 1) await soft(() => r.clickAt({ css: "button", nth: 2, dom: true }, 0.5, 0.5));
    await r.caption("Tu *agenda por profesional*, en tiempo real", { tag: OWNER });
    await spot({ x: 280, y: 290, w: 980, h: 300 }, { scale: 1.35, hold: 2200 });
    await ring({ css: "div", text: "Jorge Ramírez", nth: 0, row: false }, { label: "Cita nueva", ms: 2400 });
    await click({ css: "button", text: "Reglas" });
    await r.caption("Defines *horarios, duración y anticipación* de las citas", { tag: OWNER });
    await r.hold(2200);

    await dash("/d/contacts");
    await r.caption("Cada cliente queda *registrado* con su historial", { tag: OWNER });
    await r.hold(2200);

    await dash("/d", 2200);
    await r.caption("Tu negocio de un *vistazo*: citas, ventas y clientes", { tag: OWNER });
    await kpis();
    await dash("/d/reports", 2000);
    await r.caption("Reportes claros para *decidir mejor*", { tag: OWNER });
    await spot({ x: 280, y: 280, w: 980, h: 420 }, { scale: 1.3, hold: 2200 });
  },

  // ───────────── gym
  async gym() {
    await r.goto(`${base}/${slug}`, 1500);
    await r.caption("Tus socios eligen su *plan* y se inscriben desde el celular", { tag: CLIENT, ms: 2000 });
    await r.scroll(260, 900);
    await click({ css: "button", text: "Inscribirme", nth: 0, dom: true });
    await typeIn({ label: "Nombre", css: "input" }, "Laura Quintero");
    await typeIn({ label: "Celular", css: "input" }, "3105550172");
    await click({ css: "button[type=submit]", text: "Inscribirme" });
    await r.sfx("success");
    await r.caption("La inscripción llega a tu panel; *tú confirmas el pago*", { tag: CLIENT });
    await r.hold(1800);
    await spot({ x: 190, y: 130, w: 900, h: 520 }, { scale: 1.3, hold: 1800 });
    await r.scroll(700, 1400);
    await r.caption("Y reservan *cupo en las clases* de la semana", { tag: CLIENT });
    await r.hold(2200);
    await r.caption("");

    await dash("/d/socios", 2200);
    await r.caption("*Recepción*: registra la entrada de un socio en segundos", { tag: OWNER });
    await ring({ css: "span,div", text: "por vencer", nth: 0 }, { label: "Renovaciones", ms: 2000 });
    await typeIn({ css: "input", text: "Ej: Laura" }, "a", { delay: 120 });
    await r.hold(1200);
    await spot({ x: 280, y: 190, w: 560, h: 400 }, { scale: 1.3, hold: 2000 });
    await click({ css: "button", text: "Socios", nth: 0 });
    await r.caption("Cada socio con su *plan, vencimiento y asistencia*", { tag: OWNER });
    await spot({ x: 280, y: 200, w: 980, h: 480 }, { scale: 1.25, hold: 2200 });
    await click({ css: "button", text: "Clases", nth: 0 });
    await r.caption("*Clases* con cupo, instructor y lista de asistentes", { tag: OWNER });
    await spot({ x: 280, y: 200, w: 980, h: 480 }, { scale: 1.25, hold: 2200 });
    await click({ css: "button", text: "Planes", nth: 0 });
    await r.caption("Tus *planes y precios*, siempre a la mano", { tag: OWNER });
    await r.hold(2200);

    await dash("/d", 2200);
    await r.caption("Tu gimnasio de un *vistazo*", { tag: OWNER });
    await kpis();
    await dash("/d/reports", 2000);
    await r.caption("Reportes claros para *decidir mejor*", { tag: OWNER });
    await spot({ x: 280, y: 280, w: 980, h: 420 }, { scale: 1.3, hold: 2200 });
  },

  // ───────────── hotels and hostels
  async stays() {
    await r.goto(`${base}/${slug}`, 1500);
    await r.caption("Tus huéspedes *reservan en línea*, con precio y cupo reales", { tag: CLIENT, ms: 2000 });
    if (slug === "demo-hostal") {
      // tonight only one bed is free: search for 1 guest so the booking goes through
      await r.eval("(() => { const s = document.querySelectorAll('select')[0]; const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(s, '1'); s.dispatchEvent(new Event('change', { bubbles: true })); })()");
      await r.hold(500);
    }
    await click({ css: "button", text: "Ver disponibilidad" });
    await r.hold(1600);
    await spot({ x: 190, y: 400, w: 900, h: 320 }, { scale: 1.3, hold: 1800 });
    await click({ css: "button", text: "Reservar", nth: 0, dom: true });
    await typeIn({ label: "Nombre completo", css: "input" }, "Laura Quintero");
    await typeIn({ label: "Celular", css: "input" }, "3105550172");
    await r.scroll(300, 600);
    await click({ css: "button[type=submit]", text: "Confirmar reserva" });
    await r.sfx("success");
    await r.caption("¡Reserva recibida! Aparece en tu panel *al instante*", { tag: CLIENT });
    await r.hold(2200);
    await r.caption("");

    await dash("/d/estadias", 2200);
    await r.caption("*Hoy*: llegadas, salidas y huéspedes en casa", { tag: OWNER });
    await spot({ x: 280, y: 110, w: 900, h: 40 }, { scale: 1.6, hold: 1900 });
    await spot({ x: 280, y: 240, w: 980, h: 330 }, { scale: 1.3, hold: 2000 });
    await click({ css: "button", text: "Calendario", nth: 0 });
    await r.caption("*Calendario* de ocupación por habitación", { tag: OWNER });
    await spot({ x: 280, y: 240, w: 980, h: 420 }, { scale: 1.25, hold: 2300 });
    await click({ css: "button", text: "Reservas", nth: 0 });
    await r.caption("Todas las *reservas*, con su saldo y su estado", { tag: OWNER });
    await r.hold(2400);
    await click({ css: "button", text: "Tarifas", nth: 0 });
    await r.caption("*Tarifas por temporada* y estadía mínima", { tag: OWNER });
    await r.hold(2400);

    await dash("/d", 2200);
    await r.caption("Tu negocio de un *vistazo*", { tag: OWNER });
    await kpis();
    await dash("/d/reports", 2000);
    await r.caption("Reportes claros para *decidir mejor*", { tag: OWNER });
    await spot({ x: 280, y: 280, w: 980, h: 420 }, { scale: 1.3, hold: 2200 });
  },

  // ───────────── laundry
  async laundry() {
    await r.goto(`${base}/${slug}`, 1500);
    await r.caption("Tus clientes *piden su lavado* desde el celular", { tag: CLIENT, ms: 2000 });
    await click({ css: "button", nth: 1, dom: true }); // + on the first service
    await click({ css: "button", nth: 1, dom: true });
    await click({ css: "button", nth: 3, dom: true }); // + on the second service
    await r.caption("Eligen *prendas y cantidades*, y cómo entregarlas", { tag: CLIENT });
    await r.scroll(650, 1200);
    await typeIn({ label: "Nombre", css: "input" }, "Laura Quintero");
    await typeIn({ label: "Celular", css: "input" }, "3105550172");
    await r.hold(500);
    await click({ css: "button[type=submit]", nth: 0, dom: true });
    await r.sfx("success");
    await r.caption("¡Pedido recibido! Con *enlace de seguimiento* para el cliente", { tag: CLIENT });
    await r.hold(2600);
    await r.caption("");

    await dash("/d/servicios", 2200);
    await r.caption("Cada pedido en un *tablero por etapas*", { tag: OWNER });
    await ring({ css: "span,div,button", text: "solicitudes web", nth: 0 }, { label: "Nuevas", ms: 2000 });
    await r.scroll(300, 1100);
    await r.scroll(-300, 800);
    await click({ css: "button", text: "Marcar recibido", nth: 0, dom: true });
    await r.caption("Avanzas cada orden con *un clic* y el cliente se entera", { tag: OWNER });
    await r.hold(2200);
    await click({ css: "button", text: "Tarifas" });
    await r.caption("Tú defines las *tarifas*: por kilo, por prenda y recargos", { tag: OWNER });
    await r.hold(2400);

    await dash("/d", 2200);
    await r.caption("Tu lavandería de un *vistazo*: pedidos, ingresos y cobros", { tag: OWNER });
    await kpis();
    await dash("/d/reports", 2000);
    await r.caption("Reportes claros para *decidir mejor*", { tag: OWNER });
    await spot({ x: 280, y: 280, w: 980, h: 420 }, { scale: 1.3, hold: 2200 });
  },

  // ───────────── vehicle dealership
  async dealer() {
    await r.goto(`${base}/${slug}`, 1800);
    await r.caption("Tu *catálogo público*: motos y carros con precio y fotos", { tag: CLIENT, ms: 2200 });
    await r.scroll(500, 1300);
    await ring({ css: "a", text: "Me interesa", nth: 0 }, { label: "Escribe por WhatsApp", ms: 2200 });
    await r.scroll(-500, 800);
    await r.caption("");

    await dash("/d/vehiculos", 2200);
    await r.caption("Tu inventario *por placa*: costo, precio, días y margen", { tag: OWNER });
    await spot({ x: 280, y: 190, w: 980, h: 380 }, { scale: 1.3, hold: 2300 });
    await click({ css: "button", text: "Vender", nth: 0, dom: true });
    await r.caption("Al vender ves tu *utilidad real* antes de confirmar", { tag: OWNER });
    await r.hold(2300);
    await r.press("Escape");
    await r.hold(500);
    await click({ css: "button, [role=tab]", text: "Análisis" });
    await r.caption("*Capital inmovilizado* y antigüedad del inventario", { tag: OWNER });
    await spot({ x: 280, y: 190, w: 980, h: 130 }, { scale: 1.45, hold: 2200 });
    await r.caption("*Rebajas sugeridas* para recuperar tu capital sin perder utilidad", { tag: OWNER });
    await r.scroll(420, 1200);
    await click({ css: "button", text: "Aplicar", nth: 0, dom: true });
    await r.hold(2200);
    await r.scroll(-420, 600);
    await click({ css: "button, [role=tab]", text: "Documentación" });
    await r.caption("Dónde está *la carpeta física* y qué papeles faltan", { tag: OWNER });
    await ring({ css: "div,span", text: "Sin ubicar", nth: 0 }, { label: "Falta ubicar", ms: 2000 });
    await spot({ x: 280, y: 190, w: 980, h: 400 }, { scale: 1.25, hold: 2200 });

    await dash("/d", 2200);
    await r.caption("Tu negocio de un *vistazo*", { tag: OWNER });
    await kpis();
  },
};

await scenes[cfg.kind]();
await r.caption("");
await r.card({ kind: "outro", title: "Tu negocio, tu lugar", subtitle: cfg.outro, cta: "Pide tu demo gratis", foot: FOOT, ms: 5000 });

const out = join(root, "out", outName ?? `demo-${slug}.mp4`);
const info = await r.finish(out, { jobName: slug.replace("demo-", ""), music, title: `Spot · demo ${biz.name}` });
console.log("done", JSON.stringify(info), "->", out);
await r.close();
