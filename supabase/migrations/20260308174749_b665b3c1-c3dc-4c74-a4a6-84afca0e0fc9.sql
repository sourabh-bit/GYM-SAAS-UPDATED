
-- Fix stale trainer members_count: set to actual count of assigned members
UPDATE public.trainers t SET members_count = (
  SELECT COUNT(*) FROM public.members m WHERE m.trainer_id = t.id
);
