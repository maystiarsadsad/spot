import { describe, expect, it } from "vitest";
import {
  canEnter,
  currentMembership,
  daysLeft,
  membershipState,
  newMemberCode,
  periodEnd,
  reminderMessage,
  renewalStart,
  type MembershipLike,
} from "./status";

const TODAY = "2026-10-07";
const m = (over: Partial<MembershipLike>): MembershipLike => ({
  status: "active", starts_on: "2026-09-20", ends_on: "2026-10-19", sessions_total: null, sessions_used: 0, ...over,
});

describe("membershipState", () => {
  it("classifies by dates, status and sessions", () => {
    expect(membershipState(m({}), TODAY)).toBe("active");
    expect(membershipState(m({ ends_on: "2026-10-10" }), TODAY)).toBe("expiring");
    expect(membershipState(m({ ends_on: "2026-10-06" }), TODAY)).toBe("expired");
    expect(membershipState(m({ starts_on: "2026-10-20", ends_on: "2026-11-18" }), TODAY)).toBe("scheduled");
    expect(membershipState(m({ sessions_total: 10, sessions_used: 10 }), TODAY)).toBe("no_sessions");
    expect(membershipState(m({ status: "pending" }), TODAY)).toBe("pending");
    expect(membershipState(null, TODAY)).toBe("none");
  });
  it("only active/expiring can enter", () => {
    expect(canEnter("expiring")).toBe(true);
    expect(canEnter("no_sessions")).toBe(false);
  });
  it("counts today as a remaining day", () => {
    expect(daysLeft(m({ ends_on: TODAY }), TODAY)).toBe(1);
    expect(daysLeft(m({ ends_on: "2026-10-01" }), TODAY)).toBe(0);
  });
});

describe("renewals", () => {
  it("stacks after the current period, or starts today when expired", () => {
    expect(renewalStart([m({ ends_on: "2026-10-19" })], TODAY)).toBe("2026-10-20");
    expect(renewalStart([m({ ends_on: "2026-10-01" })], TODAY)).toBe(TODAY);
    expect(renewalStart([m({ sessions_total: 10, sessions_used: 10 })], TODAY)).toBe(TODAY);
  });
  it("computes inclusive end dates", () => {
    expect(periodEnd("2026-10-07", 30)).toBe("2026-11-05");
    expect(periodEnd("2026-10-07", 1)).toBe("2026-10-07");
  });
  it("picks the membership that covers today", () => {
    const old = m({ starts_on: "2026-08-01", ends_on: "2026-08-30" });
    const now = m({});
    const next = m({ starts_on: "2026-10-20", ends_on: "2026-11-18" });
    expect(currentMembership([old, next, now], TODAY)).toBe(now);
    expect(currentMembership([old, next], TODAY)).toBe(next);
    expect(currentMembership([old], TODAY)).toBe(old);
  });
});

describe("helpers", () => {
  it("writes a friendly reminder", () => {
    const msg = reminderMessage({ name: "Laura Gómez", businessName: "Iron Fit", planName: "Plan mensual", endsOn: "2026-10-10", state: "expiring" });
    expect(msg).toContain("Hola Laura");
    expect(msg).toContain("sábado, 10 de octubre");
  });
  it("generates unused 6-digit codes", () => {
    let i = 0;
    const seq = [0.1, 0.1, 0.5];
    const code = newMemberCode(new Set(["190000"]), () => seq[i++]);
    expect(code).toBe("550000");
  });
});
