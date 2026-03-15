-- Owner preferences persisted on gyms
ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS owner_preferences JSONB NOT NULL DEFAULT
  '{
    "notifications": {
      "payment_reminders": true,
      "new_member_alerts": true,
      "subscription_expiry": true
    }
  }'::jsonb;

-- Atomic: assign plan to member + create pending subscription
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

-- Atomic: record payment + update member financial fields
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

-- Atomic: assign/unassign trainer + sync trainer member counters
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

-- Atomic: check in member + set last_checkin
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
BEGIN
  v_gym_id := public.get_user_gym_id(auth.uid());
  IF v_gym_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT id, gym_id, name
  INTO v_member
  FROM public.members
  WHERE id = p_member_id
    AND gym_id = v_gym_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found for this gym';
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

-- Atomic: check out session
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
