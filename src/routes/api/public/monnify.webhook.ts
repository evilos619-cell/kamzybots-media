import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/monnify/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.MONIFY_SECRET_KEY;
        if (!secret) return new Response("not configured", { status: 500 });

        const raw = await request.text();
        const signature = request.headers.get("monnify-signature") ?? "";
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

        const eventType = payload?.eventType ?? payload?.event;
        const data = payload?.eventData ?? payload?.data ?? payload;

        if (eventType === "SUCCESSFUL_TRANSACTION" && data) {
          const reference = String(data.paymentReference ?? data.transactionReference ?? "");
          const amountPaid = Number(data.amountPaid ?? data.amount ?? 0);
          if (data.paymentStatus === "PAID" && reference && amountPaid > 0) {
            const { error } = await supabaseAdmin.rpc("credit_wallet_from_payment", {
              _reference: reference,
              _provider: "monnify",
              _amount_paid: amountPaid,
              _raw: payload,
            });
            if (error) {
              console.error("monnify credit error", error);
              return new Response("error", { status: 500 });
            }
          }
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});