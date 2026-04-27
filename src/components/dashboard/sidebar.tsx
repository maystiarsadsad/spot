"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  DollarSign,
  Users,
  Contact,
  BarChart3,
  Settings,
  LogOut,
  Palette,
  Loader2,
  ShieldCheck,
  CalendarDays,
  Globe,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useTransition } from "react";
import { useAuth } from "@/components/shared/auth-provider";
import { Badge } from "@/components/ui/badge";

interface UserInfo {
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
}

const navItems = [
  { label: "Panel", href: "/d", icon: LayoutDashboard }, // always show
  { label: "Reservas", href: "/d/reservations", icon: CalendarDays, moduleKey: 'reservations' },
  { label: "Pedidos", href: "/d/orders", icon: ShoppingCart, moduleKey: 'transactions' },
  { label: "Catálogo", href: "/d/catalog", icon: Package, moduleKey: 'catalog' },
  { label: "Inventario", href: "/d/inventory", icon: Warehouse, moduleKey: 'inventory' },
  { label: "Finanzas", href: "/d/finance", icon: DollarSign, moduleKey: 'finance' },
  { label: "Equipo", href: "/d/team", icon: Users, moduleKey: 'team' },
  { label: "Clientes", href: "/d/contacts", icon: Contact, moduleKey: 'contacts' },
  { label: "Reportes", href: "/d/reports", icon: BarChart3, moduleKey: 'reports' },
  { label: "Mi Página", href: "/d/webpage", icon: Globe },
];

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { DEFAULT_MODULES_BY_TYPE, type BusinessType } from "@/lib/constants";

interface BusinessInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  type: string;
}

export function DashboardSidebar({ user: initialUser, businesses = [], initialActiveBusinessId }: { user: UserInfo, businesses?: BusinessInfo[], initialActiveBusinessId?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { profile } = useAuth();
  
  const initialBusiness = initialActiveBusinessId 
    ? businesses.find(b => b.id === initialActiveBusinessId) 
    : businesses[0];
  
  const [activeBusiness, setActiveBusiness] = useState<BusinessInfo | null>(initialBusiness || null);

  const handleBusinessSwitch = async (business: BusinessInfo) => {
    setActiveBusiness(business);
    try {
      const { setActiveBusinessCookie } = await import("@/lib/actions/context");
      await setActiveBusinessCookie(business.id);
      router.refresh();
    } catch (e) {
      console.error("Failed to set business cookie", e);
    }
  };

  const user = {
    ...initialUser,
    role: profile?.platform_role ?? initialUser.role,
    display_name: profile?.display_name ?? initialUser.display_name,
    avatar_url: profile?.avatar_url ?? initialUser.avatar_url,
  };

  const initials =
    user.display_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "U";

  const isSuperAdmin = user.role?.toLowerCase().trim() === "superadmin";

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center justify-between cursor-pointer rounded-lg hover:bg-accent p-2 transition-colors outline-none text-left">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center shrink-0">
                {activeBusiness?.logo_url ? (
                  <img src={activeBusiness.logo_url} alt={activeBusiness.name} className="w-full h-full rounded-lg object-cover" />
                ) : (
                  <span className="font-bold text-sm">
                    {activeBusiness?.name?.charAt(0)?.toUpperCase() || "S"}
                  </span>
                )}
              </div>
              <div className="flex-1 truncate group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-bold truncate pr-2">{activeBusiness?.name || "Spot"}</p>
              </div>
            </div>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground group-data-[collapsible=icon]:hidden shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="start">
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase font-bold">Tus Negocios</DropdownMenuLabel>
            {businesses && businesses.length > 0 ? (
              businesses.map((business) => (
                <DropdownMenuItem 
                  key={business.id} 
                  onClick={() => handleBusinessSwitch(business)}
                  className="flex items-center justify-between cursor-pointer p-2"
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0">
                       {business.logo_url ? (
                          <img src={business.logo_url} alt={business.name} className="w-full h-full rounded object-cover" />
                        ) : (
                          <span className="font-bold text-[10px]">
                            {business.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                    </div>
                    <span className="truncate">{business.name}</span>
                  </div>
                  {activeBusiness?.id === business.id && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No tienes otros negocios.
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menú</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                if (item.moduleKey && activeBusiness?.type) {
                  const allowedModules = DEFAULT_MODULES_BY_TYPE[activeBusiness.type as BusinessType] || [];
                  if (!allowedModules.includes(item.moduleKey)) return null;
                }

                const isActive =
                  pathname === item.href ||
                  (item.href !== "/d" && pathname.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton isActive={isActive}>
                      <Link href={item.href} className="flex items-center gap-2 w-full">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={pathname === "/d/settings"}>
                  <Link href="/d/settings" className="flex items-center gap-2 w-full">
                    <Settings className="h-4 w-4" />
                    <span>Configuración</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            data-slot="dropdown-menu-trigger"
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors outline-none text-left cursor-pointer"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold truncate leading-none">
                  {user.display_name ?? "Usuario"}
                </p>
                {isSuperAdmin && (
                  <Badge variant="outline" className="h-4 px-1 text-[9px] bg-orange-500/10 text-orange-600 border-orange-500/20 leading-none">
                    SA
                  </Badge>
                )}
              </div>
              {user.display_name !== user.email && (
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {user.email}
                </p>
              )}
              {isSuperAdmin && user.display_name === user.email && (
                <p className="text-xs text-orange-600 font-medium mt-1">Super Admin</p>
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 rounded-xl p-2 shadow-xl border border-border" sideOffset={8}>
            <div className="p-3 font-normal border-b border-border/50 mb-1">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar_url ?? undefined} />
                  <AvatarFallback className="text-sm bg-primary text-primary-foreground">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-sm font-bold truncate leading-none mb-1">{user.display_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            </div>
            
            <DropdownMenuSeparator className="my-2" />
            
            {isSuperAdmin && (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuItem className="p-0 cursor-pointer bg-orange-500/5 text-orange-600 focus:bg-orange-500/10 focus:text-orange-700 font-bold rounded-lg transition-colors overflow-hidden">
                    <Link href="/sa" className="flex items-center gap-2 w-full p-2">
                      <ShieldCheck className="h-4 w-4" />
                      PLATAFORMA SUPERADMIN
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="my-2" />
              </>
            )}

            <DropdownMenuGroup>
              <DropdownMenuItem className="p-0 cursor-pointer rounded-lg">
                <Link href="/d/settings" className="flex items-center gap-2 w-full p-2">
                  <Settings className="h-4 w-4" />
                  Configuración General
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            
            <DropdownMenuSeparator className="my-2" />
            
            <div className="px-2 py-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Palette className="h-3.5 w-3.5" />
                  Tema UI
                </span>
                <ThemeToggle />
              </div>
            </div>

            <DropdownMenuSeparator className="my-2" />
            
            <DropdownMenuItem
              onClick={() => startTransition(() => logout())}
              className="p-2 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer rounded-lg"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
// Version: 1.0.1 (Base UI Fix)
    </Sidebar>
  );
}
