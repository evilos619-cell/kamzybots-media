
-- 1. Extend coupons
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'both' CHECK (scope IN ('purchase','funding','both')),
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  ADD COLUMN IF NOT EXISTS fixed_amount numeric;

-- 2. payment_transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('paystack','monnify')),
  reference text NOT NULL UNIQUE,
  amount_paid numeric NOT NULL CHECK (amount_paid >= 0),
  amount_credited numeric NOT NULL DEFAULT 0 CHECK (amount_credited >= 0),
  coupon_code text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);

GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT ALL    ON public.payment_transactions TO service_role;

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own payments"
  ON public.payment_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "admins see all payments"
  ON public.payment_transactions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS payment_transactions_user_idx ON public.payment_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_transactions_status_idx ON public.payment_transactions(status, created_at DESC);

-- 3. credit_wallet_from_payment — idempotent
CREATE OR REPLACE FUNCTION public.credit_wallet_from_payment(
  _reference text,
  _provider  text,
  _amount_paid numeric,
  _raw jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx        payment_transactions%ROWTYPE;
  v_coupon    coupons%ROWTYPE;
  v_credited  numeric;
  v_new_bal   numeric;
BEGIN
  SELECT * INTO v_tx FROM payment_transactions
   WHERE reference = _reference FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown payment reference %', _reference;
  END IF;

  IF v_tx.status = 'success' THEN
    RETURN jsonb_build_object('ok', true, 'alreadyCredited', true,
                              'amountCredited', v_tx.amount_credited);
  END IF;

  -- Compute credited (apply funding coupon stored on the row, if any)
  v_credited := _amount_paid;
  IF v_tx.coupon_code IS NOT NULL THEN
    SELECT * INTO v_coupon FROM coupons
      WHERE code = upper(v_tx.coupon_code)
        AND active = true
        AND scope IN ('funding','both')
      FOR UPDATE;
    IF FOUND
       AND (v_coupon.expires_at IS NULL OR v_coupon.expires_at > now())
       AND (v_coupon.max_uses IS NULL OR v_coupon.times_used < v_coupon.max_uses)
    THEN
      IF v_coupon.discount_type = 'percent' AND v_coupon.discount_percent > 0 THEN
        v_credited := round(_amount_paid / (1 - v_coupon.discount_percent::numeric/100), 2);
      ELSIF v_coupon.discount_type = 'fixed' AND coalesce(v_coupon.fixed_amount,0) > 0 THEN
        v_credited := _amount_paid + v_coupon.fixed_amount;
      END IF;
      UPDATE coupons SET times_used = times_used + 1 WHERE id = v_coupon.id;
    END IF;
  END IF;

  UPDATE payment_transactions
     SET status = 'success',
         amount_paid = _amount_paid,
         amount_credited = v_credited,
         provider = _provider,
         raw_payload = _raw,
         verified_at = now()
   WHERE id = v_tx.id;

  UPDATE profiles
     SET wallet_balance = wallet_balance + v_credited
   WHERE id = v_tx.user_id
   RETURNING wallet_balance INTO v_new_bal;

  INSERT INTO wallet_transactions (user_id, amount, type, note)
  VALUES (v_tx.user_id, v_credited, 'funding',
          _provider || ' funding ' || _reference ||
          CASE WHEN v_credited > _amount_paid
               THEN ' (coupon '||v_tx.coupon_code||')' ELSE '' END);

  RETURN jsonb_build_object('ok', true, 'alreadyCredited', false,
                            'amountCredited', v_credited,
                            'newBalance', v_new_bal,
                            'userId', v_tx.user_id);
END $$;

REVOKE ALL ON FUNCTION public.credit_wallet_from_payment(text,text,numeric,jsonb) FROM public, anon, authenticated;
