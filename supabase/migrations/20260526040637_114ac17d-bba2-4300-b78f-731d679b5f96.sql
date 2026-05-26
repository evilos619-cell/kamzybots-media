
-- 1) Coupons: remove broad authed read, keep admin-only
DROP POLICY IF EXISTS "anyone authed can read active coupons" ON public.coupons;

-- 2) user_roles: add explicit restrictive policies forbidding non-admin writes
--    (defence-in-depth on top of deny-by-default)
CREATE POLICY "only admins insert roles"
ON public.user_roles AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "only admins update roles"
ON public.user_roles AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "only admins delete roles"
ON public.user_roles AS RESTRICTIVE
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Wallet balance non-negative constraint
ALTER TABLE public.profiles
  ADD CONSTRAINT wallet_balance_non_negative CHECK (wallet_balance >= 0) NOT VALID;
ALTER TABLE public.profiles VALIDATE CONSTRAINT wallet_balance_non_negative;

-- 4) Atomic purchase RPC — single transaction, row-locks profile + claims a login
CREATE OR REPLACE FUNCTION public.purchase_product_atomic(
  _user_id uuid,
  _product_id uuid,
  _coupon_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile        profiles%ROWTYPE;
  v_product        products%ROWTYPE;
  v_login          product_logins%ROWTYPE;
  v_coupon         coupons%ROWTYPE;
  v_discount       int := 0;
  v_final_price    numeric;
  v_new_balance    numeric;
  v_order_id       uuid;
BEGIN
  -- Lock the buyer's profile row to serialise concurrent purchases
  SELECT * INTO v_profile FROM profiles WHERE id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF v_profile.is_suspended THEN RAISE EXCEPTION 'Your account is suspended'; END IF;

  SELECT * INTO v_product FROM products WHERE id = _product_id;
  IF NOT FOUND OR NOT v_product.active THEN RAISE EXCEPTION 'Product unavailable'; END IF;

  IF _coupon_code IS NOT NULL AND length(trim(_coupon_code)) > 0 THEN
    SELECT * INTO v_coupon FROM coupons WHERE code = upper(trim(_coupon_code)) FOR UPDATE;
    IF NOT FOUND OR NOT v_coupon.active THEN RAISE EXCEPTION 'Invalid coupon'; END IF;
    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
      RAISE EXCEPTION 'Coupon expired';
    END IF;
    IF v_coupon.max_uses IS NOT NULL AND v_coupon.times_used >= v_coupon.max_uses THEN
      RAISE EXCEPTION 'Coupon fully used';
    END IF;
    v_discount := v_coupon.discount_percent;
  END IF;

  v_final_price := round(v_product.price * (1 - v_discount::numeric / 100), 2);

  IF v_profile.wallet_balance < v_final_price THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Need %', v_final_price;
  END IF;

  -- Claim an available login atomically
  SELECT * INTO v_login
  FROM product_logins
  WHERE product_id = v_product.id AND status = 'available'
  ORDER BY created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Out of stock'; END IF;

  UPDATE product_logins
     SET status = 'sold', sold_to_user_id = _user_id, sold_at = now()
   WHERE id = v_login.id;

  v_new_balance := v_profile.wallet_balance - v_final_price;
  UPDATE profiles SET wallet_balance = v_new_balance WHERE id = _user_id;

  INSERT INTO orders (user_id, product_id, login_id, price_paid, coupon_code, discount_percent, status)
  VALUES (_user_id, v_product.id, v_login.id, v_final_price,
          CASE WHEN v_coupon.id IS NOT NULL THEN v_coupon.code END,
          CASE WHEN v_discount > 0 THEN v_discount END,
          'completed')
  RETURNING id INTO v_order_id;

  INSERT INTO wallet_transactions (user_id, amount, type, note)
  VALUES (_user_id, -v_final_price, 'purchase', 'Purchase: ' || v_product.name);

  IF v_coupon.id IS NOT NULL THEN
    UPDATE coupons SET times_used = times_used + 1 WHERE id = v_coupon.id;
    INSERT INTO coupon_redemptions (coupon_id, user_id, order_id)
    VALUES (v_coupon.id, _user_id, v_order_id);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'productName', v_product.name,
    'pricePaid', v_final_price,
    'loginData', v_login.login_data,
    'newBalance', v_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_product_atomic(uuid, uuid, text) FROM public, anon, authenticated;
