-- Platform settings + feature flags for super admin

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id integer PRIMARY KEY DEFAULT 1,
  platform_name text NOT NULL DEFAULT 'FitCore',
  support_email text NOT NULL DEFAULT 'support@fitcore.com',
  default_currency text NOT NULL DEFAULT 'USD',
  default_timezone text NOT NULL DEFAULT 'UTC',
  notification_new_gym boolean NOT NULL DEFAULT true,
  notification_failed_payment boolean NOT NULL DEFAULT true,
  notification_health_alerts boolean NOT NULL DEFAULT true,
  notification_weekly_report boolean NOT NULL DEFAULT false,
  require_email_verification boolean NOT NULL DEFAULT true,
  enable_two_factor boolean NOT NULL DEFAULT false,
  allow_google_signin boolean NOT NULL DEFAULT true,
  force_password_reset_90 boolean NOT NULL DEFAULT false,
  api_rate_limit_per_min integer NOT NULL DEFAULT 1000,
  login_attempts_before_lock integer NOT NULL DEFAULT 5,
  smtp_host text NOT NULL DEFAULT 'smtp.sendgrid.net',
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_from_email text NOT NULL DEFAULT 'noreply@fitcore.com',
  smtp_from_name text NOT NULL DEFAULT 'FitCore Platform',
  maintenance_mode boolean NOT NULL DEFAULT false,
  maintenance_message text NOT NULL DEFAULT 'We''re performing scheduled maintenance. We''ll be back soon!',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.platform_settings
  ADD CONSTRAINT platform_settings_singleton CHECK (id = 1);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform settings select (super admin)"
  ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Platform settings insert (super admin)"
  ON public.platform_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Platform settings update (super admin)"
  ON public.platform_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

INSERT INTO public.platform_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  scope text NOT NULL DEFAULT 'global',
  enabled boolean NOT NULL DEFAULT false,
  rollout integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feature_flags_rollout_range CHECK (rollout >= 0 AND rollout <= 100)
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feature flags select (super admin)"
  ON public.feature_flags
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Feature flags insert (super admin)"
  ON public.feature_flags
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Feature flags update (super admin)"
  ON public.feature_flags
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Feature flags delete (super admin)"
  ON public.feature_flags
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

INSERT INTO public.feature_flags (name, label, description, scope, enabled, rollout)
VALUES
  ('ai_workout_recommendations', 'AI Workout Recommendations', 'Enable AI-powered personalized workout suggestions for members', 'global', true, 100),
  ('dark_mode_v2', 'Dark Mode V2', 'New dark mode theme with improved contrast and accessibility', 'beta', true, 25),
  ('payment_retry', 'Auto Payment Retry', 'Automatically retry failed subscription payments after 24h', 'global', true, 100),
  ('social_features', 'Social Features', 'Enable member social feed, challenges, and community posts', 'beta', false, 10),
  ('multi_location', 'Multi-Location Support', 'Allow gym owners to manage multiple locations from one dashboard', 'enterprise', true, 100),
  ('advanced_analytics', 'Advanced Analytics', 'Deep analytics with cohort analysis and predictive metrics', 'enterprise', false, 0),
  ('qr_checkin', 'QR Code Check-in', 'Members can check in by scanning a QR code at the gym entrance', 'global', true, 100)
ON CONFLICT (name) DO NOTHING;
