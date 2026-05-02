import { createClient } from "@/lib/supabase/server";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Plus, Search, MoreHorizontal, ExternalLink, ShieldAlert, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { BUSINESS_TYPES } from "@/lib/constants";

export default async function BusinessesPage() {
  const supabase = await createClient();

  // Fetch all businesses with their owners (profiles)
  const { data: businesses, error } = await supabase
    .from("businesses")
    .select(`
      *,
      profiles:owner_id (
        email,
        display_name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <ShieldAlert className="size-12 text-red-500" />
        <p className="text-muted-foreground">Error al cargar negocios: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/sa/analytics">Plataforma</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Negocios</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl font-bold tracking-tight mt-2 font-display">Negocios</h1>
          <p className="text-muted-foreground">
            Gestiona todos los negocios registrados en la plataforma.
          </p>
        </div>
        <Button 
          render={<Link href="/sa/businesses/create" />} 
          className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white shadow-[var(--shadow-stamp)] hover:shadow-[var(--shadow-stamp-lg)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
          nativeButton={false}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Negocio
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nombre, slug o dueño..."
            className="pl-8"
          />
        </div>
        <Button variant="outline">Filtros</Button>
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-card shadow-[var(--shadow-stamp)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Negocio</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Dueño</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {businesses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No se encontraron negocios.
                </TableCell>
              </TableRow>
            ) : (
              businesses.map((business) => (
                <TableRow key={business.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold">{business.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        /{business.slug}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {(BUSINESS_TYPES as any)[business.type]?.icon || "🏢"}
                      </span>
                      <span className="text-sm">
                        {(BUSINESS_TYPES as any)[business.type]?.label || business.type}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">
                        {(business.profiles as any)?.display_name || "Sin nombre"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {(business.profiles as any)?.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {business.suspended ? (
                      <Badge variant="destructive">Suspendido</Badge>
                    ) : business.active ? (
                      <Badge className="bg-[var(--success)] text-white hover:bg-[var(--success)]/90 border-0">
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {business.subscription_plan || "Free"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger 
                        className={buttonVariants({ variant: "ghost", className: "h-8 w-8 p-0" })}
                      >
                         <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border/50 mb-1">
                            Acciones
                          </div>
                        <DropdownMenuGroup>
                          <DropdownMenuItem 
                            render={<Link href={`/sa/businesses/${business.id}`} />} 
                            className="cursor-pointer"
                            nativeButton={false}
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Gestionar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            render={<Link href={`/${business.slug}`} target="_blank" />}
                            className="cursor-pointer"
                            nativeButton={false}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Ver Web
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-[var(--destructive)] focus:text-[var(--destructive)] cursor-pointer">
                          <ShieldAlert className="mr-2 h-4 w-4" />
                          {business.suspended ? "Levantar Suspensión" : "Suspender Negocio"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
