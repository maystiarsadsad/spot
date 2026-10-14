import type { Metadata } from "next";
import { LegalDocument } from "@/components/marketing/legal-document";
import { getMarketingCopy } from "@/lib/i18n/marketing";

const doc = getMarketingCopy().legal.dataProcessing;

export const metadata: Metadata = {
  title: doc.title,
  description: doc.intro,
};

export default function DataProcessingPage() {
  return <LegalDocument title={doc.title} intro={doc.intro} sections={doc.sections} />;
}
