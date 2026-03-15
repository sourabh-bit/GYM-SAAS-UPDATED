
-- Create roles enum
CREATE TYPE public.app_role AS ENUM ('owner', 'trainer', 'frontdesk', 'member');

-- Create member status enum
CREATE TYPE public.member_status AS ENUM ('active', 'expired', 'frozen', 'trial');

-- Create trainer status enum  
CREATE TYPE public.trainer_status AS ENUM ('active', 'on_leave', 'inactive');

-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('paid', 'pending', 'overdue', 'partial');

-- Gyms table
CREATE TABLE public.gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  avatar_url TEXT,
  gym_id UUID REFERENCES public.gyms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE,
  UNIQUE(user_id, role, gym_id)
);

-- Plans table
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 30,
  description TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Members table
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  plan_name TEXT DEFAULT '',
  status member_status NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry_at TIMESTAMPTZ,
  due_amount NUMERIC NOT NULL DEFAULT 0,
  last_payment NUMERIC DEFAULT 0,
  payment_status payment_status NOT NULL DEFAULT 'paid',
  payment_method TEXT DEFAULT 'cash',
  payment_date TIMESTAMPTZ,
  last_checkin TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trainers table
CREATE TABLE public.trainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  specialty TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  members_count INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC DEFAULT 0,
  status trainer_status NOT NULL DEFAULT 'active',
  schedule TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  plan_name TEXT DEFAULT '',
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  payment_status payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  check_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's gym_id
CREATE OR REPLACE FUNCTION public.get_user_gym_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gym_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- Profiles: users can read/update their own
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Gyms: owners can manage their gym
CREATE POLICY "Owners can view their gym" ON public.gyms FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owners can create gym" ON public.gyms FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners can update their gym" ON public.gyms FOR UPDATE TO authenticated USING (owner_id = auth.uid());

-- User roles: viewable by authenticated users for their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Members: gym owners can CRUD members in their gym
CREATE POLICY "Gym members select" ON public.members FOR SELECT TO authenticated USING (gym_id = public.get_user_gym_id(auth.uid()));
CREATE POLICY "Gym members insert" ON public.members FOR INSERT TO authenticated WITH CHECK (gym_id = public.get_user_gym_id(auth.uid()));
CREATE POLICY "Gym members update" ON public.members FOR UPDATE TO authenticated USING (gym_id = public.get_user_gym_id(auth.uid()));
CREATE POLICY "Gym members delete" ON public.members FOR DELETE TO authenticated USING (gym_id = public.get_user_gym_id(auth.uid()));

-- Trainers: gym owners can CRUD trainers in their gym
CREATE POLICY "Gym trainers select" ON public.trainers FOR SELECT TO authenticated USING (gym_id = public.get_user_gym_id(auth.uid()));
CREATE POLICY "Gym trainers insert" ON public.trainers FOR INSERT TO authenticated WITH CHECK (gym_id = public.get_user_gym_id(auth.uid()));
CREATE POLICY "Gym trainers update" ON public.trainers FOR UPDATE TO authenticated USING (gym_id = public.get_user_gym_id(auth.uid()));
CREATE POLICY "Gym trainers delete" ON public.trainers FOR DELETE TO authenticated USING (gym_id = public.get_user_gym_id(auth.uid()));

-- Plans: gym owners can CRUD plans in their gym
CREATE POLICY "Gym plans select" ON public.plans FOR SELECT TO authenticated USING (gym_id = public.get_user_gym_id(auth.uid()));
CREATE POLICY "Gym plans insert" ON public.plans FOR INSERT TO authenticated WITH CHECK (gym_id = public.get_user_gym_id(auth.uid()));
CREATE POLICY "Gym plans update" ON public.plans FOR UPDATE TO authenticated USING (gym_id = public.get_user_gym_id(auth.uid()));
CREATE POLICY "Gym plans delete" ON public.plans FOR DELETE TO authenticated USING (gym_id = public.get_user_gym_id(auth.uid()));

-- Subscriptions: gym owners can CRUD
CREATE POLICY "Gym subscriptions select" ON public.subscriptions FOR SELECT TO authenticated USING (gym_id = public.get_user_gym_id(auth.uid()));
CREATE POLICY "Gym subscriptions insert" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (gym_id = public.get_user_gym_id(auth.uid()));
CREATE POLICY "Gym subscriptions update" ON public.subscriptions FOR UPDATE TO authenticated USING (gym_id = public.get_user_gym_id(auth.uid()));
CREATE POLICY "Gym subscriptions delete" ON public.subscriptions FOR DELETE TO authenticated USING (gym_id = public.get_user_gym_id(auth.uid()));

-- Attendance: gym owners can CRUD
CREATE POLICY "Gym attendance select" ON public.attendance FOR SELECT TO authenticated USING (gym_id = public.get_user_gym_id(auth.uid()));
CREATE POLICY "Gym attendance insert" ON public.attendance FOR INSERT TO authenticated WITH CHECK (gym_id = public.get_user_gym_id(auth.uid()));
CREATE POLICY "Gym attendance update" ON public.attendance FOR UPDATE TO authenticated USING (gym_id = public.get_user_gym_id(auth.uid()));

-- Trigger to create profile + gym on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_gym_id UUID;
BEGIN
  -- Create a gym for the new user
  INSERT INTO public.gyms (name, owner_id)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'gym_name', 'My Gym'), NEW.id)
  RETURNING id INTO new_gym_id;
  
  -- Create profile
  INSERT INTO public.profiles (id, full_name, email, gym_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    new_gym_id
  );
  
  -- Assign owner role
  INSERT INTO public.user_roles (user_id, role, gym_id)
  VALUES (NEW.id, 'owner', new_gym_id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
