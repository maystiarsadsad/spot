import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getMarketingCopy } from "@/lib/i18n/marketing";

interface LegalSection {
  title: string;
  paragraphs?: string[];
  list?: string[];
}

interface LegalDocumentProps {
  title: string;
  intro: string;
  sections: LegalSection[];
}

/** Highlights pending fields such as [RAZÓN SOCIAL] so they're easy to spot before launch. */
function withPlaceholders(text: string) {
  return text.split(/(\[[^\]]+\])/g).map((part, i) =>
    /^\[[^\]]+\]$/.test(part) ? <mark key={i} className="mk-placeholder">{part}</mark> : part
  );
}

export function LegalDocument({ title, intro, sections }: LegalDocumentProps) {
  const t = getMarketingCopy();
  const hasPlaceholders = JSON.stringify(sections).includes("[");

  return (
    <article className="mk-container mk-legal">
      <Link href="/" className="mk-legal-back">
        <ArrowLeft size={16} /> {t.legal.backHome}
      </Link>
      <h1 className="mk-display mk-display-sm">{title}</h1>
      <p className="mk-legal-updated">{t.legal.updatedLabel}: {t.legal.updated}</p>
      {hasPlaceholders && <p className="mk-legal-note">{t.legal.placeholderNote}</p>}
      <p className="mk-legal-intro">{intro}</p>

      {sections.map((s) => (
        <section key={s.title}>
          <h2>{s.title}</h2>
          {s.paragraphs?.map((p, i) => <p key={i}>{withPlaceholders(p)}</p>)}
          {s.list && (
            <ul>
              {s.list.map((li, i) => <li key={i}>{withPlaceholders(li)}</li>)}
            </ul>
          )}
        </section>
      ))}
    </article>
  );
}
