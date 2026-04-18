import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function NoBusinessSelected() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-6">
            <Building2 className="h-8 w-8 text-orange-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">Sin negocio seleccionado</h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            Selecciona un negocio desde el menú del sidebar para ver sus datos y gestionar sus módulos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
