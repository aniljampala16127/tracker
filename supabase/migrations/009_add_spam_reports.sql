-- ============================================
-- SPAM REPORTS
-- Lets users flag suspicious entries (e.g. AOR marked within 1 day of
-- submission, which IRCC cannot actually do). When ≥2 distinct users
-- report the same application, the entry is auto-deleted by the API.
-- ============================================

create table if not exists public.spam_reports (
  id                 uuid primary key default gen_random_uuid(),
  application_id     uuid references public.applications(id) on delete cascade not null,
  reporter_pin_hash  text not null,
  reason             text,
  created_at         timestamptz default now(),
  unique(application_id, reporter_pin_hash)
);

create index if not exists idx_spam_reports_app on public.spam_reports(application_id);

alter table public.spam_reports enable row level security;

create policy "Open read spam_reports" on public.spam_reports for select using (true);
create policy "Open insert spam_reports" on public.spam_reports for insert with check (true);
create policy "Open delete spam_reports" on public.spam_reports for delete using (true);
