import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet as WalletIcon, ArrowLeft, MessageCircle, Loader2, Plus, ArrowDownCircle, ArrowUpCircle, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — KAMZYBOT'S MEDIA" },
      { name: "description", content: "View your KAMZYBOT'S MEDIA wallet balance, transactions, and fund your account." },
    ],
  }),
  component: WalletPage,
});

type Txn = {
  id: string;
  amount: number;
  type: string;
  note: string | null;
  created_at: string;
};

function formatNGN(n: number) {
  return "₦" + Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function WalletPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [email, setEmail] = useState<string | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/login" }); return; }
      setEmail(session.user.email ?? null);
      const [{ data: profile, error: pErr }, { data: txData, error: tErr }] = await Promise.all([
        supabase.from("profiles").select("wallet_balance").eq("id", session.user.id).maybeSingle(),
        supabase.from("wallet_transactions").select("id,amount,type,note,created_at").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(50),
      ]);
      if (cancelled) return;
      if (pErr) toast.error(pErr.message);
      if (tErr) toast.error(tErr.message);
      setBalance(Number(profile?.wallet_balance ?? 0));
      setTxns((txData ?? []) as Txn[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <header className="sticky top-0 z-40 bg-background border-b border-border/60">
        <div className="container mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <span className="font-display font-bold tracking-tight">Wallet</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
        <section className="rounded-3xl bg-cta-gradient text-primary-foreground p-7 shadow-soft">
          <div className="flex items-center gap-3 opacity-90">
            <WalletIcon className="w-5 h-5" />
            <p className="text-sm">Wallet balance</p>
          </div>
          <p className="mt-3 font-display text-4xl md:text-5xl font-extrabold tracking-tight">{formatNGN(balance)}</p>
          <p className="mt-2 text-sm opacity-80">Signed in as {email}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="https://wa.me/2348159696814?text=I%20want%20to%20fund%20my%20wallet" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white text-foreground px-5 py-2.5 text-sm font-semibold shadow-soft hover:scale-[1.02] transition-transform">
              <Plus className="w-4 h-4" /> Fund via WhatsApp
            </a>
            <Link to="/products" className="inline-flex items-center gap-2 rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold hover:bg-white/10 transition-colors">
              Shop Products
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div>
            <div>
              <h2 className="font-semibold">How to fund your wallet</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Message us on WhatsApp with the amount you want to add. Once payment is confirmed, our admin team credits your wallet instantly and you can start purchasing.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-display font-bold text-xl mb-4">Recent transactions</h2>
          {txns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              No transactions yet. Fund your wallet to get started.
            </div>
          ) : (
            <ul className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
              {txns.map(t => {
                const credit = t.type !== "purchase";
                const Icon = credit ? ArrowDownCircle : ArrowUpCircle;
                return (
                  <li key={t.id} className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${credit ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold capitalize">{t.type.replace("_", " ")}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.note || new Date(t.created_at).toLocaleString()}</p>
                    </div>
                    <p className={`text-sm font-bold ${credit ? "text-foreground" : "text-destructive"}`}>
                      {credit ? "+" : "−"}{formatNGN(Math.abs(Number(t.amount)))}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <a href="https://wa.me/2348159696814" target="_blank" rel="noreferrer"
        className="fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-3 text-sm font-semibold shadow-soft hover:scale-105 transition-transform">
        <MessageCircle className="w-4 h-4" /> Message Us
      </a>
    </div>
  );
}