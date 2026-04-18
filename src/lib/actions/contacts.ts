"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

export async function createContact(contactData: any) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contacts")
    .insert([contactData])
    .select()
    .single();

  if (error) {
    console.error("Error creating contact:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/d/contacts");
  return { success: true, data };
}

export async function updateContact(id: string, contactData: any) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contacts")
    .update(contactData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating contact:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/d/contacts");
  return { success: true, data };
}

export async function deleteContact(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting contact:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/d/contacts");
  return { success: true };
}
