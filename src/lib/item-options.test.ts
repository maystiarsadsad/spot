import { describe, expect, it } from "vitest";
import {
  defaultSelection,
  describeOptions,
  lineKey,
  optionsPrice,
  parseOptionGroups,
  snapshotSelection,
  toggleChoice,
  validateSelection,
  type OptionGroup,
} from "./item-options";

const protein: OptionGroup = {
  id: "g1", name: "Proteína", min: 1, max: 1,
  choices: [
    { id: "pollo", name: "Pollo", price: 0, available: true },
    { id: "res", name: "Res", price: 3000, available: true, inventory_id: "inv-res", inventory_qty: 0.15 },
    { id: "cerdo", name: "Cerdo", price: 0, available: false },
  ],
};
const extras: OptionGroup = {
  id: "g2", name: "Adiciones", min: 0, max: 2,
  choices: [
    { id: "queso", name: "Queso", price: 2500, available: true },
    { id: "tocineta", name: "Tocineta", price: 4000, available: true },
    { id: "huevo", name: "Huevo", price: 2000, available: true, default: true },
  ],
};
const groups = [protein, extras];

describe("parseOptionGroups", () => {
  it("drops malformed groups/choices and clamps min/max", () => {
    const parsed = parseOptionGroups([
      { id: "a", name: "  Tamaño ", min: 5, max: 9, choices: [{ id: "s", name: "S", price: -10 }, { id: "", name: "x" }] },
      { id: "b", name: "", choices: [{ id: "c", name: "C" }] },
      "garbage",
      { id: "c", name: "Vacío", choices: [] },
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ id: "a", name: "Tamaño", min: 1, max: 1 });
    expect(parsed[0].choices).toEqual([{ id: "s", name: "S", price: 0, available: true, inventory_id: null, inventory_qty: null }]);
  });

  it("returns [] for non-arrays", () => {
    expect(parseOptionGroups(null)).toEqual([]);
    expect(parseOptionGroups({})).toEqual([]);
  });
});

describe("selection", () => {
  it("pre-selects defaults", () => {
    expect(defaultSelection(groups)).toEqual({ g1: [], g2: ["huevo"] });
  });

  it("radio replaces, checkbox respects max", () => {
    let sel = toggleChoice({}, protein, "pollo");
    sel = toggleChoice(sel, protein, "res");
    expect(sel.g1).toEqual(["res"]);
    // required radio can't be cleared by tapping again
    expect(toggleChoice(sel, protein, "res").g1).toEqual(["res"]);

    sel = toggleChoice(sel, extras, "queso");
    sel = toggleChoice(sel, extras, "tocineta");
    sel = toggleChoice(sel, extras, "huevo"); // over max → ignored
    expect(sel.g2).toEqual(["queso", "tocineta"]);
  });

  it("validates required groups, availability and max", () => {
    expect(validateSelection(groups, { g1: [], g2: [] })).toMatch(/Proteína/);
    expect(validateSelection(groups, { g1: ["cerdo"] })).toMatch(/disponible/);
    expect(validateSelection(groups, { g1: ["res"], g2: ["queso", "tocineta", "huevo"] })).toMatch(/Máximo 2/);
    expect(validateSelection(groups, { g1: ["res"], g2: ["queso"] })).toBeNull();
  });
});

describe("snapshot & pricing", () => {
  it("prices options and keeps inventory links", () => {
    const snap = snapshotSelection(groups, { g1: ["res"], g2: ["queso", "huevo"] });
    expect(optionsPrice(snap)).toBe(7500);
    expect(snap[0]).toEqual({ group: "Proteína", choice: "Res", price: 3000, inventory_id: "inv-res", inventory_qty: 0.15 });
    expect(describeOptions(snap, (n) => `$${n}`)).toEqual(["Proteína: Res (+$3000)", "Adiciones: Queso (+$2500), Huevo (+$2000)"]);
  });

  it("builds the same line key regardless of choice order", () => {
    expect(lineKey("item", { g2: ["queso", "huevo"], g1: ["res"] })).toBe(lineKey("item", { g1: ["res"], g2: ["huevo", "queso"] }));
    expect(lineKey("item", { g1: ["res"] }, "sin sal")).not.toBe(lineKey("item", { g1: ["res"] }));
  });
});
