
-- Add member_name to subscriptions for historical tracking
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS member_name TEXT;

-- Backfill member_name in subscriptions
UPDATE public.subscriptions s SET member_name = m.name FROM public.members m WHERE s.member_id = m.id AND s.member_name IS NULL;

-- Backfill member_name in attendance (in case previous migration didn't run)
UPDATE public.attendance a SET member_name = m.name FROM public.members m WHERE a.member_id = m.id AND a.member_name IS NULL;

-- Fix foreign keys to SET NULL on delete (use IF EXISTS pattern)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'attendance_member_id_fkey') THEN
    ALTER TABLE public.attendance DROP CONSTRAINT attendance_member_id_fkey;
  END IF;
END $$;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'subscriptions_member_id_fkey') THEN
    ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_member_id_fkey;
  END IF;
END $$;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'members_trainer_id_fkey') THEN
    ALTER TABLE public.members DROP CONSTRAINT members_trainer_id_fkey;
  END IF;
END $$;
ALTER TABLE public.members ADD CONSTRAINT members_trainer_id_fkey 
  FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) ON DELETE SET NULL;
