-- AIF initial schema

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.feeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  domain text,
  cadence text,
  feed_url text unique not null,
  subscriber_count integer not null default 0,
  is_verified boolean not null default false,
  is_public boolean not null default true,
  raw_feed jsonb,
  last_fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feeds_domain_idx on public.feeds (domain);
create index if not exists feeds_cadence_idx on public.feeds (cadence);
create index if not exists feeds_subscriber_count_idx on public.feeds (subscriber_count desc);
create index if not exists feeds_created_at_idx on public.feeds (created_at desc);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feed_id uuid not null references public.feeds(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, feed_id)
);

create index if not exists subscriptions_user_idx on public.subscriptions (user_id);
create index if not exists subscriptions_feed_idx on public.subscriptions (feed_id);

create table if not exists public.feed_items (
  id uuid primary key default gen_random_uuid(),
  feed_id uuid not null references public.feeds(id) on delete cascade,
  external_id text,
  title text,
  summary text,
  content text,
  confidence double precision,
  signals text[],
  source_urls text[],
  agent_model text,
  tags text[],
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (feed_id, external_id)
);

create index if not exists feed_items_feed_idx on public.feed_items (feed_id);
create index if not exists feed_items_published_at_idx on public.feed_items (published_at desc);

-- touch updated_at
create or replace function public.tg_set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists feeds_set_updated_at on public.feeds;
create trigger feeds_set_updated_at
  before update on public.feeds
  for each row execute function public.tg_set_updated_at();
