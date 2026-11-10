// Demo video v2: hardware store. Captured from the live app; zooms, captions, sound and pacing are added in post.
import { Recorder } from "./studio.mjs";
import { join } from "node:path";

const root = process.argv[2];
const out = join(root, "out", process.argv[3] ?? "demo-ferreteria.mp4");
const music = process.argv[4]; // optional: path to a Suno track
const BIZ = "a1c7225a-df7c-4e93-9a6d-e2dc766f0412";
const base = "https://spot-pi-olive.vercel.app";
const CLIENT = "TU CLIENTE", OWNER = "TÚ, EL DUEÑO";

const soft = async (fn) => { try { await fn(); } catch (e) { console.warn("skipped:", e.message); } };
const r = new Recorder({ profileDir: join(root, "profile-owner"), outDir: join(root, "out"), port: 9351 });
await r.launch();
const spot = (t, o) => soft(() => r.spotlight(t, o));
const ring = (t, o) => soft(() => r.ring(t, o));
await r.setCookie("spot-business-id", BIZ, base);
await r.goto(base + "/demo-ferreteria", 2000, { dip: false }); // warm up
await r.startRecording();

await r.card({ kind: "intro", title: "Ferretería El Tornillo", subtitle: "Así se vería tu negocio con Spot", chips: ["Tienda en línea", "Caja", "Inventario", "Fiado"], ms: 4200 });

// ── 1. El cliente pide desde el celular ──
await r.goto(base + "/demo-ferreteria", 1500);
await r.caption("Tu tienda en línea, con *tu marca* y tu catálogo", { tag: CLIENT, ms: 2400 });
await r.scroll(650, 1400);
await r.scroll(-650, 800);
await r.type({ css: "input", text: "Buscar productos" }, "taladro");
await r.caption("Encuentra lo que busca en *segundos*", { tag: CLIENT, ms: 1300 });
await r.click({ css: "button", text: "Agregar", nth: 0 });
await r.click({ css: "button", text: "Agregar", nth: 0 }); // the first card turns into a stepper
await r.caption("Lo agrega al carrito y *pide sin llamarte*", { tag: CLIENT });
await r.click({ css: "button", text: "2", exact: true });
await r.hold(900);
await spot({ x: 880, y: 0, w: 400, h: 300 }, { scale: 1.5, hold: 1700 });
await r.click({ css: "button", text: "Confirmar pedido" });
await r.type({ css: "input", text: "Tu nombre completo" }, "Jorge Ramírez");
await r.type({ css: "input", text: "Tu número de teléfono" }, "3105550148");
await r.click({ css: "button", text: "Enviar pedido" });
await r.sfx("success");
await r.caption("¡Pedido enviado! Llega a tu panel *al instante*", { tag: CLIENT });
await r.hold(1200);
await spot({ css: "h1,h2,h3,div,p,span", text: "Pedido enviado" }, { scale: 1.5, hold: 1900 });
await r.caption("");

// ── 2. El dueño lo ve y lo gestiona ──
await r.goto(base + "/d", 2200);
await r.caption("Tu negocio de un *vistazo*: ventas, pedidos y productos", { tag: OWNER, ms: 1200 });
await spot({ x: 280, y: 140, w: 980, h: 128 }, { scale: 1.45, hold: 2300 });
await r.scroll(420, 1300);
await r.hold(900);

await r.goto(base + "/d/orders", 1800);
await r.caption("El pedido web ya está aquí, *en tiempo real*", { tag: OWNER });
await ring({ css: "div,span", text: "WEB-", nth: 0, row: true }, { label: "Pedido nuevo", ms: 2600 });
await r.hold(500);

await r.goto(base + "/d/pos", 1800);
await r.caption("Vende en el mostrador y *descuenta el inventario solo*", { tag: OWNER });
await r.click({ css: "button", text: "Taladro percutor" });
await r.click({ css: "button", text: "Flexómetro" });
await r.click({ css: "button", text: "Brocha" });
await spot({ x: 950, y: 140, w: 310, h: 560 }, { scale: 1.5, hold: 1700 });
await r.click({ css: "button", text: "Cobrar Orden" });
await r.type({ css: "input", text: "Nombre del cliente" }, "Sebastián Castro");
await r.click({ css: "button", text: "Confirmar Pago" });
await r.sfx("success");
await r.caption("Cobras en segundos y *queda registrado*", { tag: OWNER });
await r.hold(2200);

await r.goto(base + "/d/inventory", 1800);
await r.caption("Alertas de *stock bajo* antes de que se acabe", { tag: OWNER });
await ring({ css: "span,div", text: "2 bajo", nth: 0 }, { label: "Reponer", ms: 2200 });
await r.click({ css: "button", text: "Movimientos" });
await r.caption("Cada entrada y salida *queda registrada*", { tag: OWNER });
await spot({ x: 280, y: 370, w: 980, h: 190 }, { scale: 1.4, hold: 2100 });

await r.goto(base + "/d/finance", 1800);
await r.click({ css: "button, [role=tab]", text: "Créditos" });
await r.hold(900);
await r.caption("*Fiado* bajo control: quién debe, cuánto y desde cuándo", { tag: OWNER });
await spot({ x: 280, y: 190, w: 980, h: 130 }, { scale: 1.45, hold: 2100 });
await ring({ css: "div", text: "Andrés Rodríguez", nth: 0, row: true }, { ms: 1800 });

await r.goto(base + "/d/reports", 2000);
await r.caption("Reportes claros para *decidir mejor*", { tag: OWNER });
await spot({ x: 280, y: 280, w: 980, h: 420 }, { scale: 1.3, hold: 2200 });
await r.caption("");

await r.card({ kind: "outro", title: "Tu negocio, tu lugar", subtitle: "Tienda en línea, caja, inventario y fiado en un solo sistema", cta: "Pide tu demo gratis", foot: "Hablas directo con quienes lo construimos · WhatsApp +57 304 404 7382", ms: 5000 });

const info = await r.finish(out, { jobName: "ferreteria", music, title: "Spot · demo ferretería" });
console.log("done", JSON.stringify(info), "->", out);
await r.close();
