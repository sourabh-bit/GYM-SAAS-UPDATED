-- Prevent duplicate open attendance sessions for the same member

CREATE OR REPLACE FUNCTION public.owner_check_in_member(
  p_member_id UUID,
  p_member_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gym_id UUID;
  v_member RECORD;
  v_attendance_id UUID;
  v_existing_open_session UUID;
BEGIN
  v_gym_id := public.get_user_gym_id(auth.uid());
  IF v_gym_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT id, gym_id, name
  INTO v_member
  FROM public.members
  WHERE id = p_member_id
    AND gym_id = v_gym_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found for this gym';
  END IF;

  SELECT a.id
  INTO v_existing_open_session
  FROM public.attendance a
  WHERE a.gym_id = v_gym_id
    AND a.member_id = v_member.id
    AND a.check_out IS NULL
  ORDER BY a.check_in DESC
  LIMIT 1;

  IF v_existing_open_session IS NOT NULL THEN
    RAISE EXCEPTION 'Member is already checked in';
  END IF;

  INSERT INTO public.attendance (gym_id, member_id, member_name)
  VALUES (v_gym_id, v_member.id, COALESCE(NULLIF(TRIM(p_member_name), ''), v_member.name))
  RETURNING id INTO v_attendance_id;

  UPDATE public.members
  SET last_checkin = now()
  WHERE id = v_member.id;

  RETURN v_attendance_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.owner_check_in_member(UUID, TEXT) TO authenticated;
