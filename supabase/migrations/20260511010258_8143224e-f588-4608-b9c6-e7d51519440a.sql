create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  amount_ml integer not null,
  drink_type text default 'water',
  is_water boolean default true,
  hydration_credit_ml integer not null,
  input_method text default 'manual',
  logged_at timestamptz default now(),
  local_date date not null,
  user_timezone text default 'America/New_York',
  notes text
);

alter table public.water_logs enable row level security;

create policy "users manage own water logs"
  on public.water_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists water_logs_user_date
  on public.water_logs (user_id, local_date);

alter table public.user_stats
  add column if not exists water_goal_ml integer default 2000;

alter table public.user_stats
  add column if not exists water_streak integer default 0;

alter table public.user_stats
  add column if not exists last_water_streak_date date;