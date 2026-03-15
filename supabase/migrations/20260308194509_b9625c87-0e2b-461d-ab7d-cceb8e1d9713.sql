-- Members can view their own attendance
CREATE POLICY "Members can view own attendance"
ON public.attendance
FOR SELECT
TO authenticated
USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Members can view their own subscriptions
CREATE POLICY "Members can view own subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Members can view their gym
CREATE POLICY "Members can view own gym"
ON public.gyms
FOR SELECT
TO authenticated
USING (id IN (SELECT gym_id FROM public.profiles WHERE id = auth.uid()));

-- Members can view their trainer
CREATE POLICY "Members can view assigned trainer"
ON public.trainers
FOR SELECT
TO authenticated
USING (id IN (SELECT trainer_id FROM public.members WHERE user_id = auth.uid()));

-- Allow profiles insert for edge function (service role handles this but just in case)
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());