import { describe, expect, it } from "vitest";
import { keywordAnswer, type KbContext } from "./keyword-engine";
import type { OptionGroup } from "@/lib/item-options";

const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`;

const quitar: OptionGroup = {
  id: "g-quitar", name: "Quitar ingredientes", min: 0, max: 4,
  choices: [
    { id: "c-cebolla", name: "Sin cebolla", price: 0, available: true },
    { id: "c-tomate", name: "Sin tomate", price: 0, available: true },
  ],
};
const adiciones: OptionGroup = {
  id: "g-adic", name: "Adiciones", min: 0, max: 3,
  choices: [
    { id: "c-tocineta", name: "Tocineta", price: 4000, available: true },
    { id: "c-aguacate", name: "Aguacate", price: 3500, available: true },
  ],
};
const termino: OptionGroup = {
  id: "g-term", name: "Término de la carne", min: 1, max: 1,
  choices: [
    { id: "c-medio", name: "Medio", price: 0, available: true },
    { id: "c-34", name: "Tres cuartos", price: 0, available: true, default: true },
  ],
};

const ctx: KbContext = {
  businessName: "Burger Brothers",
  address: "Cra 7 # 45-12, Cedritos",
  city: "Bogotá",
  whatsapp: "+573044047382",
  hours: Object.fromEntries(["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => [d, { open: "12:00", close: "23:00" }])),
  greeting: null,
  faqs: [{ q: "¿Aceptan Nequi?", a: "Sí, recibimos Nequi y Daviplata al 3044047382." }],
  extraInfo: "Hacemos domicilios hasta la calle 170. El pedido mínimo para domicilio es de $20.000.",
  categories: ["Hamburguesas", "Bebidas"],
  items: [
    { id: "i-clasica", name: "Clásica", description: "Carne 150 g, queso cheddar, lechuga, tomate.", price: 22000, category: "Hamburguesas", featured: true, groups: [termino, adiciones, quitar] },
    { id: "i-bacon", name: "Doble Bacon", description: "Doble carne y tocineta.", price: 31000, category: "Hamburguesas", featured: true, groups: [termino, quitar] },
    { id: "i-perro", name: "Perro americano", description: "Salchicha americana.", price: 16000, category: "Perros", featured: false, groups: [adiciones] },
    { id: "i-gaseosa", name: "Gaseosa 400 ml", description: null, price: 5000, category: "Bebidas", featured: false, groups: [] },
  ],
};

describe("keywordAnswer", () => {
  it("answers 'sin cebolla' with the matching option preselected", () => {
    const r = keywordAnswer("¿La clásica se puede sin cebolla?", ctx, fmt);
    expect(r.text).toContain("Sin cebolla");
    expect(r.action).toEqual({ label: "Personalizar Clásica", itemId: "i-clasica", selection: { "g-quitar": ["c-cebolla"] } });
  });

  it("tolerates typos and reports the extra price", () => {
    const r = keywordAnswer("amburguesa clasica con tosineta", ctx, fmt);
    expect(r.text).toContain("Tocineta");
    expect(r.text).toContain("+$4.000");
    expect(r.action?.selection).toEqual({ "g-adic": ["c-tocineta"] });
  });

  it("falls back to special instructions for options that don't exist", () => {
    const r = keywordAnswer("la doble bacon sin pepinillos", ctx, fmt);
    expect(r.text).toMatch(/Instrucciones especiales/);
    expect(r.action?.itemId).toBe("i-bacon");
  });

  it("gives prices with the cheapest extra", () => {
    const r = keywordAnswer("cuanto vale la clasica", ctx, fmt);
    expect(r.text).toContain("$22.000");
    expect(r.text).toContain("+$3.500");
  });

  it("lists option groups", () => {
    const r = keywordAnswer("que opciones tiene el perro americano?", ctx, fmt);
    expect(r.text).toContain("Adiciones");
    expect(r.text).toContain("Aguacate (+$3.500)");
  });

  it("uses the owner's FAQ first", () => {
    expect(keywordAnswer("aceptan nequi?", ctx, fmt).text).toContain("Daviplata");
  });

  it("answers hours, address and delivery", () => {
    expect(keywordAnswer("a que hora abren?", ctx, fmt).text).toContain("Todos los días: 12:00 a 23:00");
    expect(keywordAnswer("donde quedan?", ctx, fmt).text).toContain("Cedritos");
    expect(keywordAnswer("hacen domicilios?", ctx, fmt).text).toMatch(/domicilio/i);
  });

  it("finds products by ingredient", () => {
    const r = keywordAnswer("tienen algo con aguacate?", ctx, fmt);
    expect(r.text).toContain("Clásica");
    expect(r.text).toContain("Perro americano");
  });

  it("answers from the owner's extra info", () => {
    expect(keywordAnswer("cual es el pedido minimo?", ctx, fmt).text).toContain("$20.000");
  });

  it("offers help when it doesn't understand", () => {
    expect(keywordAnswer("xyz", ctx, fmt).text).toMatch(/Puedo ayudarte/);
  });
});

describe("keywordAnswer — appointment businesses", () => {
  it("points customers to the online booking", () => {
    const r = keywordAnswer("tienen turno para mañana?", { ...ctx, booking: true }, fmt);
    expect(r.text).toMatch(/agendar tu cita/);
  });
  it("does not talk about booking for shops", () => {
    expect(keywordAnswer("tienen turno para mañana?", ctx, fmt).text).not.toMatch(/agendar tu cita/);
  });
});

describe("keywordAnswer — hours still win over booking", () => {
  it("answers hours for 'a qué hora abren hoy' in an appointment business", () => {
    expect(keywordAnswer("a que hora abren hoy?", { ...ctx, booking: true }, fmt).text).toMatch(/horario/);
  });
});

describe("keywordAnswer — gyms", () => {
  const gymCtx: KbContext = {
    ...ctx,
    businessName: "Iron Fit",
    items: [
      { id: "p1", name: "Plan mensual", description: null, price: 120000, category: "Planes", featured: true, groups: [] },
      { id: "p2", name: "Tiquetera 10 días", description: null, price: 70000, category: "Planes", featured: false, groups: [] },
    ],
    gym: { classes: [{ name: "Spinning", day: "lun", time: "06:00" }, { name: "Spinning", day: "mié", time: "18:30" }, { name: "Yoga", day: "mar", time: "07:00" }] },
  };
  it("gives the timetable of a named class", () => {
    const r = keywordAnswer("a que hora es spinning?", gymCtx, fmt);
    expect(r.text).toContain("Spinning: lun 06:00, mié 18:30");
    expect(r.text).not.toContain("Yoga");
  });
  it("lists every class when asked generally", () => {
    expect(keywordAnswer("que clases tienen?", gymCtx, fmt).text).toContain("Yoga: mar 07:00");
  });
  it("explains plans and sign-up", () => {
    const r = keywordAnswer("como me inscribo?", gymCtx, fmt);
    expect(r.text).toContain("Plan mensual — $120.000");
    expect(r.text).toMatch(/Inscribirme/);
  });
  it("prefers the class timetable over a catalog item with the same name, without cart buttons", () => {
    const withItem: KbContext = {
      ...gymCtx,
      items: [...gymCtx.items, { id: "s1", name: "Spinning", description: null, price: 20000, category: "Clases", featured: false, groups: [] }],
    };
    const r = keywordAnswer("a que hora es spinning?", withItem, fmt);
    expect(r.text).toContain("Spinning: lun 06:00");
    expect(r.action).toBeUndefined();
    const price = keywordAnswer("cuanto cuesta spinning?", withItem, fmt);
    expect(price.text).toContain("$20.000");
    expect(price.action).toBeUndefined();
  });
});
