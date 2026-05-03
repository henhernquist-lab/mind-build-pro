-- Water tracking tables

-- water_logs: stores each individual drink log entry
CREATE TABLE public.water_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  log_date date NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  amount_ml integer NOT NULL CHECK (amount_ml > 0),
  drink_type text NOT NULL DEFAULT 'water' CHECK (drink_type IN ('water','sports_drink','juice','coffee','tea','soda','other')),
  is_water boolean NOT NULL DEFAULT true,
  hydration_credit_ml integer NOT NULL CHECK (hydration_credit_ml >= 0),
  input_method text NOT NULL DEFAULT 'manual' CHECK (input_method IN ('manual','camera_scan')),
  notes text
);

ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "water own select" ON public.water_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "water own insert" ON public.water_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "water own delete" ON public.water_logs FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX water_logs_user_date_idx ON public.water_logs (user_id, log_date DESC);
CREATE INDEX water_logs_user_logged_at_idx ON public.water_logs (user_id, logged_at DESC);

-- user_water_goals: stores per-user custom water goal overrides
CREATE TABLE public.user_water_goals (
  user_id uuid PRIMARY KEY,
  goal_ml integer NOT NULL DEFAULT 2000 CHECK (goal_ml >= 500),
  source text NOT NULL DEFAULT 'default' CHECK (source IN ('calculated','custom','default')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_water_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "water_goal own select" ON public.user_water_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "water_goal own upsert" ON public.user_water_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "water_goal own update" ON public.user_water_goals FOR UPDATE USING (auth.uid() = user_id);
