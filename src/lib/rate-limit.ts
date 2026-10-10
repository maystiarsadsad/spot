import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export interface LimitRule {
  /** Counter key, e.g. "book:ip:1.2.3.4" */
  key: string;
  max: number;
  windowSeconds: number;
}

export const TOO_MANY = "Demasiados intentos seguidos. Espera unos minutos e intenta de nuevo.";

/** Visitor IP as seen by Vercel (first hop of x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Last 10 digits, so +57 300… and 300… share a counter. */
export const phoneKey = (phone: string) => phone.replace(/\D/g, "").slice(-10);

/**
 * Counts one hit per rule and returns false when any rule is over its limit.
 * Fails open: if the DB is unreachable we prefer serving customers over blocking them.
 */
export async function withinLimits(rules: LimitRule[]): Promise<boolean> {
  const admin = createAdminClient();
  const results = await Promise.all(
    rules.map(async (r) => {
      const { data, error } = await admin.rpc("rate_limit_hit", {
        p_key: r.key,
        p_max: r.max,
        p_window_seconds: r.windowSeconds,
      });
      if (error) {
        console.error("[rate-limit]", error.message);
        return true;
      }
      return data !== false;
    })
  );
  return results.every(Boolean);
}

const HOUR = 3600;

/** Per-action limits for anonymous visitors (IP), per phone, and per business as a flood ceiling. */
export async function publicLimit(
  action: "slots" | "book" | "signup" | "class" | "order" | "chat",
  businessId: string,
  phone?: string
): Promise<boolean> {
  const ip = await clientIp();
  const rules: LimitRule[] = [];
  switch (action) {
    case "slots":
      rules.push({ key: `slots:ip:${ip}`, max: 120, windowSeconds: 600 });
      break;
    case "book":
      rules.push({ key: `book:ip:${ip}`, max: 10, windowSeconds: HOUR }, { key: `book:biz:${businessId}`, max: 60, windowSeconds: HOUR });
      if (phone) rules.push({ key: `book:phone:${businessId}:${phoneKey(phone)}`, max: 6, windowSeconds: 24 * HOUR });
      break;
    case "signup":
      rules.push({ key: `signup:ip:${ip}`, max: 5, windowSeconds: HOUR }, { key: `signup:biz:${businessId}`, max: 40, windowSeconds: HOUR });
      break;
    case "class":
      rules.push({ key: `class:ip:${ip}`, max: 20, windowSeconds: HOUR });
      break;
    case "order":
      rules.push({ key: `order:ip:${ip}`, max: 8, windowSeconds: HOUR }, { key: `order:biz:${businessId}`, max: 150, windowSeconds: HOUR });
      if (phone) rules.push({ key: `order:phone:${businessId}:${phoneKey(phone)}`, max: 5, windowSeconds: HOUR });
      break;
    case "chat":
      rules.push({ key: `chat:ip:${ip}`, max: 30, windowSeconds: 600 });
      break;
  }
  return withinLimits(rules);
}
