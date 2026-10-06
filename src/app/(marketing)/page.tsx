import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bike,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  Contact,
  Globe,
  MessageCircle,
  ScanBarcode,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { createPublicClient } from "@/lib/supabase/public";
import { getMarketingCopy, fill } from "@/lib/i18n/marketing";
import { BUSINESS_TYPES, salesWhatsappUrl, type BusinessType } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

// Demos change only when scripts/seed-demos.mjs runs — refresh hourly.
export const revalidate = 3600;

const t = getMarketingCopy();

export const metadata: Metadata = {
  title: { absolute: t.meta.title },
  description: t.meta.description,
  openGraph: { title: t.meta.title, description: t.meta.description, images: ["/branding/spot-og.png"] },
};

const FEATURE_ICONS: Record<string, LucideIcon> = {
  Globe, Bike, ScanBarcode, Warehouse, CalendarDays, Contact, Wallet, BarChart3, Bot, Users,
};

const TYPE_ORDER = Object.keys(BUSINESS_TYPES) as BusinessType[];

async function getDemos() {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("businesses")
    .select("name, slug, type, tagline, cover_url")
    .like("slug", "demo-%")
    .eq("active", true);
  return (data ?? []).sort(
    (a, b) => TYPE_ORDER.indexOf(a.type as BusinessType) - TYPE_ORDER.indexOf(b.type as BusinessType)
  );
}

export default async function HomePage() {
  const demos = await getDemos();
  const demoUrl = salesWhatsappUrl(t.whatsapp.demoMessage);
  const m = t.hero.mock;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="mk-hero">
        <div className="mk-container mk-hero-grid">
          <div className="mk-hero-copy">
            <p className="mk-eyebrow">{t.hero.eyebrow}</p>
            <h1 className="mk-display">
              {t.hero.titleStart} <em>{t.hero.titleAccent}</em> {t.hero.titleEnd}
            </h1>
            <p className="mk-lead">{t.hero.subtitle}</p>
            <div className="mk-cta-row">
              <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="mk-btn mk-btn-primary">
                <MessageCircle size={18} /> {t.hero.primaryCta}
              </a>
              <a href="#demos" className="mk-btn mk-btn-ghost">
                {t.hero.secondaryCta} <ArrowRight size={16} />
              </a>
            </div>
            <ul className="mk-proof">
              {t.hero.proof.map((p) => (
                <li key={p}><Check size={15} /> {p}</li>
              ))}
            </ul>
          </div>

          {/* Product snapshot — plain markup, no screenshots to keep in sync */}
          <div className="mk-hero-visual" aria-hidden="true">
            <div className="mk-mock mk-mock-track">
              <div className="mk-mock-map">
                <span className="mk-mock-route" />
                <span className="mk-mock-pin mk-mock-pin-courier"><Bike size={16} /></span>
                <span className="mk-mock-pin mk-mock-pin-home" />
              </div>
              <div className="mk-mock-body">
                <p className="mk-mock-meta">{m.store} · {m.order}</p>
                <p className="mk-mock-title">{m.eta}</p>
                <p className="mk-mock-sub">{m.courier}</p>
                <ol className="mk-mock-steps">
                  {m.steps.map((s, i) => (
                    <li key={s} className={i < 2 ? "done" : i === 2 ? "current" : ""}>{s}</li>
                  ))}
                </ol>
              </div>
            </div>
            <div className="mk-mock mk-mock-stat mk-mock-stat-a">
              <span>{m.salesLabel}</span>
              <strong>{m.salesValue}</strong>
            </div>
            <div className="mk-mock mk-mock-stat mk-mock-stat-b">
              <span>{m.stockLabel}</span>
              <strong>{m.stockValue}</strong>
            </div>
          </div>
        </div>

        <div className="mk-container">
          <p className="mk-segments-title">{t.segments.title}</p>
          <ul className="mk-segments">
            {TYPE_ORDER.filter((k) => k !== "custom").map((k) => (
              <li key={k}><span aria-hidden="true">{BUSINESS_TYPES[k].icon}</span> {BUSINESS_TYPES[k].label}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────── */}
      <section id="funciones" className="mk-section">
        <div className="mk-container">
          <header className="mk-section-head">
            <p className="mk-eyebrow">{t.features.eyebrow}</p>
            <h2 className="mk-h2">{t.features.title}</h2>
            <p className="mk-lead">{t.features.subtitle}</p>
          </header>
          <div className="mk-features">
            {t.features.items.map((f) => {
              const Icon = FEATURE_ICONS[f.icon] ?? Globe;
              return (
                <article key={f.title} className="mk-feature">
                  <span className="mk-feature-icon"><Icon size={20} /></span>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Process ──────────────────────────────────── */}
      <section id="como-funciona" className="mk-section mk-section-ink">
        <div className="mk-container">
          <header className="mk-section-head">
            <p className="mk-eyebrow">{t.process.eyebrow}</p>
            <h2 className="mk-h2">{t.process.title}</h2>
            <p className="mk-lead">{t.process.subtitle}</p>
          </header>
          <ol className="mk-steps">
            {t.process.steps.map((s, i) => (
              <li key={s.week} className="mk-step">
                <span className="mk-step-num">{String(i + 1).padStart(2, "0")}</span>
                <p className="mk-step-week">{s.week}</p>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
          <div className="mk-after">
            <h3>{t.process.after.title}</h3>
            <p>{t.process.after.body}</p>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────── */}
      <section id="precios" className="mk-section">
        <div className="mk-container">
          <header className="mk-section-head">
            <p className="mk-eyebrow">{t.pricing.eyebrow}</p>
            <h2 className="mk-h2">{t.pricing.title}</h2>
            <p className="mk-lead">{t.pricing.subtitle}</p>
          </header>
          <div className="mk-plans">
            {t.pricing.plans.map((p) => {
              const popular = "popular" in p && p.popular;
              const from = "fromPrice" in p && p.fromPrice;
              return (
                <article key={p.key} className={`mk-plan ${popular ? "is-popular" : ""}`}>
                  {popular && <span className="mk-plan-badge">{t.pricing.popular}</span>}
                  <h3>{p.name}</h3>
                  <p className="mk-plan-tagline">{p.tagline}</p>
                  <p className="mk-plan-price">
                    {from && <span className="mk-plan-from">{t.pricing.from}</span>}
                    <strong>{formatCurrency(p.monthly)}</strong>
                    <span>{t.pricing.monthlyLabel}</span>
                  </p>
                  <p className="mk-plan-annual">{fill(t.pricing.annualNote, { price: formatCurrency(p.monthly * 10) })}</p>
                  <div className="mk-plan-setup">
                    <span>{t.pricing.setupLabel}</span>
                    <strong>{from ? `${t.pricing.from} ` : ""}{formatCurrency(p.setup)}</strong>
                  </div>
                  <ul className="mk-plan-features">
                    {p.features.map((f) => (
                      <li key={f}><Check size={16} /> {f}</li>
                    ))}
                  </ul>
                  <a
                    href={salesWhatsappUrl(fill(t.whatsapp.planMessage, { plan: p.name }))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mk-btn ${popular ? "mk-btn-primary" : "mk-btn-ghost"} mk-btn-block`}
                  >
                    <MessageCircle size={16} /> {t.pricing.cta}
                  </a>
                </article>
              );
            })}
          </div>
          <aside className="mk-compare">
            <h3>{t.pricing.compare.title}</h3>
            <p>{t.pricing.compare.body}</p>
          </aside>
        </div>
      </section>

      {/* ── Demos ────────────────────────────────────── */}
      <section id="demos" className="mk-section mk-section-alt">
        <div className="mk-container">
          <header className="mk-section-head">
            <p className="mk-eyebrow">{t.demos.eyebrow}</p>
            <h2 className="mk-h2">{t.demos.title}</h2>
            <p className="mk-lead">{t.demos.subtitle}</p>
          </header>
          {demos.length === 0 ? (
            <p className="mk-empty">{t.demos.empty}</p>
          ) : (
            <div className="mk-demos">
              {demos.map((d) => {
                const type = BUSINESS_TYPES[d.type as BusinessType];
                return (
                  <Link key={d.slug} href={`/${d.slug}`} target="_blank" rel="noopener noreferrer" className="mk-demo">
                    <div className="mk-demo-media">
                      {d.cover_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.cover_url.replace("w=1600", "w=640").replace("h=700", "h=360")} alt="" loading="lazy" />
                      )}
                      <span className="mk-demo-type">{type?.icon} {type?.label ?? d.type}</span>
                    </div>
                    <div className="mk-demo-body">
                      <h3>{d.name}</h3>
                      <p>{d.tagline}</p>
                      <span className="mk-demo-open">{t.demos.open} <ArrowUpRight size={15} /></span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────── */}
      <section id="preguntas" className="mk-section">
        <div className="mk-container mk-faq-wrap">
          <header className="mk-section-head">
            <p className="mk-eyebrow">{t.faq.eyebrow}</p>
            <h2 className="mk-h2">{t.faq.title}</h2>
          </header>
          <div className="mk-faq">
            {t.faq.items.map((f) => (
              <details key={f.q}>
                <summary>{f.q} <ChevronDown size={18} /></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────── */}
      <section className="mk-final">
        <div className="mk-container mk-final-inner">
          <h2 className="mk-display mk-display-sm">{t.finalCta.title}</h2>
          <p className="mk-lead">{t.finalCta.subtitle}</p>
          <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="mk-btn mk-btn-primary mk-btn-lg">
            <MessageCircle size={20} /> {t.finalCta.cta}
          </a>
        </div>
      </section>
    </>
  );
}
