## Goal

Ship a production-ready purchase + funding loop that does not depend on any email service. Money flows in via Paystack or Monnify (both go straight to your connected accounts), webhooks credit the wallet, purchases are stored against the user, and the user collects their login credentials inside `/dashboard/products`.

## 1. Database changes (single migration)

New + altered tables:

- `payment_transactions` — every funding attempt
  - `id`, `user_id`, `provider` (`paystack` | `monnify`), `reference` (unique), `amount_paid` (what user paid), `amount_credited` (what hits wallet, after coupon), `coupon_code`, `status` (`pending` | `success` | `failed`), `raw_payload jsonb`, `created_at`, `verified_at`
  - RLS: user sees own; admins see all; only service role inserts/updates
- Extend `coupons`: add `scope` (`purchase` | `funding` | `both`, default `both`) and `discount_type` (`percent` | `fixed`, default `percent`) and `fixed_amount numeric` (nullable). Keep `discount_percent` for back-compat.
- Add view `user_purchases` (or just query `orders` joined with `products` + `product_logins`) — no new table needed; `orders` already links `user_id`, `product_id`, `login_id`, `price_paid`, `created_at`. RLS already returns user's own orders.

New RPCs:

- `apply_funding_coupon(_code text, _amount_paid numeric) returns jsonb` — returns `{ amount_credited, coupon_code }`. Used by the verification routes; locks + increments `times_used` atomically.
- `credit_wallet_from_payment(_user_id uuid, _reference text, _provider text, _amount_paid numeric, _coupon_code text, _raw jsonb) returns jsonb` — idempotent: if `reference` already `success`, returns existing record without re-crediting. Otherwise computes credited amount (with coupon), updates `profiles.wallet_balance`, inserts `wallet_transactions`, marks `payment_transactions.status = 'success'`.

## 2. Payment initialization (server functions)

`src/lib/payments.functions.ts`:

- `initPaystackPayment({ amount, couponCode })` — calls Paystack `/transaction/initialize` with user email, amount in kobo, our generated `reference`, `callback_url = ${SITE_URL}/wallet?ref=...`. Inserts `payment_transactions` row with `status='pending'`. Returns `{ authorization_url, reference }`.
- `initMonnifyPayment({ amount, couponCode })` — same shape, uses Monnify `/api/v1/merchant/transactions/init-transaction`, returns the checkout URL.
- `verifyPaymentByReference({ reference })` — user-callable fallback after redirect: re-verifies with provider, then calls `credit_wallet_from_payment`. Used so credit happens even if the webhook is slow.

`SITE_URL` derived from `process.env.SITE_URL` (set in deploy env). Fallback to request origin server-side.

## 3. Webhooks (TanStack server routes — no edge functions)

- `src/routes/api/public/paystack.webhook.ts` — verify `x-paystack-signature` HMAC SHA512 against raw body using `PAYSTACK_SECRET_KEY`. On `charge.success`, call `credit_wallet_from_payment`.
- `src/routes/api/public/monnify.webhook.ts` — verify `monnify-signature` HMAC SHA512 against raw body using `MONIFY_SECRET_KEY`. On `SUCCESSFUL_TRANSACTION`, call `credit_wallet_from_payment`.

Both are idempotent via `reference`. Webhook URLs you'll paste into Paystack/Monnify dashboard:
- `https://kamzybotsmedia.store/api/public/paystack.webhook`
- `https://kamzybotsmedia.store/api/public/monnify.webhook`

## 4. Wallet UI rewrite (`/wallet`)

Replace WhatsApp-only funding with a real funding card:
- Amount input (NGN), coupon input, two buttons: **Pay with Paystack** / **Pay with Monnify**.
- On click: call `initPaystackPayment` / `initMonnifyPayment`, then `window.location.assign(authorization_url)`.
- On return (`?ref=...`): show "verifying" state, call `verifyPaymentByReference`, toast success, refresh balance and txns.

## 5. Dashboard product delivery

- New route `src/routes/_authenticated.tsx` (pathless layout) + move/duplicate dashboard + products under it. Loader gate calls `supabase.auth.getUser()`; if missing, `throw redirect({ to: "/login", search: { redirect: location.href } })`.
- New `src/routes/_authenticated/dashboard.products.tsx` → URL `/dashboard/products`.
  - Server fn `getMyPurchases()` returns `orders` joined with `products` and `product_logins.login_data` for that user.
  - UI: responsive grid of cards — product image, name, purchase date, status badge, **Reveal credentials** (toggles `login_data`), **Copy**, **Buy again** link.
  - Empty state: "You have not purchased any products yet."
- Update login + register to redirect to `/dashboard/products` after success (or to `search.redirect` if present).
- Update shop's purchase modal: in addition to showing credentials inline, show CTA "View in My Products" → `/dashboard/products`.

## 6. Coupons applied to funding

- Extend `manage.coupons.tsx`: add `scope` and `discount_type` controls, optional `fixed_amount`.
- `apply_funding_coupon` does the math:
  - `percent` → `credited = amount_paid / (1 - p/100)` (your example: ₦9,000 paid with 10% → ₦10,000 credited).
  - `fixed` → `credited = amount_paid + fixed_amount`.
- Funding flow stores the chosen coupon on the `payment_transactions` row; webhook reads it from there (never trust webhook payload for coupon).

## 7. Admin transactions view

- New `src/routes/manage.payments.tsx` listing `payment_transactions` (filter by status / provider, search by reference / email). Read-only.
- Add to `manage.index.tsx` sidebar.

## 8. Secrets + env

Already present: `PAYSTARK_PUBLIC_KEY`, `PAYSTARK_SECRET_KEY`, `MONIFY_API_KEY`, `MONIFY_SECRET_KEY`, `MONIFY_CONTRACT_CODE`. Will ask you to add:
- `SITE_URL=https://kamzybotsmedia.store`
- (Optional, for separate webhook secrets) — Paystack uses the secret key for webhook HMAC, so no extra. Monnify uses `MONIFY_SECRET_KEY` for the `transactionHash` check — already set.

## 9. Auth + deployment correctness

- Login redirect: respect `?redirect=` search param; default to `/dashboard/products`.
- Register: `emailRedirectTo` → `${SITE_URL}/auth/callback`; callback redirects to `/dashboard/products`.
- Remove any hardcoded `kamzybotsmedia.store` from code — derive from `SITE_URL` env or `window.location.origin`.
- `wrangler.jsonc` already correct after prior fix.

## 10. Out of scope (will not do unless asked)

- Replacing the existing in-wallet purchase flow with a "pay at checkout" flow. Purchases continue to deduct from wallet (matches your "fund wallet → buy" model). Coupon at purchase time keeps working as today.
- Building an automated file-download system for non-credential products. Today's products are login credentials (`product_logins.login_data`), shown securely in the dashboard. Add me a note if you also sell file products and I'll layer signed Supabase Storage URLs on top.

## Open questions before I build

1. **Webhook URL** — confirm I should use `https://kamzybotsmedia.store/api/public/...` (your custom domain). If you're still routing through the Lovable preview, give me the URL to register in Paystack/Monnify.
2. **`SITE_URL` secret** — I'll add it via the secrets tool. OK to use `https://kamzybotsmedia.store`?
3. **Funding coupon math** — confirm the spec: "₦9,000 paid with 10% coupon → ₦10,000 credited" (gross-up). The alternative reading is "10% discount on what you owe for the same credit" which is the same number — just confirming.
4. Any minimum / maximum funding amount? I'll default to **min ₦100, max ₦1,000,000** per transaction unless you say otherwise.

Reply with answers (or just "go") and I'll implement in this order: migration → server fns + webhooks → wallet UI → `_authenticated` gate + `/dashboard/products` → admin payments page → login/register redirect fixes.