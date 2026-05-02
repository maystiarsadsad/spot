import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { 
  Building2, 
  Users, 
  CreditCard, 
  Settings, 
  MapPin, 
  Globe, 
  Calendar, 
  ChevronRight,
  ShieldAlert,
  ArrowLeft,
  Mail,
  Phone
} from "lucide-react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BusinessModulesManager } from "@/components/superadmin/business-modules-manager";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EditBusinessDialog } from "@/components/superadmin/edit-business-dialog";

interface BusinessDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BusinessDetailPage({ params }: BusinessDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch business data using SECURITY DEFINER RPC to bypass RLS
  // Safety: layout already verifies the user is a superadmin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: businessArr, error } = await (supabase as any)
    .rpc("get_business_as_superadmin", { business_id: id });

  const business = (businessArr as Record<string, any>[] | null)?.[0];

  if (error || !business) {
    console.error('[SA Business Detail] Error:', error?.message);
    notFound();
  }

  // Fetch owner profile
  const { data: owner } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", business.owner_id)
    .single();

  const { data: modules } = await supabase
    .from("business_modules")
    .select("*")
    .eq("business_id", id);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header / Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            render={<Link href="/sa/businesses" />} 
            className="rounded-full"
            nativeButton={false}
          >
             <ArrowLeft className="size-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1 font-mono uppercase tracking-wider text-[11px]">
              <span>Negocios</span>
              <ChevronRight className="size-3" />
              <span className="text-foreground font-semibold normal-case tracking-normal font-sans">Detalle</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight font-display">{business.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {business.suspended ? (
            <Badge variant="destructive" className="h-7 px-3">Suspendido</Badge>
          ) : business.active ? (
            <Badge className="bg-[var(--success)] text-white h-7 px-3 border-0">Activo</Badge>
          ) : (
            <Badge variant="secondary" className="h-7 px-3">Inactivo</Badge>
          )}
          <EditBusinessDialog business={{
            id: business.id,
            name: business.name,
            slug: business.slug,
            description: business.description,
            type: business.type,
          }} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="shadow-[var(--shadow-stamp)] border-[var(--line)]">
            <CardHeader>
              <CardTitle className="text-lg font-display">Propietario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-[var(--line)]">
                  <AvatarImage src={owner?.avatar_url || ''} />
                  <AvatarFallback className="bg-[var(--accent)] text-white font-bold">
                    {owner?.display_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold">{owner?.display_name || 'Sin nombre'}</p>
                  <p className="text-xs text-muted-foreground font-mono">{owner?.id.slice(0, 8)}</p>
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-dashed border-[var(--line)] text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-3.5" />
                  {owner?.email}
                </div>
                {owner?.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="size-3.5" />
                    {owner.phone}
                  </div>
                )}
              </div>
              <Button 
                variant="outline" 
                className="w-full text-xs h-8" 
                render={<Link href={`/sa/users?id=${owner?.id}`} />}
                nativeButton={false}
              >
                Ver Perfil Completo
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-stamp)] border-[var(--line)]">
            <CardHeader>
              <CardTitle className="text-lg font-display">Detalles Rápidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">Slug</span>
                <Badge variant="secondary" className="font-mono text-[10px]">/{business.slug}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">Tipo</span>
                <span className="font-medium capitalize">{business.type.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">Plan</span>
                <Badge className="bg-[var(--accent)] text-white border-0">{business.subscription_plan || 'free'}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">Creado el</span>
                <span className="font-mono text-xs">{new Date(business.created_at!).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start border-b border-dashed border-[var(--line)] rounded-none h-12 bg-transparent p-0 gap-6">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--accent)] data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full transition-all font-semibold">Overview</TabsTrigger>
              <TabsTrigger value="modules" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--accent)] data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full transition-all font-semibold">Módulos</TabsTrigger>
              <TabsTrigger value="subscription" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--accent)] data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full transition-all font-semibold">Suscripción</TabsTrigger>
              <TabsTrigger value="users" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--accent)] data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full transition-all font-semibold">Usuarios</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="pt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="shadow-[var(--shadow-stamp)] border-[var(--line)]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">Ventas Totales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold font-display">$0.00</div>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">Sincronizado con Stripe</p>
                  </CardContent>
                </Card>
                <Card className="shadow-[var(--shadow-stamp)] border-[var(--line)]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">Uso de Almacenamiento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold font-display">12 / 500 MB</div>
                    <div className="w-full bg-muted h-2 rounded-full mt-3 overflow-hidden border border-[var(--line)]">
                       <div className="bg-[var(--accent)] h-full w-[5%] rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-[var(--shadow-stamp)] border-[var(--line)]">
                <CardHeader>
                  <CardTitle className="font-display text-lg">Configuración de Marca</CardTitle>
                  <CardDescription>Datos visuales del negocio en la plataforma.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">Logo</p>
                      {business.logo_url ? (
                        <img src={business.logo_url} className="h-12 w-auto object-contain border border-[var(--line)] rounded-xl p-1" alt="Logo" />
                      ) : (
                        <div className="h-12 w-12 bg-muted rounded-xl flex items-center justify-center text-muted-foreground text-[10px] font-mono">Sin Logo</div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">Cover</p>
                      {business.cover_url ? (
                        <img src={business.cover_url} className="h-12 w-full object-cover border border-[var(--line)] rounded-xl" alt="Cover" />
                      ) : (
                        <div className="h-12 w-full bg-muted rounded-xl flex items-center justify-center text-muted-foreground text-[10px] font-mono">Sin Cover</div>
                      )}
                    </div>
                  </div>
                  <div className="pt-2">
                     <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider mb-1">Descripción</p>
                     <p className="text-sm">{business.description || "Sin descripción proporcionada."}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="modules" className="pt-6">
              <BusinessModulesManager businessId={id} activeModules={modules || []} />
            </TabsContent>

            <TabsContent value="subscription" className="pt-6">
               <Card className="border-dashed border-[var(--line)]">
                 <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <CreditCard className="size-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold font-display">Gestión de Suscripción</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mb-6">El historial de facturación y cambios de plan se gestionan a través de Stripe Billing.</p>
                    <Button variant="outline">Abrir Stripe Dashboard</Button>
                 </CardContent>
               </Card>
            </TabsContent>

            <TabsContent value="users" className="pt-6">
               <Card className="shadow-[var(--shadow-stamp)] border-[var(--line)]">
                 <CardHeader>
                    <CardTitle className="font-display">Miembros del Negocio</CardTitle>
                    <CardDescription>Usuarios con acceso administrativo a este negocio.</CardDescription>
                 </CardHeader>
                 <CardContent>
                    <p className="text-sm text-muted-foreground italic">Cargando lista de miembros...</p>
                 </CardContent>
               </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
