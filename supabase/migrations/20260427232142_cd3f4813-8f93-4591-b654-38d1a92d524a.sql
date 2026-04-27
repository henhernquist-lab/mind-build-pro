
-- 1. Planner labels library (subject/activity presets for planner)
CREATE TABLE public.planner_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'school',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.planner_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pl select own" ON public.planner_labels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pl insert own" ON public.planner_labels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pl update own" ON public.planner_labels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pl delete own" ON public.planner_labels FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER planner_labels_updated_at
  BEFORE UPDATE ON public.planner_labels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Saved chats
CREATE TABLE public.saved_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id TEXT NOT NULL,
  subject_label TEXT NOT NULL,
  subject_emoji TEXT NOT NULL DEFAULT '📚',
  subject_color TEXT NOT NULL DEFAULT 'school',
  title TEXT NOT NULL DEFAULT '',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sc select own" ON public.saved_chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sc insert own" ON public.saved_chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sc delete own" ON public.saved_chats FOR DELETE USING (auth.uid() = user_id);

-- 3. Extend user_preferences with weight unit + video preference + first-name override
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS weight_unit TEXT NOT NULL DEFAULT 'lbs',
  ADD COLUMN IF NOT EXISTS videos_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_name TEXT;

-- 4. Migrate existing `coding` rows to `free` for planner data
UPDATE public.planner_blocks SET category = 'free' WHERE category = 'coding';
UPDATE public.planner_recurring SET category = 'free' WHERE category = 'coding';
UPDATE public.planner_overrides SET category = 'free' WHERE category = 'coding';

-- 5. Add index for faster saved chat lookups
CREATE INDEX IF NOT EXISTS saved_chats_user_created_idx ON public.saved_chats(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS planner_labels_user_sort_idx ON public.planner_labels(user_id, sort_order);
