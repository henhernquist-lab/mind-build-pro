create table if not exists public.user_macro_targets (
  user_id uuid primary key references auth.users on delete cascade,
  calories integer not null,
  protein_g integer not null,
  carbs_g integer not null,
  fat_g integer not null,
  updated_at timestamptz not null default now()
);

alter table public.user_macro_targets enable row level security;

create policy "users manage own macro targets"
  on public.user_macro_targets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);