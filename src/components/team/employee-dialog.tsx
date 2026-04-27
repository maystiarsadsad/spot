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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createEmployee, updateEmployee } from "@/lib/actions/team";
import { ROLES_BY_TYPE, DEPARTMENTS_BY_TYPE, type BusinessType } from "@/lib/constants";

const employeeSchema = z.object({
  full_name: z.string().min(2, "El nombre completo es requerido"),
  position: z.string().min(2, "El cargo es requerido"),
  department: z.string().optional(),
  document_id: z.string().optional(),
  email: z.string().email("Email inválido").or(z.literal("")),
  phone: z.string().optional(),
  salary: z.coerce.number().min(0, "El salario no puede ser negativo"),
  salary_type: z.enum(["monthly", "hourly", "variable"]),
  status: z.enum(["active", "inactive", "on_leave"]),
  hire_date: z.string().optional(),
  emergency_contact: z.string().optional(),
  emergency_phone: z.string().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface EmployeeDialogProps {
  businessId: string;
  businessType: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeToEdit?: any;
}

export function EmployeeDialog({ businessId, businessType, open, onOpenChange, employeeToEdit }: EmployeeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!employeeToEdit;

  const roles = ROLES_BY_TYPE[(businessType as BusinessType)] || ROLES_BY_TYPE.custom;
  const departments = DEPARTMENTS_BY_TYPE[(businessType as BusinessType)] || DEPARTMENTS_BY_TYPE.custom;

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema) as any,
    defaultValues: {
      full_name: "",
      position: "",
      department: "",
      document_id: "",
      email: "",
      phone: "",
      salary: 0,
      salary_type: "monthly",
      status: "active",
      hire_date: new Date().toISOString().split('T')[0],
      emergency_contact: "",
      emergency_phone: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (isEditing && employeeToEdit) {
        form.reset({
          full_name: employeeToEdit.full_name,
          position: employeeToEdit.position,
          department: employeeToEdit.department || "",
          document_id: employeeToEdit.document_id || "",
          email: employeeToEdit.email || "",
          phone: employeeToEdit.phone || "",
          salary: employeeToEdit.salary || 0,
          salary_type: employeeToEdit.salary_type || "monthly",
          status: employeeToEdit.status || "active",
          hire_date: employeeToEdit.hire_date ? employeeToEdit.hire_date.split('T')[0] : "",
          emergency_contact: employeeToEdit.emergency_contact || "",
          emergency_phone: employeeToEdit.emergency_phone || "",
        });
      } else {
        form.reset();
      }
    }
  }, [open, isEditing, employeeToEdit, form]);

  const onSubmit = async (values: EmployeeFormValues) => {
    setIsLoading(true);

    try {
      if (isEditing) {
        const result = await updateEmployee(employeeToEdit.id, values);
        if (result.success) {
          toast.success("Empleado actualizado exitosamente");
          onOpenChange(false);
        } else {
          toast.error(result.error || "Error al actualizar");
        }
      } else {
        const result = await createEmployee({
          business_id: businessId,
          ...values
        });
        if (result.success) {
          toast.success("Empleado registrado exitosamente");
          onOpenChange(false);
          form.reset();
        } else {
          toast.error(result.error || "Error al registrar");
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
          <DialogTitle>{isEditing ? "Editar Empleado" : "Registrar Empleado"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Actualiza los datos de filiación y salariales del empleado." 
              : "Completa el formulario para añadir un nuevo integrante al equipo."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nombre Completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Juan Pérez" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="document_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Documento / DNI</FormLabel>
                    <FormControl>
                      <Input placeholder="Número de identificación" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un cargo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                        <SelectItem value="__other">Otro (personalizado)</SelectItem>
                      </SelectContent>
                    </Select>
                    {field.value === "__other" && (
                      <Input
                        className="mt-2"
                        placeholder="Escribe el cargo..."
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento / Área</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un área" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Sin asignar</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                        <SelectItem value="__other">Otro (personalizado)</SelectItem>
                      </SelectContent>
                    </Select>
                    {field.value === "__other" && (
                      <Input
                        className="mt-2"
                        placeholder="Escribe el departamento..."
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="inactive">Inactivo / Retirado</SelectItem>
                        <SelectItem value="on_leave">De Licencia</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="salary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salario Base ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="salary_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Salario</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione el modelo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Mensual (Sueldo Fijo)</SelectItem>
                        <SelectItem value="hourly">Por Honorarios / Horas</SelectItem>
                        <SelectItem value="variable">Variable / Comisiones</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono Celular</FormLabel>
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
                name="hire_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Contratación</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="bg-muted/50 p-4 rounded-md space-y-4">
              <h4 className="font-semibold text-sm">Contacto de Emergencia</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="emergency_contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Mamá (María)..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergency_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="+57 300..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="gap-2">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditing ? "Actualizar Empleado" : "Registrar Empleado"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
