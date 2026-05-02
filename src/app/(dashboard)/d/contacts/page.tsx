import { getActiveBusiness } from "@/lib/get-active-business";
import { redirect } from "next/navigation";
import { getContacts } from "@/lib/actions/contacts";
import { ContactsClient } from "@/components/contacts/contacts-client";
import { Metadata } from "next";
import { Contact } from "lucide-react";

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
    <div className="space-y-6">
      <div className="dash-header">
        <h1 className="flex items-center gap-3">
          <div className="section-header-icon">
            <Contact className="h-5 w-5" />
          </div>
          Contactos / CRM
        </h1>
        <p>
          Gestiona los clientes y proveedores asociados a {business.name}.
        </p>
      </div>
      
      <ContactsClient 
        businessId={business.id}
        currency={business.currency || "COP"}
        initialContacts={contacts || []}
      />
    </div>
  );
}
