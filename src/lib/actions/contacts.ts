"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireBusinessAccess } from "@/lib/auth-guard";

export async function getContacts(businessId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching contacts:", error);
    return null;
  }

  return data;
}

function sanitizeContactData(data: any) {
  const cleaned = { ...data };
  // Convert empty strings to null for fields that are nullable in PG
  const nullableFields = [
    "phone", "email", "address", "document_type", "document_number",
    "date_of_birth", "notes",
  ];
  for (const field of nullableFields) {
    if (cleaned[field] === "" || cleaned[field] === undefined) {
      cleaned[field] = null;
    }
  }
  return cleaned;
}

export async function createContact(contactData: any) {
  const auth = await requireBusinessAccess(contactData?.business_id);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase
    .from("contacts")
    .insert([sanitizeContactData(contactData)])
    .select()
    .single();

  if (error) {
    console.error("Error creating contact:", error);
    return { success: false, error: "No se pudo crear el contacto" };
  }

  revalidatePath("/d/contacts");
  return { success: true, data };
}

/** Business that owns a contact, read through RLS (null if not visible). */
async function contactBusinessId(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("contacts").select("business_id").eq("id", id).maybeSingle();
  return data?.business_id ?? "";
}

export async function updateContact(id: string, contactData: any) {
  const businessId = await contactBusinessId(id);
  const auth = await requireBusinessAccess(businessId);
  if ("error" in auth) return { success: false, error: auth.error };

  // Never let the client move a contact to another business or change its id.
  const { business_id: _b, id: _i, ...fields } = sanitizeContactData(contactData);
  void _b; void _i;

  const { data, error } = await auth.supabase
    .from("contacts")
    .update(fields)
    .eq("id", id)
    .eq("business_id", businessId)
    .select()
    .single();

  if (error) {
    console.error("Error updating contact:", error);
    return { success: false, error: "No se pudo actualizar el contacto" };
  }

  revalidatePath("/d/contacts");
  return { success: true, data };
}

export async function deleteContact(id: string) {
  const businessId = await contactBusinessId(id);
  const auth = await requireBusinessAccess(businessId);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .from("contacts")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("Error deleting contact:", error);
    return { success: false, error: "No se pudo eliminar el contacto" };
  }

  revalidatePath("/d/contacts");
  return { success: true };
}
