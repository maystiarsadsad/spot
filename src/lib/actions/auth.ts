"use server";

import { createClient } from "@/lib/supabase/server";
import { requestOrigin } from "@/lib/site-url";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { LEGAL_DOCUMENTS, LEGAL_VERSION } from "@/lib/legal";

export async function login(formData: FormData) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { error: "No se pudo conectar con el servidor. Intenta de nuevo más tarde." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/d");
}

export async function register(formData: FormData) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { error: "No se pudo conectar con el servidor. Intenta de nuevo más tarde." };
  }

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const displayName = formData.get("display_name") as string;

  // The checkbox is also enforced here: an account can't exist without accepting
  if (formData.get("accept_terms") !== "on") {
    return { error: "Para crear la cuenta debes aceptar los términos, la política de privacidad y el acuerdo de tratamiento de datos." };
  }

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Proof of acceptance: who, which version, when and from where
  if (signUpData.user) {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
    const { error: legalError } = await createAdminClient()
      .from("legal_acceptances")
      .insert(
        LEGAL_DOCUMENTS.map((document) => ({
          user_id: signUpData.user!.id,
          document,
          version: LEGAL_VERSION,
          ip,
          user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
        }))
      );
    if (legalError) console.error("[register] legal acceptance not saved:", legalError.message);
  }

  redirect("/d");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPassword(formData: FormData) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { error: "No se pudo conectar con el servidor." };
  }

  const email = formData.get("email") as string;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await requestOrigin()}/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
