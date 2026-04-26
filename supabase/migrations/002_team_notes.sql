-- Team Knowledge Base
-- Free-form shared notes the AI always loads. Anyone can read/write.
create table public.team_notes (
  id         uuid primary key default uuid_generate_v4(),
  title      text not null,
  body       text not null,
  category   text not null default 'General'
    check (category in ('Contact','Context','Rule','Fundraising','Engineering','Research','General')),
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger set_team_notes_updated_at
  before update on public.team_notes
  for each row execute function public.set_updated_at();

alter table public.team_notes enable row level security;

create policy "Authenticated full access to team_notes"
  on public.team_notes for all
  using (auth.role() = 'authenticated');
