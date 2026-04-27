import { getActiveBusiness } from "@/lib/get-active-business";
import { redirect } from "next/navigation";
import { getInventory, getInventoryMovements } from "@/lib/actions/inventory";
import { InventoryClient } from "@/components/inventory/inventory-client";
import { Warehouse } from "lucide-react";

export default async function InventoryPage() {
  const business = await getActiveBusiness();

  if (!business) {
    redirect("/d/getting-started");
  }

  const items = await getInventory(business.id);
  const movements = await getInventoryMovements(business.id);

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <h1 className="flex items-center gap-3">
          <div className="section-header-icon">
            <Warehouse className="h-5 w-5" />
          </div>
          Inventario
        </h1>
        <p>
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
