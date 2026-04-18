import { 
  Settings, 
  ShieldCheck, 
  Globe, 
  Bell, 
  Database, 
  Lock, 
  Cloud,
  ChevronRight,
  ArrowRight,
  Monitor
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function PlatformSettingsPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="size-8 text-orange-600" />
          Configuración Global
        </h1>
        <p className="text-muted-foreground mt-1">Control maestro de la plataforma Spot y servicios core.</p>
      </div>

      <div className="grid gap-6">
        {/* System Status Section */}
        <Card className="border-orange-100 dark:border-orange-950/50 shadow-sm overflow-hidden backdrop-blur-sm bg-background/50">
          <CardHeader className="bg-orange-50/30 dark:bg-orange-950/20 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Monitor className="size-5 text-orange-600" />
              Estado del Sistema
            </CardTitle>
            <CardDescription>Parámetros fundamentales de operación en tiempo real.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              <div className="flex items-center justify-between p-6 hover:bg-muted/30 transition-colors group">
                 <div className="space-y-1">
                   <Label className="text-base font-semibold group-hover:text-orange-600 transition-colors cursor-pointer" htmlFor="maintenance-mode">Modo Mantenimiento</Label>
                   <p className="text-sm text-muted-foreground">Bloquea temporalmente el acceso a todos los usuarios excepto SuperAdmins.</p>
                 </div>
                 <Switch id="maintenance-mode" />
              </div>
              
              <div className="flex items-center justify-between p-6 hover:bg-muted/30 transition-colors group">
                 <div className="space-y-1">
                   <Label className="text-base font-semibold group-hover:text-orange-600 transition-colors cursor-pointer" htmlFor="registrations-enabled">Nuevos Registros</Label>
                   <p className="text-sm text-muted-foreground">Permitir que nuevos negocios se registren de forma autónoma.</p>
                 </div>
                 <Switch id="registrations-enabled" defaultChecked />
              </div>

              <div className="flex items-center justify-between p-6 hover:bg-muted/30 transition-colors group">
                 <div className="space-y-1">
                   <Label className="text-base font-semibold group-hover:text-orange-600 transition-colors cursor-pointer" htmlFor="trial-enabled">Prueba Gratuita Automática</Label>
                   <p className="text-sm text-muted-foreground">Activar trial de 14 días al crear un negocio nuevo.</p>
                 </div>
                 <Switch id="trial-enabled" defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card className="border-orange-100 dark:border-orange-950/50 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
             <CardTitle className="text-lg flex items-center gap-2">
               <ShieldCheck className="size-5 text-emerald-600" />
               Seguridad y Acceso
             </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                     <Lock className="size-5" />
                   </div>
                   <div>
                     <p className="font-semibold text-sm">Autenticación Multifactor (MFA)</p>
                     <p className="text-xs text-muted-foreground">Requerido para roles Administrativos.</p>
                   </div>
                </div>
                <Badge variant="outline" className="text-emerald-600 bg-emerald-50/50 capitalize">Activo</Badge>
             </div>
             
             <Separator />

             <div className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                     <Database className="size-5" />
                   </div>
                   <div>
                     <p className="font-semibold text-sm">Backup Diario Automatizado</p>
                     <p className="text-xs text-muted-foreground">Última captura: Hace 4 horas (Vía Supabase PITR).</p>
                   </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
             </div>
          </CardContent>
        </Card>

        {/* Infrastructure Section */}
        <Card className="border-orange-100 dark:border-orange-950/50 shadow-sm overflow-hidden bg-gradient-to-br from-background to-orange-50/20 dark:to-orange-950/10">
          <CardHeader className="border-b">
             <CardTitle className="text-lg flex items-center gap-2">
               <Cloud className="size-5 text-blue-500" />
               Infraestructura y API
             </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border bg-background/50 space-y-2">
                   <p className="text-xs font-bold text-muted-foreground uppercase">Stripe API Status</p>
                   <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <span className="text-sm font-semibold">Conectado (Live)</span>
                   </div>
                </div>
                <div className="p-4 rounded-xl border bg-background/50 space-y-2">
                   <p className="text-xs font-bold text-muted-foreground uppercase">Supabase Region</p>
                   <div className="flex items-center gap-2 text-sm font-semibold italic text-muted-foreground">
                      us-east-1 (N. Virginia)
                   </div>
                </div>
             </div>
             <Button variant="ghost" size="sm" className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50">
                Ver Métricas Avanzadas de Servidor
                <ChevronRight className="ml-1 size-4" />
             </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-dashed">
         <Button variant="outline">Restaurar Valores por Defecto</Button>
         <Button className="bg-orange-600 hover:bg-orange-700 px-8">Guardar Cambios Globales</Button>
      </div>
    </div>
  );
}
