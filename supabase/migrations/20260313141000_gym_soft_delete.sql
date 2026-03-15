-- Soft delete support for gyms

ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_gyms_deleted_at
  ON public.gyms (deleted_at);
