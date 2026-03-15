-- Add user_id column to members table to link member to their auth account
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Allow members to read their own member record
CREATE POLICY "Members can view own record"
ON public.members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
