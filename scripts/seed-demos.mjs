#!/usr/bin/env node
/**
 * Demo businesses — one realistic demo per business type.
 *
 *   node --env-file=.env.local scripts/seed-demos.mjs            # (re)create all demos
 *   node --env-file=.env.local scripts/seed-demos.mjs --only=demo-ferreteria
 *   node --env-file=.env.local scripts/seed-demos.mjs --check-images
 *
 * Idempotent: deletes every business whose slug starts with "demo-" (or the
 * --only slug) and creates it again with catalog, inventory, customers, team,
 * 30 days of sales/orders, reservations, expenses and delivery tracking.
 * Uses the secret key (bypasses RLS) — never import this from app code.
 */
import { createClient } from "@supabase/supabase-js";

const OWNER_EMAIL = process.env.DEMO_OWNER_EMAIL || "arias.crc@gmail.com";
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY (usa --env-file=.env.local)");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

/* ── helpers ─────────────────────────────────────────── */

// Deterministic RNG so every run produces the same demo
let seed = 20261006;
const rand = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const img = (id, w = 800, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ""}&q=80`;
const daysAgo = (d, hour = int(9, 20), min = int(0, 59)) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  dt.setHours(hour, min, 0, 0);
  // Past days only: keep today's records before "now" (reservations use negative d for the future)
  const now = Date.now();
  if (d >= 0 && dt.getTime() > now) dt.setTime(now - int(5, 240) * 60000);
  return dt;
};
const round100 = (n) => Math.round(n / 100) * 100;

async function must(promise, label) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

/* ── shared demo people ──────────────────────────────── */

const FIRST = ["Valentina", "Santiago", "Camila", "Mateo", "Mariana", "Sebastián", "Daniela", "Juan Pablo", "Laura", "Andrés", "Isabella", "Felipe", "Sofía", "Nicolás", "Paula", "Carlos", "Natalia", "Julián", "Gabriela", "David", "Luisa", "Alejandro", "Manuela", "Esteban"];
const LAST = ["Gómez", "Rodríguez", "Martínez", "López", "García", "Hernández", "Ramírez", "Torres", "Díaz", "Moreno", "Castro", "Rojas", "Vargas", "Ortiz", "Suárez", "Jiménez", "Restrepo", "Ospina", "Cárdenas", "Parra"];
const STREETS = ["Cra 7 # 45-12", "Calle 85 # 15-30", "Cra 15 # 93-60", "Calle 53 # 24-18", "Av. Suba # 115-40", "Cra 11 # 82-71", "Calle 26 # 68-35", "Cra 30 # 19-22", "Calle 72 # 10-07", "Cra 68 # 23-15", "Calle 127 # 45-90", "Cra 50 # 2-31"];
const BARRIOS = ["Chapinero", "Usaquén", "Teusaquillo", "Cedritos", "Galerías", "Modelia", "Suba", "Kennedy", "Santa Bárbara", "Salitre", "Niza", "La Soledad"];
const fullName = () => `${pick(FIRST)} ${pick(LAST)}`;

// Bogotá bounding box for delivery pins
const bogotaPoint = () => ({ lat: 4.6 + rand() * 0.15, lng: -74.15 + rand() * 0.1 });

/* ── per-type demo definitions ───────────────────────── */
// items: [name, price, description, unsplashId, extra?]
// extra: { type, duration, capacity, stock, unit, min }

const DEMOS = [
  {
    type: "restaurant", slug: "demo-restaurante", name: "La Mesa de Doña Rosa",
    tagline: "Cocina casera con sabor de hogar", color: "#c2410c",
    description: "Restaurante familiar de cocina casera e internacional: carnes a la parrilla, pastas, ensaladas y postres de la casa. Almuerzos ejecutivos de lunes a viernes.",
    cover: "1517248135467-4c7edcad34c4", logo: "1547592166-23ac45744acd", barrio: "La Candelaria", hours: ["11:30", "22:00"],
    itemType: "product", reservations: true, deliveries: true,
    categories: [
      { name: "Platos fuertes", icon: "🍲", items: [
        ["Crema de tomate asado", 16000, "Tomates asados al horno, albahaca fresca y crutones.", "1547592166-23ac45744acd"],
        ["Churrasco con papas", 46000, "Corte de res de 300 g a la parrilla con papas a la francesa.", "1600891964092-4316c288032e"],
        ["Pollo asado a las finas hierbas", 34000, "Medio pollo marinado con hierbas y vegetales asados.", "1598103442097-8b74394b95c6"],
        ["Salmón a la plancha", 52000, "Filete de salmón con espinacas salteadas y limón.", "1519708227418-c8fd9a32b7a2"],
        ["Pasta arrabiata", 31000, "Penne en salsa de tomate picante con ajo y perejil.", "1621996346565-e3dbc646d9a9"],
      ]},
      { name: "Entradas", icon: "🥗", items: [
        ["Ensalada de la casa", 18000, "Lechugas frescas, tomate cherry, aguacate y vinagreta de maracuyá.", "1512621776951-a57141f2eefd"],
        ["Tacos de pollo x2", 19000, "Tortilla de maíz, pollo, repollo morado y salsa de la casa.", "1604467715878-83e57e8bc129"],
      ]},
      { name: "Bebidas", icon: "🥤", items: [
        ["Limonada de coco", 9500, "Refrescante limonada cremosa de coco.", "1621263764928-df1444c5e859"],
        ["Jugo natural en agua", 7000, "Mora, lulo, maracuyá o mango.", "1600271886742-f049cd451bba"],
        ["Gaseosa", 5000, "Coca-Cola, Sprite o Quatro 400 ml.", "1622483767028-3f66f32aef97"],
      ]},
      { name: "Postres", icon: "🍰", items: [
        ["Donas artesanales x2", 12000, "Glaseadas y decoradas a mano.", "1551024601-bec78aea704b"],
        ["Cheesecake de frutos rojos", 13000, "Base de galleta y salsa de frutos rojos.", "1533134242443-d4fd215305ad"],
      ]},
    ],
    staff: [["Chef", "Cocina"], ["Cocinero(a)", "Cocina"], ["Mesero(a)", "Salón"], ["Mesero(a)", "Salón"], ["Cajero(a)", "Caja"], ["Repartidor(a)", "Domicilios"]],
    inventory: [["Pechuga de pollo", "kg", 18, 8, 16000, "Avícola El Dorado"], ["Papa criolla", "kg", 25, 10, 3500, "Corabastos"], ["Arroz", "kg", 40, 15, 4200, "Diana"], ["Aguacate hass", "und", 12, 20, 2500, "Corabastos"], ["Crema de leche", "lt", 6, 4, 9800, "Alpina"]],
  },
  {
    type: "fast_food", slug: "demo-comidas-rapidas", name: "Burger Brothers",
    tagline: "Hamburguesas a la parrilla y papas que enamoran", color: "#ea580c",
    description: "Hamburguesas artesanales con carne 100% res a la parrilla, perros calientes y papas rústicas. Domicilios en todo el norte de Bogotá.",
    cover: "1550547660-d9450f859349", logo: "1568901346375-23c9450c58cd", barrio: "Cedritos", hours: ["12:00", "23:00"],
    itemType: "product", deliveries: true,
    categories: [
      { name: "Hamburguesas", icon: "🍔", items: [
        ["Clásica", 22000, "Carne 150 g, queso cheddar, lechuga, tomate y salsa de la casa.", "1568901346375-23c9450c58cd"],
        ["Doble Bacon", 31000, "Doble carne, doble cheddar y tocineta crocante.", "1553979459-d2229ba7433b"],
        ["BBQ Ranch", 28000, "Aros de cebolla, salsa BBQ ahumada y ranch.", "1594212699903-ec8a3eca50f5"],
        ["Pollo Crispy", 25000, "Pechuga apanada, coleslaw y mayonesa picante.", "1606755962773-d324e0a13086"],
        ["Veggie", 24000, "Medallón de garbanzo, guacamole y pico de gallo.", "1520072959219-c595dc870360"],
      ]},
      { name: "Perros y más", icon: "🌭", items: [
        ["Perro americano", 16000, "Salchicha americana, cebolla caramelizada y papita.", "1612392062631-94dd858cba88"],
        ["Alitas BBQ x8", 26000, "Alitas bañadas en BBQ con dip de queso azul.", "1608039755401-742074f0548d"],
      ]},
      { name: "Acompañamientos", icon: "🍟", items: [
        ["Papas rústicas", 9000, "Con paprika y sal marina.", "1585109649139-366815a0d713"],
        ["Papas con queso y tocineta", 14000, "Bañadas en cheddar fundido.", "1573080496219-bb080dd4f877"],
      ]},
      { name: "Bebidas", icon: "🥤", items: [
        ["Malteada de vainilla", 13000, "Helado artesanal y crema batida.", "1572490122747-3968b75cc699"],
        ["Gaseosa 400 ml", 5000, "Coca-Cola, Sprite o Quatro.", "1622483767028-3f66f32aef97"],
      ]},
    ],
    staff: [["Cocinero(a)", "Cocina"], ["Preparador(a)", "Cocina"], ["Cajero(a)", "Caja"], ["Repartidor(a)", "Domicilios"], ["Repartidor(a)", "Domicilios"]],
    inventory: [["Carne de res molida", "kg", 22, 10, 24000, "Frigorífico Guadalupe"], ["Pan brioche", "und", 60, 80, 1200, "Panadería Artesanal"], ["Queso cheddar", "kg", 6, 3, 32000, "Alpina"], ["Papa pastusa", "kg", 50, 20, 2200, "Corabastos"], ["Tocineta", "kg", 4, 5, 38000, "Zenú"]],
  },
  {
    type: "supermarket", slug: "demo-supermercado", name: "Mercado Fresco La 80",
    tagline: "Todo para tu hogar, fresco y a buen precio", color: "#16a34a",
    description: "Supermercado de barrio con frutas y verduras frescas todos los días, despensa, lácteos y aseo. Domicilio gratis por compras superiores a $80.000.",
    cover: "1542838132-92c53300491e", logo: "1610832958506-aa56368176cf", barrio: "Modelia", hours: ["07:00", "21:00"],
    itemType: "product", linkInventory: true,
    categories: [
      { name: "Frutas y verduras", icon: "🥑", items: [
        ["Aguacate hass x und", 2800, "Aguacate maduro listo para consumir.", "1523049673857-eb18f1d7b578", { stock: 80, unit: "und" }],
        ["Banano x kg", 3200, "Banano criollo fresco.", "1571771894821-ce9b6c11b08e", { stock: 60, unit: "kg" }],
        ["Tomate chonto x kg", 4500, "Tomate fresco para ensalada o guiso.", "1546094096-0df4bcaaa337", { stock: 45, unit: "kg" }],
      ]},
      { name: "Lácteos y huevos", icon: "🥛", items: [
        ["Leche entera 1 L", 4300, "Leche UHT entera.", "1563636619-e9143da7973b", { stock: 120, unit: "und" }],
        ["Huevos AA x30", 18500, "Cubeta de huevos rojos AA.", "1582722872445-44dc5f7e3c8f", { stock: 25, unit: "und" }],
      ]},
      { name: "Despensa", icon: "🥫", items: [
        ["Arroz 5 kg", 21900, "Arroz blanco de grano largo.", "1586201375761-83865001e31c", { stock: 40, unit: "und" }],
        ["Café molido 500 g", 16900, "Café 100% colombiano tostión media.", "1559056199-641a0ac8b55e", { stock: 8, unit: "und", min: 15 }],
        ["Pan artesanal", 6200, "Pan de masa madre horneado hoy.", "1509440159596-0249088772ff", { stock: 30, unit: "und" }],
        ["Aceite de girasol 1 L", 11800, "Aceite vegetal de girasol.", "1474979266404-7eaacbcd87c5", { stock: 35, unit: "und" }],
      ]},
    ],
    staff: [["Cajero(a)", "Cajas"], ["Cajero(a)", "Cajas"], ["Bodeguero(a)", "Bodega"], ["Auxiliar de Percha", "Góndolas"], ["Administrador(a)", "Administración"]],
  },
  {
    type: "barbershop", slug: "demo-barberia", name: "Navaja & Tijera Barber Club",
    tagline: "Cortes clásicos y modernos, con cerveza de cortesía", color: "#1d4ed8",
    description: "Barbería premium con barberos expertos en fades, diseño de barba y afeitado con toalla caliente. Agenda tu cita en línea.",
    cover: "1503951914875-452162b0f3f1", logo: "1585747860715-2ba37e788b70", barrio: "Chapinero Alto", hours: ["09:00", "20:00"],
    itemType: "service", reservations: true,
    categories: [
      { name: "Cortes", icon: "✂️", items: [
        ["Corte clásico", 30000, "Corte a tijera y máquina con lavado y peinado.", "1503951914875-452162b0f3f1", { duration: 40 }],
        ["Fade + diseño", 38000, "Degradado a la piel con diseño a navaja.", "1599351431202-1e0f0137899a", { duration: 50 }],
        ["Corte niño", 22000, "Para menores de 12 años.", "1621605815971-fbc98d665033", { duration: 30 }],
      ]},
      { name: "Barba", icon: "🪒", items: [
        ["Perfilado de barba", 20000, "Diseño y perfilado con navaja.", "1585747860715-2ba37e788b70", { duration: 25 }],
        ["Afeitado con toalla caliente", 28000, "Ritual clásico con aceites esenciales.", "1585747860715-2ba37e788b70", { duration: 35 }],
        ["Combo corte + barba", 45000, "Corte de tu elección y arreglo de barba.", "1622286342621-4bd786c2447c", { duration: 70 }],
      ]},
      { name: "Productos", icon: "🧴", items: [
        ["Secador profesional", 189000, "2000 W con difusor y boquilla concentradora.", "1621607512214-68297480165e", { type: "product" }],
        ["Aceite para barba", 42000, "Hidrata y suaviza, aroma a sándalo.", "1621607512022-6aecc4fed814", { type: "product" }],
      ]},
    ],
    staff: [["Barbero(a)", "Corte y Estilo"], ["Barbero(a)", "Corte y Estilo"], ["Barbero(a)", "Corte y Estilo"], ["Recepcionista", "Recepción"]],
  },
  {
    type: "tattoo", slug: "demo-tattoo", name: "Tinta Negra Studio",
    tagline: "Arte en tu piel, con bioseguridad certificada", color: "#7c3aed",
    description: "Estudio de tatuajes y piercing con artistas especializados en fine line, realismo y tradicional. Diseños personalizados y valoración gratuita.",
    cover: "1611501275019-9b5cda994e8d", logo: "1565058379802-bbe93b2f703a", barrio: "Chapinero", hours: ["11:00", "20:00"],
    itemType: "service", reservations: true,
    categories: [
      { name: "Tatuajes", icon: "🖋️", items: [
        ["Tatuaje pequeño (hasta 5 cm)", 150000, "Fine line o minimalista, incluye diseño.", "1611501275019-9b5cda994e8d", { duration: 60 }],
        ["Tatuaje mediano (hasta 15 cm)", 380000, "Diseño personalizado, una sesión.", "1611501275019-9b5cda994e8d", { duration: 180 }],
        ["Sesión de realismo (hora)", 250000, "Proyectos grandes por sesión.", "1565058379802-bbe93b2f703a", { duration: 60 }],
        ["Cover up", 450000, "Cubrimiento de tatuaje antiguo.", "1562962230-16e4623d36e6", { duration: 180 }],
      ]},
      { name: "Piercing", icon: "💎", items: [
        ["Piercing lóbulo", 60000, "Incluye joya de titanio.", "1630019852942-f89202989a59", { duration: 20 }],
        ["Piercing septum", 90000, "Incluye joya de titanio grado implante.", "1630019852942-f89202989a59", { duration: 25 }],
      ]},
    ],
    staff: [["Tatuador(a)", "Tatuaje"], ["Tatuador(a)", "Tatuaje"], ["Piercer", "Piercing"], ["Recepcionista", "Recepción"]],
  },
  {
    type: "bar", slug: "demo-bar", name: "Bar La Terraza 93",
    tagline: "Cócteles de autor y la mejor vista del parque", color: "#9333ea",
    description: "Bar de cócteles con terraza, DJ en vivo jueves a sábado y happy hour de 5 a 8 p.m. Reserva tu mesa para cumpleaños y eventos.",
    cover: "1572116469696-31de0f17cc34", logo: "1514362545857-3bc16c4c7d1b", barrio: "Parque de la 93", hours: ["16:00", "02:00"],
    itemType: "product", reservations: true,
    categories: [
      { name: "Cócteles", icon: "🍸", items: [
        ["Mojito", 28000, "Ron blanco, hierbabuena, limón y soda.", "1551024709-8f23befc6f87"],
        ["Margarita de maracuyá", 30000, "Tequila, triple sec y maracuyá fresco.", "1551538827-9c037cb4f32a"],
        ["Gin tonic de frutos rojos", 34000, "Gin premium, tónica y frutos rojos.", "1514362545857-3bc16c4c7d1b"],
        ["Old fashioned", 36000, "Bourbon, angostura y piel de naranja.", "1470337458703-46ad1756a187"],
      ]},
      { name: "Cervezas", icon: "🍺", items: [
        ["Cerveza artesanal", 16000, "Rubia, roja o negra de la casa.", "1535958636474-b021ee887b13"],
        ["Cubetazo x6", 48000, "Seis cervezas nacionales bien frías.", "1608270586620-248524c67de9"],
      ]},
      { name: "Para picar", icon: "🍗", items: [
        ["Nachos supremos", 32000, "Con queso, guacamole, pico de gallo y carne.", "1513456852971-30c0b8199d4d"],
        ["Alitas picantes x10", 34000, "Con salsa búfalo y apio.", "1608039755401-742074f0548d"],
        ["Whisky en las rocas", 32000, "Whisky escocés etiqueta negra.", "1569529465841-dfecdab7503b"],
      ]},
    ],
    staff: [["Barman", "Barra"], ["Barman", "Barra"], ["Mesero(a)", "Salón"], ["DJ", "Cabina DJ"], ["Guardia de Seguridad", "Seguridad"]],
    inventory: [["Ron blanco", "botella", 9, 6, 52000, "Dislicores"], ["Tequila", "botella", 4, 6, 98000, "Dislicores"], ["Gin", "botella", 7, 4, 120000, "Dislicores"], ["Limón tahití", "kg", 10, 5, 4000, "Corabastos"], ["Cerveza nacional", "und", 180, 120, 2600, "Bavaria"]],
  },
  {
    type: "hotel", slug: "demo-hotel", name: "Hotel Mirador Andino",
    tagline: "Descanso boutique en el corazón de Bogotá", color: "#0891b2",
    description: "Hotel boutique de 24 habitaciones con desayuno incluido, spa, gimnasio y terraza con vista a los cerros orientales. A 10 minutos de la Zona T.",
    cover: "1566073771259-6a8506099945", logo: "1611892440504-42a792e24d32", barrio: "Rosales", hours: ["00:00", "23:59"],
    itemType: "room", reservations: true,
    categories: [
      { name: "Habitaciones", icon: "🛏️", items: [
        ["Habitación Estándar", 260000, "Cama doble, baño privado, TV y wifi. Desayuno incluido.", "1611892440504-42a792e24d32", { capacity: 2 }],
        ["Habitación Superior", 340000, "Cama king, escritorio y vista a la ciudad.", "1590490360182-c33d57733427", { capacity: 2 }],
        ["Suite Junior", 480000, "Sala independiente y tina de hidromasaje.", "1578683010236-d716f9a3f461", { capacity: 3 }],
        ["Habitación Familiar", 520000, "Dos camas dobles, ideal para 4 personas.", "1582719478250-c89cae4dc85b", { capacity: 4 }],
      ]},
      { name: "Servicios", icon: "🧖", items: [
        ["Masaje relajante 60 min", 160000, "En nuestro spa con aceites esenciales.", "1544161515-4ab6ce6db874", { type: "service", duration: 60 }],
        ["Desayuno adicional", 35000, "Desayuno buffet para acompañante.", "1533089860892-a7c6f0a88666", { type: "service" }],
        ["Traslado aeropuerto", 90000, "Servicio privado desde/hacia El Dorado.", "1449965408869-eaa3f722e40d", { type: "service" }],
      ]},
    ],
    staff: [["Recepcionista", "Recepción"], ["Recepcionista", "Recepción"], ["Camarero(a) de Pisos", "Pisos"], ["Camarero(a) de Pisos", "Pisos"], ["Conserje", "Conserjería"], ["Gerente", "Gerencia"]],
    inventory: [["Kit de amenidades", "und", 140, 60, 6500, "Hotel Supply"], ["Toallas", "und", 90, 50, 28000, "Textiles Lafayette"], ["Café para habitación", "und", 35, 40, 1800, "Juan Valdez"]],
  },
  {
    type: "hostel", slug: "demo-hostal", name: "Casa Viajera Hostel",
    tagline: "Tu casa en La Candelaria, para mochileros del mundo", color: "#0d9488",
    description: "Hostal en una casa colonial restaurada con dormitorios compartidos y privados, cocina común, tours a pie y noches de juegos.",
    cover: "1555854877-bab0e564b8d5", logo: "1596394516093-501ba68a0ba6", barrio: "La Candelaria", hours: ["00:00", "23:59"],
    itemType: "room", reservations: true,
    categories: [
      { name: "Alojamiento", icon: "🛏️", items: [
        ["Cama en dormitorio de 8", 45000, "Locker incluido, baño compartido.", "1555854877-bab0e564b8d5", { capacity: 1 }],
        ["Cama en dormitorio femenino de 6", 52000, "Solo mujeres, baño compartido.", "1520277739336-7bf67edfa768", { capacity: 1 }],
        ["Habitación privada doble", 140000, "Cama doble y baño privado.", "1596394516093-501ba68a0ba6", { capacity: 2 }],
      ]},
      { name: "Tours y extras", icon: "🗺️", items: [
        ["City tour a pie", 40000, "Recorrido guiado de 3 horas por el centro histórico.", "1568632234157-ce7aecd03d0d", { type: "service", duration: 180 }],
        ["Tour miradores de la ciudad", 60000, "Recorrido por los mejores miradores con guía local.", "1568632234157-ce7aecd03d0d", { type: "service", duration: 240 }],
        ["Desayuno", 15000, "Huevos, arepa, fruta y café.", "1533089860892-a7c6f0a88666", { type: "service" }],
      ]},
    ],
    staff: [["Recepcionista", "Recepción"], ["Recepcionista", "Recepción"], ["Auxiliar de Limpieza", "Limpieza"], ["Guía Turístico(a)", "Tours"]],
  },
  {
    type: "cafe", slug: "demo-cafe", name: "Origen Café de Especialidad",
    tagline: "Café colombiano de origen, tostado aquí mismo", color: "#78350f",
    description: "Tostadores de café de especialidad de Huila, Nariño y Sierra Nevada. Métodos filtrados, repostería artesanal y espacio para trabajar.",
    cover: "1554118811-1e0d58224f24", logo: "1495474472287-4d71bcdd2085", barrio: "Quinta Camacho", hours: ["07:00", "19:00"],
    itemType: "product",
    categories: [
      { name: "Café", icon: "☕", items: [
        ["Espresso", 5500, "Doble shot de nuestro blend de la casa.", "1510591509098-f4fdc6d0ff04"],
        ["Cappuccino", 8500, "Espresso con leche texturizada.", "1509042239860-f550ce710b93"],
        ["Latte", 9000, "Suave y cremoso, con arte latte.", "1495474472287-4d71bcdd2085"],
        ["V60 de origen", 11000, "Filtrado del café de origen del día.", "1497515114629-f71d768fd07c"],
        ["Café 250 g en grano", 32000, "Huila lavado, notas a panela y frutos rojos.", "1559056199-641a0ac8b55e"],
      ]},
      { name: "Bebidas frías y té", icon: "🧋", items: [
        ["Cold brew", 10000, "Extracción en frío por 18 horas.", "1461023058943-07fcbe16d735"],
        ["Té helado de limón", 8500, "Té negro frío con limón y hierbabuena.", "1556679343-c7306c1976bc"],
      ]},
      { name: "Repostería", icon: "🥐", items: [
        ["Croissant de mantequilla", 7500, "Hojaldre francés horneado cada mañana.", "1555507036-ab1f4038808a"],
        ["Cheesecake de maracuyá", 12000, "Cremoso con coulis de maracuyá.", "1533134242443-d4fd215305ad"],
        ["Sándwich de pavo", 16000, "Pan masa madre, pavo, queso y pesto.", "1528735602780-2552fd46c7af"],
      ]},
    ],
    staff: [["Barista", "Barra"], ["Barista", "Barra"], ["Pastelero(a)", "Repostería"], ["Cajero(a)", "Caja"]],
    inventory: [["Café verde Huila", "kg", 40, 20, 38000, "Finca La Esperanza"], ["Leche entera", "lt", 18, 24, 4100, "Alpina"], ["Mantequilla", "kg", 5, 3, 36000, "Colanta"], ["Vasos 12 oz", "und", 300, 200, 350, "Empaques Andinos"]],
  },
  {
    type: "gym", slug: "demo-gimnasio", name: "Iron Fit Gym",
    tagline: "Entrena fuerte, vive mejor", color: "#dc2626",
    description: "Gimnasio con zona de pesas, cardio, clases grupales de spinning, funcional y yoga. Planes mensuales sin matrícula y entrenador personal.",
    cover: "1534438327276-14e5300c3a48", logo: "1517836357463-d25dfeac3438", barrio: "Galerías", hours: ["05:00", "22:00"],
    itemType: "membership", reservations: true,
    categories: [
      { name: "Planes", icon: "🏋️", items: [
        ["Plan mensual", 120000, "Acceso ilimitado a máquinas y clases.", "1534438327276-14e5300c3a48"],
        ["Plan trimestral", 320000, "Tres meses con valoración física incluida.", "1571019613454-1cb2f99b2d8b"],
        ["Tiquetera 10 días", 70000, "Úsala cuando quieras durante 2 meses.", "1517836357463-d25dfeac3438"],
      ]},
      { name: "Clases y servicios", icon: "🧘", items: [
        ["Clase de yoga", 25000, "Clase grupal de 60 minutos.", "1544367567-0f2fcb009e0b", { type: "service", duration: 60 }],
        ["Spinning", 20000, "Clase de 45 minutos.", "1534258936925-c58bed479fcb", { type: "service", duration: 45 }],
        ["Entrenamiento personal", 60000, "Sesión 1 a 1 con entrenador certificado.", "1571019614242-c5c5dee9f50b", { type: "service", duration: 60 }],
      ]},
      { name: "Tienda", icon: "🥤", items: [
        ["Proteína whey 2 lb", 145000, "Sabor chocolate, 30 servicios.", "1593079831268-3381b0db4a77", { type: "product" }],
        ["Bebida hidratante", 6000, "600 ml.", "1622483767028-3f66f32aef97", { type: "product" }],
      ]},
    ],
    staff: [["Entrenador(a) Personal", "Piso de Entrenamiento"], ["Entrenador(a) Personal", "Piso de Entrenamiento"], ["Instructor(a) de Clases", "Clases Grupales"], ["Recepcionista", "Recepción"], ["Nutricionista", "Nutrición"]],
  },
  {
    type: "laundry", slug: "demo-lavanderia", name: "Lavandería Burbujas",
    tagline: "Tu ropa limpia en 24 horas, la recogemos en tu casa", color: "#0284c7",
    description: "Lavado por kilo, lavado en seco, planchado y lavado de edredones. Servicio de recogida y entrega a domicilio sin costo adicional.",
    cover: "1545173168-9f1947eebb7f", logo: "1582735689369-4fe89db7114c", barrio: "Niza", hours: ["07:00", "19:00"],
    itemType: "service", deliveries: true,
    categories: [
      { name: "Lavado", icon: "🧺", items: [
        ["Lavado por kilo", 9000, "Lavado, secado y doblado. Mínimo 3 kg.", "1545173168-9f1947eebb7f"],
        ["Lavado de edredón", 32000, "Edredones sencillos y dobles.", "1582735689369-4fe89db7114c"],
        ["Lavado de tenis", 25000, "Limpieza profunda a mano.", "1542291026-7eec264c27ff"],
      ]},
      { name: "Lavado en seco", icon: "👔", items: [
        ["Vestido de paño", 28000, "Saco y pantalón.", "1594938298603-c8148c4dae35"],
        ["Camisa", 9000, "Lavado y planchado profesional.", "1489274495757-95c7c837b101"],
        ["Vestido de fiesta", 45000, "Cuidado especial para telas delicadas.", "1595777457583-95e059d581b8"],
      ]},
      { name: "Planchado", icon: "♨️", items: [
        ["Planchado por prenda", 3500, "Camisas, blusas y pantalones.", "1517677208171-0bc6725a3e60"],
      ]},
    ],
    staff: [["Operador(a) de Máquinas", "Lavado"], ["Planchador(a)", "Planchado"], ["Recepcionista", "Recepción"], ["Repartidor(a)", "Domicilios"]],
  },
  {
    type: "clothing", slug: "demo-tienda-ropa", name: "Urbana Concept Store",
    tagline: "Moda urbana hecha en Colombia", color: "#db2777",
    description: "Tienda de ropa urbana de marcas colombianas independientes. Camisetas, jeans, chaquetas y tenis. Envíos a todo el país.",
    cover: "1441986300917-64674bd600d8", logo: "1556821840-3a63f95609a7", barrio: "Zona T", hours: ["10:00", "20:00"],
    itemType: "product", linkInventory: true,
    categories: [
      { name: "Camisetas y buzos", icon: "👕", items: [
        ["Camiseta oversize básica", 59000, "Algodón peinado 220 g. Tallas S a XL.", "1521572163474-6864f9cf17ab", { stock: 45, unit: "und" }],
        ["Buzo con capota", 129000, "Felpa perchada, estampado frontal.", "1556821840-3a63f95609a7", { stock: 18, unit: "und" }],
      ]},
      { name: "Pantalones", icon: "👖", items: [
        ["Jean slim fit", 139000, "Denim stretch azul medio.", "1542272604-787c3835535d", { stock: 26, unit: "und" }],
        ["Jogger cargo", 119000, "Drill con bolsillos laterales.", "1624378439575-d8705ad7ae80", { stock: 4, unit: "und", min: 8 }],
      ]},
      { name: "Chaquetas y vestidos", icon: "🧥", items: [
        ["Chaqueta de cuero sintético", 229000, "Corte biker con cremalleras metálicas.", "1551028719-00167b16eac5", { stock: 10, unit: "und" }],
        ["Vestido midi", 149000, "Tela fresca estampada.", "1595777457583-95e059d581b8", { stock: 12, unit: "und" }],
      ]},
      { name: "Calzado", icon: "👟", items: [
        ["Tenis deportivos rojos", 219000, "Livianos y transpirables para correr o el día a día.", "1542291026-7eec264c27ff", { stock: 15, unit: "par" }],
      ]},
    ],
    staff: [["Vendedor(a)", "Ventas"], ["Vendedor(a)", "Ventas"], ["Cajero(a)", "Caja"], ["Visual Merchandiser", "Exhibición"]],
  },
  {
    type: "veterinary", slug: "demo-veterinaria", name: "Clínica Veterinaria Huellitas",
    tagline: "Cuidamos a tu mejor amigo como parte de nuestra familia", color: "#65a30d",
    description: "Clínica veterinaria con consulta general, vacunación, cirugía, laboratorio y peluquería canina y felina. Urgencias 24 horas.",
    cover: "1628009368231-7bb7cfcb0def", logo: "1583337130417-3346a1be7dee", barrio: "Pasadena", hours: ["08:00", "20:00"],
    itemType: "service", reservations: true,
    categories: [
      { name: "Consultas", icon: "🩺", items: [
        ["Consulta general", 70000, "Valoración completa de tu mascota.", "1628009368231-7bb7cfcb0def", { duration: 30 }],
        ["Vacunación", 65000, "Vacunas según el plan de tu mascota.", "1583337130417-3346a1be7dee", { duration: 20 }],
        ["Desparasitación", 40000, "Interna y externa.", "1514888286974-6c03e2ca1dba", { duration: 15 }],
      ]},
      { name: "Peluquería", icon: "🛁", items: [
        ["Baño y corte perro pequeño", 55000, "Incluye corte de uñas y limpieza de oídos.", "1516734212186-a967f81ad0d7", { duration: 60 }],
        ["Baño gato", 60000, "Con productos hipoalergénicos.", "1574158622682-e40e69881006", { duration: 45 }],
      ]},
      { name: "Tienda", icon: "🦴", items: [
        ["Concentrado perro adulto 8 kg", 165000, "Alimento premium sin colorantes.", "1589924691995-400dc9ecc119", { type: "product" }],
        ["Arena para gato 10 kg", 48000, "Aglomerante y sin olor.", "1545249390-6bdfa286032f", { type: "product" }],
      ]},
    ],
    staff: [["Veterinario(a)", "Consulta"], ["Veterinario(a)", "Cirugía"], ["Auxiliar Veterinario(a)", "Consulta"], ["Peluquero(a) Canino", "Peluquería"], ["Recepcionista", "Recepción"]],
    inventory: [["Vacuna antirrábica", "dosis", 30, 20, 18000, "Zoetis"], ["Antipulgas pipeta", "und", 6, 15, 22000, "Bayer"], ["Jeringas 3 ml", "und", 200, 100, 350, "Medisuministros"]],
  },
  {
    type: "logistics", slug: "demo-logistica", name: "Rápido Express Mensajería",
    tagline: "Tus envíos en Bogotá, rápidos y rastreables en tiempo real", color: "#d97706",
    description: "Mensajería urbana y envíos nacionales con seguimiento en vivo. Domicilios para negocios, documentos, paquetes y pequeñas mudanzas.",
    cover: "1586528116311-ad8dd3c8310d", logo: "1566576721346-d4a3b4eaeb55", barrio: "Puente Aranda", hours: ["06:00", "21:00"],
    itemType: "service", deliveries: true, allDeliveries: true,
    categories: [
      { name: "Envíos urbanos", icon: "🛵", items: [
        ["Envío urbano estándar (hasta 5 kg)", 12000, "Entrega el mismo día en Bogotá.", "1566576721346-d4a3b4eaeb55"],
        ["Envío express (90 min)", 18000, "Recogida inmediata y entrega en 90 minutos.", "1558981806-ec527fa84c39"],
        ["Documentos", 8000, "Sobres y documentos con firma de recibido.", "1586528116311-ad8dd3c8310d"],
        ["Mensajero por hora", 25000, "Diligencias, pagos y trámites.", "1617347454431-f49d7ff5c3b1"],
      ]},
      { name: "Nacional y carga", icon: "🚚", items: [
        ["Envío nacional por kg", 6500, "Ciudades principales en 24 a 48 horas.", "1601584115197-04ecc0da31d7"],
        ["Mini mudanza (camioneta)", 180000, "Hasta 3 horas con 2 auxiliares.", "1600518464441-9154a4dea21b"],
      ]},
      { name: "Insumos", icon: "📦", items: [
        ["Caja de cartón mediana", 4500, "40 x 30 x 30 cm.", "1607166452427-7e4477079cb9", { type: "product" }],
        ["Bolsa de seguridad", 1500, "Con cierre inviolable.", "1553413077-190dd305871c", { type: "product" }],
      ]},
    ],
    staff: [["Mensajero(a)", "Flota"], ["Mensajero(a)", "Flota"], ["Mensajero(a)", "Flota"], ["Conductor(a)", "Flota"], ["Coordinador(a) de Despachos", "Operaciones"], ["Servicio al Cliente", "Servicio al Cliente"]],
  },
  {
    type: "hardware_store", slug: "demo-ferreteria", name: "Ferretería El Tornillo",
    tagline: "Todo para construir, reparar y mejorar tu hogar", color: "#475569",
    description: "Ferretería con herramientas eléctricas y manuales, pinturas, tornillería, plomería y electricidad. Asesoría técnica y domicilios en la localidad.",
    cover: "1581783898377-1c85bf937427", logo: "1530124566582-a618bc2615dc", barrio: "Siete de Agosto", hours: ["07:00", "18:30"],
    itemType: "product", linkInventory: true, deliveries: true,
    categories: [
      { name: "Herramientas eléctricas", icon: "🔌", items: [
        ["Taladro percutor 1/2\" 650 W", 289000, "Velocidad variable y reversa, incluye maletín.", "1572981779307-38b8cabb2407", { stock: 7, unit: "und" }],
        ["Taladro inalámbrico 20 V", 349000, "Con 2 baterías de litio y cargador rápido.", "1504148455328-c376907d081c", { stock: 3, unit: "und", min: 5 }],
      ]},
      { name: "Herramientas manuales", icon: "🔨", items: [
        ["Martillo de uña 16 oz", 32000, "Mango en fibra de vidrio antivibración.", "1586864387967-d02ef85d93e8", { stock: 24, unit: "und" }],
        ["Juego de llaves mixtas x12", 89000, "Cromo vanadio, 8 a 19 mm.", "1426927308491-6380b6a9936f", { stock: 9, unit: "und" }],
        ["Flexómetro 5 m", 18000, "Cinta de acero con freno.", "1581783898377-1c85bf937427", { stock: 40, unit: "und" }],
      ]},
      { name: "Pinturas", icon: "🎨", items: [
        ["Vinilo tipo 1 galón blanco", 68000, "Alto cubrimiento, lavable.", "1562259949-e8e7689d7828", { stock: 30, unit: "galón" }],
        ["Brocha 3\"", 9500, "Cerda natural.", "1589939705384-5185137a7f0f", { stock: 50, unit: "und" }],
      ]},
      { name: "Tornillería y fijación", icon: "🔩", items: [
        ["Tornillo drywall 1\" x100", 7500, "Punta fina, cabeza de trompeta.", "1530124566582-a618bc2615dc", { stock: 120, unit: "caja" }],
        ["Chazo plástico 1/4\" x100", 6000, "Para muro y ladrillo.", "1530124566582-a618bc2615dc", { stock: 15, unit: "caja", min: 30 }],
      ]},
    ],
    staff: [["Vendedor(a) de Mostrador", "Mostrador"], ["Vendedor(a) de Mostrador", "Mostrador"], ["Cajero(a)", "Caja"], ["Bodeguero(a)", "Bodega"], ["Asesor(a) Técnico(a)", "Mostrador"]],
  },
  {
    type: "custom", slug: "demo-estudio-creativo", name: "Lumen Estudio Creativo",
    tagline: "Fotografía, diseño y contenido para marcas que quieren brillar", color: "#4f46e5",
    description: "Estudio creativo con set fotográfico, producción de contenido para redes, diseño de marca y alquiler de estudio por horas.",
    cover: "1497366216548-37526070297c", logo: "1516035069371-29a1b244cc32", barrio: "San Felipe", hours: ["09:00", "19:00"],
    itemType: "service", reservations: true,
    categories: [
      { name: "Fotografía", icon: "📸", items: [
        ["Sesión de producto (10 fotos)", 350000, "Fondo blanco o ambientado, edición incluida.", "1516035069371-29a1b244cc32", { duration: 120 }],
        ["Retrato profesional", 220000, "Para LinkedIn o portafolio, 5 fotos editadas.", "1507003211169-0a1dd7228f2d", { duration: 60 }],
        ["Alquiler de estudio por hora", 90000, "Set con iluminación y fondos.", "1471341971476-ae15ff5dd4ea", { duration: 60 }],
      ]},
      { name: "Diseño y contenido", icon: "🎨", items: [
        ["Diseño de logo", 650000, "Tres propuestas y manual básico de marca.", "1561070791-2526d30994b5"],
        ["Paquete redes sociales (12 piezas)", 480000, "Diseño de contenido mensual.", "1497366216548-37526070297c"],
      ]},
    ],
    staff: [["Administrador(a)", "Administración"], ["Operario(a)", "Operaciones"], ["Vendedor(a)", "Ventas"]],
  },
];

const MODULES_BY_TYPE = {
  // Mirror of DEFAULT_MODULES_BY_TYPE in src/lib/constants.ts
  restaurant: ["catalog", "transactions", "reservations", "inventory", "finance", "team", "contacts", "reports"],
  fast_food: ["catalog", "transactions", "inventory", "finance", "team", "contacts", "reports"],
  supermarket: ["catalog", "transactions", "inventory", "finance", "team", "contacts", "reports"],
  barbershop: ["catalog", "transactions", "reservations", "finance", "team", "contacts", "reports"],
  tattoo: ["catalog", "transactions", "reservations", "finance", "team", "contacts", "reports"],
  bar: ["catalog", "transactions", "reservations", "inventory", "finance", "team", "contacts", "reports"],
  hotel: ["catalog", "transactions", "reservations", "inventory", "finance", "team", "contacts", "reports"],
  hostel: ["catalog", "transactions", "reservations", "inventory", "finance", "team", "contacts", "reports"],
  cafe: ["catalog", "transactions", "inventory", "finance", "team", "contacts", "reports"],
  gym: ["catalog", "transactions", "reservations", "finance", "team", "contacts", "reports"],
  laundry: ["catalog", "transactions", "finance", "team", "contacts", "reports"],
  clothing: ["catalog", "transactions", "inventory", "finance", "team", "contacts", "reports"],
  veterinary: ["catalog", "transactions", "reservations", "inventory", "finance", "team", "contacts", "reports"],
  logistics: ["catalog", "transactions", "finance", "team", "contacts", "reports"],
  hardware_store: ["catalog", "transactions", "inventory", "finance", "team", "contacts", "reports"],
  custom: ["catalog", "transactions", "reservations", "finance", "team", "contacts", "reports"],
};

/* ── image verification ──────────────────────────────── */

async function checkImages(demos) {
  const ids = new Set();
  for (const d of demos) {
    ids.add(d.cover); ids.add(d.logo);
    for (const c of d.categories) for (const it of c.items) ids.add(it[3]);
  }
  const broken = new Set();
  await Promise.all([...ids].map(async (id) => {
    try {
      const res = await fetch(img(id, 64), { method: "HEAD" });
      if (!res.ok) broken.add(id);
    } catch {
      broken.add(id);
    }
  }));
  return broken;
}

/* ── seeding ─────────────────────────────────────────── */

async function seedDemo(d, ownerId, broken) {
  const safeImg = (id, w, h) => (broken.has(id) ? null : img(id, w, h));
  const hours = Object.fromEntries(["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((k) => [k, { open: d.hours[0], close: d.hours[1], closed: false }]));

  const business = await must(sb.from("businesses").insert({
    name: d.name, slug: d.slug, type: d.type, owner_id: ownerId,
    tagline: d.tagline, description: d.description,
    logo_url: safeImg(d.logo, 400, 400), cover_url: safeImg(d.cover, 1600, 700),
    address: `${pick(STREETS)}, ${d.barrio}`, city: "Bogotá", country: "CO",
    email: `hola@${d.slug}.demo`,
    business_hours: hours, currency: "COP", timezone: "America/Bogota", locale: "es",
    theme: { primary_color: d.color },
    social_links: { instagram: "", facebook: "", tiktok: "", twitter: "", website: "" },
    webpage_published: true, active: true, onboarding_completed: true,
    subscription_plan: "pro", subscription_status: "active",
    internal_notes: "Negocio DEMO generado por scripts/seed-demos.mjs — se recrea al volver a correr el script.",
  }).select().single(), `business ${d.slug}`);
  const bid = business.id;

  await must(sb.from("business_members").insert({ business_id: bid, user_id: ownerId, role: "owner", status: "active" }), "member");
  await must(sb.from("business_modules").insert(MODULES_BY_TYPE[d.type].map((m) => ({ business_id: bid, module_key: m, enabled: true }))), "modules");

  // ── catalog (+ inventory linked 1:1 for retail types)
  const items = [];
  let sort = 0;
  for (const [ci, cat] of d.categories.entries()) {
    const category = await must(sb.from("catalog_categories").insert({ business_id: bid, name: cat.name, icon: cat.icon, sort_order: ci, active: true }).select().single(), "category");
    for (const [name, price, description, imgId, extra = {}] of cat.items) {
      let inventoryId = null;
      const sku = `${d.slug.replace("demo-", "").slice(0, 3).toUpperCase()}-${String(++sort).padStart(3, "0")}`;
      if (d.linkInventory && extra.stock != null) {
        const inv = await must(sb.from("inventory").insert({
          business_id: bid, name, category: cat.name, unit: extra.unit || "und",
          current_stock: extra.stock, min_stock: extra.min ?? Math.max(3, Math.round(extra.stock * 0.25)),
          cost_per_unit: round100(price * 0.62), supplier: "Distribuidora Andina", barcode: `770${String(int(1e8, 9e8))}`,
          last_restock_at: daysAgo(int(2, 12)).toISOString(), active: true,
        }).select().single(), "inventory");
        inventoryId = inv.id;
      }
      const item = await must(sb.from("catalog_items").insert({
        business_id: bid, category_id: category.id, name, description, price,
        cost: round100(price * (d.itemType === "service" || d.itemType === "room" ? 0.3 : 0.45)),
        type: extra.type || d.itemType, image_url: safeImg(imgId), sku,
        duration_minutes: extra.duration ?? null, capacity: extra.capacity ?? null,
        featured: sort <= 3, sort_order: sort, active: true, inventory_id: inventoryId,
      }).select().single(), "item");
      items.push(item);
    }
  }

  // ── standalone inventory (ingredients / supplies)
  if (d.inventory) {
    await must(sb.from("inventory").insert(d.inventory.map(([name, unit, stock, min, cost, supplier]) => ({
      business_id: bid, name, unit, current_stock: stock, min_stock: min, cost_per_unit: cost, supplier,
      category: "Insumos", last_restock_at: daysAgo(int(1, 10)).toISOString(), active: true,
    }))), "supplies");
  }

  // ── customers
  const contacts = await must(sb.from("contacts").insert(Array.from({ length: 18 }, (_, i) => {
    const full_name = fullName();
    return {
      business_id: bid, full_name,
      phone: `30000${String(10000 + i * 37 + int(0, 30)).slice(-5)}`,
      email: `${full_name.split(" ")[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}${int(10, 99)}@correo.demo`,
      address: `${pick(STREETS)}, ${pick(BARRIOS)}`,
      tags: i < 4 ? ["frecuente"] : i < 6 ? ["nuevo"] : [],
      created_at: daysAgo(int(5, 90)).toISOString(),
    };
  })).select(), "contacts");

  // ── team
  await must(sb.from("employees").insert(d.staff.map(([position, department], i) => ({
    business_id: bid, full_name: fullName(), position, department,
    phone: `30100${String(20000 + i * 113).slice(-5)}`,
    salary: [1300000, 1500000, 1800000, 2200000, 2800000][Math.min(4, int(0, 4))],
    salary_type: "monthly", status: i === d.staff.length - 1 && d.staff.length > 4 ? "on_leave" : "active",
    hire_date: daysAgo(int(60, 700)).toISOString().slice(0, 10),
  }))), "employees");

  // ── 30 days of transactions
  const sellable = items.filter((it) => it.price > 0);
  const stats = new Map(); // contact_id -> { spent, visits, last }
  const txns = [];
  const isService = d.itemType === "service" || d.itemType === "room" || d.itemType === "membership";
  let codeSeq = 1000;

  const buildLines = () => {
    const n = d.itemType === "room" || d.type === "logistics" ? 1 : int(1, isService ? 2 : 4);
    const chosen = new Map();
    for (let i = 0; i < n; i++) {
      const it = pick(sellable);
      chosen.set(it.id, { it, q: (chosen.get(it.id)?.q || 0) + (d.itemType === "room" ? int(1, 3) : 1) });
    }
    return [...chosen.values()].map(({ it, q }) => ({ catalog_item_id: it.id, name: it.name, quantity: q, unit_price: it.price, total_price: it.price * q }));
  };

  for (let day = 29; day >= 0; day--) {
    const weekend = [0, 5, 6].includes(daysAgo(day).getDay());
    const count = day === 0 ? int(4, 6) : int(weekend ? 5 : 3, weekend ? 9 : 6);
    for (let k = 0; k < count; k++) {
      const lines = buildLines();
      const subtotal = lines.reduce((s, l) => s + l.total_price, 0);
      const discount = rand() < 0.1 ? round100(subtotal * 0.1) : 0;
      const total = subtotal - discount;
      const contact = rand() < 0.75 ? pick(contacts) : null;
      const created = daysAgo(day);
      const isWeb = d.deliveries && (d.allDeliveries || rand() < 0.45);
      // Today's last orders stay open so the Orders board has live work
      const open = day === 0 && k >= count - 3;
      const status = open ? ["pending", "confirmed", "in_progress"][k % 3] : rand() < 0.04 ? "cancelled" : "completed";
      const address = isWeb ? (contact?.address || `${pick(STREETS)}, ${pick(BARRIOS)}`) : null;
      txns.push({
        row: {
          business_id: bid, contact_id: contact?.id ?? null,
          type: isWeb ? "order" : isService && d.reservations ? "appointment" : "sale",
          code: `${isWeb ? "WEB" : "POS"}-${++codeSeq}`,
          status, subtotal, discount, tax: 0, total,
          payment_method: status === "pending" ? "pending" : pick(["cash", "cash", "card", "transfer"]),
          payment_status: status === "completed" ? "paid" : "pending",
          customer_name: contact?.full_name ?? (isWeb ? fullName() : "Consumidor Final"),
          customer_phone: contact?.phone ?? null,
          address,
          notes: isWeb ? `📦 Domicilio | 📍 ${address}` : null,
          created_at: created.toISOString(), updated_at: created.toISOString(),
          completed_at: status === "completed" ? new Date(created.getTime() + int(15, 90) * 60000).toISOString() : null,
        },
        lines, isWeb, open,
      });
      if (contact && status === "completed") {
        const s = stats.get(contact.id) || { spent: 0, visits: 0, last: null };
        s.spent += total; s.visits += 1; s.last = created.toISOString();
        stats.set(contact.id, s);
      }
    }
  }

  // insert transactions in chunks
  const inserted = [];
  for (let i = 0; i < txns.length; i += 100) {
    const chunk = txns.slice(i, i + 100);
    const rows = await must(sb.from("transactions").insert(chunk.map((t) => t.row)).select("id"), "transactions");
    rows.forEach((r, j) => inserted.push({ ...chunk[j], id: r.id }));
  }
  const lineRows = inserted.flatMap((t) => t.lines.map((l) => ({ ...l, transaction_id: t.id })));
  for (let i = 0; i < lineRows.length; i += 300) {
    await must(sb.from("transaction_items").insert(lineRows.slice(i, i + 300)), "transaction_items");
  }

  // ── delivery tracking for web orders (recent ones; open ones get live state)
  if (d.deliveries) {
    const recent = inserted.filter((t) => t.isWeb && t.row.status !== "cancelled" && new Date(t.row.created_at) > daysAgo(3, 0, 0));
    const rows = recent.map((t) => {
      const dest = bogotaPoint();
      const enRoute = t.open && t.row.status === "in_progress";
      const done = t.row.status === "completed";
      return {
        business_id: bid, transaction_id: t.id, dest_lat: dest.lat, dest_lng: dest.lng,
        status: enRoute ? "on_the_way" : done ? "delivered" : "pending",
        courier_name: enRoute || done ? pick(FIRST) : null,
        courier_lat: enRoute ? dest.lat + 0.006 : null,
        courier_lng: enRoute ? dest.lng + 0.004 : null,
        location_updated_at: enRoute ? new Date().toISOString() : null,
        started_at: enRoute || done ? t.row.created_at : null,
        delivered_at: done ? t.row.completed_at : null,
      };
    });
    if (rows.length) await must(sb.from("deliveries").insert(rows), "deliveries");
  }

  // ── customer stats
  await Promise.all([...stats.entries()].map(([id, s]) =>
    sb.from("contacts").update({ total_spent: s.spent, total_visits: s.visits, last_visit_at: s.last }).eq("id", id)
  ));

  // ── reservations: past week + next two weeks
  if (d.reservations) {
    const bookable = items.filter((it) => it.type !== "product" || ["restaurant", "bar"].includes(d.type));
    const res = [];
    for (let day = -7; day <= 14; day++) {
      const n = int(1, 3);
      for (let k = 0; k < n; k++) {
        const contact = pick(contacts);
        const it = ["restaurant", "bar"].includes(d.type) ? null : pick(bookable);
        const start = daysAgo(-day, int(10, 19), pick([0, 30]));
        const minutes = d.itemType === "room" ? int(1, 4) * 24 * 60 : it?.duration_minutes || 90;
        res.push({
          business_id: bid, item_id: it?.id ?? null,
          customer_name: contact.full_name, customer_phone: contact.phone, customer_email: contact.email,
          reservation_time: start.toISOString(), end_time: new Date(start.getTime() + minutes * 60000).toISOString(),
          party_size: d.itemType === "room" ? int(1, it?.capacity || 2) : ["restaurant", "bar"].includes(d.type) ? int(2, 8) : 1,
          status: day < 0 ? (rand() < 0.1 ? "cancelled" : "completed") : day <= 2 ? "confirmed" : pick(["pending", "confirmed"]),
          notes: rand() < 0.2 ? pick(["Cumpleaños 🎂", "Primera vez", "Pide ventana", "Cliente frecuente"]) : null,
        });
      }
    }
    await must(sb.from("reservations").insert(res), "reservations");
  }

  // ── expenses for the month
  const expenseTemplates = [
    ["Arriendo del local", "operation", 3200000, "transfer"],
    ["Energía y agua", "utilities", 680000, "transfer"],
    ["Internet y telefonía", "utilities", 159000, "transfer"],
    ["Compra a proveedores", "supplies", 1450000, "transfer"],
    ["Compra a proveedores", "supplies", 980000, "cash"],
    ["Publicidad en Instagram", "marketing", 250000, "card"],
    ["Mantenimiento de equipos", "maintenance", 320000, "cash"],
    ["Implementos de aseo", "supplies", 140000, "cash"],
  ];
  await must(sb.from("expenses").insert(expenseTemplates.map(([description, category, amount, payment_method], i) => ({
    business_id: bid, description, category, amount: round100(amount * (0.85 + rand() * 0.3)), payment_method,
    date: daysAgo(i * 4 + 1).toISOString().slice(0, 10), recurring: ["operation", "utilities"].includes(category),
    recurring_interval: ["operation", "utilities"].includes(category) ? "monthly" : null,
  }))), "expenses");

  return { items: items.length, txns: inserted.length, contacts: contacts.length };
}

/* ── main ────────────────────────────────────────────── */

const { data: users, error: usersError } = await sb.auth.admin.listUsers({ perPage: 1000 });
if (usersError) throw usersError;
const owner = users.users.find((u) => u.email === OWNER_EMAIL);
if (!owner) throw new Error(`No existe el usuario ${OWNER_EMAIL}`);

const demos = args.only ? DEMOS.filter((d) => d.slug === args.only) : DEMOS;
if (!demos.length) throw new Error(`No hay demo con slug ${args.only}`);

console.log("Verificando imágenes de Unsplash…");
const broken = await checkImages(demos);
if (broken.size) console.warn(`⚠ ${broken.size} imágenes no disponibles (quedan sin foto):`, [...broken].join(", "));
if (args["check-images"]) process.exit(broken.size ? 1 : 0);

const slugs = demos.map((d) => d.slug);
const removed = await must(sb.from("businesses").delete().in("slug", slugs).select("slug"), "cleanup");
if (removed.length) console.log(`Eliminadas ${removed.length} demos anteriores`);

for (const d of demos) {
  const r = await seedDemo(d, owner.id, broken);
  console.log(`✓ ${d.name.padEnd(36)} /${d.slug.padEnd(24)} ${r.items} ítems · ${r.txns} transacciones · ${r.contacts} clientes`);
}
console.log(`\nListo: ${demos.length} demos asignadas a ${OWNER_EMAIL}`);
