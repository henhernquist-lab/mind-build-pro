
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Workout',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  total_volume_lbs NUMERIC NOT NULL DEFAULT 0,
  total_sets INTEGER NOT NULL DEFAULT 0,
  total_reps INTEGER NOT NULL DEFAULT 0,
  pr_count INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  rating INTEGER,
  local_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ws own all" ON public.workout_sessions;
CREATE POLICY "ws own all" ON public.workout_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_ws_user_finished ON public.workout_sessions(user_id, finished_at DESC);

CREATE TABLE IF NOT EXISTS public.session_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  exercise_name TEXT NOT NULL,
  exercise_id TEXT,
  muscle_group TEXT,
  exercise_type TEXT,
  order_in_session INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "se own all" ON public.session_exercises;
CREATE POLICY "se own all" ON public.session_exercises FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_se_session ON public.session_exercises(session_id);

CREATE TABLE IF NOT EXISTS public.session_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_exercise_id UUID NOT NULL REFERENCES public.session_exercises(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  set_number INTEGER NOT NULL DEFAULT 1,
  set_type TEXT NOT NULL DEFAULT 'normal',
  weight_lbs NUMERIC,
  reps INTEGER,
  time_seconds INTEGER,
  distance_meters NUMERIC,
  is_pr BOOLEAN NOT NULL DEFAULT false,
  grade TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.session_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ss own all" ON public.session_sets;
CREATE POLICY "ss own all" ON public.session_sets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_ss_exercise ON public.session_sets(session_exercise_id);
CREATE INDEX IF NOT EXISTS idx_ss_user_pr ON public.session_sets(user_id) WHERE is_pr = true;

CREATE TABLE IF NOT EXISTS public.exercise_prs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  exercise_name TEXT NOT NULL,
  exercise_id TEXT,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'lbs',
  reps INTEGER,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id UUID,
  UNIQUE(user_id, exercise_name)
);
ALTER TABLE public.exercise_prs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prs own all" ON public.exercise_prs;
CREATE POLICY "prs own all" ON public.exercise_prs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.injuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  sport TEXT,
  body_part TEXT NOT NULL,
  injury_type TEXT,
  severity TEXT,
  date_of_injury DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  cleared_by_doctor BOOLEAN NOT NULL DEFAULT false,
  protocol_json JSONB,
  estimated_return_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.injuries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inj own all" ON public.injuries;
CREATE POLICY "inj own all" ON public.injuries FOR ALL USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

CREATE TABLE IF NOT EXISTS public.recovery_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  injury_id UUID NOT NULL REFERENCES public.injuries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  pain_level INTEGER NOT NULL DEFAULT 0,
  activities_completed JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recovery_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rc own all" ON public.recovery_checkins;
CREATE POLICY "rc own all" ON public.recovery_checkins FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_rc_injury ON public.recovery_checkins(injury_id, date DESC);
