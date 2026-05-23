import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/manage/coupons")({
  component: CouponsPage,
});

type Coupon = {
  id: string; code: string; discount_percent: number; active: boolean;
  max_uses: number | null; times_used: number; expires_at: string | null;
};

function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState(10);
  const [maxUses, setMaxUses] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("coupons").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setCoupons((data ?? []) as Coupon[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("coupons").insert({
      code: code.trim().toUpperCase(),
      discount_percent: percent,
      max_uses: maxUses ? parseInt(maxUses) : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      created_by: session?.user.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Coupon created");
    setCode(""); setPercent(10); setMaxUses(""); setExpiresAt("");
    load();
  }

  async function toggleActive(c: Coupon) {
    const { error } = await supabase.from("coupons").update({ active: !c.active }).eq("id", c.id);
    if (error) toast.error(error.message); else load();
  }
  async function remove(c: Coupon) {
    if (!confirm(`Delete coupon ${c.code}?`)) return;
    const { error } = await supabase.from("coupons").delete().eq("id", c.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Coupons</h1>

      <form onSubmit={handleCreate} className="bg-card border border-border/60 rounded-xl p-5 mb-6 grid sm:grid-cols-5 gap-3 items-end">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1">Code</label>
          <input required value={code} onChange={e => setCode(e.target.value)} placeholder="GIVEAWAY10" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm uppercase" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Discount %</label>
          <input required type="number" min={1} max={100} value={percent} onChange={e => setPercent(Number(e.target.value))} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Max uses (optional)</label>
          <input type="number" min={1} value={maxUses} onChange={e => setMaxUses(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Expires (optional)</label>
          <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
        </div>
        <button disabled={saving} className="sm:col-span-5 h-10 rounded-lg bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">
          <Plus className="w-4 h-4" /> Create coupon
        </button>
      </form>

      <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : coupons.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No coupons yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Discount</th>
                <th className="px-4 py-2">Uses</th>
                <th className="px-4 py-2">Expires</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id} className="border-t border-border/40">
                  <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                  <td className="px-4 py-3">{c.discount_percent}%</td>
                  <td className="px-4 py-3">{c.times_used}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                  <td className="px-4 py-3">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(c)} className={`px-2 py-1 rounded text-xs font-medium ${c.active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {c.active ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(c)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
