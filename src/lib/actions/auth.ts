"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

  const { error } = await supabase.auth.signUp({
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
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
