-- Tenant isolation hardening migration
-- This migration enforces owner/member boundary rules, removes broad cross-tenant reads,
-- and adds a safe global leaderboard interface.

-- -----------------------------------------------------------------------------
-- Helper functions used by policies
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_gym_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_gym_id(auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_gym_data(_gym_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _gym_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.gyms g
        WHERE g.id = _gym_id
          AND g.owner_id = _user_id
      )
      OR public.is_super_admin(_user_id)
    );
$$;

-- Harden has_role so authenticated users can only query themselves (unless super_admin).
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_id uuid;
BEGIN
  -- Allow service role callers without auth.uid context.
  IF auth.role() = 'service_role' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    );
  END IF;

  requester_id := auth.uid();
  IF requester_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF requester_id <> _user_id AND NOT public.is_super_admin(requester_id) THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.current_user_gym_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_gym_id() TO authenticated;

REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.can_manage_gym_data(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_gym_data(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- -----------------------------------------------------------------------------
-- Backfill/cleanup before tighter integrity and policies
-- -----------------------------------------------------------------------------

-- Keep linkage consistent for activity/XP tables based on member ownership.
UPDATE public.attendance a
SET gym_id = m.gym_id
FROM public.members m
WHERE a.member_id = m.id
  AND a.gym_id IS DISTINCT FROM m.gym_id;

UPDATE public.subscriptions s
SET gym_id = m.gym_id
FROM public.members m
WHERE s.member_id = m.id
  AND s.gym_id IS DISTINCT FROM m.gym_id;

UPDATE public.member_xp mx
SET gym_id = m.gym_id,
    user_id = m.user_id
FROM public.members m
WHERE mx.member_id = m.id
  AND m.user_id IS NOT NULL
  AND (
    mx.gym_id IS DISTINCT FROM m.gym_id
    OR mx.user_id IS DISTINCT FROM m.user_id
  );

UPDATE public.challenge_completions cc
SET gym_id = m.gym_id,
    user_id = m.user_id
FROM public.members m
WHERE cc.member_id = m.id
  AND m.user_id IS NOT NULL
  AND (
    cc.gym_id IS DISTINCT FROM m.gym_id
    OR cc.user_id IS DISTINCT FROM m.user_id
  );

-- Remove cross-gym references that cannot be trusted.
UPDATE public.members m
SET plan_id = NULL
WHERE m.plan_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.plans p
    WHERE p.id = m.plan_id
      AND p.gym_id = m.gym_id
  );

UPDATE public.members m
SET trainer_id = NULL
WHERE m.trainer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.trainers t
    WHERE t.id = m.trainer_id
      AND t.gym_id = m.gym_id
  );

UPDATE public.subscriptions s
SET plan_id = NULL
WHERE s.plan_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.plans p
    WHERE p.id = s.plan_id
      AND p.gym_id = s.gym_id
  );

-- Enforce one auth user per member record when linked.
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_unique_user_id_not_null
  ON public.members (user_id)
  WHERE user_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Relational integrity guards (cross-gym consistency)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_members_gym_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.plan_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.plans p
      WHERE p.id = NEW.plan_id
        AND p.gym_id = NEW.gym_id
    ) THEN
      RAISE EXCEPTION 'members.plan_id must reference a plan in the same gym';
    END IF;
  END IF;

  IF NEW.trainer_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.trainers t
      WHERE t.id = NEW.trainer_id
        AND t.gym_id = NEW.gym_id
    ) THEN
      RAISE EXCEPTION 'members.trainer_id must reference a trainer in the same gym';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_attendance_gym_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  member_gym uuid;
BEGIN
  IF NEW.member_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT m.gym_id INTO member_gym
  FROM public.members m
  WHERE m.id = NEW.member_id;

  IF member_gym IS NULL THEN
    RAISE EXCEPTION 'attendance.member_id does not reference an existing member';
  END IF;

  IF member_gym IS DISTINCT FROM NEW.gym_id THEN
    RAISE EXCEPTION 'attendance.member_id must belong to the same gym as attendance.gym_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_subscriptions_gym_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  member_gym uuid;
  plan_gym uuid;
BEGIN
  IF NEW.member_id IS NOT NULL THEN
    SELECT m.gym_id INTO member_gym
    FROM public.members m
    WHERE m.id = NEW.member_id;

    IF member_gym IS NULL THEN
      RAISE EXCEPTION 'subscriptions.member_id does not reference an existing member';
    END IF;

    IF member_gym IS DISTINCT FROM NEW.gym_id THEN
      RAISE EXCEPTION 'subscriptions.member_id must belong to the same gym as subscriptions.gym_id';
    END IF;
  END IF;

  IF NEW.plan_id IS NOT NULL THEN
    SELECT p.gym_id INTO plan_gym
    FROM public.plans p
    WHERE p.id = NEW.plan_id;

    IF plan_gym IS NULL THEN
      RAISE EXCEPTION 'subscriptions.plan_id does not reference an existing plan';
    END IF;

    IF plan_gym IS DISTINCT FROM NEW.gym_id THEN
      RAISE EXCEPTION 'subscriptions.plan_id must belong to the same gym as subscriptions.gym_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_member_xp_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  member_gym uuid;
  member_user uuid;
BEGIN
  SELECT m.gym_id, m.user_id
  INTO member_gym, member_user
  FROM public.members m
  WHERE m.id = NEW.member_id;

  IF member_gym IS NULL THEN
    RAISE EXCEPTION 'member_xp.member_id does not reference an existing member';
  END IF;

  IF member_user IS NULL THEN
    RAISE EXCEPTION 'member_xp.member_id must be linked to an authenticated member user';
  END IF;

  IF NEW.gym_id IS DISTINCT FROM member_gym THEN
    RAISE EXCEPTION 'member_xp.gym_id must match the linked member gym_id';
  END IF;

  IF NEW.user_id IS DISTINCT FROM member_user THEN
    RAISE EXCEPTION 'member_xp.user_id must match the linked member user_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_challenge_completions_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  member_gym uuid;
  member_user uuid;
BEGIN
  SELECT m.gym_id, m.user_id
  INTO member_gym, member_user
  FROM public.members m
  WHERE m.id = NEW.member_id;

  IF member_gym IS NULL THEN
    RAISE EXCEPTION 'challenge_completions.member_id does not reference an existing member';
  END IF;

  IF member_user IS NULL THEN
    RAISE EXCEPTION 'challenge_completions.member_id must be linked to an authenticated member user';
  END IF;

  IF NEW.gym_id IS DISTINCT FROM member_gym THEN
    RAISE EXCEPTION 'challenge_completions.gym_id must match the linked member gym_id';
  END IF;

  IF NEW.user_id IS DISTINCT FROM member_user THEN
    RAISE EXCEPTION 'challenge_completions.user_id must match the linked member user_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_profile_gym_id_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.gym_id IS DISTINCT FROM OLD.gym_id
     AND auth.role() <> 'service_role'
     AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'profiles.gym_id cannot be reassigned by this user';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_members_gym_consistency ON public.members;
CREATE TRIGGER trg_members_gym_consistency
  BEFORE INSERT OR UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_members_gym_consistency();

DROP TRIGGER IF EXISTS trg_attendance_gym_consistency ON public.attendance;
CREATE TRIGGER trg_attendance_gym_consistency
  BEFORE INSERT OR UPDATE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_attendance_gym_consistency();

DROP TRIGGER IF EXISTS trg_subscriptions_gym_consistency ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_gym_consistency
  BEFORE INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_subscriptions_gym_consistency();

DROP TRIGGER IF EXISTS trg_member_xp_consistency ON public.member_xp;
CREATE TRIGGER trg_member_xp_consistency
  BEFORE INSERT OR UPDATE ON public.member_xp
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_member_xp_consistency();

DROP TRIGGER IF EXISTS trg_challenge_completions_consistency ON public.challenge_completions;
CREATE TRIGGER trg_challenge_completions_consistency
  BEFORE INSERT OR UPDATE ON public.challenge_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_challenge_completions_consistency();

DROP TRIGGER IF EXISTS trg_profiles_prevent_gym_reassign ON public.profiles;
CREATE TRIGGER trg_profiles_prevent_gym_reassign
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_gym_id_reassignment();

-- -----------------------------------------------------------------------------
-- RLS reset and recreation
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.__drop_all_policies(_table regclass)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  policy_name text;
BEGIN
  FOR policy_name IN
    SELECT pol.polname
    FROM pg_policy pol
    WHERE pol.polrelid = _table
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', policy_name, _table);
  END LOOP;
END;
$$;

SELECT public.__drop_all_policies('public.gyms'::regclass);
SELECT public.__drop_all_policies('public.profiles'::regclass);
SELECT public.__drop_all_policies('public.members'::regclass);
SELECT public.__drop_all_policies('public.trainers'::regclass);
SELECT public.__drop_all_policies('public.plans'::regclass);
SELECT public.__drop_all_policies('public.subscriptions'::regclass);
SELECT public.__drop_all_policies('public.attendance'::regclass);
SELECT public.__drop_all_policies('public.notifications'::regclass);
SELECT public.__drop_all_policies('public.gym_plan_requests'::regclass);
SELECT public.__drop_all_policies('public.member_xp'::regclass);
SELECT public.__drop_all_policies('public.challenge_completions'::regclass);

DROP FUNCTION public.__drop_all_policies(regclass);

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_plan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_completions ENABLE ROW LEVEL SECURITY;

-- Gyms
CREATE POLICY "Gyms select by owner member or admin"
ON public.gyms
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.is_super_admin(auth.uid())
  OR id = public.current_user_gym_id()
  OR id IN (SELECT m.gym_id FROM public.members m WHERE m.user_id = auth.uid())
);

CREATE POLICY "Gyms insert by owner or admin"
ON public.gyms
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Gyms update by owner or admin"
ON public.gyms
FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  owner_id = auth.uid()
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Gyms delete by owner or admin"
ON public.gyms
FOR DELETE
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.is_super_admin(auth.uid())
);

-- Profiles
CREATE POLICY "Profiles select own"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Profiles insert own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  id = auth.uid()
  AND gym_id IS NULL
);

CREATE POLICY "Profiles update own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Members
CREATE POLICY "Members select by owner admin"
ON public.members
FOR SELECT
TO authenticated
USING (public.can_manage_gym_data(gym_id));

CREATE POLICY "Members select own record"
ON public.members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Members insert by owner admin"
ON public.members
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_gym_data(gym_id));

CREATE POLICY "Members update by owner admin"
ON public.members
FOR UPDATE
TO authenticated
USING (public.can_manage_gym_data(gym_id))
WITH CHECK (public.can_manage_gym_data(gym_id));

CREATE POLICY "Members delete by owner admin"
ON public.members
FOR DELETE
TO authenticated
USING (public.can_manage_gym_data(gym_id));

-- Trainers
CREATE POLICY "Trainers select by owner admin"
ON public.trainers
FOR SELECT
TO authenticated
USING (public.can_manage_gym_data(gym_id));

CREATE POLICY "Trainers select assigned for member"
ON public.trainers
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT m.trainer_id
    FROM public.members m
    WHERE m.user_id = auth.uid()
  )
);

CREATE POLICY "Trainers insert by owner admin"
ON public.trainers
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_gym_data(gym_id));

CREATE POLICY "Trainers update by owner admin"
ON public.trainers
FOR UPDATE
TO authenticated
USING (public.can_manage_gym_data(gym_id))
WITH CHECK (public.can_manage_gym_data(gym_id));

CREATE POLICY "Trainers delete by owner admin"
ON public.trainers
FOR DELETE
TO authenticated
USING (public.can_manage_gym_data(gym_id));

-- Plans
CREATE POLICY "Plans select by owner admin"
ON public.plans
FOR SELECT
TO authenticated
USING (public.can_manage_gym_data(gym_id));

CREATE POLICY "Plans insert by owner admin"
ON public.plans
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_gym_data(gym_id));

CREATE POLICY "Plans update by owner admin"
ON public.plans
FOR UPDATE
TO authenticated
USING (public.can_manage_gym_data(gym_id))
WITH CHECK (public.can_manage_gym_data(gym_id));

CREATE POLICY "Plans delete by owner admin"
ON public.plans
FOR DELETE
TO authenticated
USING (public.can_manage_gym_data(gym_id));

-- Subscriptions
CREATE POLICY "Subscriptions select by owner admin"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (public.can_manage_gym_data(gym_id));

CREATE POLICY "Subscriptions select own member"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (
  member_id IN (
    SELECT m.id
    FROM public.members m
    WHERE m.user_id = auth.uid()
  )
);

CREATE POLICY "Subscriptions insert by owner admin"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_gym_data(gym_id));

CREATE POLICY "Subscriptions update by owner admin"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (public.can_manage_gym_data(gym_id))
WITH CHECK (public.can_manage_gym_data(gym_id));

CREATE POLICY "Subscriptions delete by owner admin"
ON public.subscriptions
FOR DELETE
TO authenticated
USING (public.can_manage_gym_data(gym_id));

-- Attendance
CREATE POLICY "Attendance select by owner admin"
ON public.attendance
FOR SELECT
TO authenticated
USING (public.can_manage_gym_data(gym_id));

CREATE POLICY "Attendance select own member"
ON public.attendance
FOR SELECT
TO authenticated
USING (
  member_id IN (
    SELECT m.id
    FROM public.members m
    WHERE m.user_id = auth.uid()
  )
);

CREATE POLICY "Attendance insert by owner admin"
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_gym_data(gym_id));

CREATE POLICY "Attendance update by owner admin"
ON public.attendance
FOR UPDATE
TO authenticated
USING (public.can_manage_gym_data(gym_id))
WITH CHECK (public.can_manage_gym_data(gym_id));

CREATE POLICY "Attendance delete by owner admin"
ON public.attendance
FOR DELETE
TO authenticated
USING (public.can_manage_gym_data(gym_id));

-- Notifications
CREATE POLICY "Notifications select by gym membership"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  public.can_manage_gym_data(gym_id)
  OR gym_id = public.current_user_gym_id()
  OR gym_id IN (SELECT m.gym_id FROM public.members m WHERE m.user_id = auth.uid())
);

CREATE POLICY "Notifications insert by owner admin"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_gym_data(gym_id));

CREATE POLICY "Notifications update by owner admin"
ON public.notifications
FOR UPDATE
TO authenticated
USING (public.can_manage_gym_data(gym_id))
WITH CHECK (public.can_manage_gym_data(gym_id));

CREATE POLICY "Notifications delete by owner admin"
ON public.notifications
FOR DELETE
TO authenticated
USING (public.can_manage_gym_data(gym_id));

-- Gym plan requests
CREATE POLICY "Gym plan requests insert by owner admin"
ON public.gym_plan_requests
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_gym_data(gym_id));

CREATE POLICY "Gym plan requests select own gym"
ON public.gym_plan_requests
FOR SELECT
TO authenticated
USING (public.can_manage_gym_data(gym_id));

CREATE POLICY "Gym plan requests select by super admin"
ON public.gym_plan_requests
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Gym plan requests update by super admin"
ON public.gym_plan_requests
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Member XP (read-only for authenticated clients; writes via service role edge functions)
CREATE POLICY "Member XP select own"
ON public.member_xp
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Member XP select gym leaderboard"
ON public.member_xp
FOR SELECT
TO authenticated
USING (
  public.can_manage_gym_data(gym_id)
  OR gym_id = public.current_user_gym_id()
  OR gym_id IN (SELECT m.gym_id FROM public.members m WHERE m.user_id = auth.uid())
);

-- Challenge completions (read-only for authenticated clients; writes via service role edge functions)
CREATE POLICY "Challenge completions select own"
ON public.challenge_completions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Challenge completions select by owner admin"
ON public.challenge_completions
FOR SELECT
TO authenticated
USING (public.can_manage_gym_data(gym_id));

-- -----------------------------------------------------------------------------
-- Safe global leaderboard interface (anonymized)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_global_leaderboard_anonymized(
  p_limit integer DEFAULT 100,
  p_tier text DEFAULT NULL
)
RETURNS TABLE (
  rank bigint,
  display_name text,
  xp integer,
  level integer,
  tier text,
  streak_days integer,
  total_challenges_completed integer,
  is_current_user boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      row_number() OVER (ORDER BY mx.xp DESC, mx.updated_at ASC) AS rank,
      CASE
        WHEN mx.user_id = auth.uid() THEN COALESCE(NULLIF(m.name, ''), 'You')
        ELSE
          CASE
            WHEN COALESCE(NULLIF(m.name, ''), '') = '' THEN 'Member'
            ELSE left(split_part(m.name, ' ', 1), 1) || repeat('*', GREATEST(length(split_part(m.name, ' ', 1)) - 1, 2))
          END
      END AS display_name,
      mx.xp,
      mx.level,
      mx.tier,
      mx.streak_days,
      mx.total_challenges_completed,
      (mx.user_id = auth.uid()) AS is_current_user
    FROM public.member_xp mx
    JOIN public.members m ON m.id = mx.member_id
    WHERE p_tier IS NULL OR mx.tier = lower(p_tier)
  )
  SELECT
    rank,
    display_name,
    xp,
    level,
    tier,
    streak_days,
    total_challenges_completed,
    is_current_user
  FROM ranked
  ORDER BY rank
  LIMIT GREATEST(COALESCE(p_limit, 100), 1);
$$;

REVOKE ALL ON FUNCTION public.get_global_leaderboard_anonymized(integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_global_leaderboard_anonymized(integer, text) TO authenticated;
