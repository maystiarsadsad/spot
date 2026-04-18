import { getActiveBusiness } from "@/lib/get-active-business";
import { redirect } from "next/navigation";
import { getContacts } from "@/lib/actions/contacts";
import { ContactsClient } from "@/components/contacts/contacts-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contactos | CRM",
};

export default async function ContactsPage() {
  const business = await getActiveBusiness();

  if (!business) {
    redirect("/d/getting-started");
  }

  const contacts = await getContacts(business.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contactos / CRM</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona los clientes y proveedores asociados a {business.name}.
        </p>
      </div>
      
      <ContactsClient 
        businessId={business.id}
        initialContacts={contacts || []}
      />
    </div>
  );
}
