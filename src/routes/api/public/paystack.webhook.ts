import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/paystack/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYSTARK_SECRET_KEY;
        if (!secret) return new Response("not configured", { status: 500 });

        const raw = await request.text();
        const signature = request.headers.get("x-paystack-signature") ?? "";
        const expected = createHmac("sha512", secret).update(raw).digest("hex");

        const a = Buffer.from(signature, "utf8");
        const b = Buffer.from(expected, "utf8");
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("invalid signature", { status: 401 });
        }

        let payload: any;
        try { payload = JSON.parse(raw); } catch {
          return new Response("bad json", { status: 400 });
        }

        if (payload?.event === "charge.success" && payload?.data) {
          const reference = String(payload.data.reference ?? "");
          const amountPaid = Number(payload.data.amount ?? 0) / 100;
          if (reference && amountPaid > 0) {
            const { error } = await supabaseAdmin.rpc("credit_wallet_from_payment", {
              _reference: reference,
              _provider: "paystack",
              _amount_paid: amountPaid,
              _raw: payload,
            });
            if (error) {
              console.error("paystack credit error", error);
              return new Response("error", { status: 500 });
            }
          }
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});