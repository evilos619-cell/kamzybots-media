import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet as WalletIcon, ArrowLeft, Loader2, ArrowDownCircle, ArrowUpCircle, ShieldCheck, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { initPaystackPayment, initMonnifyPayment, verifyPaymentByReference } from "@/lib/payments.functions";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — KAMZYBOT'S MEDIA" },
      { name: "description", content: "View your KAMZYBOT'S MEDIA wallet balance, transactions, and fund your account." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    ref: typeof s.ref === "string" ? s.ref : undefined,
    provider: typeof s.provider === "string" ? s.provider : undefined,
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
  const search = useSearch({ from: "/wallet" });
  const initPaystack = useServerFn(initPaystackPayment);
  const initMonnify = useServerFn(initMonnifyPayment);
  const verifyFn = useServerFn(verifyPaymentByReference);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [email, setEmail] = useState<string | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [amount, setAmount] = useState<string>("1000");
  const [coupon, setCoupon] = useState<string>("");
  const [paying, setPaying] = useState<"paystack" | "monnify" | null>(null);
  const [verifyState, setVerifyState] = useState<"idle" | "verifying" | "done">("idle");

  async function refresh() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const [{ data: profile }, { data: txData }] = await Promise.all([
      supabase.from("profiles").select("wallet_balance").eq("id", session.user.id).maybeSingle(),
      supabase.from("wallet_transactions").select("id,amount,type,note,created_at").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(50),
    ]);
    setBalance(Number(profile?.wallet_balance ?? 0));
    setTxns((txData ?? []) as Txn[]);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/login", search: { redirect: "/wallet" } as any }); return; }
      setEmail(session.user.email ?? null);
      await refresh();
      if (cancelled) return;
      setLoading(false);

      if (search.ref) {
        setVerifyState("verifying");
        try {
          const res = await verifyFn({ data: { reference: search.ref } });
          if (res.ok && res.status === "success") {
            toast.success(`Wallet credited with ₦${Number(res.amountCredited).toLocaleString()}`);
            await refresh();
          } else {
            toast.error("Payment not successful. If you completed payment, try again in a few seconds.");
          }
        } catch (e: any) {
          toast.error(e?.message ?? "Verification failed");
        }
        setVerifyState("done");
        navigate({ to: "/wallet", replace: true, search: {} as any });
      }
    })();
    return () => { cancelled = true; };
  }, [navigate, search.ref]);

  async function handlePay(provider: "paystack" | "monnify") {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 100) { toast.error("Minimum funding is ₦100"); return; }
    if (amt > 1_000_000) { toast.error("Maximum funding is ₦1,000,000"); return; }
    setPaying(provider);
    try {
      const fn = provider === "paystack" ? initPaystack : initMonnify;
      const res = await fn({ data: { amount: amt, couponCode: coupon.trim() || undefined } });
      window.location.assign(res.authorization_url);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start payment");
      setPaying(null);
    }
  }

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
        {verifyState === "verifying" && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm text-primary inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Verifying your payment…
          </div>
        )}
        <section className="rounded-3xl bg-cta-gradient text-primary-foreground p-7 shadow-soft">
          <div className="flex items-center gap-3 opacity-90">
            <WalletIcon className="w-5 h-5" />
            <p className="text-sm">Wallet balance</p>
          </div>
          <p className="mt-3 font-display text-4xl md:text-5xl font-extrabold tracking-tight">{formatNGN(balance)}</p>
          <p className="mt-2 text-sm opacity-80">Signed in as {email}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/dashboard/products" className="inline-flex items-center gap-2 rounded-full bg-white text-foreground px-5 py-2.5 text-sm font-semibold shadow-soft hover:scale-[1.02] transition-transform">
              My Products
            </Link>
            <Link to="/products" className="inline-flex items-center gap-2 rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold hover:bg-white/10 transition-colors">
              Shop Products
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div>
            <div>
              <h2 className="font-semibold">Fund your wallet</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Pay securely with Paystack or Monnify. Your wallet is credited instantly after successful payment.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Amount (NGN)</span>
              <input type="number" min={100} max={1_000_000} step={50} value={amount}
                onChange={e => setAmount(e.target.value)}
                className="mt-1 w-full h-11 rounded-lg border border-input bg-background px-3 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Coupon (optional)</span>
              <input type="text" value={coupon}
                onChange={e => setCoupon(e.target.value.toUpperCase())}
                placeholder="GIFT10"
                className="mt-1 w-full h-11 rounded-lg border border-input bg-background px-3 text-sm uppercase" />
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <button disabled={!!paying} onClick={() => handlePay("paystack")}
              className="inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-[#0BA4DB] text-white font-semibold disabled:opacity-60">
              {paying === "paystack" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Pay with Paystack
            </button>
            <button disabled={!!paying} onClick={() => handlePay("monnify")}
              className="inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-[#0B2545] text-white font-semibold disabled:opacity-60">
              {paying === "monnify" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Pay with Monnify
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Min ₦100 · Max ₦1,000,000 per transaction.</p>
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

    </div>
  );
}