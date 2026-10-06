import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Separator } from "@/components/ui/separator";
import { AuthProvider } from "@/components/shared/auth-provider";
import { cookies } from "next/headers";
import { getUserBusinesses, resolveActiveBusinessId } from "@/lib/get-user-businesses";
import { ensureContrast, HEX_COLOR, readableTextColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Brand color as page-level CSS variables, derived per theme so it stays
 * legible: the brand is nudged lighter/darker only if it fails 3:1 against the
 * theme's surface, and the text on top of it is picked by contrast. Emitted on
 * <html> (not a wrapper div) so dialogs/menus rendered in portals get it too.
 * In dark mode --primary follows the brand as well, since that's what filled
 * buttons and active tabs use there.
 */
function buildBrandCss(brandColor: string | null): string | null {
  // Only a strict #rrggbb ever reaches the stylesheet.
  if (!brandColor || !HEX_COLOR.test(brandColor)) return null;

  const light = ensureContrast(brandColor, "#fdfaf2", 3);
  const dark = ensureContrast(brandColor, "#15140f", 3);
  const lightFg = readableTextColor(light);
  const darkFg = readableTextColor(dark);

  return `
html:root {
  --accent: ${light};
  --accent-foreground: ${lightFg};
  --ring: ${light};
  --chart-1: ${light};
  --sidebar-ring: ${light};
  --sidebar-accent-foreground: ${light};
}
html.dark {
  --accent: ${dark};
  --accent-foreground: ${darkFg};
  --ring: ${dark};
  --chart-1: ${dark};
  --primary: ${dark};
  --primary-foreground: ${darkFg};
  --sidebar-primary: ${dark};
  --sidebar-primary-foreground: ${darkFg};
  --sidebar-ring: ${dark};
  --sidebar-accent-foreground: ${dark};
}`;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, platform_role")
    .eq("id", user.id)
    .single();

  const businesses = await getUserBusinesses(supabase, user.id);

  const cookieStore = await cookies();
  // Cookie if it's one of the user's businesses, otherwise the first one.
  // getActiveBusiness() resolves it the same way, so pages agree with the sidebar.
  const activeBusinessId = resolveActiveBusinessId(
    businesses,
    cookieStore.get("spot-business-id")?.value
  );

  // Fetch user's member role for the active business (for module permissions)
  let memberRole: string | null = null;
  let memberPermissions: any = null;
  if (activeBusinessId) {
    const { data: membership } = await supabase
      .from("business_members")
      .select("role, permissions")
      .eq("business_id", activeBusinessId)
      .eq("user_id", user.id)
      .single();
    
    if (membership) {
      memberRole = membership.role;
      memberPermissions = membership.permissions;
    } else {
      // No membership record found — check if user is the business owner
      const { data: ownedBiz } = await supabase
        .from("businesses")
        .select("id")
        .eq("id", activeBusinessId)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (ownedBiz) {
        memberRole = "owner"; // Explicit owner — full access
      }
    }
  }

  // Fetch enabled modules for the active business
  let enabledModules: string[] | null = null;
  if (activeBusinessId) {
    const { data: modules } = await supabase
      .from("business_modules")
      .select("module_key, enabled")
      .eq("business_id", activeBusinessId);
    
    if (modules && modules.length > 0) {
      enabledModules = modules
        .filter((m: any) => m.enabled)
        .map((m: any) => m.module_key);
    }
  }

  // Fetch brand color for the active business
  let brandColor: string | null = null;
  if (activeBusinessId) {
    const { data: biz } = await supabase
      .from("businesses")
      .select("theme")
      .eq("id", activeBusinessId)
      .single();
    brandColor = (biz?.theme as any)?.brandColor || null;
  }

  const brandCss = buildBrandCss(brandColor);

  return (
    <AuthProvider initialUser={user} initialProfile={profile}>
      {brandCss && <style dangerouslySetInnerHTML={{ __html: brandCss }} />}
      <div>
      <SidebarProvider>
        <DashboardSidebar
          user={{
            email: user.email ?? "",
            display_name: profile?.display_name ?? user.email?.split("@")[0] ?? "Usuario",
            avatar_url: profile?.avatar_url ?? null,
            role: profile?.platform_role ?? null,
          }}
          businesses={businesses}
          initialActiveBusinessId={activeBusinessId}
          memberRole={memberRole}
          memberPermissions={memberPermissions}
          enabledModules={enabledModules}
        />
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-dashed border-[var(--line)] bg-[var(--background)]/80 backdrop-blur-sm px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-6" />
            <div className="flex-1" />
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      </div>
    </AuthProvider>
  );
}
