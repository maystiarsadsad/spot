"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicLimit, TOO_MANY } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/memberships/data";
import { createServiceOrder, loadServiceBusiness, type ServiceRequestInput } from "@/lib/service-orders/data";

/** Web request: a pickup/laundry order or a shipment. Prices are computed on the server. Public. */
export async function requestService(businessId: string, input: ServiceRequestInput) {
  const phone = normalizePhone(input?.phone ?? "");
  if (phone.replace(/\D/g, "").length < 7) return { error: "Escribe un celular válido" };
  if (!(await publicLimit("order", businessId, phone))) return { error: TOO_MANY };

  const admin = createAdminClient();
  const business = await loadServiceBusiness(businessId, admin);
  if (!business) return { error: "Esta página se actualizó. Recárgala e intenta de nuevo." };

  const res = await createServiceOrder(admin, business, input, { source: "web" });
  if ("error" in res) return { error: res.error };
  revalidatePath("/d/servicios");
  return { success: true, token: res.token, code: res.code, total: res.total, whatsapp: business.whatsapp };
}
