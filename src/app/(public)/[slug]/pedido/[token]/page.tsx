import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { DeliveryTracker, type TrackingData } from "@/components/public/delivery-tracker";

interface PageProps {
  params: Promise<{ slug: string; token: string }>;
}

export const metadata: Metadata = {
  title: "Sigue tu pedido",
  robots: { index: false, follow: false },
};

export default async function TrackOrderPage({ params }: PageProps) {
  const { slug, token } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_delivery_tracking", { p_token: token });
  const tracking = data as unknown as TrackingData | null;

  if (!tracking || tracking.business_slug !== slug) {
    notFound();
  }

  return <DeliveryTracker token={token} initial={tracking} />;
}
