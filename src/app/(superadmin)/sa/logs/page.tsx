import { createClient } from "@/lib/supabase/server";
import { 
  History, 
  Search, 
  Filter, 
  ShieldCheck, 
  Building2, 
  User, 
  Terminal,
  ArrowRight
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AuditLogsPage() {
  const supabase = await createClient();

  // Fetch audit logs
  const { data: logs, error } = await supabase
    .from("audit_log")
    .select(`
        *,
        profiles:user_id (display_name, email),
        businesses:business_id (name)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  const getActionBadge = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('delete') || act.includes('remove')) return <Badge variant="destructive" className="capitalize">{action}</Badge>;
    if (act.includes('create') || act.includes('insert')) return <Badge variant="default" className="bg-blue-500 capitalize">{action}</Badge>;
    if (act.includes('update')) return <Badge variant="default" className="bg-orange-500 capitalize">{action}</Badge>;
    return <Badge variant="secondary" className="capitalize">{action}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="size-8 text-orange-600" />
            Registro de Auditoría
          </h1>
          <p className="text-muted-foreground">Historial detallado de todas las acciones administrativas en la plataforma.</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-xl sticky top-20 z-10 backdrop-blur-md border">
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Filtrar por acción, usuario o entidad..." className="pl-9 bg-background focus-visible:ring-orange-500" />
        </div>
        <Button variant="outline" size="sm" className="hidden sm:flex">
             <Filter className="mr-2 h-4 w-4" />
             Filtros Avanzados
        </Button>
      </div>

      <Card className="border-orange-100 dark:border-orange-950/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Fecha y Hora</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>Negocio</TableHead>
                <TableHead className="text-right">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-muted-foreground italic">
                    No hay registros de auditoría disponibles en este momento.
                  </TableCell>
                </TableRow>
              ) : (
                logs?.map((log) => (
                  <TableRow key={log.id} className="text-sm">
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                        {new Date(log.created_at || '').toLocaleString('es-CO', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="size-3 text-muted-foreground" />
                        <span className="font-medium">{(log.profiles as any)?.display_name || 'Sistema'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                       {getActionBadge(log.action)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Terminal className="size-3 text-muted-foreground" />
                        <span className="capitalize">{log.entity_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.businesses ? (
                        <div className="flex items-center gap-2 bg-orange-50/50 dark:bg-orange-950/20 px-2 py-0.5 rounded text-orange-600 dark:text-orange-400 font-medium">
                          <Building2 className="size-3" />
                          {(log.businesses as any)?.name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">Global</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-orange-100 hover:text-orange-600 transition-all">
                          <ArrowRight className="size-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <p className="text-center text-xs text-muted-foreground py-4 italic border-t border-dashed">
         Mostrando los últimos 50 registros de auditoría. Para reportes históricos, contacte a infraestructura.
      </p>
    </div>
  );
}
