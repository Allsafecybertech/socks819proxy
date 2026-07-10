
-- 1. INVENTORY
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_order_id UUID,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assignment_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS blacklisted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_view_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS inventory_assigned_user_idx ON public.inventory(assigned_user_id) WHERE assigned_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS inventory_pool_idx ON public.inventory(status, country, proxy_kind) WHERE assigned_user_id IS NULL AND blacklisted = false;

DROP POLICY IF EXISTS "Users read own assigned proxies" ON public.inventory;
CREATE POLICY "Users read own assigned proxies" ON public.inventory
  FOR SELECT TO authenticated
  USING (assigned_user_id = auth.uid());

-- 2. ORDERS
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS assigned_count INT NOT NULL DEFAULT 0;

-- 3. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed in reads active announcements" ON public.announcements;
CREATE POLICY "Signed in reads active announcements" ON public.announcements
  FOR SELECT TO authenticated
  USING (is_active AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()));

DROP POLICY IF EXISTS "Admins manage announcements" ON public.announcements;
CREATE POLICY "Admins manage announcements" ON public.announcements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS announcements_set_updated_at ON public.announcements;
CREATE TRIGGER announcements_set_updated_at BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.announcement_dismissals (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, announcement_id)
);
GRANT SELECT, INSERT, DELETE ON public.announcement_dismissals TO authenticated;
GRANT ALL ON public.announcement_dismissals TO service_role;
ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own dismissals" ON public.announcement_dismissals;
CREATE POLICY "Users manage own dismissals" ON public.announcement_dismissals
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. NEW PLAN
INSERT INTO public.plans (name, plan_type, price_usd, duration_days, max_reveals, credits, unlimited, fair_use_limit, description, is_active, sort_order)
SELECT '24h Single Proxy', 'time', 1.50, 1, 1, NULL, false, 1, 'One dedicated proxy, valid for 24 hours. Perfect for quick tasks.', true, 1
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = '24h Single Proxy');

-- 5. AUTO-ASSIGN FN
CREATE OR REPLACE FUNCTION public.assign_proxies_for_order(_order_id UUID)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _order RECORD; _plan RECORD; _quota INT;
  _country TEXT; _city TEXT; _kind TEXT;
  _expires TIMESTAMPTZ; _assigned INT := 0;
BEGIN
  SELECT * INTO _order FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  SELECT * INTO _plan FROM public.plans WHERE id = _order.plan_id;

  _quota := COALESCE(
    CASE WHEN _plan.plan_type = 'credit' THEN _plan.credits
         WHEN _plan.unlimited THEN LEAST(COALESCE(_plan.fair_use_limit, 1000), 1000)
         ELSE COALESCE(_plan.max_reveals, _plan.fair_use_limit)
    END, 1);

  _country := NULLIF(_order.filters->>'country', '');
  _city    := NULLIF(_order.filters->>'city', '');
  _kind    := NULLIF(_order.filters->>'proxy_kind', '');

  _expires := CASE WHEN _plan.duration_days IS NOT NULL
                   THEN now() + (_plan.duration_days || ' days')::interval
                   ELSE NULL END;

  WITH picked AS (
    SELECT id FROM public.inventory
     WHERE status = 'available'
       AND assigned_user_id IS NULL
       AND blacklisted = false
       AND (_country IS NULL OR country = _country)
       AND (_city    IS NULL OR city    = _city)
       AND (_kind    IS NULL OR proxy_kind = _kind)
     ORDER BY random()
     LIMIT _quota
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.inventory i
     SET assigned_user_id = _order.user_id,
         assigned_order_id = _order.id,
         assigned_at = now(),
         assignment_expires_at = _expires,
         status = 'assigned',
         updated_at = now()
    FROM picked WHERE i.id = picked.id;

  GET DIAGNOSTICS _assigned = ROW_COUNT;
  UPDATE public.orders SET assigned_count = _assigned WHERE id = _order.id;

  INSERT INTO public.audit_log(actor_id, action, entity, entity_id, metadata)
    VALUES (auth.uid(), 'order.assign_proxies', 'order', _order.id,
            jsonb_build_object('quota', _quota, 'assigned', _assigned,
                               'country', _country, 'city', _city, 'kind', _kind));
  RETURN _assigned;
END $$;

-- 6. UPDATE activate_order → auto-assign
CREATE OR REPLACE FUNCTION public.activate_order(_order_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _order RECORD; _plan RECORD; _sub_id UUID; _assigned INT;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO _order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _order.status <> 'submitted' THEN RAISE EXCEPTION 'Order not submitted'; END IF;
  SELECT * INTO _plan FROM public.plans WHERE id = _order.plan_id;

  UPDATE public.orders SET status='verified', verified_by=auth.uid(), verified_at=now(),
    expires_at = CASE WHEN _plan.duration_days IS NOT NULL THEN now() + (_plan.duration_days || ' days')::interval ELSE NULL END
    WHERE id = _order_id;

  IF _plan.plan_type = 'credit' THEN
    INSERT INTO public.credit_balances(user_id, balance) VALUES (_order.user_id, COALESCE(_plan.credits,0))
      ON CONFLICT (user_id) DO UPDATE SET balance = credit_balances.balance + COALESCE(_plan.credits,0), updated_at = now();
  ELSE
    INSERT INTO public.subscriptions(user_id, plan_id, plan_type, max_reveals, expires_at)
      VALUES (_order.user_id, _plan.id, _plan.plan_type,
              CASE WHEN _plan.unlimited THEN NULL ELSE COALESCE(_plan.max_reveals, _plan.fair_use_limit) END,
              CASE WHEN _plan.duration_days IS NOT NULL THEN now() + (_plan.duration_days || ' days')::interval ELSE NULL END)
      RETURNING id INTO _sub_id;
  END IF;

  _assigned := public.assign_proxies_for_order(_order_id);

  INSERT INTO public.notifications(user_id, title, body, category)
    VALUES (_order.user_id, 'Payment Approved',
            'Your order ' || _order.order_number || ' is now active. ' || _assigned || ' proxies have been assigned to your account.',
            'payment');
  INSERT INTO public.audit_log(actor_id, action, entity, entity_id, metadata)
    VALUES (auth.uid(), 'order.verify', 'order', _order_id, jsonb_build_object('assigned_proxies', _assigned));
  RETURN _sub_id;
END $$;

-- 7. RELEASE EXPIRED
CREATE OR REPLACE FUNCTION public.release_expired_assignments()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n INT;
BEGIN
  UPDATE public.inventory
     SET assigned_user_id = NULL, assigned_order_id = NULL, assigned_at = NULL,
         assignment_expires_at = NULL, status = 'available', updated_at = now()
   WHERE assignment_expires_at IS NOT NULL
     AND assignment_expires_at < now()
     AND assigned_user_id IS NOT NULL;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $$;
