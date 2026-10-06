import { describe, expect, it } from "vitest";
import { resolveActiveBusinessId, type UserBusiness } from "./get-user-businesses";

const biz = (id: string): UserBusiness => ({
  id,
  name: id,
  slug: id,
  logo_url: null,
  type: "custom",
});

describe("resolveActiveBusinessId", () => {
  const businesses = [biz("a"), biz("b"), biz("c")];

  it("uses the cookie business when it belongs to the user", () => {
    expect(resolveActiveBusinessId(businesses, "b")).toBe("b");
  });

  it("falls back to the first business when there is no cookie (fresh login)", () => {
    expect(resolveActiveBusinessId(businesses, undefined)).toBe("a");
  });

  it("falls back to the first business when the cookie is stale or belongs to someone else", () => {
    expect(resolveActiveBusinessId(businesses, "someone-elses")).toBe("a");
  });

  it("returns undefined when the user has no businesses", () => {
    expect(resolveActiveBusinessId([], "a")).toBeUndefined();
  });
});
