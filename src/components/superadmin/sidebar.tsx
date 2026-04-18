"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Users,
  Palette,
  FileText,
  Settings,
  LogOut,
  Loader2,
  ChevronsUpDown,
  BadgeCheck,
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

interface SuperAdminUserInfo {
  email: string;
  display_name: string;
  avatar_url: string | null;
}

const saNavigation = [
  {
    label: "Plataforma",
    items: [
      {
        title: "Analytics",
        href: "/sa/analytics",
        icon: LayoutDashboard,
      },
      {
        title: "Negocios",
        href: "/sa/businesses",
        icon: Store,
      },
      {
        title: "Usuarios",
        href: "/sa/users",
        icon: Users,
      },
    ],
  },
  {
    label: "Contenido",
    items: [
      {
        title: "Plantillas",
        href: "/sa/templates",
        icon: Palette,
      },
      {
        title: "Propuestas",
        href: "/sa/proposals",
        icon: FileText,
      },
    ],
  },
  {
    label: "Sistema",
    items: [
      {
        title: "Configuración",
        href: "/sa/settings",
        icon: Settings,
      },
    ],
  },
];

export function SuperAdminSidebar({ user }: { user: SuperAdminUserInfo }) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
    });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              size="lg" 
              render={<Link href="/sa/analytics" />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-orange-600 text-sidebar-primary-foreground">
                <LayoutDashboard className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold uppercase tracking-wider text-[10px] text-orange-600/70 dark:text-orange-400/70">
                  Spot Platform
                </span>
                <span className="font-bold text-sm tracking-tight text-foreground underline decoration-orange-500/30 decoration-2 underline-offset-4">
                  SuperAdmin
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {saNavigation.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={pathname === item.href}
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-center py-2">
              <ThemeToggle />
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  />
                }
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    src={user.avatar_url ?? ""}
                    alt={user.display_name}
                  />
                  <AvatarFallback className="rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400 font-medium">
                    {user.display_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-foreground">
                    {user.display_name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground italic font-medium">
                    Platform Overlord
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg shadow-xl border-sidebar-border"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <div className="p-3 border-b border-sidebar-border">
                  <div className="flex items-center gap-2 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        src={user.avatar_url ?? ""}
                        alt={user.display_name}
                      />
                      <AvatarFallback className="rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400">
                        {user.display_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user.display_name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    render={<Link href="/d" />}
                    className="cursor-pointer"
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard de Negocio</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    render={<Link href="/sa/settings" />}
                    className="cursor-pointer"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configuración SA</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={handleLogout}
                  disabled={isPending}
                  className="text-red-500 focus:text-red-500 cursor-pointer"
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-2 h-4 w-4" />
                  )}
                  <span>
                    {isPending ? "Cerrando sesión..." : "Cerrar sesión"}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
// Version: 1.0.1 (Base UI Fix)
    </Sidebar>
  );
}
