-- Allow members to read their own payment subscription status

CREATE POLICY "Payment subscriptions select own"
ON public.payment_subscriptions
FOR SELECT
TO authenticated
USING (
  member_id IN (
    SELECT m.id FROM public.members m WHERE m.user_id = auth.uid()
  )
);
