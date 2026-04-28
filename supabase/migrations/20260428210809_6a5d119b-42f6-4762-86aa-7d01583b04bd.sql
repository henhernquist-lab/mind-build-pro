-- Meal logs (user food entries with macros)
CREATE TABLE public.meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  meal_type text NOT NULL DEFAULT 'snack', -- breakfast, lunch, dinner, pre_workout, post_workout, snack
  description text NOT NULL,
  calories integer NOT NULL DEFAULT 0,
  protein_g integer NOT NULL DEFAULT 0,
  carbs_g integer NOT NULL DEFAULT 0,
  fat_g integer NOT NULL DEFAULT 0,
  ai_estimated boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_meal_logs_user_date ON public.meal_logs(user_id, log_date DESC);

ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ml select own" ON public.meal_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ml insert own" ON public.meal_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ml update own" ON public.meal_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ml delete own" ON public.meal_logs FOR DELETE USING (auth.uid() = user_id);

-- Nutrition preferences (allergies, dietary preferences)
CREATE TABLE public.nutrition_prefs (
  user_id uuid PRIMARY KEY,
  preferences text,
  allergies text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.nutrition_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "np select own" ON public.nutrition_prefs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "np insert own" ON public.nutrition_prefs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "np update own" ON public.nutrition_prefs FOR UPDATE USING (auth.uid() = user_id);

-- 1RM history (estimated max lifts over time)
CREATE TABLE public.lift_max_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exercise text NOT NULL,
  estimated_1rm_lbs numeric NOT NULL,
  weight_used numeric NOT NULL,
  reps_used integer NOT NULL,
  formula_avg numeric,
  bodyweight_lbs numeric,
  strength_grade text, -- Beginner, Novice, Intermediate, Advanced, Elite
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_lift_max_user_ex ON public.lift_max_history(user_id, exercise, created_at DESC);

ALTER TABLE public.lift_max_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lmh select own" ON public.lift_max_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lmh insert own" ON public.lift_max_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lmh delete own" ON public.lift_max_history FOR DELETE USING (auth.uid() = user_id);