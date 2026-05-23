import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListAdmins, adminAddAdmin, adminRemoveAdmin } from "@/lib/store.functions";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/manage/admins")({
  component: AdminsPage,
});

function AdminsPage() {
  const list = useServerFn(adminListAdmins);
  const add = useServerFn(adminAddAdmin);
  const remove = useServerFn(adminRemoveAdmin);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try { const res = await list(); setAdmins(res.admins); } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await add({ data: { email: email.trim() } });
      toast.success("Admin added");
      setEmail(""); load();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  }
  async function handleRemove(userId: string, label: string) {
    if (!confirm(`Remove ${label} as admin?`)) return;
    try { await remove({ data: { userId } }); toast.success("Removed"); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Admins</h1>

      <form onSubmit={submit} className="bg-card border border-border/60 rounded-xl p-5 mb-6 flex gap-3">
        <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm" />
        <button disabled={saving} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2 disabled:opacity-60">
          <Plus className="w-4 h-4" /> Add admin
        </button>
      </form>
      <p className="text-xs text-muted-foreground mb-3">The person must register an account first before being promoted.</p>

      <div className="bg-card border border-border/60 rounded-xl">
        {loading ? <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
          <ul className="divide-y divide-border/40">
            {admins.map((a: any) => (
              <li key={a.user_id} className="p-4 flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium">{a.profiles?.email}</div>
                  <div className="text-xs text-muted-foreground">{[a.profiles?.first_name, a.profiles?.last_name].filter(Boolean).join(" ")}</div>
                </div>
                <button onClick={() => handleRemove(a.user_id, a.profiles?.email)} className="text-destructive"><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
            {admins.length === 0 && <li className="p-8 text-center text-sm text-muted-foreground">No admins</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
