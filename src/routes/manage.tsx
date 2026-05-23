import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, LayoutDashboard, Ticket, Package, Users, ShieldPlus, KeyRound, LogOut } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/manage")({
  head: () => ({ meta: [{ title: "Admin Panel — KAMZYBOT'S MEDIA" }] }),
  component: ManageLayout,
});

const NAV: { to: string; label: string; icon: any; exact?: boolean }[] = [
  { to: "/manage", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/manage/coupons", label: "Coupons", icon: Ticket },
  { to: "/manage/products", label: "Products & Logins", icon: Package },
  { to: "/manage/users", label: "Users", icon: Users },
  { to: "/manage/admins", label: "Admins", icon: ShieldPlus },
  { to: "/manage/password", label: "Change Password", icon: KeyRound },
];

function ManageLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!ignore) navigate({ to: "/admin" });
        return;
      }
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!role) {
        await supabase.auth.signOut();
        toast.error("Admin access required");
        if (!ignore) navigate({ to: "/admin" });
        return;
      }
      if (!ignore) setChecking(false);
    })();
    return () => { ignore = true; };
  }, [navigate]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/admin" });
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 bg-card border-b border-border/60">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/manage" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cta-gradient flex items-center justify-center text-primary-foreground font-bold text-sm">K</div>
            <span className="font-display font-bold tracking-tight">Admin Panel</span>
          </Link>
          <button onClick={handleLogout} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-6 grid md:grid-cols-[220px_1fr] gap-6">
        <nav className="bg-card rounded-xl border border-border/60 p-2 h-fit md:sticky md:top-20">
          {NAV.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? location.pathname === to : location.pathname.startsWith(to);
            return (
              <Link key={to} to={to} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}>
                <Icon className="w-4 h-4" /> {label}
              </Link>
            );
          })}
        </nav>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
