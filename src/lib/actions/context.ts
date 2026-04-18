"use server";

import { cookies } from "next/headers";

export async function setActiveBusinessCookie(businessId: string) {
  const cookieStore = await cookies();
  cookieStore.set("spot-business-id", businessId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}
