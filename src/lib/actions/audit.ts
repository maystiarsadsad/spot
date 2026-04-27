"use server";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

/**
 * Logs an action to the audit_log table.
 * This should be called from other server actions after mutations.
 */
export async function logAudit({
  action,
  entityType,
  entityId,
  businessId,
  changes,
}: {
  action: string;
  entityType: string;
  entityId?: string;
  businessId?: string;
  changes?: Record<string, Json | undefined>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase.from("audit_log").insert({
    user_id: user.id,
    business_id: businessId || null,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    changes: (changes || null) as Json | null,
  });

  if (error) {
    console.error("Failed to log audit:", error);
  }
}
