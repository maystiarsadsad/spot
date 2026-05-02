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
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-dashed border-[var(--line)] bg-[var(--background)]/80 backdrop-blur-sm px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white font-mono shadow-[var(--shadow-stamp)] transition-all duration-300 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_var(--ink)]">
              ★ SuperAdmin
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6 min-h-[calc(100vh-3.5rem)]">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
