
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gym notifications select" ON public.notifications FOR SELECT TO authenticated USING (gym_id = get_user_gym_id(auth.uid()));
CREATE POLICY "Gym notifications insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (gym_id = get_user_gym_id(auth.uid()));
CREATE POLICY "Gym notifications update" ON public.notifications FOR UPDATE TO authenticated USING (gym_id = get_user_gym_id(auth.uid()));
CREATE POLICY "Gym notifications delete" ON public.notifications FOR DELETE TO authenticated USING (gym_id = get_user_gym_id(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
