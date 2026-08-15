
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  name text,
  avatar_url text,
  home_currency text NOT NULL DEFAULT 'INR',
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  notification_prefs jsonb NOT NULL DEFAULT '{"flight":true,"weather":true,"recovery":true,"price":true,"booking":true,"automation":true}'::jsonb,
  plan text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles own" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- trips
CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  origin text NOT NULL DEFAULT '',
  destination text NOT NULL DEFAULT '',
  extra_destinations text[] NOT NULL DEFAULT '{}',
  start_date date NOT NULL,
  end_date date NOT NULL,
  adults int NOT NULL DEFAULT 1,
  children int NOT NULL DEFAULT 0,
  budget numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  travel_style text NOT NULL DEFAULT 'balanced',
  interests text[] NOT NULL DEFAULT '{}',
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  recovery_mode text NOT NULL DEFAULT 'assisted',
  automation_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'planning',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT ALL ON public.trips TO service_role;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trips own" ON public.trips FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trips_updated BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX trips_user_idx ON public.trips(user_id, start_date);

CREATE OR REPLACE FUNCTION public.owns_trip(_trip_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.trips t WHERE t.id = _trip_id AND t.user_id = auth.uid());
$$;

-- itinerary_items
CREATE TABLE public.itinerary_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  day_date date NOT NULL,
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '10:00',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'activity',
  location text NOT NULL DEFAULT '',
  latitude double precision,
  longitude double precision,
  estimated_cost numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  travel_minutes int NOT NULL DEFAULT 0,
  indoor_outdoor text NOT NULL DEFAULT 'indoor',
  weather_suitability text NOT NULL DEFAULT 'any',
  booking_url text,
  status text NOT NULL DEFAULT 'flexible',
  is_locked boolean NOT NULL DEFAULT false,
  is_sponsored boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itinerary_items TO authenticated;
GRANT ALL ON public.itinerary_items TO service_role;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "itinerary own" ON public.itinerary_items FOR ALL TO authenticated USING (public.owns_trip(trip_id)) WITH CHECK (public.owns_trip(trip_id));
CREATE TRIGGER itinerary_updated BEFORE UPDATE ON public.itinerary_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX itinerary_trip_idx ON public.itinerary_items(trip_id, day_date, start_time);

-- flights
CREATE TABLE public.flights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'demo',
  airline text NOT NULL DEFAULT '',
  flight_number text NOT NULL,
  departure_airport text NOT NULL DEFAULT '',
  arrival_airport text NOT NULL DEFAULT '',
  scheduled_departure timestamptz,
  scheduled_arrival timestamptz,
  estimated_departure timestamptz,
  estimated_arrival timestamptz,
  actual_arrival timestamptz,
  status text NOT NULL DEFAULT 'scheduled',
  delay_minutes int NOT NULL DEFAULT 0,
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flights TO authenticated;
GRANT ALL ON public.flights TO service_role;
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flights own" ON public.flights FOR ALL TO authenticated USING (public.owns_trip(trip_id)) WITH CHECK (public.owns_trip(trip_id));
CREATE INDEX flights_trip_idx ON public.flights(trip_id);

-- disruption_events
CREATE TABLE public.disruption_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  affected_item_ids uuid[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.disruption_events TO authenticated;
GRANT ALL ON public.disruption_events TO service_role;
ALTER TABLE public.disruption_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "disruptions own" ON public.disruption_events FOR ALL TO authenticated USING (public.owns_trip(trip_id)) WITH CHECK (public.owns_trip(trip_id));
CREATE INDEX disruptions_trip_idx ON public.disruption_events(trip_id, detected_at DESC);

-- recovery_recommendations
CREATE TABLE public.recovery_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  disruption_id uuid REFERENCES public.disruption_events(id) ON DELETE CASCADE,
  recommendation_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recovery_recommendations TO authenticated;
GRANT ALL ON public.recovery_recommendations TO service_role;
ALTER TABLE public.recovery_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recovery own" ON public.recovery_recommendations FOR ALL TO authenticated USING (public.owns_trip(trip_id)) WITH CHECK (public.owns_trip(trip_id));
CREATE INDEX recovery_trip_idx ON public.recovery_recommendations(trip_id, created_at DESC);

-- notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications own" ON public.notifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);

-- trip_history
CREATE TABLE public.trip_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  event text NOT NULL,
  detail text NOT NULL DEFAULT '',
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_history TO authenticated;
GRANT ALL ON public.trip_history TO service_role;
ALTER TABLE public.trip_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history own" ON public.trip_history FOR ALL TO authenticated USING (public.owns_trip(trip_id)) WITH CHECK (public.owns_trip(trip_id));
CREATE INDEX history_trip_idx ON public.trip_history(trip_id, created_at DESC);

-- price_snapshots
CREATE TABLE public.price_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  provider text NOT NULL,
  product_type text NOT NULL,
  product_id text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  booking_url text,
  is_demo boolean NOT NULL DEFAULT true,
  captured_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_snapshots TO authenticated;
GRANT ALL ON public.price_snapshots TO service_role;
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prices own" ON public.price_snapshots FOR ALL TO authenticated USING (public.owns_trip(trip_id)) WITH CHECK (public.owns_trip(trip_id));

-- subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'stripe',
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'inactive',
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions read own" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER subscriptions_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- automation_runs
CREATE TABLE public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  workflow text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error text
);
GRANT SELECT ON public.automation_runs TO authenticated;
GRANT ALL ON public.automation_runs TO service_role;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automation read own" ON public.automation_runs FOR SELECT TO authenticated USING (public.owns_trip(trip_id));

-- affiliate_clicks
CREATE TABLE public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  item_id uuid,
  provider text NOT NULL DEFAULT '',
  target_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.affiliate_clicks TO authenticated;
GRANT ALL ON public.affiliate_clicks TO service_role;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clicks insert own" ON public.affiliate_clicks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clicks read own" ON public.affiliate_clicks FOR SELECT TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.itinerary_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.disruption_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recovery_recommendations;
