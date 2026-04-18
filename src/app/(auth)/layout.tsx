import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/d");
    }
  } catch (e: any) {
    // If redirect was called inside try, Next.js throws a special error — rethrow it
    if (e?.digest?.startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    // Otherwise Supabase is unreachable — just render the login form
    console.error("Auth check failed (Supabase unreachable):", e?.message);
  }

  return (
    <div className="auth-shell">
      {/* Left panel — Constellation Hero */}
      <div className="auth-hero">
        {/* Constellation canvas */}
        <div className="constellation">
          {/* Animated dots */}
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="dot"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            />
          ))}
          {/* Connecting lines */}
          <svg className="lines" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1="15" y1="20" x2="45" y2="35" />
            <line x1="45" y1="35" x2="70" y2="15" />
            <line x1="70" y1="15" x2="85" y2="40" />
            <line x1="25" y1="55" x2="50" y2="45" />
            <line x1="50" y1="45" x2="75" y2="60" />
            <line x1="10" y1="75" x2="40" y2="65" />
            <line x1="40" y1="65" x2="60" y2="80" />
            <line x1="60" y1="80" x2="90" y2="70" />
          </svg>
        </div>

        {/* Aurora glow */}
        <div className="aurora aurora-1" />
        <div className="aurora aurora-2" />

        {/* Content */}
        <div className="auth-hero-content">
          <div className="auth-logo">
            <span className="auth-logo-text">Spot</span>
          </div>

          <div className="auth-tagline">
            <span className="tagline-line">Gestiona.</span>
            <span className="tagline-line tagline-gradient">Crece.</span>
            <span className="tagline-line">Simplifica.</span>
          </div>
        </div>
      </div>

      {/* Right panel — Form */}
      <div className="auth-form-panel">
        <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50">
          <ThemeToggle />
        </div>
        <div className="auth-form-container">
          {children}
        </div>
        <footer className="auth-footer justify-center">
          <span>© {new Date().getFullYear()} Spot</span>
        </footer>
      </div>
    </div>
  );
}
