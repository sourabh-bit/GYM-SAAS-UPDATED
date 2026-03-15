-- Gym suspension flag + super admin profile/user role writes

ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

-- Allow super admin to update profiles (for gym assignment)
DROP POLICY IF EXISTS "Profiles update by super admin" ON public.profiles;
CREATE POLICY "Profiles update by super admin"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Allow super admin to manage user_roles
DROP POLICY IF EXISTS "User roles insert by super admin" ON public.user_roles;
CREATE POLICY "User roles insert by super admin"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "User roles update by super admin" ON public.user_roles;
CREATE POLICY "User roles update by super admin"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "User roles delete by super admin" ON public.user_roles;
CREATE POLICY "User roles delete by super admin"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));
