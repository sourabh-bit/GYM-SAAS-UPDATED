-- Razorpay billing integration: gateway mappings, intents, subscriptions, and dunning

-- ---------------------------------------------------------------------------
-- Columns for gateway metadata
-- ---------------------------------------------------------------------------

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS autopay_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gateway_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS gateway_subscription_id TEXT;

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS razorpay_plan_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_plan_currency TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_plan_interval TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_plan_interval_count INTEGER,
  ADD COLUMN IF NOT EXISTS razorpay_plan_amount NUMERIC;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS gateway TEXT,
  ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS gateway_order_id TEXT,
  ADD COLUMN IF NOT EXISTS gateway_subscription_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_gateway_payment_id
  ON public.subscriptions (gateway_payment_id)
  WHERE gateway_payment_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Gateway customers (per member)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payment_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  gateway TEXT NOT NULL DEFAULT 'razorpay',
  gateway_customer_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, gateway)
);

ALTER TABLE public.payment_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payment customers select by gym managers"
  ON public.payment_customers FOR SELECT
  TO authenticated
  USING (public.can_manage_gym_data(gym_id));

CREATE POLICY "Payment customers insert by gym managers"
  ON public.payment_customers FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_gym_data(gym_id));

-- ---------------------------------------------------------------------------
-- Payment intents (orders / one-time payments)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  gateway TEXT NOT NULL DEFAULT 'razorpay',
  gateway_order_id TEXT UNIQUE,
  gateway_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'authorized', 'captured', 'failed', 'cancelled', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payment intents select by gym managers"
  ON public.payment_intents FOR SELECT
  TO authenticated
  USING (public.can_manage_gym_data(gym_id));

CREATE POLICY "Payment intents insert by gym managers"
  ON public.payment_intents FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_gym_data(gym_id));

CREATE POLICY "Payment intents update by gym managers"
  ON public.payment_intents FOR UPDATE
  TO authenticated
  USING (public.can_manage_gym_data(gym_id))
  WITH CHECK (public.can_manage_gym_data(gym_id));

CREATE INDEX IF NOT EXISTS idx_payment_intents_order_id
  ON public.payment_intents (gateway_order_id);

CREATE INDEX IF NOT EXISTS idx_payment_intents_member
  ON public.payment_intents (member_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Gateway subscriptions (autopay)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payment_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  gateway TEXT NOT NULL DEFAULT 'razorpay',
  gateway_subscription_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'active', 'paused', 'cancelled', 'completed', 'expired', 'failed')),
  current_start TIMESTAMPTZ,
  current_end TIMESTAMPTZ,
  next_charge_at TIMESTAMPTZ,
  autopay_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, gateway)
);

ALTER TABLE public.payment_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payment subscriptions select by gym managers"
  ON public.payment_subscriptions FOR SELECT
  TO authenticated
  USING (public.can_manage_gym_data(gym_id));

CREATE POLICY "Payment subscriptions insert by gym managers"
  ON public.payment_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_gym_data(gym_id));

CREATE POLICY "Payment subscriptions update by gym managers"
  ON public.payment_subscriptions FOR UPDATE
  TO authenticated
  USING (public.can_manage_gym_data(gym_id))
  WITH CHECK (public.can_manage_gym_data(gym_id));

CREATE INDEX IF NOT EXISTS idx_payment_subscriptions_gateway_id
  ON public.payment_subscriptions (gateway_subscription_id);

-- ---------------------------------------------------------------------------
-- Webhook events (idempotency)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  UNIQUE (gateway, event_id)
);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

-- No policies: only service role should access webhook events.

-- ---------------------------------------------------------------------------
-- Dunning attempts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payment_dunning_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  gateway TEXT NOT NULL DEFAULT 'razorpay',
  attempt_no INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'sent', 'paid', 'failed', 'cancelled')),
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_dunning_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dunning attempts select by gym managers"
  ON public.payment_dunning_attempts FOR SELECT
  TO authenticated
  USING (public.can_manage_gym_data(gym_id));

CREATE POLICY "Dunning attempts insert by gym managers"
  ON public.payment_dunning_attempts FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_gym_data(gym_id));

CREATE POLICY "Dunning attempts update by gym managers"
  ON public.payment_dunning_attempts FOR UPDATE
  TO authenticated
  USING (public.can_manage_gym_data(gym_id))
  WITH CHECK (public.can_manage_gym_data(gym_id));

CREATE INDEX IF NOT EXISTS idx_payment_dunning_member
  ON public.payment_dunning_attempts (member_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RPC: record gateway payment (atomic)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_gateway_payment(
  p_member_id UUID,
  p_amount NUMERIC,
  p_gateway TEXT,
  p_gateway_payment_id TEXT,
  p_gateway_order_id TEXT DEFAULT NULL,
  p_gateway_subscription_id TEXT DEFAULT NULL,
  p_extend_membership BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gym_id UUID;
  v_member RECORD;
  v_now TIMESTAMPTZ := now();
  v_due_before NUMERIC;
  v_due_after NUMERIC;
  v_payment_id UUID;
  v_new_expiry TIMESTAMPTZ;
BEGIN
  IF COALESCE(p_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  SELECT id, gym_id, name, plan_id, plan_name, expiry_at, due_amount
  INTO v_member
  FROM public.members
  WHERE id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  v_gym_id := v_member.gym_id;

  IF COALESCE(NULLIF(TRIM(COALESCE(v_member.plan_name, '')), ''), '') = '' THEN
    RAISE EXCEPTION 'Assign a plan before collecting payment';
  END IF;

  v_due_before := GREATEST(COALESCE(v_member.due_amount, 0), 0);
  v_due_after := GREATEST(v_due_before - p_amount, 0);

  IF p_extend_membership THEN
    v_new_expiry := COALESCE(v_member.expiry_at, v_now);
    IF v_new_expiry < v_now THEN
      v_new_expiry := v_now;
    END IF;
    v_new_expiry := v_new_expiry + make_interval(days => COALESCE(
      (SELECT duration_days FROM public.plans WHERE id = v_member.plan_id),
      30
    ));
  ELSE
    v_new_expiry := v_member.expiry_at;
  END IF;

  INSERT INTO public.subscriptions (
    gym_id,
    member_id,
    member_name,
    plan_id,
    plan_name,
    start_date,
    end_date,
    amount,
    amount_paid,
    payment_method,
    payment_status,
    gateway,
    gateway_payment_id,
    gateway_order_id,
    gateway_subscription_id,
    created_at
  )
  VALUES (
    v_gym_id,
    v_member.id,
    v_member.name,
    v_member.plan_id,
    v_member.plan_name,
    v_now,
    v_new_expiry,
    CASE WHEN v_due_before > 0 THEN v_due_before ELSE p_amount END,
    p_amount,
    COALESCE(NULLIF(TRIM(p_gateway), ''), 'razorpay'),
    CASE WHEN v_due_after = 0 THEN 'paid'::public.payment_status ELSE 'partial'::public.payment_status END,
    COALESCE(NULLIF(TRIM(p_gateway), ''), 'razorpay'),
    p_gateway_payment_id,
    p_gateway_order_id,
    p_gateway_subscription_id,
    v_now
  )
  RETURNING id INTO v_payment_id;

  UPDATE public.members
  SET
    last_payment = p_amount,
    due_amount = v_due_after,
    payment_status = CASE WHEN v_due_after = 0 THEN 'paid'::public.payment_status ELSE 'partial'::public.payment_status END,
    payment_method = COALESCE(NULLIF(TRIM(p_gateway), ''), 'razorpay'),
    payment_date = v_now,
    expiry_at = v_new_expiry
  WHERE id = v_member.id;

  RETURN jsonb_build_object(
    'member_id', v_member.id,
    'payment_id', v_payment_id,
    'due_before', v_due_before,
    'due_after', v_due_after
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_gateway_payment(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
