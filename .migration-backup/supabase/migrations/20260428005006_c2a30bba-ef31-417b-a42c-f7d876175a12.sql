
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.academic_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  test_date DATE NOT NULL,
  topics TEXT,
  notes TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  completed BOOLEAN NOT NULL DEFAULT false,
  score INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.academic_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tests own select" ON public.academic_tests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tests own insert" ON public.academic_tests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tests own update" ON public.academic_tests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tests own delete" ON public.academic_tests FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_tests_user_date ON public.academic_tests(user_id, test_date);

CREATE TABLE public.vocab_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  word TEXT NOT NULL,
  definition TEXT NOT NULL,
  example TEXT,
  deck TEXT NOT NULL DEFAULT 'sat',
  ease REAL NOT NULL DEFAULT 2.5,
  interval_days INT NOT NULL DEFAULT 0,
  reps INT NOT NULL DEFAULT 0,
  due_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reviewed_at TIMESTAMPTZ,
  mastered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vocab_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vocab own select" ON public.vocab_words FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "vocab own insert" ON public.vocab_words FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vocab own update" ON public.vocab_words FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "vocab own delete" ON public.vocab_words FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_vocab_due ON public.vocab_words(user_id, due_at);

CREATE TABLE public.study_streak (
  user_id UUID NOT NULL PRIMARY KEY,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_study_date DATE,
  multiplier_active_until DATE,
  total_study_days INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.study_streak ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streak own select" ON public.study_streak FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "streak own insert" ON public.study_streak FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "streak own update" ON public.study_streak FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE public.study_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.study_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes own select" ON public.study_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notes own insert" ON public.study_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes own update" ON public.study_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notes own delete" ON public.study_notes FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_notes_user_subject ON public.study_notes(user_id, subject);

CREATE TRIGGER trg_tests_updated BEFORE UPDATE ON public.academic_tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_notes_updated BEFORE UPDATE ON public.study_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
