-- Allow super admins to read profiles and user_roles for admin dashboards

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles select by super admin" ON public.profiles;
CREATE POLICY "Profiles select by super admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "User roles select by super admin" ON public.user_roles;
CREATE POLICY "User roles select by super admin"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));
