"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Edit, Trash2, MoreHorizontal, User, Phone, Mail, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { deleteContact } from "@/lib/actions/contacts";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContactDialog } from "./contact-dialog";

export function ContactsTable({ businessId, currency, contacts }: { businessId: string; currency: string; contacts: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);

  const filteredContacts = contacts.filter(
    (c) =>
      c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm) ||
      c.document_number?.includes(searchTerm)
  );

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este contacto? Se perderá su historial.")) return;
    setIsDeleting(id);
    const result = await deleteContact(id);
    if (result.success) {
      toast.success("Contacto eliminado");
    } else {
      toast.error(result.error || "Error al eliminar");
    }
    setIsDeleting(null);
  };

  const handleEdit = (contact: any) => {
    setSelectedContact(contact);
    setDialogOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedContact(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nombre, email, teléfono o documento..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={handleCreateNew} className="w-full sm:w-auto gap-2">
          <PlusCircle className="h-4 w-4" />
          Nuevo Contacto
        </Button>
      </div>

      <div className="rounded-md border bg-card/50 shadow-sm overflow-x-auto -webkit-overflow-scrolling-touch">
        <Table className="min-w-[580px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Cliente / Contacto</TableHead>
              <TableHead>Datos de Contacto</TableHead>
              <TableHead className="text-right">Total Gastado</TableHead>
              <TableHead className="text-center">Visitas</TableHead>
              <TableHead className="text-right">Última Visita</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No hay contactos o clientes registrados.
                </TableCell>
              </TableRow>
            ) : (
              filteredContacts.map((contact) => (
                <TableRow key={contact.id} className="group hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                       <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div>{contact.full_name}</div>
                        {(contact.document_type || contact.document_number) && (
                          <div className="text-xs text-muted-foreground">
                            {contact.document_type || "Doc"}: {contact.document_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                     <div className="flex flex-col gap-1 text-xs">
                      {contact.phone && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" /> {contact.phone}
                        </div>
                      )}
                      {contact.email && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" /> {contact.email}
                        </div>
                      )}
                      {!contact.phone && !contact.email && <span className="text-muted-foreground italic">Sin información</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(contact.total_spent || 0, currency)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{contact.total_visits || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm flex-col font-medium flex gap-1 justify-end items-end h-full mt-2">
                    {contact.last_visit_at ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(contact.last_visit_at), "dd MMM, yyyy", { locale: es })}
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                       <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
                        <span className="sr-only">Abrir menú</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEdit(contact)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar Cliente
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(contact.id)}
                          disabled={isDeleting === contact.id}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ContactDialog 
        businessId={businessId}
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        contactToEdit={selectedContact}
      />
    </div>
  );
}
