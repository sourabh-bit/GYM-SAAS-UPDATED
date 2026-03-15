-- Fix member signup role contamination and backfill missing member roles
-- 1) Prevent member signups from auto-creating owner gym/owner role
-- 2) Backfill member role rows for existing linked members

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_gym_id UUID;
  is_member_signup BOOLEAN;
BEGIN
  is_member_signup := lower(COALESCE(NEW.raw_user_meta_data->>'is_member', 'false')) IN ('true', 't', '1', 'yes');

  IF is_member_signup THEN
    INSERT INTO public.profiles (id, full_name, email, gym_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.email, ''),
      NULL
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
  END IF;

  -- Owner signup path
  INSERT INTO public.gyms (name, owner_id)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'gym_name', 'My Gym'), NEW.id)
  RETURNING id INTO new_gym_id;

  INSERT INTO public.profiles (id, full_name, email, gym_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    new_gym_id
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    gym_id = EXCLUDED.gym_id;

  INSERT INTO public.user_roles (user_id, role, gym_id)
  VALUES (NEW.id, 'owner', new_gym_id)
  ON CONFLICT (user_id, role, gym_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill missing member roles for already linked member accounts.
INSERT INTO public.user_roles (user_id, role, gym_id)
SELECT DISTINCT
  m.user_id,
  'member'::public.app_role,
  m.gym_id
FROM public.members m
WHERE m.user_id IS NOT NULL
ON CONFLICT (user_id, role, gym_id) DO NOTHING;
