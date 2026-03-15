-- Allow super admin to purge audit logs

CREATE POLICY "Admin audit logs delete"
  ON public.admin_audit_logs
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));
