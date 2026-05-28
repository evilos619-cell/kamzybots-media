import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getMyPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("id, product_id, login_id, price_paid, status, created_at, coupon_code, discount_percent")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const productIds = Array.from(new Set((orders ?? []).map(o => o.product_id)));
    const loginIds = (orders ?? []).map(o => o.login_id).filter((x): x is string => !!x);

    const [{ data: products }, { data: logins }] = await Promise.all([
      supabaseAdmin.from("products")
        .select("id, name, description, image_url, category, price")
        .in("id", productIds.length ? productIds : ["00000000-0000-0000-0000-000000000000"]),
      loginIds.length
        ? supabaseAdmin.from("product_logins").select("id, login_data").in("id", loginIds)
        : Promise.resolve({ data: [] as { id: string; login_data: string }[] }),
    ]);

    const pMap = new Map((products ?? []).map(p => [p.id, p]));
    const lMap = new Map((logins ?? []).map(l => [l.id, l.login_data]));

    return {
      purchases: (orders ?? []).map(o => ({
        id: o.id,
        productId: o.product_id,
        product: pMap.get(o.product_id) ?? null,
        loginData: o.login_id ? (lMap.get(o.login_id) ?? null) : null,
        pricePaid: Number(o.price_paid),
        status: o.status,
        createdAt: o.created_at,
        couponCode: o.coupon_code,
        discountPercent: o.discount_percent,
      })),
    };
  });