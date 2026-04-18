"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PackageSearch, ArrowLeftRight, Settings2 } from "lucide-react";
import { InventoryTable } from "./inventory-table";
import { MovementsTable } from "./movements-table";

interface InventoryClientProps {
  businessId: string;
  initialItems: any[];
  initialMovements: any[];
}

export function InventoryClient({ businessId, initialItems, initialMovements }: InventoryClientProps) {
  return (
    <Tabs defaultValue="stock" className="space-y-6">
      <TabsList className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-1 border">
        <TabsTrigger value="stock" className="flex items-center gap-2">
          <PackageSearch className="h-4 w-4" />
          Stock Actual
        </TabsTrigger>
        <TabsTrigger value="movements" className="flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4" />
          Movimientos
        </TabsTrigger>
        <TabsTrigger value="settings" className="flex items-center gap-2" disabled>
          <Settings2 className="h-4 w-4" />
          Configuración
        </TabsTrigger>
      </TabsList>

      <TabsContent value="stock" className="animate-in fade-in-50 zoom-in-95 duration-300">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Inventario de Productos</CardTitle>
            <CardDescription>
              Gestiona tu materia prima, stock disponible y costos unitarios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InventoryTable businessId={businessId} items={initialItems} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="movements" className="animate-in fade-in-50 zoom-in-95 duration-300">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Historial de Movimientos</CardTitle>
            <CardDescription>
              Entradas, salidas y ajustes de inventario.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MovementsTable businessId={businessId} movements={initialMovements} inventoryItems={initialItems} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
