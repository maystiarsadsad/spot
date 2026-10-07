import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicStorefront } from "@/components/public/storefront";
import { BookingFlow } from "@/components/public/booking-flow";
import { verticalOf, appointmentTerms } from "@/lib/verticals";
import { bookableDates } from "@/lib/booking/availability";
import { loadBookingBusiness, loadServices, loadStaff } from "@/lib/booking/data";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("name, description, tagline, logo_url")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (!business) {
    return { title: "No encontrado" };
  }

  return {
    title: business.name,
    description: business.tagline || business.description || `Visita ${business.name} en Spot`,
    openGraph: {
      title: business.name,
      description: business.tagline || business.description || "",
      ...(business.logo_url ? { images: [business.logo_url] } : {}),
    },
  };
}

export default async function PublicBusinessPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch business
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (!business) {
    notFound();
  }

  // Fetch categories
  const { data: categories } = await supabase
    .from("catalog_categories")
    .select("*")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  // Fetch catalog items
  const { data: items } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  // Appointment businesses (barbershop, tattoo, vet…) get the booking flow instead of a cart
  let booking: React.ReactNode = null;
  if (verticalOf(business.type) === "appointments") {
    const [bookingBusiness, services, staff] = await Promise.all([
      loadBookingBusiness(business.id),
      loadServices(business.id),
      loadStaff(business.id),
    ]);
    if (bookingBusiness && staff.length > 0) {
      booking = (
        <BookingFlow
          business={{
            id: business.id,
            name: business.name,
            slug: business.slug,
            currency: bookingBusiness.currency,
            whatsapp: bookingBusiness.whatsapp,
            address: [business.address, business.city].filter(Boolean).join(", ") || null,
          }}
          services={services}
          staff={staff}
          dates={bookableDates(staff.map((s) => s.schedule), bookingBusiness.timeZone, bookingBusiness.settings)}
          terms={appointmentTerms(business.type)}
        />
      );
    }
  }

  return (
    <PublicStorefront
      business={business}
      categories={categories || []}
      items={items || []}
      booking={booking}
    />
  );
}
