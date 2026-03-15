-- Platform billing retry policy configuration

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS billing_retry_schedule_days INTEGER[] NOT NULL DEFAULT '{2,5,9}',
  ADD COLUMN IF NOT EXISTS billing_grace_days INTEGER NOT NULL DEFAULT 3;
