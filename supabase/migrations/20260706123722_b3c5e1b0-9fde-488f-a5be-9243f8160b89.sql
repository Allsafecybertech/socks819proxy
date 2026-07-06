
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.plan_type AS ENUM ('time', 'credit', 'lifetime');
CREATE TYPE public.order_status AS ENUM ('pending_payment', 'submitted', 'verified', 'rejected', 'expired');
CREATE TYPE public.crypto_currency AS ENUM ('BTC', 'LTC', 'USDT_TRC20', 'USDT_ERC20', 'USDC');
CREATE TYPE public.inventory_status AS ENUM ('available', 'assigned', 'archived');
CREATE TYPE public.ticket_status AS ENUM ('open', 'pending', 'closed');
CREATE TYPE public.ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE public.reveal_source AS ENUM ('time_plan', 'credit');

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE, email TEXT, avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.credit_balances (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_balances TO authenticated;
GRANT ALL ON public.credit_balances TO service_role;
ALTER TABLE public.credit_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own credits" ON public.credit_balances FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin read credits" ON public.credit_balances FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
    VALUES (NEW.id, NEW.email, split_part(NEW.email,'@',1))
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  INSERT INTO public.credit_balances (user_id, balance) VALUES (NEW.id, 0) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, description TEXT,
  plan_type plan_type NOT NULL,
  price_usd NUMERIC(12,2) NOT NULL,
  duration_days INTEGER, max_reveals INTEGER, credits INTEGER,
  unlimited BOOLEAN NOT NULL DEFAULT false,
  fair_use_limit INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO authenticated, anon;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read active plans" ON public.plans FOR SELECT USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage plans" ON public.plans FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER plans_updated BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  plan_type plan_type NOT NULL,
  reveals_used INTEGER NOT NULL DEFAULT 0,
  max_reveals INTEGER,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subs" ON public.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin read subs" ON public.subscriptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL, region TEXT, city TEXT, zipcode TEXT,
  isp TEXT, host TEXT, speed TEXT, auth_type TEXT, proxy_kind TEXT,
  ip TEXT NOT NULL, port INTEGER NOT NULL, username TEXT, password TEXT,
  status inventory_status NOT NULL DEFAULT 'available',
  assigned_user UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.inventory TO authenticated;
GRANT ALL ON public.inventory TO service_role;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all inventory" ON public.inventory FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "auth read available" ON public.inventory FOR SELECT TO authenticated USING (status = 'available');
CREATE TRIGGER inventory_updated BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE VIEW public.inventory_listing WITH (security_invoker = true) AS
SELECT id, country, region, city, zipcode, isp, host, speed, auth_type, proxy_kind, status, created_at
FROM public.inventory WHERE status = 'available';
GRANT SELECT ON public.inventory_listing TO authenticated;

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE DEFAULT ('NS-' || upper(substr(md5(random()::text),1,8))),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  currency crypto_currency NOT NULL,
  wallet_address TEXT NOT NULL,
  amount_usd NUMERIC(12,2) NOT NULL,
  amount_crypto NUMERIC(24,8),
  tx_hash TEXT, screenshot_url TEXT,
  status order_status NOT NULL DEFAULT 'pending_payment',
  admin_notes TEXT,
  verified_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ, verified_at TIMESTAMPTZ, expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own orders read" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own orders insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own orders submit" ON public.orders FOR UPDATE TO authenticated USING (user_id = auth.uid() AND status IN ('pending_payment','submitted')) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin orders all" ON public.orders FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.viewed_proxies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  revealed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  source reveal_source NOT NULL,
  ip TEXT NOT NULL, port INTEGER NOT NULL, username TEXT, password TEXT,
  country TEXT, city TEXT, isp TEXT
);
GRANT SELECT ON public.viewed_proxies TO authenticated;
GRANT ALL ON public.viewed_proxies TO service_role;
ALTER TABLE public.viewed_proxies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reveals" ON public.viewed_proxies FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin reveals" ON public.viewed_proxies FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, body TEXT, category TEXT NOT NULL DEFAULT 'system',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifs" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "mark own read" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin notif all" ON public.notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  priority ticket_priority NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tickets" ON public.support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own ticket create" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin tickets" ON public.support_tickets FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER tickets_updated BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  is_admin BOOLEAN NOT NULL DEFAULT false,
  body TEXT NOT NULL, attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ticket msgs" ON public.support_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "post ticket msg" ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, entity TEXT, entity_id UUID, metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin audit" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read settings" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin settings" ON public.system_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.reveal_proxy(_inventory_id UUID, _source reveal_source)
RETURNS TABLE (view_id UUID, ip TEXT, port INTEGER, username TEXT, password TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user UUID := auth.uid();
  _inv RECORD; _sub RECORD; _view UUID;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _inv FROM public.inventory WHERE inventory.id = _inventory_id FOR UPDATE;
  IF NOT FOUND OR _inv.status <> 'available' THEN RAISE EXCEPTION 'Proxy unavailable'; END IF;

  IF _source = 'time_plan' THEN
    SELECT * INTO _sub FROM public.subscriptions
     WHERE user_id = _user AND is_active
       AND plan_type IN ('time','lifetime')
       AND (expires_at IS NULL OR expires_at > now())
     ORDER BY expires_at DESC NULLS LAST
     LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'No active plan'; END IF;
    IF _sub.max_reveals IS NOT NULL AND _sub.reveals_used >= _sub.max_reveals THEN
      RAISE EXCEPTION 'Reveal cap reached';
    END IF;
    UPDATE public.subscriptions SET reveals_used = reveals_used + 1 WHERE subscriptions.id = _sub.id;
  ELSE
    UPDATE public.credit_balances SET balance = balance - 1, updated_at = now()
      WHERE user_id = _user AND balance > 0;
    IF NOT FOUND THEN RAISE EXCEPTION 'No credits available'; END IF;
  END IF;

  INSERT INTO public.viewed_proxies(user_id, inventory_id, source, ip, port, username, password, country, city, isp)
    VALUES (_user, _inv.id, _source, _inv.ip, _inv.port, _inv.username, _inv.password, _inv.country, _inv.city, _inv.isp)
    RETURNING viewed_proxies.id INTO _view;

  INSERT INTO public.audit_log(actor_id, action, entity, entity_id, metadata)
    VALUES (_user, 'reveal', 'inventory', _inv.id, jsonb_build_object('source', _source));

  RETURN QUERY SELECT _view, _inv.ip, _inv.port, _inv.username, _inv.password;
END $$;

CREATE OR REPLACE FUNCTION public.activate_order(_order_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _order RECORD; _plan RECORD; _sub_id UUID;
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

  INSERT INTO public.notifications(user_id, title, body, category)
    VALUES (_order.user_id, 'Payment Approved', 'Your order ' || _order.order_number || ' is now active.', 'payment');
  INSERT INTO public.audit_log(actor_id, action, entity, entity_id) VALUES (auth.uid(), 'order.verify', 'order', _order_id);
  RETURN _sub_id;
END $$;

CREATE OR REPLACE FUNCTION public.reject_order(_order_id UUID, _reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _order RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO _order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  UPDATE public.orders SET status='rejected', admin_notes=_reason, verified_by=auth.uid(), verified_at=now() WHERE id=_order_id;
  INSERT INTO public.notifications(user_id, title, body, category)
    VALUES (_order.user_id, 'Payment Rejected', COALESCE(_reason,'Your payment was rejected.'), 'payment');
  INSERT INTO public.audit_log(actor_id, action, entity, entity_id, metadata)
    VALUES (auth.uid(), 'order.reject', 'order', _order_id, jsonb_build_object('reason', _reason));
END $$;

INSERT INTO public.plans (name, plan_type, price_usd, duration_days, max_reveals, credits, unlimited, sort_order) VALUES
  ('1 Day', 'time', 5, 1, 50, NULL, false, 1),
  ('15 Days', 'time', 25, 15, 500, NULL, false, 2),
  ('30 Days', 'time', 45, 30, 1500, NULL, false, 3),
  ('365 Days', 'time', 350, 365, 20000, NULL, false, 4),
  ('50 Credits', 'credit', 5, NULL, NULL, 50, false, 10),
  ('120 Credits', 'credit', 11, NULL, NULL, 120, false, 11),
  ('240 Credits', 'credit', 20, NULL, NULL, 240, false, 12),
  ('450 Credits', 'credit', 36, NULL, NULL, 450, false, 13),
  ('900 Credits', 'credit', 65, NULL, NULL, 900, false, 14),
  ('Lifetime', 'lifetime', 999, NULL, NULL, NULL, true, 20);

INSERT INTO public.system_settings (key, value) VALUES
  ('wallet.BTC', '""'),('wallet.LTC','""'),('wallet.USDT_TRC20','""'),('wallet.USDT_ERC20','""'),('wallet.USDC','""');
