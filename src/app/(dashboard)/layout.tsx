import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Separator } from "@/components/ui/separator";
import { AuthProvider } from "@/components/shared/auth-provider";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

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

  // Fetch businesses the user is a member of
  const { data: memberBusinesses, error: memberErr } = await supabase
    .from("business_members")
    .select("business_id, businesses ( id, name, slug, logo_url, type )")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (memberErr) {
    console.log("Warning fetching member businesses:", memberErr.message || JSON.stringify(memberErr));
  }

  // Fallback/additive: Fetch businesses they directly own
  const { data: ownedBusinesses } = await supabase
    .from("businesses")
    .select("id, name, slug, logo_url, type")
    .eq("owner_id", user.id);

  let businesses = (memberBusinesses || [])
    .map((mb: any) => {
      if (Array.isArray(mb.businesses)) return mb.businesses[0];
      return mb.businesses;
    })
    .filter(Boolean);
    
  if (ownedBusinesses && ownedBusinesses.length > 0) {
    const existingIds = new Set(businesses.map((b: any) => b.id));
    for (const b of ownedBusinesses) {
      if (!existingIds.has(b.id)) {
        businesses.push(b);
        existingIds.add(b.id);
      }
    }
  }

  const cookieStore = await cookies();
  let activeBusinessId = cookieStore.get("spot-business-id")?.value;

  // Validate the cookie id exists in our list. If not, auto-fallback to the first one available.
  const isValidBusinessId = businesses.find((b: { id: string }) => b.id === activeBusinessId);
  if (!isValidBusinessId && businesses.length > 0) {
    activeBusinessId = businesses[0].id;
  }

  return (
    <AuthProvider initialUser={user} initialProfile={profile}>
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
        />
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 backdrop-blur-sm px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-6" />
            <div className="flex-1" />
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  );
}
