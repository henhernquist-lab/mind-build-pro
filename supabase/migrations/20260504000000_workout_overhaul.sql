-- Workout Overhaul Tables
create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  name text,
  started_at timestamptz,
  finished_at timestamptz,
  duration_seconds integer,
  total_volume_lbs numeric,
  total_sets integer,
  total_reps integer,
  pr_count integer,
  xp_earned integer,
  rating text,
  notes text,
  local_date date,
  created_at timestamptz default now()
);

create table if not exists session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references workout_sessions on delete cascade,
  user_id uuid references auth.users,
  exercise_name text,
  exercise_id text,
  muscle_group text,
  exercise_type text,
  order_in_session integer,
  notes text
);

create table if not exists session_sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid references session_exercises on delete cascade,
  session_id uuid references workout_sessions,
  user_id uuid references auth.users,
  set_number integer,
  weight_lbs numeric,
  reps integer,
  time_seconds numeric,
  distance_meters numeric,
  is_pr boolean default false,
  estimated_1rm numeric,
  grade text,
  grade_level text,
  grade_percentile integer,
  completed_at timestamptz
);

create table if not exists workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  name text,
  exercises jsonb,
  is_default boolean default false,
  created_at timestamptz default now()
);

-- Recovery Feature Tables (ensuring user_id column name as per user instructions)
create table if not exists injuries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
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

create table if not exists recovery_checkins (
  id uuid primary key default gen_random_uuid(),
  injury_id uuid references injuries(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  pain_level integer not null check (pain_level >= 0 and pain_level <= 10),
  activities_completed jsonb not null default '[]',
  notes text,
  created_at timestamptz not null default now()
);

-- Enable RLS on all new tables
alter table workout_sessions enable row level security;
alter table session_exercises enable row level security;
alter table session_sets enable row level security;
alter table workout_templates enable row level security;
alter table injuries enable row level security;
alter table recovery_checkins enable row level security;

-- RLS policies — users only see their own data
do $$
begin
  if not exists (select 1 from pg_policy where polname = 'users see own sessions') then
    create policy "users see own sessions" on workout_sessions for all using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polname = 'users see own exercises') then
    create policy "users see own exercises" on session_exercises for all using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polname = 'users see own sets') then
    create policy "users see own sets" on session_sets for all using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polname = 'users see own templates') then
    create policy "users see own templates" on workout_templates for all using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polname = 'users see own injuries') then
    create policy "users see own injuries" on injuries for all using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polname = 'users see own recovery_checkins') then
    create policy "users see own recovery_checkins" on recovery_checkins for all using (auth.uid() = user_id);
  end if;
end $$;
