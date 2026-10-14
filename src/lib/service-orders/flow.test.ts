import { describe, expect, it } from "vitest";
import {
  DEFAULT_SERVICE_SETTINGS,
  laundryDeliveryFee,
  lineTotal,
  nextStatus,
  parseServiceSettings,
  quoteShipment,
  stagesFor,
  straightKm,
} from "./flow";

const settings = { ...DEFAULT_SERVICE_SETTINGS };

describe("pipeline", () => {
  it("laundry skips 'en camino' when the customer picks it up at the store", () => {
    expect(stagesFor("laundry", "store").map((s) => s.key)).toEqual(["requested", "received", "washing", "ready", "delivered"]);
    expect(nextStatus("laundry", "ready", "store")).toBe("delivered");
    expect(nextStatus("laundry", "ready", "delivery")).toBe("out_for_delivery");
  });

  it("shipments go requested → assigned → in transit → delivered", () => {
    expect(nextStatus("shipment", "requested")).toBe("assigned");
    expect(nextStatus("shipment", "in_transit")).toBe("delivered");
    expect(nextStatus("shipment", "delivered")).toBeNull();
    expect(nextStatus("shipment", "failed")).toBe("assigned");
  });
});

describe("shipment quote", () => {
  // Chapinero → Usaquén, ~7.4 km straight
  const from = { lat: 4.6486, lng: -74.0628 };
  const to = { lat: 4.7110, lng: -74.0300 };

  it("charges base + km beyond the included ones + size", () => {
    const straight = straightKm(from, to);
    expect(straight).toBeGreaterThan(7);
    expect(straight).toBeLessThan(8);
    const q = quoteShipment({ from, to, basePrice: 12000, size: "medium", settings });
    expect(q.distanceKm).toBeCloseTo(straight * 1.35, 0);
    expect(q.distanceFee).toBe(Math.round(((q.distanceKm - 5) * 1500) / 100) * 100);
    expect(q.total).toBe(12000 + q.distanceFee + 3000);
    expect(q.tooFar).toBe(false);
  });

  it("short trips pay only the base price", () => {
    const q = quoteShipment({ from, to: { lat: 4.652, lng: -74.06 }, basePrice: 8000, size: "small", settings });
    expect(q.distanceFee).toBe(0);
    expect(q.total).toBe(8000);
  });

  it("flags routes beyond the coverage", () => {
    const q = quoteShipment({ from, to: { lat: 5.07, lng: -75.52 }, basePrice: 12000, size: "small", settings });
    expect(q.tooFar).toBe(true);
  });
});

describe("laundry and settings", () => {
  it("charges the home service fee once", () => {
    const s = { ...settings, homeServiceFee: 6000 };
    expect(laundryDeliveryFee("pickup", "delivery", s)).toBe(6000);
    expect(laundryDeliveryFee("store", "store", s)).toBe(0);
  });

  it("rounds line totals to hundreds (e.g. 3.4 kg)", () => {
    expect(lineTotal(9000, 3.4)).toBe(30600);
    expect(lineTotal(3500, 3)).toBe(10500);
  });

  it("parses settings defensively", () => {
    const s = parseServiceSettings({ perKm: "2000", roadFactor: 5, sizeFees: { large: 12000 } });
    expect(s.perKm).toBe(2000);
    expect(s.roadFactor).toBe(2);
    expect(s.sizeFees).toEqual({ small: 0, medium: 3000, large: 12000 });
  });
});
