
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u UUID := auth.uid();
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_u, 'admin') ON CONFLICT DO NOTHING;
  INSERT INTO public.audit_log(actor_id, action, entity, entity_id) VALUES (_u, 'admin.bootstrap', 'user_roles', _u);
  RETURN true;
END $$;
