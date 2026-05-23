
## Goal

Build a complete admin panel behind admin authentication, plus the user-facing product purchase flow that delivers product "logins" by email.

## 1. Database (one migration)

New tables (all with RLS):

- `app_role` enum: `admin`, `user`
- `user_roles` (`user_id`, `role`) — separate table to avoid privilege escalation. `has_role()` SECURITY DEFINER function.
- Add `is_suspended boolean default false` to `profiles`.
- `coupons` — `code` (unique), `discount_percent` (int 1–100), `active`, `max_uses`, `times_used`, `expires_at`.
- `coupon_redemptions` — log of which user used which coupon (prevents double-use).
- `products` — `name`, `description`, `price`, `image_url`, `active`.
- `product_logins` — `product_id`, `login_data` (text, e.g. `email:pass`), `status` (`available`/`sold`), `sold_to_user_id`, `sold_at`.
- `orders` — `user_id`, `product_id`, `price_paid`, `coupon_code`, `login_id`, `status`, `created_at`.
- `wallet_transactions` — `user_id`, `amount`, `type` (`fund`, `purchase`, `admin_credit`), `note`, `admin_id`.

RLS rules:
- Users see only their own profile/orders/transactions.
- Admins (via `has_role`) can read/write everything.
- `product_logins.login_data` only readable by admins or by the buyer (via their own order).
- Suspended users blocked from inserting orders (trigger).

Seed: insert admin role for `kamzybotsmedia@gmail.com` once that account exists (handled via a server function "promote me" if email matches, or done manually after first login).

## 2. Admin auth

- Update `/admin` login page to use `supabase.auth.signInWithPassword`, then check `has_role(uid, 'admin')`. If not admin → sign out + error.
- New `_adminAuth` layout route (`src/routes/admin/_layout.tsx`) that gates every admin sub-route. Redirects to `/admin` if not signed in or not admin.
- Seed the admin: after the user registers `kamzybotsmedia@gmail.com`, a server function auto-grants admin if email matches the hardcoded owner email.

Note on the password `@KAMZY619`: the user sets this themselves at registration. The login page just authenticates against Supabase Auth — we cannot hardcode a password securely.

## 3. Admin panel pages

Layout with sidebar nav. Pages:

1. **Dashboard** (`/admin/panel`) — stat cards (users, orders, revenue).
2. **Coupons** (`/admin/panel/coupons`) — create/edit/delete coupon codes with discount %.
3. **Products** (`/admin/panel/products`) — CRUD products; per product, manage stock by pasting login entries (one per line). Shows available count.
4. **Users** (`/admin/panel/users`) — list all users with email/phone, "Suspend/Unsuspend" toggle, "Fund wallet" action (amount + note).
5. **Admins** (`/admin/panel/admins`) — add admin by email, remove admin.
6. **Change Password** (`/admin/panel/password`) — `supabase.auth.updateUser({ password })`.

## 4. User-facing purchase flow

- Update `/dashboard` (or new `/products` user view) so each product card shows price, stock, "Buy".
- Buy flow: enter optional coupon code → server function validates coupon, checks wallet balance, deducts price (with discount), assigns one available `product_logins` row, creates order, emails the login to user's email.
- Email via Lovable Emails (set up email infrastructure + one transactional template `product-login-delivery`).
- "Fund wallet" page for users (manual top-up requested via WhatsApp for now; admin credits via panel).

## 5. Suspension enforcement

- DB trigger on `orders` insert: reject if `profiles.is_suspended = true`.
- Login flow: after sign-in, if suspended, sign out + toast "Account suspended".

## Technical notes

- All admin mutations via `createServerFn` with `requireSupabaseAuth` + `has_role(uid,'admin')` check.
- Email delivery uses `email_domain--setup_email_infra` + `email_domain--scaffold_transactional_email`, then a `product-login-delivery` template called from the purchase server fn.
- Wire `attachSupabaseAuth` in `src/start.ts` if not already.

## Out of scope (flagged for user)

- Real payment gateway integration (Paystack/Flutterwave). Wallet funding will be admin-credited only for now; you can add a gateway later.
- "Password is visible only to them" — Supabase stores passwords as one-way hashes; nobody (not even the user) can view the password. Users can only **reset** it. I'll add a "Forgot password" link.

## Confirm before I build

This is a large build (~10–15 files + migration + email setup). Want me to proceed with everything above, or trim anything (e.g. skip email delivery for now, skip wallet funding gateway note)?
