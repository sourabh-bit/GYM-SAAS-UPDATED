
-- Super admins (via has_role check) can view and update all gym_plan_requests
CREATE POLICY "Admins can view all requests"
  ON public.gym_plan_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update requests"
  ON public.gym_plan_requests FOR UPDATE
  TO authenticated
  USING (true);
