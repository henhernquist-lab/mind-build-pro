
CREATE TABLE public.practice_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  total_questions INTEGER NOT NULL DEFAULT 10,
  source TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai','notes','recommended')),
  source_note_id UUID,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pt select own" ON public.practice_tests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pt insert own" ON public.practice_tests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pt delete own" ON public.practice_tests FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_practice_tests_user ON public.practice_tests(user_id, created_at DESC);

CREATE TABLE public.practice_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  test_id UUID NOT NULL REFERENCES public.practice_tests(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  score_pct INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  weak_topics TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pa select own" ON public.practice_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pa insert own" ON public.practice_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pa delete own" ON public.practice_attempts FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_practice_attempts_user ON public.practice_attempts(user_id, subject, created_at DESC);

CREATE TABLE public.subject_weakness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  last_two_scores INTEGER[] NOT NULL DEFAULT '{}',
  flagged_for_review BOOLEAN NOT NULL DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, subject)
);

ALTER TABLE public.subject_weakness ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sw select own" ON public.subject_weakness FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sw insert own" ON public.subject_weakness FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sw update own" ON public.subject_weakness FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sw delete own" ON public.subject_weakness FOR DELETE USING (auth.uid() = user_id);
