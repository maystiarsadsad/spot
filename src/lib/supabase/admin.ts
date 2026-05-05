import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with the secret key (or legacy service_role key) for admin operations.
 * This bypasses RLS and should ONLY be used in server actions with proper auth checks.
 *
 * Supabase now uses opaque `sb_secret_...` keys instead of JWT-based SERVICE_ROLE_KEY.
 * We check for the new SUPABASE_SECRET_KEY first, then fall back to the legacy key.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // New format (sb_secret_...) takes priority over legacy JWT-based key
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !secretKey) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) or NEXT_PUBLIC_SUPABASE_URL environment variable. " +
      "Add SUPABASE_SECRET_KEY to your environment variables (Vercel / .env.local)."
    );
  }

  return createSupabaseClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
