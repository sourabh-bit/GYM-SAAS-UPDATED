
-- Platform plans (SaaS tiers offered by super admin)
CREATE TABLE public.platform_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  max_members INTEGER NOT NULL DEFAULT 50,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can read platform plans
CREATE POLICY "Anyone can view platform plans"
  ON public.platform_plans FOR SELECT
  TO authenticated
  USING (true);

-- Add current_plan_id to gyms
ALTER TABLE public.gyms
  ADD COLUMN current_plan_id UUID REFERENCES public.platform_plans(id),
  ADD COLUMN plan_expires_at TIMESTAMPTZ;

-- Gym plan requests (upgrade / renew)
CREATE TABLE public.gym_plan_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  requested_plan_id UUID NOT NULL REFERENCES public.platform_plans(id),
  request_type TEXT NOT NULL DEFAULT 'upgrade',
  status TEXT NOT NULL DEFAULT 'pending',
  gym_name TEXT,
  owner_name TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.gym_plan_requests ENABLE ROW LEVEL SECURITY;

-- Gym owners can insert and view their own requests
CREATE POLICY "Gym owners can create requests"
  ON public.gym_plan_requests FOR INSERT
  TO authenticated
  WITH CHECK (gym_id = get_user_gym_id(auth.uid()));

CREATE POLICY "Gym owners can view own requests"
  ON public.gym_plan_requests FOR SELECT
  TO authenticated
  USING (gym_id = get_user_gym_id(auth.uid()));

-- Seed default platform plans
INSERT INTO public.platform_plans (name, price, billing_cycle, max_members, features) VALUES
  ('Basic', 499, 'monthly', 30, '["Member management", "Attendance tracking", "Basic reports", "Due tracking", "Email support"]'::jsonb),
  ('Growth', 999, 'monthly', 50, '["Payment collection", "Trainer management", "Advanced reports", "PDF exports", "Priority support"]'::jsonb),
  ('Pro', 1499, 'monthly', 9999, '["Member app premium", "Gamification", "Retention tools", "Priority support", "Multi-location support"]'::jsonb);
