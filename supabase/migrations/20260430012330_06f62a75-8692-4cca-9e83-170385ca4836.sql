
-- Colleges the user is targeting
CREATE TABLE public.colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  division TEXT,
  sport TEXT,
  location TEXT,
  website TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'interested'
    CHECK (status IN ('interested','contacted','applied','offered','committed','rejected')),
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own colleges" ON public.colleges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own colleges" ON public.colleges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own colleges" ON public.colleges FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own colleges" ON public.colleges FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER colleges_updated_at BEFORE UPDATE ON public.colleges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_colleges_user ON public.colleges(user_id, status);

-- Coaches / recruiters
CREATE TABLE public.recruitment_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  last_contacted DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recruitment_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own contacts" ON public.recruitment_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own contacts" ON public.recruitment_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own contacts" ON public.recruitment_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own contacts" ON public.recruitment_contacts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER recruitment_contacts_updated_at BEFORE UPDATE ON public.recruitment_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_recruitment_contacts_college ON public.recruitment_contacts(college_id);

-- Action items
CREATE TABLE public.recruitment_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recruitment_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tasks" ON public.recruitment_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own tasks" ON public.recruitment_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own tasks" ON public.recruitment_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own tasks" ON public.recruitment_tasks FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER recruitment_tasks_updated_at BEFORE UPDATE ON public.recruitment_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_recruitment_tasks_user_due ON public.recruitment_tasks(user_id, completed, due_date);

-- Timeline milestones
CREATE TABLE public.recruitment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'note'
    CHECK (event_type IN ('note','email','call','visit','offer','application','commitment','rejection')),
  title TEXT NOT NULL,
  description TEXT,
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recruitment_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own milestones" ON public.recruitment_milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own milestones" ON public.recruitment_milestones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own milestones" ON public.recruitment_milestones FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own milestones" ON public.recruitment_milestones FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_recruitment_milestones_college ON public.recruitment_milestones(college_id, occurred_on DESC);
