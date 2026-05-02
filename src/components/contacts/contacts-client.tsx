"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { ContactsTable } from "./contacts-table";

interface ContactsClientProps {
  businessId: string;
  currency: string;
  initialContacts: any[];
}

export function ContactsClient({ businessId, currency, initialContacts }: ContactsClientProps) {
  return (
    <div className="animate-in fade-in-50 zoom-in-95 duration-300">
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
             <div className="flex bg-primary/10 p-2 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
             </div>
             <div>
                <CardTitle>Directorio de Clientes</CardTitle>
                <CardDescription>
                  Centraliza y administra toda tu base de clientes y proveedores.
                </CardDescription>
             </div>
          </div>
        </CardHeader>
        <CardContent>
          <ContactsTable businessId={businessId} currency={currency} contacts={initialContacts} />
        </CardContent>
      </Card>
    </div>
  );
}
