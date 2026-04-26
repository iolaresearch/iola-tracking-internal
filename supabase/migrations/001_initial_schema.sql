-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Applications & Grants
create table public.applications (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  type             text not null check (type in ('Accelerator','Grant','VC / Angel','Partnership','Academic')),
  region           text,
  fund_description text,
  status           text not null default 'Not Yet Applied'
    check (status in ('Not Yet Applied','Applied','In Progress','Accepted','Rejected','Pending')),
  priority         text not null default 'Medium'
    check (priority in ('Critical','High','Medium','Low')),
  next_step        text,
  notes            text,
  amount           text,
  deadline         date,
  contact_name     text,
  owner            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Outreach & Contacts
create table public.outreach (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  role         text,
  region       text,
  status       text not null default 'Warm'
    check (status in ('Active','Pending','Warm','Cold','Done')),
  last_contact date,
  notes        text,
  next_step    text,
  owner        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Action Items
create table public.action_items (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  description text,
  owner       text,
  due_date    date,
  status      text not null default 'To Do'
    check (status in ('To Do','In Progress','Done')),
  priority    text not null default 'High'
    check (priority in ('Critical','High','Medium','Low')),
  week_label  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Activity Log
create table public.activity_log (
  id          uuid primary key default uuid_generate_v4(),
  user_email  text,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  entity_name text,
  created_at  timestamptz default now()
);

-- Auto-update updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_applications_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

create trigger set_outreach_updated_at
  before update on public.outreach
  for each row execute function public.set_updated_at();

create trigger set_action_items_updated_at
  before update on public.action_items
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.applications  enable row level security;
alter table public.outreach      enable row level security;
alter table public.action_items  enable row level security;
alter table public.activity_log  enable row level security;

create policy "Authenticated full access to applications"
  on public.applications for all
  using (auth.role() = 'authenticated');

create policy "Authenticated full access to outreach"
  on public.outreach for all
  using (auth.role() = 'authenticated');

create policy "Authenticated full access to action_items"
  on public.action_items for all
  using (auth.role() = 'authenticated');

create policy "Authenticated full access to activity_log"
  on public.activity_log for all
  using (auth.role() = 'authenticated');
