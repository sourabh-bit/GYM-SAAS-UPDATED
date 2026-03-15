-- Owner + Member sync foundation, notifications audience hardening, and scale indexes

-- -----------------------------------------------------------------------------
-- Notification hardening: owner/member audience split + deterministic dedupe
-- -----------------------------------------------------------------------------

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'owner'
    CHECK (audience IN ('owner', 'member')),
  ADD COLUMN IF NOT EXISTS recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT,
  ADD COLUMN IF NOT EXISTS dedupe_recipient TEXT NOT NULL DEFAULT 'gym';

UPDATE public.notifications
SET dedupe_recipient = 'gym'
WHERE dedupe_recipient IS NULL OR dedupe_recipient = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe_unique
  ON public.notifications (gym_id, audience, dedupe_recipient, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_owner_feed
  ON public.notifications (gym_id, is_read, created_at DESC)
  WHERE audience = 'owner';

CREATE INDEX IF NOT EXISTS idx_notifications_member_feed
  ON public.notifications (recipient_user_id, is_read, created_at DESC)
  WHERE audience = 'member';

CREATE INDEX IF NOT EXISTS idx_notifications_gym_audience_created
  ON public.notifications (gym_id, audience, created_at DESC);

DO $$
DECLARE
  _policy record;
BEGIN
  FOR _policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', _policy.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "Notifications owner select by gym managers"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  audience = 'owner'
  AND public.can_manage_gym_data(gym_id)
);

CREATE POLICY "Notifications member select own"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  audience = 'member'
  AND recipient_user_id = auth.uid()
);

CREATE POLICY "Notifications owner insert by gym managers"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  audience = 'owner'
  AND public.can_manage_gym_data(gym_id)
  AND recipient_user_id IS NULL
);

CREATE POLICY "Notifications member insert by gym managers"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  audience = 'member'
  AND public.can_manage_gym_data(gym_id)
  AND recipient_user_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.members m
    WHERE m.user_id = recipient_user_id
      AND m.gym_id = notifications.gym_id
  )
);

CREATE POLICY "Notifications owner update by gym managers"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  audience = 'owner'
  AND public.can_manage_gym_data(gym_id)
)
WITH CHECK (
  audience = 'owner'
  AND public.can_manage_gym_data(gym_id)
);

CREATE POLICY "Notifications member update own read state"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  audience = 'member'
  AND recipient_user_id = auth.uid()
)
WITH CHECK (
  audience = 'member'
  AND recipient_user_id = auth.uid()
);

CREATE POLICY "Notifications delete by gym managers"
ON public.notifications
FOR DELETE
TO authenticated
USING (public.can_manage_gym_data(gym_id));

-- -----------------------------------------------------------------------------
-- Member sync tables
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.member_workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  migrated_from_local BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id)
);

CREATE TABLE IF NOT EXISTS public.member_workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT current_date,
  plan_name TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  completed_sets INTEGER NOT NULL DEFAULT 0 CHECK (completed_sets >= 0),
  total_sets INTEGER NOT NULL DEFAULT 0 CHECK (total_sets >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.member_progress_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT current_date,
  weight NUMERIC(6,2),
  workout BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NOT NULL DEFAULT '',
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.member_profile_settings (
  member_id UUID PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  height_cm INTEGER,
  age INTEGER,
  gender TEXT,
  goal_weight NUMERIC(6,2),
  goal_months INTEGER NOT NULL DEFAULT 2,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  migrated_from_local BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT member_profile_settings_gender_check CHECK (
    gender IS NULL OR gender IN ('male', 'female', 'other')
  )
);

CREATE INDEX IF NOT EXISTS idx_member_workout_plans_user_id
  ON public.member_workout_plans (user_id);
CREATE INDEX IF NOT EXISTS idx_member_workout_plans_gym_id
  ON public.member_workout_plans (gym_id);

CREATE INDEX IF NOT EXISTS idx_member_workout_sessions_member_date
  ON public.member_workout_sessions (member_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_member_workout_sessions_gym_date
  ON public.member_workout_sessions (gym_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_member_workout_sessions_user_date
  ON public.member_workout_sessions (user_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_member_progress_entries_member_date
  ON public.member_progress_entries (member_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_member_progress_entries_gym_date
  ON public.member_progress_entries (gym_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_member_progress_entries_user_date
  ON public.member_progress_entries (user_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_member_profile_settings_user
  ON public.member_profile_settings (user_id);
CREATE INDEX IF NOT EXISTS idx_member_profile_settings_gym
  ON public.member_profile_settings (gym_id);

-- -----------------------------------------------------------------------------
-- Consistency triggers for member sync tables
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_member_owned_record_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_member RECORD;
BEGIN
  SELECT id, gym_id, user_id
  INTO v_member
  FROM public.members
  WHERE id = NEW.member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'member_id does not reference an existing member';
  END IF;

  IF v_member.gym_id IS DISTINCT FROM NEW.gym_id THEN
    RAISE EXCEPTION 'gym_id must match member.gym_id';
  END IF;

  IF v_member.user_id IS NULL THEN
    RAISE EXCEPTION 'member must be linked to a user account';
  END IF;

  IF v_member.user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'user_id must match member.user_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_member_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_member_workout_plans_consistency ON public.member_workout_plans;
CREATE TRIGGER trg_member_workout_plans_consistency
  BEFORE INSERT OR UPDATE ON public.member_workout_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_member_owned_record_consistency();

DROP TRIGGER IF EXISTS trg_member_workout_sessions_consistency ON public.member_workout_sessions;
CREATE TRIGGER trg_member_workout_sessions_consistency
  BEFORE INSERT OR UPDATE ON public.member_workout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_member_owned_record_consistency();

DROP TRIGGER IF EXISTS trg_member_progress_entries_consistency ON public.member_progress_entries;
CREATE TRIGGER trg_member_progress_entries_consistency
  BEFORE INSERT OR UPDATE ON public.member_progress_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_member_owned_record_consistency();

DROP TRIGGER IF EXISTS trg_member_profile_settings_consistency ON public.member_profile_settings;
CREATE TRIGGER trg_member_profile_settings_consistency
  BEFORE INSERT OR UPDATE ON public.member_profile_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_member_owned_record_consistency();

DROP TRIGGER IF EXISTS trg_member_workout_plans_touch_updated_at ON public.member_workout_plans;
CREATE TRIGGER trg_member_workout_plans_touch_updated_at
  BEFORE UPDATE ON public.member_workout_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_member_updated_at();

DROP TRIGGER IF EXISTS trg_member_profile_settings_touch_updated_at ON public.member_profile_settings;
CREATE TRIGGER trg_member_profile_settings_touch_updated_at
  BEFORE UPDATE ON public.member_profile_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_member_updated_at();

-- -----------------------------------------------------------------------------
-- RLS policies for member sync tables
-- -----------------------------------------------------------------------------

ALTER TABLE public.member_workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_progress_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_profile_settings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  _table text;
  _policy record;
BEGIN
  FOREACH _table IN ARRAY ARRAY[
    'member_workout_plans',
    'member_workout_sessions',
    'member_progress_entries',
    'member_profile_settings'
  ]
  LOOP
    FOR _policy IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = _table
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', _policy.policyname, _table);
    END LOOP;
  END LOOP;
END;
$$;

CREATE POLICY "Member workout plans select own"
ON public.member_workout_plans
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Member workout plans mutate own"
ON public.member_workout_plans
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Member workout plans select by owner admin"
ON public.member_workout_plans
FOR SELECT
TO authenticated
USING (public.can_manage_gym_data(gym_id));

CREATE POLICY "Member workout sessions select own"
ON public.member_workout_sessions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Member workout sessions mutate own"
ON public.member_workout_sessions
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Member workout sessions select by owner admin"
ON public.member_workout_sessions
FOR SELECT
TO authenticated
USING (public.can_manage_gym_data(gym_id));

CREATE POLICY "Member progress entries select own"
ON public.member_progress_entries
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Member progress entries mutate own"
ON public.member_progress_entries
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Member progress entries select by owner admin"
ON public.member_progress_entries
FOR SELECT
TO authenticated
USING (public.can_manage_gym_data(gym_id));

CREATE POLICY "Member profile settings select own"
ON public.member_profile_settings
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Member profile settings mutate own"
ON public.member_profile_settings
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Member profile settings select by owner admin"
ON public.member_profile_settings
FOR SELECT
TO authenticated
USING (public.can_manage_gym_data(gym_id));

-- -----------------------------------------------------------------------------
-- Hot-path indexes for 10k member scale
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_members_gym_created_at
  ON public.members (gym_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_gym_status
  ON public.members (gym_id, status);
CREATE INDEX IF NOT EXISTS idx_members_gym_payment_status
  ON public.members (gym_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_members_gym_plan
  ON public.members (gym_id, plan_id);
CREATE INDEX IF NOT EXISTS idx_members_gym_trainer
  ON public.members (gym_id, trainer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_gym_created_at
  ON public.subscriptions (gym_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_gym_member_created_at
  ON public.subscriptions (gym_id, member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_gym_payment_status
  ON public.subscriptions (gym_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_gym_plan
  ON public.subscriptions (gym_id, plan_id);

CREATE INDEX IF NOT EXISTS idx_attendance_gym_check_in
  ON public.attendance (gym_id, check_in DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_gym_member_check_in
  ON public.attendance (gym_id, member_id, check_in DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_gym_open_sessions
  ON public.attendance (gym_id, check_out)
  WHERE check_out IS NULL;

CREATE INDEX IF NOT EXISTS idx_member_xp_gym_xp
  ON public.member_xp (gym_id, xp DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_completions_member_completed_at
  ON public.challenge_completions (member_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_completions_gym_completed_at
  ON public.challenge_completions (gym_id, completed_at DESC);
