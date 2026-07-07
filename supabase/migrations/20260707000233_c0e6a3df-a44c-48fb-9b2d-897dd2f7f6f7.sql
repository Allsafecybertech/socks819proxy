
-- Backfill missing profiles for existing auth users
INSERT INTO public.profiles (id, email, username)
SELECT u.id, u.email, split_part(u.email,'@',1)
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.credit_balances (user_id, balance)
SELECT u.id, 0 FROM auth.users u
LEFT JOIN public.credit_balances c ON c.user_id = u.id
WHERE c.user_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::app_role FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id AND r.role='user'::app_role
WHERE r.user_id IS NULL
ON CONFLICT DO NOTHING;

-- Ensure trigger exists to auto-create profiles on new signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RPC: admin promotes another user by email
CREATE OR REPLACE FUNCTION public.grant_admin(_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid UUID;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF _uid IS NULL THEN RAISE EXCEPTION 'User not found: %', _email; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_uid, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
  INSERT INTO public.audit_log(actor_id, action, entity, entity_id, metadata)
    VALUES (auth.uid(),'admin.grant','user_roles',_uid, jsonb_build_object('email',_email));
  RETURN TRUE;
END $$;

-- RPC: revoke admin (cannot revoke self if last admin)
CREATE OR REPLACE FUNCTION public.revoke_admin(_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid UUID; _admin_count INT;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF _uid IS NULL THEN RAISE EXCEPTION 'User not found: %', _email; END IF;
  SELECT COUNT(*) INTO _admin_count FROM public.user_roles WHERE role='admin'::app_role;
  IF _admin_count <= 1 THEN RAISE EXCEPTION 'Cannot revoke the last admin'; END IF;
  DELETE FROM public.user_roles WHERE user_id=_uid AND role='admin'::app_role;
  INSERT INTO public.audit_log(actor_id, action, entity, entity_id, metadata)
    VALUES (auth.uid(),'admin.revoke','user_roles',_uid, jsonb_build_object('email',_email));
  RETURN TRUE;
END $$;

GRANT EXECUTE ON FUNCTION public.grant_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_admin(TEXT) TO authenticated;
