import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/manage/products")({
  component: ProductsPage,
});

type Product = {
  id: string; name: string; description: string | null; price: number;
  image_url: string | null; active: boolean; category: string;
};

const PRESET_CATEGORIES = [
  "Facebook", "Instagram", "TikTok", "Telegram", "Twitter/X",
  "Netflix", "Canva", "Spotify", "Gmail", "Crypto Accounts", "Others",
];

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockCounts, setStockCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(1000);
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState<string>("Facebook");
  const [customCategory, setCustomCategory] = useState("");

  async function load() {
    setLoading(true);
    const { data: prods } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    const { data: stock } = await supabase
      .from("product_logins").select("product_id").eq("status", "available");
    const counts: Record<string, number> = {};
    (stock ?? []).forEach((r: any) => { counts[r.product_id] = (counts[r.product_id] ?? 0) + 1; });
    setProducts((prods ?? []) as Product[]);
    setStockCounts(counts);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    const finalCategory = (category === "__custom__" ? customCategory.trim() : category) || "Others";
    const { error } = await supabase.from("products").insert({
      name, description: description || null, price, image_url: imageUrl || null,
      category: finalCategory,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Product created");
    setName(""); setDescription(""); setPrice(1000); setImageUrl(""); setCustomCategory("");
    load();
  }
  async function toggleActive(p: Product) {
    await supabase.from("products").update({ active: !p.active }).eq("id", p.id);
    load();
  }
  async function deleteProduct(p: Product) {
    if (!confirm(`Delete ${p.name} and all its logins?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

  const allCategories = Array.from(new Set([
    ...PRESET_CATEGORIES,
    ...products.map(p => p.category).filter(Boolean),
  ]));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Products & Logins</h1>

      <form onSubmit={createProduct} className="bg-card border border-border/60 rounded-xl p-5 mb-6 grid sm:grid-cols-2 gap-3">
        <input required placeholder="Product name (e.g. Facebook PVA)" value={name} onChange={e => setName(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
        <input required type="number" min={0} step="0.01" placeholder="Price (₦)" value={price} onChange={e => setPrice(Number(e.target.value))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
        <select value={category} onChange={e => setCategory(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          <option value="__custom__">+ Custom category…</option>
        </select>
        {category === "__custom__" ? (
          <input placeholder="New category name" value={customCategory} onChange={e => setCustomCategory(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
        ) : <div className="hidden sm:block" />}
        <input placeholder="Image URL (optional)" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="sm:col-span-2 h-10 rounded-lg border border-input bg-background px-3 text-sm" />
        <textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} className="sm:col-span-2 min-h-[60px] rounded-lg border border-input bg-background p-3 text-sm" />
        <button className="sm:col-span-2 h-10 rounded-lg bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Add product
        </button>
      </form>

      {loading ? (
        <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {products.map(p => (
            <div key={p.id} className="bg-card border border-border/60 rounded-xl">
              <div className="p-4 flex items-center gap-3">
                <button onClick={() => setOpenId(openId === p.id ? null : p.id)} className="text-muted-foreground">
                  {openId === p.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-primary/10 text-primary mr-1.5">{p.category || "Others"}</span>
                    ₦{Number(p.price).toLocaleString()} · {stockCounts[p.id] ?? 0} in stock
                  </div>
                </div>
                <button onClick={() => toggleActive(p)} className={`px-2 py-1 rounded text-xs font-medium ${p.active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                  {p.active ? "Active" : "Hidden"}
                </button>
                <button onClick={() => deleteProduct(p)} className="text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
              {openId === p.id && <LoginsPanel productId={p.id} onChange={load} />}
            </div>
          ))}
          {products.length === 0 && <div className="text-center text-muted-foreground text-sm py-8">No products yet</div>}
        </div>
      )}
    </div>
  );
}

function LoginsPanel({ productId, onChange }: { productId: string; onChange: () => void }) {
  const [logins, setLogins] = useState<{ id: string; login_data: string; status: string }[]>([]);
  const [bulk, setBulk] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("product_logins").select("id, login_data, status")
      .eq("product_id", productId).order("created_at");
    setLogins(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [productId]);

  async function addBulk() {
    const lines = bulk.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const rows = lines.map(login_data => ({ product_id: productId, login_data }));
    const { error } = await supabase.from("product_logins").insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(`Added ${lines.length} login(s)`);
    setBulk("");
    load(); onChange();
  }
  async function removeLogin(id: string) {
    const { error } = await supabase.from("product_logins").delete().eq("id", id);
    if (error) toast.error(error.message); else { load(); onChange(); }
  }

  return (
    <div className="border-t border-border/40 p-4 space-y-4 bg-muted/20">
      <div>
        <label className="block text-xs font-medium mb-1">Add logins (one per line, e.g. email:password)</label>
        <textarea value={bulk} onChange={e => setBulk(e.target.value)} placeholder={"user1@x.com:pass1\nuser2@x.com:pass2"} className="w-full min-h-[80px] rounded-lg border border-input bg-background p-3 text-sm font-mono" />
        <button onClick={addBulk} className="mt-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Add to stock</button>
      </div>
      <div>
        <div className="text-xs font-medium mb-2">Current logins · stock = number of available logins</div>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
          <div className="space-y-1 max-h-64 overflow-auto">
            {logins.map(l => (
              <div key={l.id} className="flex items-center gap-2 text-xs bg-card rounded p-2 border border-border/40">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${l.status === "available" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{l.status}</span>
                <span className="flex-1 font-mono truncate">{l.login_data}</span>
                <button onClick={() => removeLogin(l.id)} className="text-destructive"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
            {logins.length === 0 && <div className="text-xs text-muted-foreground">No logins yet</div>}
          </div>
        )}
      </div>
    </div>
  );
}
