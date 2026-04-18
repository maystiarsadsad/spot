"use client";

import { useState } from "react";
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
import { createPayrollRecord } from "@/lib/actions/team";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";

const payrollSchema = z.object({
  employee_id: z.string().min(1, "Debe seleccionar un empleado"),
  period_start: z.string().min(1, "Requerido"),
  period_end: z.string().min(1, "Requerido"),
  base_salary: z.coerce.number().min(0, "Monto inválido"),
  bonuses: z.coerce.number().min(0).optional(),
  overtime_hours: z.coerce.number().min(0).optional(),
  overtime_pay: z.coerce.number().min(0).optional(),
  deductions: z.coerce.number().min(0).optional(),
  tax: z.coerce.number().min(0).optional(),
  notes: z.string().optional()
});

type PayrollFormValues = z.infer<typeof payrollSchema>;

interface PayrollDialogProps {
  businessId: string;
  employees: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayrollDialog({ businessId, employees, open, onOpenChange }: PayrollDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Set default dates to current month approx
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const form = useForm<PayrollFormValues>({
    resolver: zodResolver(payrollSchema) as any,
    defaultValues: {
      employee_id: "",
      period_start: firstDay,
      period_end: lastDay,
      base_salary: 0,
      bonuses: 0,
      overtime_hours: 0,
      overtime_pay: 0,
      deductions: 0,
      tax: 0,
      notes: ""
    },
  });

  const onSubmit = async (values: PayrollFormValues) => {
    setIsLoading(true);

    try {
      const result = await createPayrollRecord({
        business_id: businessId,
        ...values
      });

      if (result.success) {
        toast.success("Pago liquidado exitosamente");
        onOpenChange(false);
        form.reset();
      } else {
        toast.error(result.error || "Error al liquidar");
      }
    } catch (error) {
       toast.error("Ocurrió un error inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedEmployeeId = form.watch("employee_id");
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  // Auto-fill salary when employee is selected
  const handleEmployeeChange = (val: string) => {
    form.setValue("employee_id", val);
    const emp = employees.find(e => e.id === val);
    if (emp) {
      form.setValue("base_salary", emp.salary || 0);
    }
  };

  // Safe live calculations
  const watchValues = form.watch();
  const base = Number(watchValues.base_salary) || 0;
  const bon = Number(watchValues.bonuses) || 0;
  const over = Number(watchValues.overtime_pay) || 0;
  const ded = Number(watchValues.deductions) || 0;
  const tax = Number(watchValues.tax) || 0;
  const liveNetPay = base + bon + over - ded - tax;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) form.reset();
    }}>
      <DialogContent className="sm:max-w-[600px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Liquidar Pago de Nómina</DialogTitle>
          <DialogDescription>
            Registra el pago de salario, sumando bonos y restando deducciones para generar el neto.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="employee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empleado a liquidar *</FormLabel>
                  <Select onValueChange={(val) => handleEmployeeChange(val || "")} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un empleado..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name} - {emp.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="period_start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inicio Período</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="period_end"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fin Período</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-muted/30 p-4 rounded-xl border border-border/50 space-y-4">
              <FormField
                control={form.control}
                name="base_salary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salario Base ($) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bonuses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-emerald-500">Bonos Extras (+)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="overtime_pay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-emerald-500">Pago Horas Extra (+)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="deductions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-destructive">Deducciones (-)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-destructive">Impuestos/Otros (-)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="mt-4 pt-4 border-t flex justify-between items-center bg-background/50 p-3 rounded-lg border">
                 <span className="font-semibold text-muted-foreground">Pago Neto (A transferir):</span>
                 <span className="text-xl font-bold text-primary">{formatCurrency(liveNetPay)}</span>
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concepto / Notas del pago</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Pago de quincena, observaciones..." {...field} />
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
                Registrar Pago
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
