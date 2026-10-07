/**
 * Server-side loading of everything the store assistant needs for one business:
 * settings + training, catalog with option groups, and spending so far.
 * Uses the service role (the storefront visitor is anonymous and
 * business_ai_settings is members-only), always filtered by business_id.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { parseOptionGroups } from "@/lib/item-options";
import { DEFAULT_CLAUDE_MODEL, DEFAULT_DAILY_CAP_USD } from "./models";
import type { KbContext, KbFaq, KbItem } from "./keyword-engine";

export interface AssistantSettings {
  claudeEnabled: boolean;
  model: string;
  dailyCapUsd: number;
  monthlyCapUsd: number | null;
  hasKey: boolean;
  keyLast4: string | null;
  keyVerifiedAt: string | null;
  greeting: string | null;
  instructions: string | null;
  extraInfo: string | null;
  faqs: KbFaq[];
}

export interface BusinessInfo {
  id: string;
  name: string;
  type: string;
  plan: string | null;
  description: string | null;
  tagline: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  whatsapp: string | null;
  currency: string;
  timezone: string;
  hours: unknown;
  legacyGreeting: string | null;
}

export function parseFaqs(raw: unknown): KbFaq[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => ({ q: String(f?.q ?? "").trim().slice(0, 300), a: String(f?.a ?? "").trim().slice(0, 1000) }))
    .filter((f) => f.q && f.a)
    .slice(0, 50);
}

export function toSettings(row: Record<string, unknown> | null): AssistantSettings {
  return {
    claudeEnabled: row?.claude_enabled === true,
    model: (row?.model as string) || DEFAULT_CLAUDE_MODEL,
    dailyCapUsd: row?.daily_cap_usd != null ? Number(row.daily_cap_usd) : DEFAULT_DAILY_CAP_USD,
    monthlyCapUsd: row?.monthly_cap_usd != null ? Number(row.monthly_cap_usd) : null,
    hasKey: !!row?.key_secret_id,
    keyLast4: (row?.key_last4 as string) ?? null,
    keyVerifiedAt: (row?.key_verified_at as string) ?? null,
    greeting: (row?.greeting as string) ?? null,
    instructions: (row?.instructions as string) ?? null,
    extraInfo: (row?.extra_info as string) ?? null,
    faqs: parseFaqs(row?.faqs),
  };
}

export async function loadAssistantContext(businessId: string) {
  const admin = createAdminClient();
  const [{ data: business }, { data: settingsRow }, { data: items }, { data: categories }] = await Promise.all([
    admin
      .from("businesses")
      .select("id, name, type, subscription_plan, description, tagline, address, city, phone, whatsapp, currency, timezone, business_hours, ai_agent_greeting, active")
      .eq("id", businessId)
      .single(),
    admin.from("business_ai_settings").select("*").eq("business_id", businessId).maybeSingle(),
    admin
      .from("catalog_items")
      .select("id, name, description, price, featured, options, category_id, active")
      .eq("business_id", businessId)
      .eq("active", true)
      .order("sort_order")
      .limit(200),
    admin.from("catalog_categories").select("id, name").eq("business_id", businessId).eq("active", true).order("sort_order"),
  ]);

  if (!business || business.active === false) return null;

  const info: BusinessInfo = {
    id: business.id,
    name: business.name,
    type: business.type,
    plan: business.subscription_plan,
    description: business.description,
    tagline: business.tagline,
    address: business.address,
    city: business.city,
    phone: business.phone,
    whatsapp: business.whatsapp,
    currency: business.currency || "COP",
    timezone: business.timezone || "America/Bogota",
    hours: business.business_hours,
    legacyGreeting: business.ai_agent_greeting,
  };
  const settings = toSettings(settingsRow);
  const catName = new Map<string, string>((categories ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));

  const kbItems: KbItem[] = (items ?? []).map((it: Record<string, unknown>) => ({
    id: it.id as string,
    name: it.name as string,
    description: (it.description as string) ?? null,
    price: Number(it.price),
    category: it.category_id ? catName.get(it.category_id as string) ?? null : null,
    featured: it.featured === true,
    groups: parseOptionGroups(it.options),
  }));

  const kb: KbContext = {
    businessName: info.name,
    address: info.address,
    city: info.city,
    whatsapp: info.whatsapp || info.phone,
    hours: info.hours,
    greeting: settings.greeting || info.legacyGreeting,
    faqs: settings.faqs,
    extraInfo: settings.extraInfo,
    items: kbItems,
    categories: (categories ?? []).map((c: { name: string }) => c.name),
  };

  return { info, settings, kb };
}

/* ── spending ────────────────────────────────────────── */

/** UTC instant of local midnight (today or the 1st of the month) in a time zone. */
export function periodStartUtc(timeZone: string, period: "day" | "month", now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  const y = Number(parts.year);
  const m = Number(parts.month);
  const d = period === "day" ? Number(parts.day) : 1;
  // Offset of the zone at that local midnight, e.g. "GMT-05:00"
  const guess = new Date(Date.UTC(y, m - 1, d));
  const tzName = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(guess)
    .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const match = tzName.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  const offsetMin = match ? (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3] ?? 0)) : 0;
  return new Date(guess.getTime() - offsetMin * 60_000);
}

/** USD spent on Claude today and this month (business time zone). */
export async function getSpend(businessId: string, timeZone: string) {
  const admin = createAdminClient();
  const monthStart = periodStartUtc(timeZone, "month");
  const dayStart = periodStartUtc(timeZone, "day");
  const { data } = await admin
    .from("ai_usage")
    .select("cost_usd, created_at")
    .eq("business_id", businessId)
    .eq("engine", "claude")
    .gte("created_at", monthStart.toISOString())
    .limit(20000);
  let month = 0;
  let day = 0;
  for (const r of data ?? []) {
    const cost = Number(r.cost_usd);
    month += cost;
    if (new Date(r.created_at) >= dayStart) day += cost;
  }
  return { day, month };
}

/* ── prompt material ─────────────────────────────────── */

const money = (currency: string) => (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency, minimumFractionDigits: 0 }).format(n);

/** Catalog as compact text for the model: categories, prices and every option with its price. */
export function catalogText(kb: KbContext, currency: string) {
  const fmt = money(currency);
  const byCat = new Map<string, KbItem[]>();
  for (const it of kb.items) {
    const key = it.category ?? "Otros";
    byCat.set(key, [...(byCat.get(key) ?? []), it]);
  }
  const out: string[] = [];
  for (const [cat, list] of byCat) {
    out.push(`## ${cat}`);
    for (const it of list) {
      out.push(`- ${it.name} — ${fmt(it.price)}${it.description ? `. ${it.description}` : ""}`);
      for (const g of it.groups) {
        const choices = g.choices
          .map((c) => `${c.name}${c.price > 0 ? ` (+${fmt(c.price)})` : ""}${c.available ? "" : " [agotado]"}`)
          .join(", ");
        const rule = g.min > 0 ? `obligatorio, elegir ${g.min === g.max ? g.min : `${g.min}-${g.max}`}` : `opcional, hasta ${g.max}`;
        out.push(`    · ${g.name} (${rule}): ${choices}`);
      }
    }
  }
  return out.join("\n");
}

export const moneyFormatter = money;
