import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListUsers, adminSetSuspended, adminAdjustWallet } from "@/lib/store.functions";
import { Loader2, Ban, CheckCircle2, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/manage/users")({
  component: UsersPage,
});

type U = {
  id: string; first_name: string | null; last_name: string | null;
  username: string | null; email: string | null; phone: string | null;
  wallet_balance: number; is_suspended: boolean;
};

function UsersPage() {
  const list = useServerFn(adminListUsers);
  const setSuspended = useServerFn(adminSetSuspended);
  const adjustWallet = useServerFn(adminAdjustWallet);
  const [users, setUsers] = useState<U[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fundFor, setFundFor] = useState<U | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await list();
      setUsers(res.users as U[]);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleSuspend(u: U) {
    if (!confirm(`${u.is_suspended ? "Unsuspend" : "Suspend"} ${u.email}?`)) return;
    try {
      await setSuspended({ data: { userId: u.id, suspended: !u.is_suspended } });
      toast.success("Updated");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  const filtered = users.filter(u =>
    !search ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search),
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Users</h1>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email, username, phone…" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm mb-4" />

      <div className="bg-card border border-border/60 rounded-xl overflow-x-auto">
        {loading ? <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Wallet</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-t border-border/40">
                  <td className="px-4 py-3">{[u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || "—"}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.phone || "—"}</td>
                  <td className="px-4 py-3 font-medium">₦{Number(u.wallet_balance).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {u.is_suspended
                      ? <span className="px-2 py-1 rounded text-xs bg-destructive/10 text-destructive">Suspended</span>
                      : <span className="px-2 py-1 rounded text-xs bg-emerald-100 text-emerald-700">Active</span>}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => setFundFor(u)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary text-primary-foreground">
                      <Wallet className="w-3 h-3" /> Fund
                    </button>
                    <button onClick={() => toggleSuspend(u)} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${u.is_suspended ? "bg-emerald-600 text-white" : "bg-destructive text-destructive-foreground"}`}>
                      {u.is_suspended ? <CheckCircle2 className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                      {u.is_suspended ? "Unsuspend" : "Suspend"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {fundFor && <FundModal user={fundFor} onClose={() => setFundFor(null)} onDone={() => { setFundFor(null); load(); }} adjustWallet={adjustWallet} />}
    </div>
  );
}

function FundModal({ user, onClose, onDone, adjustWallet }: any) {
  const [amount, setAmount] = useState(1000);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await adjustWallet({ data: { userEmail: user.email, amount, note: note || undefined } });
      toast.success(`Wallet now ₦${Number(res.newBalance).toLocaleString()}`);
      onDone();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="bg-card rounded-xl p-6 max-w-sm w-full space-y-4">
        <h2 className="font-display text-lg font-bold">Adjust wallet — {user.email}</h2>
        <p className="text-xs text-muted-foreground">Current balance: ₦{Number(user.wallet_balance).toLocaleString()}. Use a negative amount to debit.</p>
        <div>
          <label className="block text-xs font-medium mb-1">Amount (₦)</label>
          <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Note (optional)</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Failed payment refund" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg border border-border text-sm">Cancel</button>
          <button disabled={saving} className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">
            {saving ? "Saving…" : "Apply"}
          </button>
        </div>
      </form>
    </div>
  );
}
