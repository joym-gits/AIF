create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feed_id uuid not null references public.feeds(id) on delete cascade,
  key_hash text unique not null,
  label text,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists api_keys_feed_idx on public.api_keys (feed_id);
create index if not exists api_keys_user_idx on public.api_keys (user_id);

-- Track last ingest error for health endpoint
alter table public.feeds
  add column if not exists last_error text,
  add column if not exists last_error_at timestamptz;
