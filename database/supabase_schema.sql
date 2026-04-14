-- Shape Certo - Supabase baseline
-- Execute no SQL Editor do Supabase depois de criar o projeto.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  username text unique,
  avatar_path text,
  active_plan text not null default 'intermediario' check (active_plan in ('basico', 'intermediario', 'avancado')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'annual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gateway text not null,
  gateway_customer_id text,
  default_payment_method_id text,
  card_brand text,
  card_last4 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'payment_profiles_user_gateway_key'
  ) then
    alter table public.payment_profiles
      add constraint payment_profiles_user_gateway_key unique (user_id, gateway);
  end if;
end $$;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('basico', 'intermediario', 'avancado')),
  billing_cycle text not null check (billing_cycle in ('monthly', 'annual')),
  status text not null default 'active',
  token_limit integer not null default 90000,
  token_balance integer not null default 90000,
  current_period_start timestamptz,
  current_period_end timestamptz,
  gateway_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_gateway_subscription_id_key'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_gateway_subscription_id_key unique (gateway_subscription_id);
  end if;
end $$;

create table if not exists public.token_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  tokens_used integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cadence text not null check (cadence in ('daily', 'weekly', 'monthly')),
  status text not null default 'completed',
  checkin_date date not null default current_date,
  payload jsonb not null default '{}'::jsonb,
  ai_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checkin_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_id uuid references public.checkins(id) on delete cascade,
  kind text not null,
  pose text,
  bucket text not null default 'checkin-media',
  path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_protocols (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  payload jsonb not null default '{}'::jsonb,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  protocol_id uuid references public.workout_protocols(id) on delete set null,
  workout_id text not null,
  workout_title text not null,
  payload jsonb not null default '{}'::jsonb,
  performed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.diet_protocols (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  payload jsonb not null default '{}'::jsonb,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.food_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  mark text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, item_id)
);

create table if not exists public.gym_equipment_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  equipment_id text not null,
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, equipment_id)
);

alter table public.profiles enable row level security;
alter table public.payment_profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.token_usage enable row level security;
alter table public.checkins enable row level security;
alter table public.checkin_files enable row level security;
alter table public.workout_protocols enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.diet_protocols enable row level security;
alter table public.food_preferences enable row level security;
alter table public.gym_equipment_preferences enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

create policy "payment_profiles_own" on public.payment_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subscriptions_own" on public.subscriptions for select using (auth.uid() = user_id);
create policy "token_usage_own" on public.token_usage for select using (auth.uid() = user_id);
create policy "checkins_own" on public.checkins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "checkin_files_own" on public.checkin_files for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workout_protocols_own" on public.workout_protocols for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workout_sessions_own" on public.workout_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "diet_protocols_own" on public.diet_protocols for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "food_preferences_own" on public.food_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "gym_equipment_preferences_own" on public.gym_equipment_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', false),
  ('checkin-media', 'checkin-media', false),
  ('exercise-videos', 'exercise-videos', false)
on conflict (id) do nothing;

create policy "avatars_user_folder" on storage.objects
for all
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "checkin_media_user_folder" on storage.objects
for all
using (bucket_id = 'checkin-media' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'checkin-media' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "exercise_videos_user_folder" on storage.objects
for all
using (bucket_id = 'exercise-videos' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'exercise-videos' and auth.uid()::text = (storage.foldername(name))[1]);
