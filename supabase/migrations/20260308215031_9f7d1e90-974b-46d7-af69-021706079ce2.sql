
-- Member XP table: stores persistent XP, level, tier per member
CREATE TABLE public.member_xp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  tier text NOT NULL DEFAULT 'rookie',
  streak_days integer NOT NULL DEFAULT 0,
  total_challenges_completed integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(member_id)
);

ALTER TABLE public.member_xp ENABLE ROW LEVEL SECURITY;

-- Members can view their own XP
CREATE POLICY "Members can view own xp" ON public.member_xp
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Members can update their own XP
CREATE POLICY "Members can update own xp" ON public.member_xp
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Members can insert their own XP
CREATE POLICY "Members can insert own xp" ON public.member_xp
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Gym members can view gym leaderboard (same gym)
CREATE POLICY "Gym members can view gym leaderboard" ON public.member_xp
  FOR SELECT TO authenticated
  USING (gym_id IN (SELECT m.gym_id FROM members m WHERE m.user_id = auth.uid()));

-- Global leaderboard: everyone can see all XP for ranking
CREATE POLICY "Anyone authenticated can view global leaderboard" ON public.member_xp
  FOR SELECT TO authenticated
  USING (true);

-- Challenge completions table
CREATE TABLE public.challenge_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  challenge_key text NOT NULL,
  challenge_name text NOT NULL,
  xp_earned integer NOT NULL DEFAULT 0,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.challenge_completions ENABLE ROW LEVEL SECURITY;

-- Members can view own completions
CREATE POLICY "Members can view own completions" ON public.challenge_completions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Members can insert own completions
CREATE POLICY "Members can insert own completions" ON public.challenge_completions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Enable realtime for leaderboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.member_xp;
