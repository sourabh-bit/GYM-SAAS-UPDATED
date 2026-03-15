
-- Delete duplicate notifications, keeping only the oldest one per metadata+date combo
DELETE FROM public.notifications
WHERE id NOT IN (
  SELECT DISTINCT ON (metadata::text) id
  FROM public.notifications
  ORDER BY metadata::text, created_at ASC
);
