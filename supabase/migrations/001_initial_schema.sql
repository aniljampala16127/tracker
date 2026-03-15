-- ============================================
-- Spousal Sponsorship Tracker — Schema (No Auth)
-- Run this in the Supabase SQL Editor
-- ============================================

-- ============================================
-- APPLICATIONS
-- ============================================
create table if not exists public.applications (
  id              uuid primary key default gen_random_uuid(),
  initials        text not null,
  sponsor_status  text not null check (sponsor_status in ('Citizen', 'PR')),
  stream          text not null check (stream in ('Outland', 'Inland')),
  country_origin  text not null,
  province        text default 'Ontario',
  current_step    text not null default 'submitted',
  is_complete     boolean default false,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================
-- STEP EVENTS
-- ============================================
create table if not exists public.step_events (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid references public.applications(id) on delete cascade not null,
  step_id         text not null check (step_id in (
    'submitted', 'aor', 'eligibility', 'background',
    'medical', 'biometrics', 'decision', 'landing'
  )),
  event_date      date not null,
  notes           text,
  created_at      timestamptz default now(),
  unique(application_id, step_id)
);

-- ============================================
-- MESSAGES (live chat / discussion)
-- ============================================
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  display_name    text not null default 'Anonymous',
  body            text not null check (char_length(body) <= 2000),
  application_id  uuid references public.applications(id) on delete set null,
  created_at      timestamptz default now()
);

-- ============================================
-- COMMUNITY AVERAGES (materialized view)
-- ============================================
create materialized view if not exists public.community_averages as
with step_durations as (
  select
    a.stream,
    a.country_origin,
    se_curr.step_id,
    se_curr.event_date - se_prev.event_date as days_taken
  from public.step_events se_curr
  join public.step_events se_prev
    on se_curr.application_id = se_prev.application_id
  join public.applications a
    on a.id = se_curr.application_id
  where
    (se_curr.step_id = 'aor' and se_prev.step_id = 'submitted') or
    (se_curr.step_id = 'eligibility' and se_prev.step_id = 'aor') or
    (se_curr.step_id = 'background' and se_prev.step_id = 'eligibility') or
    (se_curr.step_id = 'medical' and se_prev.step_id = 'background') or
    (se_curr.step_id = 'biometrics' and se_prev.step_id = 'medical') or
    (se_curr.step_id = 'decision' and se_prev.step_id = 'biometrics') or
    (se_curr.step_id = 'landing' and se_prev.step_id = 'decision')
  and se_curr.event_date - se_prev.event_date >= 0
)
select
  stream,
  country_origin,
  step_id,
  count(*)::int as sample_size,
  round(avg(days_taken))::int as avg_days,
  round(percentile_cont(0.5) within group (order by days_taken))::int as median_days,
  min(days_taken)::int as min_days,
  max(days_taken)::int as max_days
from step_durations
group by stream, country_origin, step_id;

create unique index if not exists idx_community_averages_unique
  on public.community_averages (stream, country_origin, step_id);

-- ============================================
-- ROW LEVEL SECURITY (open access)
-- ============================================
alter table public.applications enable row level security;
alter table public.step_events enable row level security;
alter table public.messages enable row level security;

create policy "Open read applications" on public.applications for select using (true);
create policy "Open insert applications" on public.applications for insert with check (true);
create policy "Open update applications" on public.applications for update using (true);
create policy "Open delete applications" on public.applications for delete using (true);

create policy "Open read step_events" on public.step_events for select using (true);
create policy "Open insert step_events" on public.step_events for insert with check (true);
create policy "Open update step_events" on public.step_events for update using (true);
create policy "Open delete step_events" on public.step_events for delete using (true);

create policy "Open read messages" on public.messages for select using (true);
create policy "Open insert messages" on public.messages for insert with check (true);
create policy "Open delete messages" on public.messages for delete using (true);

grant select on public.community_averages to anon, authenticated;

-- ============================================
-- INDEXES
-- ============================================
create index if not exists idx_applications_stream on public.applications(stream);
create index if not exists idx_applications_country on public.applications(country_origin);
create index if not exists idx_applications_step on public.applications(current_step);
create index if not exists idx_applications_created on public.applications(created_at);
create index if not exists idx_step_events_app on public.step_events(application_id);
create index if not exists idx_step_events_step on public.step_events(step_id);
create index if not exists idx_messages_created on public.messages(created_at);
create index if not exists idx_messages_app on public.messages(application_id);

-- ============================================
-- HELPERS
-- ============================================
create or replace function public.refresh_community_averages()
returns void as $$
begin
  refresh materialized view concurrently public.community_averages;
end;
$$ language plpgsql security definer;

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.applications
  for each row execute procedure public.update_updated_at();

-- ============================================
-- ENABLE REALTIME for live chat
-- ============================================
alter publication supabase_realtime add table public.messages;
