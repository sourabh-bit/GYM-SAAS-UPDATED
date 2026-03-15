-- Security definer hardening + index tuning

-- -----------------------------------------------------------------------------
-- Tighten get_user_gym_id to prevent arbitrary lookups
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_gym_id(_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester uuid;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN (SELECT gym_id FROM public.profiles WHERE id = _user_id LIMIT 1);
  END IF;

  requester := auth.uid();
  IF requester IS NULL THEN
    RETURN NULL;
  END IF;

  IF requester <> _user_id AND NOT public.is_super_admin(requester) THEN
    RETURN NULL;
  END IF;

  RETURN (SELECT gym_id FROM public.profiles WHERE id = _user_id LIMIT 1);
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_gym_id(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_gym_id(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- Owner RPCs: enforce role checks (owner or super_admin)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.owner_assign_plan(
  p_member_id UUID,
  p_plan_id UUID,
  p_start_at TIMESTAMPTZ DEFAULT now()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gym_id UUID;
  v_member RECORD;
  v_plan RECORD;
  v_end_at TIMESTAMPTZ;
  v_subscription_id UUID;
BEGIN
  v_gym_id := public.get_user_gym_id(auth.uid());
  IF v_gym_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'owner'::public.app_role) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT id, gym_id, name
  INTO v_member
  FROM public.members
  WHERE id = p_member_id
    AND gym_id = v_gym_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found for this gym';
  END IF;

  SELECT id, gym_id, name, price, duration_days, is_active
  INTO v_plan
  FROM public.plans
  WHERE id = p_plan_id
    AND gym_id = v_gym_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found for this gym';
  END IF;

  IF COALESCE(v_plan.is_active, false) = false THEN
    RAISE EXCEPTION 'Plan is inactive';
  END IF;

  v_end_at := p_start_at + make_interval(days => GREATEST(COALESCE(v_plan.duration_days, 0), 0));

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
    payment_status
  )
  VALUES (
    v_gym_id,
    v_member.id,
    v_member.name,
    v_plan.id,
    v_plan.name,
    p_start_at,
    v_end_at,
    v_plan.price,
    0,
    'cash',
    'pending'::public.payment_status
  )
  RETURNING id INTO v_subscription_id;

  UPDATE public.members
  SET
    plan_id = v_plan.id,
    plan_name = v_plan.name,
    due_amount = v_plan.price,
    payment_status = 'pending'::public.payment_status,
    expiry_at = v_end_at
  WHERE id = v_member.id;

  RETURN jsonb_build_object(
    'member_id', v_member.id,
    'plan_id', v_plan.id,
    'subscription_id', v_subscription_id,
    'start_at', p_start_at,
    'end_at', v_end_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_record_payment(
  p_member_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_upi_ref TEXT DEFAULT NULL
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
  v_method TEXT;
  v_payment_id UUID;
BEGIN
  v_gym_id := public.get_user_gym_id(auth.uid());
  IF v_gym_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'owner'::public.app_role) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF COALESCE(p_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  SELECT
    id,
    gym_id,
    name,
    plan_id,
    plan_name,
    expiry_at,
    due_amount,
    payment_status
  INTO v_member
  FROM public.members
  WHERE id = p_member_id
    AND gym_id = v_gym_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found for this gym';
  END IF;

  IF COALESCE(NULLIF(TRIM(COALESCE(v_member.plan_name, '')), ''), '') = '' THEN
    RAISE EXCEPTION 'Assign a plan before collecting payment';
  END IF;

  v_due_before := GREATEST(COALESCE(v_member.due_amount, 0), 0);

  IF v_due_before > 0 AND p_amount > v_due_before THEN
    RAISE EXCEPTION 'Amount cannot exceed due amount';
  END IF;

  IF LOWER(TRIM(COALESCE(p_payment_method, ''))) = 'upi' THEN
    IF COALESCE(NULLIF(TRIM(COALESCE(p_upi_ref, '')), ''), '') = '' THEN
      RAISE EXCEPTION 'UPI reference is required';
    END IF;
    v_method := 'upi:' || TRIM(p_upi_ref);
  ELSE
    v_method := LOWER(COALESCE(NULLIF(TRIM(COALESCE(p_payment_method, '')), ''), 'cash'));
  END IF;

  v_due_after := GREATEST(v_due_before - p_amount, 0);

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
    created_at
  )
  VALUES (
    v_gym_id,
    v_member.id,
    v_member.name,
    v_member.plan_id,
    v_member.plan_name,
    v_now,
    v_member.expiry_at,
    CASE WHEN v_due_before > 0 THEN v_due_before ELSE p_amount END,
    p_amount,
    v_method,
    CASE WHEN v_due_after = 0 THEN 'paid'::public.payment_status ELSE 'partial'::public.payment_status END,
    v_now
  )
  RETURNING id INTO v_payment_id;

  UPDATE public.members
  SET
    last_payment = p_amount,
    due_amount = v_due_after,
    payment_status = CASE WHEN v_due_after = 0 THEN 'paid'::public.payment_status ELSE 'partial'::public.payment_status END,
    payment_method = v_method,
    payment_date = v_now
  WHERE id = v_member.id;

  RETURN jsonb_build_object(
    'member_id', v_member.id,
    'payment_id', v_payment_id,
    'due_before', v_due_before,
    'due_after', v_due_after,
    'payment_method', v_method
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_set_member_trainer(
  p_member_id UUID,
  p_trainer_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gym_id UUID;
  v_member RECORD;
  v_old_trainer_id UUID;
BEGIN
  v_gym_id := public.get_user_gym_id(auth.uid());
  IF v_gym_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'owner'::public.app_role) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT id, gym_id, trainer_id
  INTO v_member
  FROM public.members
  WHERE id = p_member_id
    AND gym_id = v_gym_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found for this gym';
  END IF;

  v_old_trainer_id := v_member.trainer_id;

  IF p_trainer_id IS NOT NULL THEN
    PERFORM 1
    FROM public.trainers
    WHERE id = p_trainer_id
      AND gym_id = v_gym_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Trainer not found for this gym';
    END IF;
  END IF;

  UPDATE public.members
  SET trainer_id = p_trainer_id
  WHERE id = p_member_id;

  IF v_old_trainer_id IS NOT NULL THEN
    UPDATE public.trainers t
    SET members_count = (
      SELECT COUNT(*)
      FROM public.members m
      WHERE m.trainer_id = t.id
        AND m.gym_id = v_gym_id
    )
    WHERE t.id = v_old_trainer_id
      AND t.gym_id = v_gym_id;
  END IF;

  IF p_trainer_id IS NOT NULL THEN
    UPDATE public.trainers t
    SET members_count = (
      SELECT COUNT(*)
      FROM public.members m
      WHERE m.trainer_id = t.id
        AND m.gym_id = v_gym_id
    )
    WHERE t.id = p_trainer_id
      AND t.gym_id = v_gym_id;
  END IF;

  RETURN jsonb_build_object(
    'member_id', p_member_id,
    'old_trainer_id', v_old_trainer_id,
    'trainer_id', p_trainer_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_check_in_member(
  p_member_id UUID,
  p_member_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gym_id UUID;
  v_member RECORD;
  v_attendance_id UUID;
  v_existing_open_session UUID;
BEGIN
  v_gym_id := public.get_user_gym_id(auth.uid());
  IF v_gym_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'owner'::public.app_role) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT id, gym_id, name
  INTO v_member
  FROM public.members
  WHERE id = p_member_id
    AND gym_id = v_gym_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found for this gym';
  END IF;

  SELECT a.id
  INTO v_existing_open_session
  FROM public.attendance a
  WHERE a.gym_id = v_gym_id
    AND a.member_id = v_member.id
    AND a.check_out IS NULL
  ORDER BY a.check_in DESC
  LIMIT 1;

  IF v_existing_open_session IS NOT NULL THEN
    RAISE EXCEPTION 'Member is already checked in';
  END IF;

  INSERT INTO public.attendance (gym_id, member_id, member_name)
  VALUES (v_gym_id, v_member.id, COALESCE(NULLIF(TRIM(p_member_name), ''), v_member.name))
  RETURNING id INTO v_attendance_id;

  UPDATE public.members
  SET last_checkin = now()
  WHERE id = v_member.id;

  RETURN v_attendance_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_check_out_session(
  p_attendance_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gym_id UUID;
  v_result_id UUID;
BEGIN
  v_gym_id := public.get_user_gym_id(auth.uid());
  IF v_gym_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'owner'::public.app_role) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.attendance
  SET check_out = now()
  WHERE id = p_attendance_id
    AND gym_id = v_gym_id
    AND check_out IS NULL
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Session not found or already checked out';
  END IF;

  RETURN v_result_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.owner_assign_plan(UUID, UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_record_payment(UUID, NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_set_member_trainer(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_check_in_member(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_check_out_session(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- record_gateway_payment: service-role only
-- -----------------------------------------------------------------------------
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
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

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

REVOKE ALL ON FUNCTION public.record_gateway_payment(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_gateway_payment(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_gateway_payment(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO service_role;

-- -----------------------------------------------------------------------------
-- Indexes for hot paths
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_attendance_member_check_in
  ON public.attendance (member_id, check_in DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_member_created_at
  ON public.subscriptions (member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_dunning_status_next_retry
  ON public.payment_dunning_attempts (status, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_member_xp_user_id
  ON public.member_xp (user_id);

CREATE INDEX IF NOT EXISTS idx_members_gym_email
  ON public.members (gym_id, lower(email))
  WHERE email IS NOT NULL AND email <> '';
