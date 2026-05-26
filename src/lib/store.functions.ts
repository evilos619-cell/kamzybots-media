import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function ensureAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

// ===== Admin: Fund or debit user wallet =====
export const adminAdjustWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      userEmail: z.string().email(),
      amount: z.number(),
      note: z.string().max(500).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles").select("id, wallet_balance").eq("email", data.userEmail).maybeSingle();
    if (pErr || !profile) throw new Error("User not found");
    const newBal = Number(profile.wallet_balance) + data.amount;
    if (newBal < 0) throw new Error("Resulting balance would be negative");
    const { error: uErr } = await supabaseAdmin
      .from("profiles").update({ wallet_balance: newBal }).eq("id", profile.id);
    if (uErr) throw new Error(uErr.message);
    await supabaseAdmin.from("wallet_transactions").insert({
      user_id: profile.id,
      amount: data.amount,
      type: data.amount >= 0 ? "admin_credit" : "admin_debit",
      note: data.note ?? null,
      admin_id: context.userId,
    });
    return { ok: true, newBalance: newBal };
  });

// ===== Admin: Suspend / unsuspend user =====
export const adminSetSuspended = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), suspended: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("profiles").update({ is_suspended: data.suspended }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Admin: Add admin by email =====
export const adminAddAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const { data: profile } = await supabaseAdmin
      .from("profiles").select("id").eq("email", data.email).maybeSingle();
    if (!profile) throw new Error("No user found with that email — they must register first");
    const { error } = await supabaseAdmin
      .from("user_roles").insert({ user_id: profile.id, role: "admin" });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

// ===== Admin: Remove admin =====
export const adminRemoveAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("You cannot remove yourself");
    const { error } = await supabaseAdmin
      .from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Admin: List all users =====
export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, username, email, phone, wallet_balance, is_suspended, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { users: data ?? [] };
  });

// ===== Admin: List all admins =====
export const adminListAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, profiles!inner(email, first_name, last_name)")
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    return { admins: data ?? [] };
  });

// ===== User: Purchase product (atomic) =====
export const purchaseProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      productId: z.string().uuid(),
      couponCode: z.string().trim().max(64).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rpc, error } = await supabaseAdmin.rpc("purchase_product_atomic", {
      _user_id: context.userId,
      _product_id: data.productId,
      _coupon_code: data.couponCode ?? null,
    });
    if (error) throw new Error(error.message);
    return rpc as {
      ok: boolean;
      productName: string;
      pricePaid: number;
      loginData: string;
      newBalance: number;
    };
  });
