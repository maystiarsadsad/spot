"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createContact, updateContact } from "@/lib/actions/contacts";

const contactSchema = z.object({
  full_name: z.string().min(2, "El nombre completo es requerido"),
  email: z.string().email("Email inválido").or(z.literal("")),
  phone: z.string().optional(),
  document_type: z.string().optional(),
  document_number: z.string().optional(),
  date_of_birth: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface ContactDialogProps {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactToEdit?: any;
}

export function ContactDialog({ businessId, open, onOpenChange, contactToEdit }: ContactDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!contactToEdit;

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema) as any,
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      document_type: "CC",
      document_number: "",
      date_of_birth: "",
      address: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (isEditing && contactToEdit) {
        form.reset({
          full_name: contactToEdit.full_name,
          email: contactToEdit.email || "",
          phone: contactToEdit.phone || "",
          document_type: contactToEdit.document_type || "CC",
          document_number: contactToEdit.document_number || "",
          date_of_birth: contactToEdit.date_of_birth ? contactToEdit.date_of_birth.split('T')[0] : "",
          address: contactToEdit.address || "",
          notes: contactToEdit.notes || "",
        });
      } else {
        form.reset();
      }
    }
  }, [open, isEditing, contactToEdit, form]);

  const onSubmit = async (values: ContactFormValues) => {
    setIsLoading(true);

    try {
      if (isEditing) {
        const result = await updateContact(contactToEdit.id, values);
        if (result.success) {
          toast.success("Contacto actualizado exitosamente");
          onOpenChange(false);
        } else {
          toast.error(result.error || "Error al actualizar");
        }
      } else {
        const result = await createContact({
          business_id: businessId,
          ...values
        });
        if (result.success) {
          toast.success("Contacto creado exitosamente");
          onOpenChange(false);
          form.reset();
        } else {
          toast.error(result.error || "Error al crear");
        }
      }
    } catch (error) {
       toast.error("Ocurrió un error inesperado al procesar la solicitud");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Contacto / Cliente" : "Nuevo Contacto / Cliente"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Actualiza la información personal y de contacto del cliente." 
              : "Añade un nuevo cliente a tu base de datos para seguimiento y facturación."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo / Razón Social *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Ana Gómez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="document_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Documento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CC">Cédula de Ciudadanía (CC)</SelectItem>
                        <SelectItem value="CE">Cédula de Extranjería (CE)</SelectItem>
                        <SelectItem value="NIT">NIT (Empresa)</SelectItem>
                        <SelectItem value="PASS">Pasaporte</SelectItem>
                        <SelectItem value="OTHER">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="document_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Documento / NIT</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. 1020304050" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono Celular / Fijo</FormLabel>
                    <FormControl>
                      <Input placeholder="+57 300..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="correo@ejemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Nacimiento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="address"
               render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección Física</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Calle 123 #45-67, Ciudad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
               render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas y Observaciones</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Preferencias del cliente, datos adicionales de contacto, etc." className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="gap-2">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditing ? "Guardar Cambios" : "Crear Contacto"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
