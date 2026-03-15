-- Admin audit logs table for super admin telemetry

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT,
  action TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'settings',
  target_id UUID,
  target_label TEXT,
  detail TEXT,
  severity TEXT NOT NULL DEFAULT 'low',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at
  ON public.admin_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_category
  ON public.admin_audit_logs (category, created_at DESC);

DROP POLICY IF EXISTS "Admin audit logs select" ON public.admin_audit_logs;
CREATE POLICY "Admin audit logs select"
  ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin audit logs insert" ON public.admin_audit_logs;
CREATE POLICY "Admin audit logs insert"
  ON public.admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));
