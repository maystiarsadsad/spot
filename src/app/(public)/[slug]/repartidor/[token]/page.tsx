import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CourierPanel, type CourierData } from "@/components/public/courier-panel";

interface PageProps {
  params: Promise<{ slug: string; token: string }>;
}

export const metadata: Metadata = {
  title: "Entrega",
  robots: { index: false, follow: false },
};

export default async function CourierPage({ params }: PageProps) {
  const { slug, token } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_courier_delivery", { p_token: token });
  const delivery = data as unknown as (CourierData & { business_slug: string }) | null;

  if (!delivery || delivery.business_slug !== slug) {
    notFound();
  }

  return <CourierPanel token={token} initial={delivery} />;
}
