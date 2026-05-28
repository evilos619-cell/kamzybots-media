import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MIN_NGN = 100;
const MAX_NGN = 1_000_000;

function getOrigin(): string {
  const fromEnv = process.env.SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  try {
    const req = getRequest();
    const origin = req.headers.get("origin") ?? req.headers.get("referer");
    if (origin) return new URL(origin).origin;
    const host = req.headers.get("host");
    if (host) return `https://${host}`;
  } catch {}
  return "https://kamzybotsmedia.store";
}

function genRef(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function recordPending(args: {
  userId: string;
  provider: "paystack" | "monnify";
  reference: string;
  amount: number;
  couponCode: string | null;
}) {
  const { error } = await supabaseAdmin.from("payment_transactions").insert({
    user_id: args.userId,
    provider: args.provider,
    reference: args.reference,
    amount_paid: args.amount,
    amount_credited: 0,
    coupon_code: args.couponCode,
    status: "pending",
  });
  if (error) throw new Error(error.message);
}

const InitInput = z.object({
  amount: z.number().min(MIN_NGN).max(MAX_NGN),
  couponCode: z.string().trim().max(64).optional(),
});

// ===== Paystack =====
export const initPaystackPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InitInput.parse(input))
  .handler(async ({ data, context }) => {
    const secret = process.env.PAYSTARK_SECRET_KEY;
    if (!secret) throw new Error("Paystack not configured");

    const { data: profile } = await supabaseAdmin
      .from("profiles").select("email").eq("id", context.userId).maybeSingle();
    const email = profile?.email ?? context.claims.email;
    if (!email) throw new Error("Email missing on account");

    const reference = genRef("ps");
    const origin = getOrigin();
    const coupon = data.couponCode?.toUpperCase().trim() || null;

    await recordPending({
      userId: context.userId,
      provider: "paystack",
      reference,
      amount: data.amount,
      couponCode: coupon,
    });

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: Math.round(data.amount * 100),
        currency: "NGN",
        reference,
        callback_url: `${origin}/wallet?ref=${reference}&provider=paystack`,
        metadata: { user_id: context.userId, coupon_code: coupon },
      }),
    });
    const json = await res.json() as any;
    if (!res.ok || !json.status) {
      throw new Error(json.message || "Paystack init failed");
    }
    return {
      authorization_url: json.data.authorization_url as string,
      reference,
    };
  });

// ===== Monnify =====
let monnifyToken: { value: string; expiresAt: number } | null = null;

async function getMonnifyToken(): Promise<string> {
  if (monnifyToken && monnifyToken.expiresAt > Date.now() + 30_000) {
    return monnifyToken.value;
  }
  const apiKey = process.env.MONIFY_API_KEY;
  const secret = process.env.MONIFY_SECRET_KEY;
  if (!apiKey || !secret) throw new Error("Monnify not configured");
  const basic = Buffer.from(`${apiKey}:${secret}`).toString("base64");
  const res = await fetch("https://api.monnify.com/api/v1/auth/login", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
  });
  const json = await res.json() as any;
  if (!res.ok || !json.requestSuccessful) {
    throw new Error(json.responseMessage || "Monnify auth failed");
  }
  const token = json.responseBody.accessToken as string;
  const expiresIn = (json.responseBody.expiresIn ?? 3600) * 1000;
  monnifyToken = { value: token, expiresAt: Date.now() + expiresIn };
  return token;
}

export const initMonnifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InitInput.parse(input))
  .handler(async ({ data, context }) => {
    const contractCode = process.env.MONIFY_CONTRACT_CODE;
    if (!contractCode) throw new Error("Monnify not configured");

    const { data: profile } = await supabaseAdmin
      .from("profiles").select("email, first_name, last_name").eq("id", context.userId).maybeSingle();
    const email = profile?.email ?? context.claims.email;
    if (!email) throw new Error("Email missing on account");
    const name =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
      String(email).split("@")[0];

    const reference = genRef("mn");
    const origin = getOrigin();
    const coupon = data.couponCode?.toUpperCase().trim() || null;

    await recordPending({
      userId: context.userId,
      provider: "monnify",
      reference,
      amount: data.amount,
      couponCode: coupon,
    });

    const token = await getMonnifyToken();
    const res = await fetch("https://api.monnify.com/api/v1/merchant/transactions/init-transaction", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: data.amount,
        customerName: name,
        customerEmail: email,
        paymentReference: reference,
        paymentDescription: "Wallet funding",
        currencyCode: "NGN",
        contractCode,
        redirectUrl: `${origin}/wallet?ref=${reference}&provider=monnify`,
      }),
    });
    const json = await res.json() as any;
    if (!res.ok || !json.requestSuccessful) {
      throw new Error(json.responseMessage || "Monnify init failed");
    }
    return {
      authorization_url: json.responseBody.checkoutUrl as string,
      reference,
    };
  });

// ===== Verify (client-fallback re-check) =====
export const verifyPaymentByReference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reference: z.string().min(4).max(120) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: tx, error } = await supabaseAdmin
      .from("payment_transactions")
      .select("*")
      .eq("reference", data.reference)
      .maybeSingle();
    if (error || !tx) throw new Error("Unknown reference");
    if (tx.user_id !== context.userId) throw new Error("Forbidden");
    if (tx.status === "success") {
      return { ok: true, status: "success" as const, amountCredited: Number(tx.amount_credited) };
    }

    let amountPaid = 0;
    let success = false;
    let raw: any = null;

    if (tx.provider === "paystack") {
      const secret = process.env.PAYSTARK_SECRET_KEY!;
      const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`, {
        headers: { Authorization: `Bearer ${secret}` },
      });
      raw = await res.json();
      success = res.ok && raw?.data?.status === "success";
      amountPaid = success ? Number(raw.data.amount) / 100 : 0;
    } else {
      const token = await getMonnifyToken();
      const res = await fetch(
        `https://api.monnify.com/api/v2/transactions/${encodeURIComponent(data.reference)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      raw = await res.json();
      success = res.ok && raw?.responseBody?.paymentStatus === "PAID";
      amountPaid = success ? Number(raw.responseBody.amountPaid) : 0;
    }

    if (!success) {
      await supabaseAdmin.from("payment_transactions")
        .update({ status: "failed", raw_payload: raw, verified_at: new Date().toISOString() })
        .eq("id", tx.id);
      return { ok: false, status: "failed" as const, amountCredited: 0 };
    }

    const { data: rpc, error: rpcErr } = await supabaseAdmin.rpc("credit_wallet_from_payment", {
      _reference: data.reference,
      _provider: tx.provider,
      _amount_paid: amountPaid,
      _raw: raw,
    });
    if (rpcErr) throw new Error(rpcErr.message);
    return {
      ok: true,
      status: "success" as const,
      amountCredited: Number((rpc as any).amountCredited ?? 0),
    };
  });

// ===== Admin: list payments =====
export const adminListPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden");
    const { data, error } = await supabaseAdmin
      .from("payment_transactions")
      .select("id, user_id, provider, reference, amount_paid, amount_credited, coupon_code, status, created_at, verified_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const userIds = Array.from(new Set((data ?? []).map(r => r.user_id)));
    const { data: profiles } = await supabaseAdmin
      .from("profiles").select("id, email").in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const emailById = new Map((profiles ?? []).map(p => [p.id, p.email]));
    return {
      payments: (data ?? []).map(p => ({ ...p, email: emailById.get(p.user_id) ?? null })),
    };
  });