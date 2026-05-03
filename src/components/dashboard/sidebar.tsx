"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  CreditCard,
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
  { label: "Caja (POS)", href: "/d/pos", icon: CreditCard, moduleKey: 'transactions' },
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

export function DashboardSidebar({ user: initialUser, businesses = [], initialActiveBusinessId, memberRole: initialMemberRole, memberPermissions: initialMemberPermissions }: { user: UserInfo, businesses?: BusinessInfo[], initialActiveBusinessId?: string, memberRole?: string | null, memberPermissions?: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { profile } = useAuth();
  
  const initialBusiness = initialActiveBusinessId 
    ? businesses.find(b => b.id === initialActiveBusinessId) 
    : businesses[0];
  
  const [activeBusiness, setActiveBusiness] = useState<BusinessInfo | null>(initialBusiness || null);
  const [memberRole, setMemberRole] = useState<string | null | undefined>(initialMemberRole);
  const [memberPermissions, setMemberPermissions] = useState<any>(initialMemberPermissions);

  const handleBusinessSwitch = async (business: BusinessInfo) => {
    setActiveBusiness(business);
    try {
      const { setActiveBusinessCookie, getMembershipForBusiness } = await import("@/lib/actions/context");
      const [, membership] = await Promise.all([
        setActiveBusinessCookie(business.id),
        getMembershipForBusiness(business.id),
      ]);
      setMemberRole(membership.role);
      setMemberPermissions(membership.permissions);
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
    <Sidebar className="border-r border-dashed border-[var(--line)]">
      <SidebarHeader className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center justify-between cursor-pointer rounded-xl hover:bg-[var(--background-2)] p-2 transition-colors outline-none text-left">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[var(--ink)] text-[var(--sun)] flex items-center justify-center shrink-0 shadow-[var(--shadow-stamp)]">
                {activeBusiness?.logo_url ? (
                  <img src={activeBusiness.logo_url} alt={activeBusiness.name} className="w-full h-full rounded-xl object-cover" />
                ) : (
                  <span className="font-display font-bold text-sm">
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
          <DropdownMenuContent className="w-64 rounded-xl shadow-[var(--shadow-stamp-lg)] border-[var(--line)]" align="start">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase font-bold font-mono tracking-widest">Tus Negocios</DropdownMenuLabel>
            {businesses && businesses.length > 0 ? (
              businesses.map((business) => (
                <DropdownMenuItem 
                  key={business.id} 
                  onClick={() => handleBusinessSwitch(business)}
                  className="flex items-center justify-between cursor-pointer p-2"
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-6 h-6 rounded-lg bg-[var(--background-2)] border border-[var(--line)] flex items-center justify-center shrink-0">
                       {business.logo_url ? (
                          <img src={business.logo_url} alt={business.name} className="w-full h-full rounded-lg object-cover" />
                        ) : (
                          <span className="font-display font-bold text-[10px]">
                            {business.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                    </div>
                    <span className="truncate">{business.name}</span>
                  </div>
                  {activeBusiness?.id === business.id && <Check className="h-4 w-4 text-[var(--accent)]" />}
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
          <SidebarGroupLabel className="font-mono text-[10px] font-bold uppercase tracking-widest">Menú</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                if (item.moduleKey && activeBusiness?.type) {
                  // Layer 1: Business-type module filter
                  const businessModules = DEFAULT_MODULES_BY_TYPE[activeBusiness.type as BusinessType] || [];
                  if (!businessModules.includes(item.moduleKey)) return null;

                  // Layer 2: User permission filter (owners/admins see everything)
                  const isFullAccess = !memberRole || memberRole === 'owner' || memberRole === 'admin';
                  if (!isFullAccess && memberPermissions?.modules) {
                    const userModules: string[] = memberPermissions.modules;
                    if (!userModules.includes(item.moduleKey)) return null;
                  }
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
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--background-2)] transition-colors outline-none text-left cursor-pointer"
          >
            <Avatar className="h-8 w-8 rounded-full">
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs rounded-full bg-gradient-to-br from-[var(--accent)] to-[#ff8e6f] text-white font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold truncate leading-none">
                  {user.display_name ?? "Usuario"}
                </p>
                {isSuperAdmin && (
                  <Badge className="h-4 px-1 text-[9px] bg-[var(--accent)] text-white border-0 font-mono leading-none">
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
                <p className="text-xs text-[var(--accent)] font-bold font-mono mt-1">Super Admin</p>
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 rounded-xl p-2 shadow-[var(--shadow-stamp-lg)] border-[var(--line)]" sideOffset={8}>
            <div className="p-3 font-normal border-b border-dashed border-[var(--line)] mb-1">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 rounded-full">
                  <AvatarImage src={user.avatar_url ?? undefined} />
                  <AvatarFallback className="text-sm rounded-full bg-gradient-to-br from-[var(--accent)] to-[#ff8e6f] text-white font-bold">{initials}</AvatarFallback>
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
                  <DropdownMenuItem className="p-0 cursor-pointer bg-[var(--accent)]/10 text-[var(--accent)] focus:bg-[var(--accent)]/15 focus:text-[var(--accent)] font-bold font-mono rounded-lg transition-colors overflow-hidden">
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
                <span className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-mono">
                  <Palette className="h-3.5 w-3.5" />
                  Tema UI
                </span>
                <ThemeToggle />
              </div>
            </div>

            <DropdownMenuSeparator className="my-2" />
            
            <DropdownMenuItem
              onClick={() => startTransition(() => logout())}
              className="p-2 text-[var(--destructive)] focus:bg-[var(--destructive)]/10 focus:text-[var(--destructive)] cursor-pointer rounded-lg"
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
    </Sidebar>
  );
}
