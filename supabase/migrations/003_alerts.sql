create table public.alerts (
  id          uuid primary key default uuid_generate_v4(),
  user_email  text not null,
  type        text not null check (type in (
    'deadline_today','deadline_upcoming','overdue',
    'assignment','status_change','ai_action'
  )),
  title       text not null,
  body        text,
  priority    text check (priority in ('Critical','High','Medium','Low')),
  entity_type text,
  entity_id   uuid,
  entity_name text,
  snapshot    jsonb,
  read        boolean not null default false,
  dismissed   boolean not null default false,
  created_at  timestamptz default now()
);

alter table public.alerts enable row level security;

create policy "Users see own alerts"
  on public.alerts for all
  using (user_email = auth.jwt() ->> 'email');

create index alerts_user_unread on public.alerts (user_email, dismissed, created_at desc);
