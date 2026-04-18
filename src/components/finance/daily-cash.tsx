"use client";

import { useState } from "react";
import { Database } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { openDailyCash, closeDailyCash } from "@/lib/actions/finance";
import { toast } from "sonner";
import { Coins, AlertCircle, CheckCircle2 } from "lucide-react";

type DailyCashRow = Database["public"]["Tables"]["daily_cash"]["Row"];

interface DailyCashProps {
  businessId: string;
  initialData: DailyCashRow | null;
  todayDate: string;
}

export function DailyCash({ businessId, initialData, todayDate }: DailyCashProps) {
  const [openingBalance, setOpeningBalance] = useState<string>("");
  const [closingBalance, setClosingBalance] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenCash = async () => {
    if (!openingBalance || isNaN(Number(openingBalance))) {
      toast.error("Por favor ingresa un balance de apertura válido");
      return;
    }

    setIsLoading(true);
    const result = await openDailyCash({
      business_id: businessId,
      date: todayDate,
      opening_balance: Number(openingBalance),
    });

    setIsLoading(false);
    if (result.success) {
      toast.success("Caja abierta exitosamente");
    } else {
      toast.error("Error al abrir caja: " + result.error);
    }
  };

  const handleCloseCash = async () => {
    if (!initialData) return;
    
    if (!closingBalance || isNaN(Number(closingBalance))) {
      toast.error("Por favor ingresa un balance de cierre válido");
      return;
    }

    setIsLoading(true);
    const result = await closeDailyCash(
      initialData.id,
      Number(closingBalance),
      notes
    );

    setIsLoading(false);
    if (result.success) {
      toast.success("Caja cerrada exitosamente");
    } else {
      toast.error("Error al cerrar caja: " + result.error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);
  };

  if (!initialData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Caja Cerrada
          </CardTitle>
          <CardDescription>
            Aún no has abierto caja para el día de hoy ({todayDate}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Balance Inicial de Apertura</label>
            <div className="flex gap-4 items-center">
              <span className="text-muted-foreground">$</span>
              <Input 
                type="number"
                placeholder="Ej. 150000"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="max-w-[200px]"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleOpenCash} disabled={isLoading}>
            <Coins className="mr-2 h-4 w-4" />
            Abrir Caja del Día
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const isClosed = initialData.status === "closed";
  const currentTotal = 
    (initialData.opening_balance || 0) + 
    (initialData.total_cash_in || 0) - 
    (initialData.total_expenses || 0);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isClosed ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Coins className="h-5 w-5 text-emerald-500" />
            )}
            Resumen de Caja - {todayDate}
          </CardTitle>
          <CardDescription>
            {isClosed ? "La caja ya fue cerrada por hoy." : "Resumen de movimientos registrados en el día."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Base Inicial</p>
              <p className="text-2xl font-bold">{formatCurrency(initialData.opening_balance || 0)}</p>
            </div>
            {isClosed && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Balance Final Real</p>
                <p className="text-2xl font-bold">{formatCurrency(initialData.closing_balance || 0)}</p>
              </div>
            )}
          </div>
          
          <div className="space-y-3 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Entradas (Efectivo)</span>
              <span className="font-medium text-green-600">{formatCurrency(initialData.total_cash_in || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Entradas (Digital/Tarjetas)</span>
              <span className="font-medium text-green-600">{formatCurrency(initialData.total_digital_in || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Salidas (Gastos hoy)</span>
              <span className="font-medium text-red-600">{formatCurrency(initialData.total_expenses || 0)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t font-semibold">
              <span>Efectivo Esperado en Caja</span>
              <span>{formatCurrency(currentTotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Ventas Totales</span>
              <span>{formatCurrency(initialData.total_sales || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {!isClosed && (
        <Card>
          <CardHeader>
            <CardTitle>Cerrar Caja</CardTitle>
            <CardDescription>
              Realiza el arqueo contando el efectivo real en caja.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Efectivo Real (Arqueo)</label>
              <div className="flex gap-4 items-center">
                <span className="text-muted-foreground">$</span>
                <Input 
                  type="number"
                  placeholder="Ej. 250000"
                  value={closingBalance}
                  onChange={(e) => setClosingBalance(e.target.value)}
                  className="max-w-[200px]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notas o Diferencias</label>
              <Input 
                placeholder="Razón si hay descuadres..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="secondary" onClick={handleCloseCash} disabled={isLoading}>
              Registrar Cierre
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
