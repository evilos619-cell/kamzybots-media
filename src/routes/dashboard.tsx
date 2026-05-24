import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Menu, LogOut, Wallet, Search, ArrowRight, Send, ShoppingCart,
  Layers, Twitter, Instagram, Facebook, Youtube, Music2, Mail, Globe, X, User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — KAMZYBOT'S MEDIA" },
      { name: "description", content: "Your KAMZYBOT'S MEDIA service marketplace dashboard." },
    ],
  }),
  component: DashboardPage,
});

type Profile = {
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  email: string | null;
  wallet_balance: number;
};

type Service = {
  category: string;
  icon: any;
  color: string;
  count: number;
  products: { title: string; stock: number; price: number; icon: any }[];
};

const SERVICES: Service[] = [
  {
    category: "9 PROXY", icon: Layers, color: "oklch(0.35 0.05 250)", count: 1,
    products: [
      { title: "9 PROXY | Premium Residential Proxy | 30 Days Unlimited Bandwidth", stock: 12, price: 4500, icon: Layers },
    ],
  },
  {
    category: "TWITTER", icon: Twitter, color: "oklch(0.65 0.18 230)", count: 3,
    products: [
      { title: "X OLD ACCOUNTS 1-50 FOLLOWERS | Registration 2009-2020, verified by email | mail+pass | 2FA, 80% USA", stock: 8, price: 1200, icon: X },
      { title: "X OLD ACCOUNTS 100-500 REAL FOLLOWERS | Aged accounts | email access included", stock: 5, price: 3500, icon: X },
      { title: "X PVA NEW ACCOUNTS | Phone Verified | USA IPs", stock: 22, price: 800, icon: X },
    ],
  },
  {
    category: "INSTAGRAM", icon: Instagram, color: "oklch(0.65 0.2 20)", count: 4,
    products: [
      { title: "Instagram Aged Accounts 2018-2022 | Email Access | High Quality", stock: 14, price: 2500, icon: Instagram },
      { title: "Instagram Followers 1K — Real & High Retention", stock: 99, price: 1500, icon: Instagram },
    ],
  },
  {
    category: "FACEBOOK", icon: Facebook, color: "oklch(0.5 0.18 250)", count: 2,
    products: [
      { title: "Facebook PVA Accounts | Email + Password | Profile Picture", stock: 30, price: 1800, icon: Facebook },
    ],
  },
  {
    category: "TIKTOK", icon: Music2, color: "oklch(0.25 0.02 280)", count: 2,
    products: [
      { title: "TikTok USA Aged Accounts | 1K+ Followers | Email Access", stock: 7, price: 3000, icon: Music2 },
    ],
  },
  {
    category: "YOUTUBE", icon: Youtube, color: "oklch(0.6 0.22 25)", count: 2,
    products: [
      { title: "YouTube Monetized Channel | 1K Subs + 4K Watch Hours", stock: 3, price: 95000, icon: Youtube },
    ],
  },
  {
    category: "VPN SERVICES", icon: Globe, color: "oklch(0.55 0.18 160)", count: 4,
    products: [
      { title: "HMA VPN | PREMIUM | One device, One user — 30 days | Mail | Password", stock: 8, price: 3000, icon: Globe },
      { title: "IPVANISH VPN | PREMIUM | Use Time: 30 days | Mail + Password", stock: 0, price: 3000, icon: Globe },
      { title: "NordVPN | 1 Year Subscription | Premium Account", stock: 4, price: 7500, icon: Globe },
    ],
  },
  {
    category: "EMAIL SERVICES", icon: Mail, color: "oklch(0.55 0.18 290)", count: 3,
    products: [
      { title: "Outlook Aged Email | 2020-2022 | POP/IMAP Enabled", stock: 50, price: 600, icon: Mail },
    ],
  },
];

function formatNGN(n: number) {
  return "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function DashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/login" });
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name,last_name,username,email,wallet_balance")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
      }
      setProfile(
        data ?? {
          first_name: null, last_name: null, username: null,
          email: session.user.email ?? null, wallet_balance: 0,
        },
      );
      setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/login" });
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [navigate]);

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate({ to: "/" });
  }

  const filtered = SERVICES.map(s => ({
    ...s,
    products: search
      ? s.products.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
      : s.products,
  })).filter(s => !search || s.products.length > 0 || s.category.toLowerCase().includes(search.toLowerCase()));

  const displayName = profile?.first_name || profile?.username || profile?.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-background border-b border-border/60 shadow-sm">
        <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-border/70 bg-card hover:bg-muted transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2">
            <span className="font-display font-extrabold text-2xl tracking-tight text-primary">
              KAMZY<span className="text-gradient">BOT</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link to="/wallet" className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-2 text-sm font-semibold border border-primary/20 hover:bg-primary/20 transition-colors">
              <Wallet className="w-4 h-4" />
              {loading ? "…" : formatNGN(profile?.wallet_balance ?? 0)}
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full border-2 border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="relative w-[82vw] max-w-xs h-full bg-card shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 bg-cta-gradient text-primary-foreground">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{displayName}</p>
                  <p className="text-xs opacity-80 truncate">{profile?.email}</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-white/15 backdrop-blur px-3 py-2 text-sm flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Wallet: <span className="font-bold ml-auto">{formatNGN(profile?.wallet_balance ?? 0)}</span>
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              {[
                { label: "Dashboard", to: "/dashboard" },
                { label: "Products", to: "/products" },
                { label: "Wallet", to: "/wallet" },
                { label: "Contact", to: "/contact" },
                { label: "About", to: "/about" },
                { label: "Home", to: "/" },
              ].map(item => (
                <Link key={item.label} to={item.to} onClick={() => setSidebarOpen(false)}
                  className="block px-6 py-4 text-base font-medium hover:bg-muted transition-colors border-b border-border/40">
                  {item.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="w-full text-left px-6 py-4 text-base font-medium text-destructive hover:bg-destructive/10 transition-colors border-b border-border/40 inline-flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </nav>
          </aside>
        </div>
      )}

      <main className="container mx-auto max-w-7xl px-4 py-8">
        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="font-display font-extrabold text-4xl md:text-5xl text-primary tracking-tight">
            Service Marketplace
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Welcome back, <span className="font-semibold text-foreground">{displayName}</span> — browse premium digital assets below.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="What are you looking for today?"
              className="w-full h-14 rounded-2xl border border-border bg-card pl-12 pr-4 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Service categories */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(svc => {
            const Icon = svc.icon;
            return (
              <section key={svc.category} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="p-5 flex items-start gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-soft shrink-0"
                    style={{ background: svc.color }}
                  >
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-xl font-bold tracking-tight">{svc.category}</h2>
                    <span
                      className="inline-block mt-1 rounded-md px-2 py-0.5 text-xs font-semibold text-white"
                      style={{ background: svc.color }}
                    >
                      {svc.count} SERVICES
                    </span>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      Premium high-quality services for {svc.category}. Boost your presence with our instant delivery solutions.
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5">
                  <button
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-white font-semibold transition-transform hover:scale-[1.01]"
                    style={{ background: svc.color }}
                  >
                    Browse All <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="border-t border-border bg-muted/30 p-5">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Most Popular</h3>
                  <ul className="space-y-4">
                    {svc.products.slice(0, 2).map((p, i) => {
                      const PIcon = p.icon;
                      const out = p.stock === 0;
                      return (
                        <li key={i} className="rounded-xl bg-card border border-border/60 p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-md bg-foreground text-background flex items-center justify-center shrink-0">
                              <PIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold leading-snug">{p.title}</p>
                              <p className="text-xs mt-2">
                                <span className="text-muted-foreground">In Stock:</span>{" "}
                                <span className={out ? "text-destructive font-bold" : "text-foreground font-bold"}>
                                  {p.stock} qty.
                                </span>
                              </p>
                              <p className="text-xs">
                                <span className="text-muted-foreground">Per Quantity:</span>{" "}
                                <span className="font-bold">{formatNGN(p.price)}</span>
                              </p>
                              <button
                                disabled={out}
                                onClick={() => out ? toast.error("Out of stock") : toast.success(`Added "${p.title.slice(0, 30)}…" to cart`)}
                                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold shadow-soft disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform"
                              >
                                <ShoppingCart className="w-3.5 h-3.5" /> Purchase
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            );
          })}
        </div>
      </main>

      <a
        href="https://wa.me/2348159696814"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-3 text-sm font-semibold shadow-soft hover:scale-105 transition-transform z-30"
      >
        <Send className="w-4 h-4" /> Message Us
      </a>
    </div>
  );
}
