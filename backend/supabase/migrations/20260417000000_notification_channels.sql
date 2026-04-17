create table if not exists public.notification_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feed_id uuid references public.feeds(id) on delete cascade,
  channel_type text not null check (channel_type in ('webhook', 'email')),
  config jsonb not null default '{}',
  enabled boolean not null default true,
  last_notified_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists notif_channels_user_idx on public.notification_channels (user_id);
create index if not exists notif_channels_feed_idx on public.notification_channels (feed_id);
