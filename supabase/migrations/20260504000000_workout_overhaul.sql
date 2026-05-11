-- Workout Session Tracking Schema
create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  duration_seconds integer,
  total_volume_lbs numeric default 0,
  total_sets integer default 0,
  total_reps integer default 0,
  pr_count integer default 0,
  xp_earned integer default 0,
  overall_grade text,
  rating text,
  notes text,
  local_date date,
  created_at timestamptz default now()
);

create table if not exists session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references workout_sessions on delete cascade,
  user_id uuid references auth.users,
  exercise_name text not null,
  exercise_id text,
  muscle_group text,
  exercise_type text default 'weighted',
  order_in_session integer default 0,
  best_set_weight numeric,
  best_set_reps integer,
  estimated_1rm numeric,
  exercise_grade text,
  notes text
);

create table if not exists session_sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid references session_exercises on delete cascade,
  session_id uuid references workout_sessions,
  user_id uuid references auth.users,
  set_number integer not null,
  set_type text default 'normal', -- 'warmup', 'normal', 'max'
  weight_lbs numeric default 0,
  reps integer default 0,
  time_seconds numeric,
  is_pr boolean default false,
  estimated_1rm numeric,
  grade text,
  grade_level text,
  grade_percentile integer,
  grade_color text,
  completed_at timestamptz default now()
);

create table if not exists exercise_prs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  exercise_id text not null,
  exercise_name text not null,
  best_weight_lbs numeric,
  best_reps integer,
  best_estimated_1rm numeric,
  best_time_seconds numeric,
  achieved_at timestamptz,
  session_id uuid references workout_sessions,
  unique(user_id, exercise_id)
);

alter table workout_sessions enable row level security;
alter table session_exercises enable row level security;
alter table session_sets enable row level security;
alter table exercise_prs enable row level security;

-- Drop existing policies if they exist before creating
do $$
begin
  drop policy if exists "own sessions" on workout_sessions;
  drop policy if exists "own exercises" on session_exercises;
  drop policy if exists "own sets" on session_sets;
  drop policy if exists "own prs" on exercise_prs;
end $$;

create policy "own sessions" on workout_sessions for all using (auth.uid() = user_id);
create policy "own exercises" on session_exercises for all using (auth.uid() = user_id);
create policy "own sets" on session_sets for all using (auth.uid() = user_id);
create policy "own prs" on exercise_prs for all using (auth.uid() = user_id);
