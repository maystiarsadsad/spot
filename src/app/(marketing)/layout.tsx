import Link from "next/link";
import { MapPin, MessageCircle } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { getMarketingCopy } from "@/lib/i18n/marketing";
import { SALES_WHATSAPP, salesWhatsappUrl } from "@/lib/constants";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const t = getMarketingCopy();
  const demoUrl = salesWhatsappUrl(t.whatsapp.demoMessage);

  return (
    <div className="mk">
      <header className="mk-header">
        <div className="mk-container mk-header-inner">
          <Link href="/" className="mk-logo" aria-label="Spot, inicio">
            Sp<span className="mk-logo-pin"><MapPin size={22} strokeWidth={2.6} /></span>t
          </Link>
          <nav className="mk-nav" aria-label="Principal">
            <Link href="/#funciones">{t.nav.features}</Link>
            <Link href="/#como-funciona">{t.nav.howItWorks}</Link>
            <Link href="/#precios">{t.nav.pricing}</Link>
            <Link href="/#demos">{t.nav.demos}</Link>
            <Link href="/#preguntas">{t.nav.faq}</Link>
          </nav>
          <div className="mk-header-actions">
            <Link href="/login" className="mk-link-login">{t.nav.login}</Link>
            <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="mk-btn mk-btn-primary mk-btn-sm" aria-label={t.nav.cta}>
              <MessageCircle size={16} />
              <span>{t.nav.cta}</span>
            </a>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mk-footer">
        <div className="mk-container mk-footer-grid">
          <div>
            <Link href="/" className="mk-logo mk-logo-sm" aria-label="Spot, inicio">
              Sp<span className="mk-logo-pin"><MapPin size={18} strokeWidth={2.6} /></span>t
            </Link>
            <p className="mk-footer-tagline">{t.footer.tagline}</p>
          </div>
          <div>
            <h3>{t.footer.product}</h3>
            <Link href="/#funciones">{t.nav.features}</Link>
            <Link href="/#precios">{t.nav.pricing}</Link>
            <Link href="/#demos">{t.nav.demos}</Link>
            <Link href="/login">{t.nav.login}</Link>
          </div>
          <div>
            <h3>{t.footer.legal}</h3>
            <Link href="/privacidad">{t.footer.privacy}</Link>
            <Link href="/terminos">{t.footer.terms}</Link>
            <Link href="/cookies">{t.footer.cookies}</Link>
          </div>
          <div>
            <h3>{t.footer.contact}</h3>
            <a href={demoUrl} target="_blank" rel="noopener noreferrer">
              {t.footer.whatsapp}: +{SALES_WHATSAPP.slice(0, 2)} {SALES_WHATSAPP.slice(2, 5)} {SALES_WHATSAPP.slice(5, 8)} {SALES_WHATSAPP.slice(8)}
            </a>
            <div className="mk-footer-theme"><ThemeToggle /></div>
          </div>
        </div>
        <div className="mk-container mk-footer-bottom">
          © {new Date().getFullYear()} Spot. {t.footer.rights}
        </div>
      </footer>
    </div>
  );
}
