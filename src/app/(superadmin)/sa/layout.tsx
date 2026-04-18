import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { SuperAdminSidebar } from "@/components/superadmin/sidebar";
import { Separator } from "@/components/ui/separator";

export default async function SuperAdminLayout({
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

  // Check if the user has the superadmin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, platform_role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.platform_role !== "superadmin") {
    console.log("NOT SUPERADMIN", profile);
    redirect("/d");
  }

  return (
    <SidebarProvider>
      <SuperAdminSidebar
        user={{
          email: user.email ?? "",
          display_name: profile?.display_name ?? user.email?.split("@")[0] ?? "SuperAdmin",
          avatar_url: profile?.avatar_url ?? null,
        }}
      />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 backdrop-blur-sm px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-orange-500/10">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-orange-600 dark:bg-orange-950 dark:text-orange-400 border border-orange-200 dark:border-orange-800 shadow-sm transition-all duration-300 hover:scale-105 active:scale-95 leading-relaxed">
              SuperAdmin Active
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6 bg-muted/20 dark:bg-muted/5 min-h-[calc(100vh-3.5rem)]">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
