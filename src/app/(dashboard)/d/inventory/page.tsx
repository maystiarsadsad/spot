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
    <InventoryClient
      businessId={business.id}
      initialItems={(items || []) as any}
      initialMovements={(movements || []) as any}
    />
  );
}
