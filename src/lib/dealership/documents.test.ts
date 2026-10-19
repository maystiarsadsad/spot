import { describe, expect, it } from "vitest";
import { documentIssues, missingForSale, parseDocuments } from "./documents";

describe("parseDocuments", () => {
  it("keeps known keys and valid dates only", () => {
    const d = parseDocuments({
      soat: { has: true, expires: "2027-03-01" },
      tarjeta_propiedad: { has: true, expires: "2027-03-01" }, // does not expire: date dropped
      basura: { has: true },
      tecnomecanica: { has: true, expires: "mañana" },
    });
    expect(d.soat).toEqual({ has: true, expires: "2027-03-01" });
    expect(d.tarjeta_propiedad).toEqual({ has: true });
    expect(d.tecnomecanica).toEqual({ has: true });
    expect("basura" in d).toBe(false);
  });
  it("tolerates non-objects", () => {
    expect(parseDocuments(null)).toEqual({});
    expect(parseDocuments([1, 2])).toEqual({});
  });
});

describe("documentIssues", () => {
  const today = "2026-10-19";
  it("lists everything as missing for an untracked vehicle", () => {
    const issues = documentIssues({}, today);
    expect(issues.length).toBeGreaterThan(5);
    expect(issues.every((i) => i.problem === "missing")).toBe(true);
  });
  it("flags expired and soon-to-expire documents", () => {
    const issues = documentIssues(
      { soat: { has: true, expires: "2026-10-01" }, tecnomecanica: { has: true, expires: "2026-11-10" } },
      today
    );
    expect(issues.find((i) => i.key === "soat")?.problem).toBe("expired");
    expect(issues.find((i) => i.key === "tecnomecanica")?.problem).toBe("expiring");
  });
  it("does not flag a valid document", () => {
    const issues = documentIssues({ soat: { has: true, expires: "2027-10-01" } }, today);
    expect(issues.find((i) => i.key === "soat")).toBeUndefined();
  });
});

describe("missingForSale", () => {
  it("requires the title card and the transfer form", () => {
    expect(missingForSale({})).toEqual(["Tarjeta de propiedad", "Formulario de traspaso"]);
    expect(missingForSale({ tarjeta_propiedad: { has: true } })).toEqual(["Formulario de traspaso"]);
    expect(missingForSale({ tarjeta_propiedad: { has: true }, traspaso: { has: true } })).toEqual([]);
  });
});
