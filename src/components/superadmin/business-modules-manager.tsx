"use client";

import { useTransition } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MODULES } from "@/lib/constants";
import { toggleBusinessModule } from "@/lib/actions/businesses";
import { toast } from "sonner";
import { Loader2, Package, ShoppingCart, Warehouse, DollarSign, Users, Contact, BarChart3, Settings } from "lucide-react";

const ICON_MAP: Record<string, any> = {
  catalog: Package,
  transactions: ShoppingCart,
  inventory: Warehouse,
  finance: DollarSign,
  team: Users,
  contacts: Contact,
  reports: BarChart3,
};

interface Props {
  businessId: string;
  activeModules: any[];
}

export function BusinessModulesManager({ businessId, activeModules }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (moduleKey: string, currentEnabled: boolean) => {
    startTransition(async () => {
      try {
        await toggleBusinessModule(businessId, moduleKey, !currentEnabled);
        toast.success(`Módulo ${moduleKey} ${!currentEnabled ? 'activado' : 'desactivado'}`);
      } catch (error: any) {
        toast.error(`Error: ${error.message}`);
      }
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Object.entries(MODULES).map(([key, config]) => {
        const isActive = activeModules.find((m) => m.module_key === key)?.enabled ?? false;
        const Icon = ICON_MAP[key] || Settings;

        return (
          <Card key={key} className={`border-orange-100 dark:border-orange-950 transition-all ${isActive ? 'bg-orange-50/10 dark:bg-orange-950/20 ring-1 ring-orange-500/20' : 'bg-card/50'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isActive ? 'bg-orange-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold tracking-tight">{(config as any).defaultLabel}</CardTitle>
                </div>
              </div>
              <Switch 
                checked={isActive} 
                disabled={isPending}
                onCheckedChange={() => handleToggle(key, isActive)}
                className="data-[state=checked]:bg-orange-600"
              />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-orange-100 text-orange-700 hover:bg-orange-100" : "bg-muted text-muted-foreground"}>
                  {isActive ? 'Activo' : 'Desactivado'}
                </Badge>
                {isPending && (
                   <Loader2 className="h-3 w-3 animate-spin text-orange-500" />
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
