import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { purchaseProduct } from "@/lib/store.functions";
import { toast } from "sonner";
import { Loader2, ShoppingCart, Wallet, LogOut } from "lucide-react";

export const Route = createFileRoute("/shop")({
  head: () => ({ meta: [{ title: "Shop — KAMZYBOT'S MEDIA" }] }),
  component: ShopPage,
});

type Product = { id: string; name: string; description: string | null; price: number; image_url: string | null };

function ShopPage() {
  const navigate = useNavigate();
  const buy = useServerFn(purchaseProduct);
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<Record<string, number>>({});
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [coupon, setCoupon] = useState("");
  const [result, setResult] = useState<{ name: string; data: string; price: number } | null>(null);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate({ to: "/login" }); return; }
    const [{ data: prods }, { data: prof }, { data: logs }] = await Promise.all([
      supabase.from("products").select("*").eq("active", true),
      supabase.from("profiles").select("wallet_balance").eq("id", session.user.id).single(),
      supabase.from("product_logins").select("product_id").eq("status", "available"),
    ]);
    const counts: Record<string, number> = {};
    (logs ?? []).forEach((r: any) => { counts[r.product_id] = (counts[r.product_id] ?? 0) + 1; });
    setProducts((prods ?? []) as Product[]);
    setStock(counts);
    setBalance(Number(prof?.wallet_balance ?? 0));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleBuy(p: Product) {
    setBusyId(p.id);
    try {
      const res = await buy({ data: { productId: p.id, couponCode: coupon.trim() || undefined } });
      setResult({ name: res.productName, data: res.loginData, price: res.pricePaid });
      setBalance(res.newBalance);
      toast.success("Purchase complete");
      load();
    } catch (e: any) { toast.error(e.message); }
    setBusyId(null);
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 bg-card border-b border-border/60">
        <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <Link to="/" className="font-display font-bold">KAMZYBOT'S MEDIA</Link>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
              <Wallet className="w-4 h-4" /> ₦{balance.toLocaleString()}
            </span>
            <button onClick={logout} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold mb-4">Shop</h1>

        <div className="bg-card border border-border/60 rounded-xl p-4 mb-6">
          <label className="block text-xs font-medium mb-1">Coupon code (optional)</label>
          <input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} placeholder="GIVEAWAY10" className="w-full sm:w-64 h-10 rounded-lg border border-input bg-background px-3 text-sm uppercase" />
          <p className="text-xs text-muted-foreground mt-1">Applied to your next purchase.</p>
        </div>

        {loading ? <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(p => {
              const s = stock[p.id] ?? 0;
              return (
                <div key={p.id} className="bg-card border border-border/60 rounded-xl p-4 flex flex-col">
                  {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-32 object-cover rounded-lg mb-3" />}
                  <h3 className="font-semibold mb-1">{p.name}</h3>
                  {p.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-3">{p.description}</p>}
                  <div className="mt-auto pt-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-lg">₦{Number(p.price).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{s} in stock</div>
                    </div>
                    <button disabled={s === 0 || busyId === p.id} onClick={() => handleBuy(p)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                      {busyId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                      {s === 0 ? "Out" : "Buy"}
                    </button>
                  </div>
                </div>
              );
            })}
            {products.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12">No products available yet</div>}
          </div>
        )}
      </main>

      {result && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setResult(null)}>
          <div className="bg-card rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="font-display text-lg font-bold mb-2">✓ {result.name}</h2>
            <p className="text-sm text-muted-foreground mb-4">You paid ₦{result.price.toLocaleString()}. Your login details:</p>
            <pre className="bg-muted rounded-lg p-3 text-sm font-mono whitespace-pre-wrap break-all">{result.data}</pre>
            <p className="text-xs text-muted-foreground mt-3">Save this now. You can also view it again in your order history.</p>
            <button onClick={() => setResult(null)} className="mt-4 w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
