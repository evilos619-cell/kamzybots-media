import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, ShoppingCart, Wallet, Ticket } from "lucide-react";

export const Route = createFileRoute("/manage/")({
  component: OverviewPage,
});

function OverviewPage() {
  const [stats, setStats] = useState({ users: 0, orders: 0, revenue: 0, coupons: 0 });

  useEffect(() => {
    (async () => {
      const [u, o, c] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("price_paid"),
        supabase.from("coupons").select("id", { count: "exact", head: true }),
      ]);
      const revenue = (o.data ?? []).reduce((s, r: any) => s + Number(r.price_paid), 0);
      setStats({
        users: u.count ?? 0,
        orders: o.data?.length ?? 0,
        revenue,
        coupons: c.count ?? 0,
      });
    })();
  }, []);

  const cards = [
    { label: "Users", value: stats.users, icon: Users, color: "text-blue-600" },
    { label: "Orders", value: stats.orders, icon: ShoppingCart, color: "text-emerald-600" },
    { label: "Revenue", value: `₦${stats.revenue.toLocaleString()}`, icon: Wallet, color: "text-amber-600" },
    { label: "Coupons", value: stats.coupons, icon: Ticket, color: "text-purple-600" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Overview</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-card rounded-xl border border-border/60 p-5">
            <c.icon className={`w-5 h-5 ${c.color}`} />
            <div className="mt-3 text-2xl font-bold">{c.value}</div>
            <div className="text-sm text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
