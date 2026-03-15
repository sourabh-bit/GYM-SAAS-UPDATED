CREATE INDEX IF NOT EXISTS idx_members_email_user_id ON public.members (email, user_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members (email);