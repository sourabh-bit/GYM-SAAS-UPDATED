
-- Add member_name column to attendance to preserve name after member deletion
ALTER TABLE public.attendance ADD COLUMN member_name TEXT;

-- Drop existing foreign keys and recreate with SET NULL
ALTER TABLE public.attendance DROP CONSTRAINT attendance_member_id_fkey;
ALTER TABLE public.attendance ALTER COLUMN member_id DROP NOT NULL;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;

ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_member_id_fkey;
ALTER TABLE public.subscriptions ALTER COLUMN member_id DROP NOT NULL;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;

-- Members referencing trainers - SET NULL on trainer delete (already nullable)
ALTER TABLE public.members DROP CONSTRAINT members_trainer_id_fkey;
ALTER TABLE public.members ADD CONSTRAINT members_trainer_id_fkey 
  FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) ON DELETE SET NULL;

-- Backfill member_name from existing data
UPDATE public.attendance a SET member_name = m.name FROM public.members m WHERE a.member_id = m.id AND a.member_name IS NULL;
