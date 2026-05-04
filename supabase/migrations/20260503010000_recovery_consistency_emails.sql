-- ============================================================
-- AI Comeback Plan: injuries + recovery_checkins
-- ============================================================
create table if not exists injuries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  sport text not null default '',
  body_part text not null,
  injury_type text not null,
  severity text not null check (severity in ('mild', 'moderate', 'severe')),
  date_of_injury date not null,
  description text,
  cleared_by_doctor boolean default false,
  protocol_json jsonb,
  estimated_return_date date,
  status text not null default 'active' check (status in ('active', 'recovered')),
  created_at timestamptz not null default now()
);

alter table injuries enable row level security;
create policy "injuries_select" on injuries for select using (auth.uid() = student_id);
create policy "injuries_insert" on injuries for insert with check (auth.uid() = student_id);
create policy "injuries_update" on injuries for update using (auth.uid() = student_id);
create policy "injuries_delete" on injuries for delete using (auth.uid() = student_id);

create table if not exists recovery_checkins (
  id uuid primary key default gen_random_uuid(),
  injury_id uuid not null references injuries(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  pain_level integer not null check (pain_level >= 0 and pain_level <= 10),
  activities_completed text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);

alter table recovery_checkins enable row level security;
create policy "checkins_select" on recovery_checkins for select using (auth.uid() = student_id);
create policy "checkins_insert" on recovery_checkins for insert with check (auth.uid() = student_id);
create policy "checkins_update" on recovery_checkins for update using (auth.uid() = student_id);
create policy "checkins_delete" on recovery_checkins for delete using (auth.uid() = student_id);

-- ============================================================
-- Consistency Score
-- ============================================================
create table if not exists consistency_scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  week_start_date date not null,
  workout_score numeric not null default 0,
  study_score numeric not null default 0,
  nutrition_score numeric not null default 0,
  water_score numeric not null default 0,
  total_score integer not null default 0,
  xp_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  unique (student_id, week_start_date)
);

alter table consistency_scores enable row level security;
create policy "consistency_select" on consistency_scores for select using (auth.uid() = student_id);
create policy "consistency_insert" on consistency_scores for insert with check (auth.uid() = student_id);
create policy "consistency_update" on consistency_scores for update using (auth.uid() = student_id);
create policy "consistency_delete" on consistency_scores for delete using (auth.uid() = student_id);

-- ============================================================
-- Teacher Email Drafter
-- ============================================================
create table if not exists teacher_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null default '',
  teacher_name text not null default '',
  email_subject_line text not null default '',
  email_body text not null default '',
  raw_input text not null default '',
  tone_used text not null default 'friendly',
  created_at timestamptz not null default now()
);

alter table teacher_emails enable row level security;
create policy "emails_select" on teacher_emails for select using (auth.uid() = user_id);
create policy "emails_insert" on teacher_emails for insert with check (auth.uid() = user_id);
create policy "emails_update" on teacher_emails for update using (auth.uid() = user_id);
create policy "emails_delete" on teacher_emails for delete using (auth.uid() = user_id);
