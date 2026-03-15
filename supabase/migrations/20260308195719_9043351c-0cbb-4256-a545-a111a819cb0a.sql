CREATE POLICY "Members can view gym via member record"
ON public.gyms
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT m.gym_id FROM public.members m WHERE m.user_id = auth.uid()
  )
);