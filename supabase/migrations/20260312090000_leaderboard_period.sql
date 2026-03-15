-- Period leaderboards based on challenge_completions

CREATE OR REPLACE FUNCTION public.get_gym_leaderboard_period(
  p_gym_id uuid,
  p_limit integer DEFAULT 100,
  p_tier text DEFAULT NULL,
  p_period text DEFAULT 'weekly'
)
RETURNS TABLE (
  rank bigint,
  member_id uuid,
  user_id uuid,
  xp integer,
  level integer,
  tier text,
  streak_days integer,
  challenges_completed integer,
  is_current_user boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH access AS (
    SELECT
      CASE
        WHEN p_gym_id IS NULL THEN false
        WHEN auth.uid() IS NULL THEN false
        WHEN public.is_super_admin(auth.uid()) THEN true
        WHEN public.can_manage_gym_data(p_gym_id) THEN true
        WHEN p_gym_id = public.current_user_gym_id() THEN true
        WHEN EXISTS (
          SELECT 1
          FROM public.members m
          WHERE m.user_id = auth.uid()
            AND m.gym_id = p_gym_id
        ) THEN true
        ELSE false
      END AS allowed
  ),
  bounds AS (
    SELECT
      CASE
        WHEN lower(coalesce(p_period, 'weekly')) = 'monthly'
          THEN date_trunc('month', now())
        ELSE (date_trunc('week', now() + interval '1 day') - interval '1 day')
      END AS period_start,
      CASE
        WHEN lower(coalesce(p_period, 'weekly')) = 'monthly'
          THEN date_trunc('month', now()) + interval '1 month'
        ELSE (date_trunc('week', now() + interval '1 day') - interval '1 day') + interval '1 week'
      END AS period_end
  ),
  scoped AS (
    SELECT
      cc.member_id,
      cc.user_id,
      sum(cc.xp_earned)::int AS xp,
      count(*)::int AS challenges_completed
    FROM public.challenge_completions cc
    CROSS JOIN bounds b
    CROSS JOIN access a
    WHERE a.allowed
      AND cc.gym_id = p_gym_id
      AND cc.completed_at >= b.period_start
      AND cc.completed_at < b.period_end
    GROUP BY cc.member_id, cc.user_id
  ),
  ranked AS (
    SELECT
      row_number() OVER (
        ORDER BY s.xp DESC, s.challenges_completed DESC, s.member_id ASC
      ) AS rank,
      s.member_id,
      s.user_id,
      s.xp,
      COALESCE(mx.level, 1) AS level,
      COALESCE(mx.tier, 'rookie') AS tier,
      COALESCE(mx.streak_days, 0) AS streak_days,
      s.challenges_completed,
      (s.user_id = auth.uid()) AS is_current_user
    FROM scoped s
    LEFT JOIN public.member_xp mx ON mx.member_id = s.member_id
    WHERE p_tier IS NULL OR mx.tier = lower(p_tier)
  )
  SELECT *
  FROM ranked
  ORDER BY rank
  LIMIT GREATEST(COALESCE(p_limit, 100), 1);
$$;

REVOKE ALL ON FUNCTION public.get_gym_leaderboard_period(uuid, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_gym_leaderboard_period(uuid, integer, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_global_leaderboard_period_anonymized(
  p_limit integer DEFAULT 100,
  p_tier text DEFAULT NULL,
  p_period text DEFAULT 'weekly'
)
RETURNS TABLE (
  rank bigint,
  display_name text,
  xp integer,
  level integer,
  tier text,
  streak_days integer,
  challenges_completed integer,
  is_current_user boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT
      CASE
        WHEN lower(coalesce(p_period, 'weekly')) = 'monthly'
          THEN date_trunc('month', now())
        ELSE (date_trunc('week', now() + interval '1 day') - interval '1 day')
      END AS period_start,
      CASE
        WHEN lower(coalesce(p_period, 'weekly')) = 'monthly'
          THEN date_trunc('month', now()) + interval '1 month'
        ELSE (date_trunc('week', now() + interval '1 day') - interval '1 day') + interval '1 week'
      END AS period_end
  ),
  scoped AS (
    SELECT
      cc.member_id,
      cc.user_id,
      sum(cc.xp_earned)::int AS xp,
      count(*)::int AS challenges_completed
    FROM public.challenge_completions cc
    CROSS JOIN bounds b
    WHERE cc.completed_at >= b.period_start
      AND cc.completed_at < b.period_end
    GROUP BY cc.member_id, cc.user_id
  ),
  ranked AS (
    SELECT
      row_number() OVER (
        ORDER BY s.xp DESC, s.challenges_completed DESC, s.member_id ASC
      ) AS rank,
      CASE
        WHEN s.user_id = auth.uid() THEN COALESCE(NULLIF(m.name, ''), 'You')
        ELSE
          CASE
            WHEN COALESCE(NULLIF(m.name, ''), '') = '' THEN 'Member'
            ELSE left(split_part(m.name, ' ', 1), 1)
              || repeat('*', GREATEST(length(split_part(m.name, ' ', 1)) - 1, 2))
          END
      END AS display_name,
      s.xp,
      COALESCE(mx.level, 1) AS level,
      COALESCE(mx.tier, 'rookie') AS tier,
      COALESCE(mx.streak_days, 0) AS streak_days,
      s.challenges_completed,
      (s.user_id = auth.uid()) AS is_current_user
    FROM scoped s
    JOIN public.members m ON m.id = s.member_id
    LEFT JOIN public.member_xp mx ON mx.member_id = s.member_id
    WHERE p_tier IS NULL OR mx.tier = lower(p_tier)
  )
  SELECT
    rank,
    display_name,
    xp,
    level,
    tier,
    streak_days,
    challenges_completed,
    is_current_user
  FROM ranked
  ORDER BY rank
  LIMIT GREATEST(COALESCE(p_limit, 100), 1);
$$;

REVOKE ALL ON FUNCTION public.get_global_leaderboard_period_anonymized(integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_global_leaderboard_period_anonymized(integer, text, text) TO authenticated;
