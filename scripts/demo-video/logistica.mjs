// Demo video v2: courier company. Captured from the live app; zooms, captions, sound and pacing are added in post.
import { Recorder } from "./studio.mjs";
import { join } from "node:path";

const root = process.argv[2];
const out = join(root, "out", process.argv[3] ?? "demo-logistica.mp4");
const liveToken = process.argv[4]; // tracking token of an order already in transit (courier on the map)
const music = process.argv[5]; // optional: path to a Suno track
const BIZ = "405a11f3-35b2-4969-8772-006e2a9648b9";
const base = "https://spot-pi-olive.vercel.app";
const MAP = { css: ".leaflet-container" };
const CLIENT = "TU CLIENTE", OWNER = "TÚ, EL DUEÑO";

const soft = async (fn) => { try { await fn(); } catch (e) { console.warn("skipped:", e.message); } };
const r = new Recorder({ profileDir: join(root, "profile-owner"), outDir: join(root, "out"), port: 9353 });
await r.launch();
const spot = (t, o) => soft(() => r.spotlight(t, o));
const ring = (t, o) => soft(() => r.ring(t, o));
await r.setCookie("spot-business-id", BIZ, base);
await r.goto(base + "/demo-logistica", 2000, { dip: false }); // warm up
await r.startRecording();

await r.card({ kind: "intro", title: "Rápido Express Mensajería", subtitle: "Cotiza, despacha y rastrea cada envío desde un solo lugar", chips: ["Cotización por mapa", "Despacho", "Rastreo en vivo", "Cobros"], ms: 4200 });

// ── 1. El cliente cotiza y pide solo ──
await r.goto(base + "/demo-logistica", 1500);
await r.caption("Tu cliente pide su envío *desde el celular*, sin llamarte", { tag: CLIENT, ms: 2300 });
await r.click({ css: "label", text: "Envío express" });
await r.caption("Elige el servicio y marca *dónde recogemos y dónde entregamos*", { tag: CLIENT });
await r.click({ css: "button", text: "Recogida" });
await r.clickAt(MAP, 0.40, 0.62);
await r.hold(700);
await r.click({ css: "button", text: "Entrega" });
await r.clickAt(MAP, 0.68, 0.30);
await r.hold(500);
await spot(MAP, { scale: 1.6, hold: 2300 });
await r.caption("");
await r.type({ label: "Dirección de recogida", css: "input" }, "Cra 43A # 7-50, El Poblado");
await r.type({ label: "Dirección de entrega", css: "input" }, "Cra 70 # 44-30, Laureles");
await r.type({ label: "Quién recibe", css: "input" }, "David López");
await r.type({ label: "Celular de quien recibe", css: "input" }, "3239193223");
await r.type({ label: "¿Qué envías?", css: "input" }, "Documentos firmados");
await r.type({ label: "Nombre *", css: "input" }, "Laura Quintero");
await r.type({ label: "Celular / WhatsApp", css: "input" }, "3105550172");
await r.scroll(500, 800);
await r.caption("El precio se calcula *solo*, según la distancia y el paquete", { tag: CLIENT });
await spot({ x: 230, y: 560, w: 820, h: 110 }, { scale: 1.6, hold: 2300 });
await r.caption("");
await r.click({ css: "button", text: "Solicitar envío" });
await r.sfx("success");
await r.hold(1400);
await r.caption("¡Listo! Recibe un *enlace para seguir su envío*", { tag: CLIENT });
await spot({ x: 380, y: 210, w: 520, h: 330 }, { scale: 1.45, hold: 1900 });
await r.click({ css: "a, button", text: "Seguir mi envío" });
await r.caption("");
await r.hold(1500);
const trackUrl = await r.eval("location.href");
console.log("tracking:", trackUrl);
await r.caption("Ve el estado de su envío *desde el celular*, sin descargar nada", { tag: CLIENT, ms: 2000 });
await r.scroll(350, 1000);
await r.hold(700);

// ── 2. La operación lo despacha ──
await r.goto(base + "/d/servicios", 2000);
await r.caption("Todos tus envíos en un *tablero por etapas*", { tag: OWNER });
await ring({ css: "span,div,button", text: "solicitudes web", nth: 0 }, { label: "Nuevas", ms: 2000 });
await r.scroll(300, 1100);
await r.scroll(-300, 800);
await r.caption("La solicitud de Laura ya está aquí, *lista para despachar*", { tag: OWNER });
await r.click({ css: "button, div", text: "Laura Quintero" });
await r.hold(1200);
await r.caption("Asignas un mensajero y se crea *su enlace con mapa en vivo*", { tag: OWNER });
await spot({ x: 330, y: 400, w: 620, h: 150 }, { scale: 1.5, hold: 1900 });
await r.click({ css: "button", text: "Asignar y crear enlace" });
await r.hold(1200);
await spot({ x: 330, y: 80, w: 620, h: 560 }, { scale: 1.25, hold: 1800 });
await r.press("Escape");
await r.hold(600);

// ── 3. El cliente ve el cambio ──
await r.goto(trackUrl, 2000);
await r.caption("Y tu cliente ve *al instante* que ya tiene mensajero", { tag: CLIENT, ms: 2600 });
await r.scroll(300, 900);

if (liveToken) {
  await r.goto(`${base}/demo-logistica/servicio/${liveToken}`, 2200);
  await r.caption("Cuando va en camino, lo ve *moverse en el mapa en vivo*", { tag: CLIENT });
  await spot({ css: ".leaflet-container" }, { scale: 1.6, hold: 2600 });
}

// ── 4. Tarifas, historial y resumen ──
await r.goto(base + "/d/servicios", 1800);
await r.click({ css: "button", text: "Tarifas" });
await r.caption("Tú defines las *tarifas*: km incluidos, precio por km y recargos", { tag: OWNER });
await spot({ x: 280, y: 200, w: 680, h: 290 }, { scale: 1.45, hold: 2200 });
await r.click({ css: "button", text: "Historial" });
await r.caption("Historial de cada envío: *quién lo entregó* y si ya está pagado", { tag: OWNER });
await r.hold(2000);
await r.goto(base + "/d", 2000);
await r.caption("Tu operación de un *vistazo*: envíos, ingresos y cobros", { tag: OWNER });
await spot({ x: 280, y: 140, w: 980, h: 128 }, { scale: 1.45, hold: 2300 });
await r.caption("");

await r.card({ kind: "outro", title: "Tu negocio, tu lugar", subtitle: "Cotización por mapa, despacho, rastreo y cobros en un solo sistema", cta: "Pide tu demo gratis", foot: "Hablas directo con quienes lo construimos · WhatsApp +57 304 404 7382", ms: 5000 });

const info = await r.finish(out, { jobName: "logistica", music, title: "Spot · demo logística" });
console.log("done", JSON.stringify(info), "->", out);
await r.close();
