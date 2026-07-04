-- Enable pg_cron and pg_net extensions (run in Supabase dashboard under Database > Extensions)
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;

create table if not exists gaming_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notified boolean not null default false
);

create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_limit_seconds integer not null default 7200
);

create table if not exists push_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  subscription jsonb not null
);

-- Row Level Security
alter table gaming_sessions enable row level security;
alter table user_settings enable row level security;
alter table push_subscriptions enable row level security;

create policy "Users manage own sessions"
  on gaming_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own settings"
  on user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own push subscription"
  on push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for quick daily session queries
create index on gaming_sessions (user_id, started_at);
