import { getActiveBusiness } from "@/lib/get-active-business";
import { redirect } from "next/navigation";
import { getInventory, getInventoryMovements } from "@/lib/actions/inventory";
import { InventoryClient } from "@/components/inventory/inventory-client";

export default async function InventoryPage() {
  const business = await getActiveBusiness();

  if (!business) {
    redirect("/d/getting-started");
  }

  const items = await getInventory(business.id);
  const movements = await getInventoryMovements(business.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
        <p className="text-muted-foreground mt-1">
          Controla existencias, materias primas y movimientos de stock de {business.name}.
        </p>
      </div>
      
      <InventoryClient 
        businessId={business.id}
        initialItems={items || []}
        initialMovements={movements || []}
      />
    </div>
  );
}
