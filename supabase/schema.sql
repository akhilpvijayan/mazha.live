-- ═══════════════════════════════════════════════════════════
-- MAZHA.LIVE — Supabase Schema v2
-- Run this in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. RAIN REPORTS TABLE
create table if not exists public.rain_reports (
  id          uuid primary key default gen_random_uuid(),
  pin         text not null,
  place       text not null,
  district    text not null,
  state       text not null default 'Kerala',
  lat         double precision not null,
  lng         double precision not null,
  intensity   integer not null,          -- mm/hr at time of report
  reported_at timestamptz not null default now()
);

create index if not exists rain_reports_pin_idx      on public.rain_reports(pin);
create index if not exists rain_reports_district_idx on public.rain_reports(district);
create index if not exists rain_reports_time_idx     on public.rain_reports(reported_at desc);

-- 2. AGGREGATED VIEW
-- Intensity decays linearly to 0 over 2 hours.
-- Reports older than 2 days are excluded entirely.
-- Shows a ghost (faded) entry when all reports are 2–48 h old.
create or replace view public.rain_aggregates as
with recent as (
  select *,
    extract(epoch from (now() - reported_at)) / 3600.0 as age_hours
  from public.rain_reports
  where reported_at > now() - interval '48 hours'   -- 2-day hard cutoff
),
weighted as (
  select
    pin, place, district, state, lat, lng,
    -- decay factor: 1.0 at t=0, 0.0 at t=2h, 0 after
    intensity * greatest(0, 1.0 - (age_hours / 2.0)) as effective_intensity,
    age_hours,
    reported_at
  from recent
)
select
  pin,
  place,
  district,
  state,
  lat,
  lng,
  round(avg(effective_intensity)::numeric, 1)   as avg_intensity,
  round(max(effective_intensity)::numeric, 1)   as peak_intensity,
  count(*)::int                                  as report_count,
  min(reported_at)                               as first_report,
  max(reported_at)                               as last_updated,
  -- ghost = all effective intensities are 0 (reports > 2h old) but < 48h
  (max(effective_intensity) = 0)                 as is_ghost
from weighted
group by pin, place, district, state, lat, lng
having count(*) > 0;

-- 3. PUSH SUBSCRIPTIONS
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  districts  text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. NOTIFICATIONS LOG
create table if not exists public.notifications_log (
  id         uuid primary key default gen_random_uuid(),
  district   text not null,
  pin        text not null,
  intensity  integer not null,
  sent_count integer not null default 0,
  sent_at    timestamptz not null default now()
);

-- 5. ROW LEVEL SECURITY
alter table public.rain_reports       enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notifications_log  enable row level security;

create policy "anyone_insert_reports"  on public.rain_reports for insert with check (true);
create policy "anyone_read_reports"    on public.rain_reports for select using (true);
create policy "anyone_subscribe"       on public.push_subscriptions for insert with check (true);
create policy "anyone_update_sub"      on public.push_subscriptions for update using (true);
create policy "anyone_read_sub"        on public.push_subscriptions for select using (true);
create policy "anyone_delete_sub"      on public.push_subscriptions for delete using (true);

-- 6. AUTO-DELETE rows older than 2 days (pg_cron — enable in Supabase extensions)
-- select cron.schedule('delete-old-reports', '0 * * * *',
--   $$delete from public.rain_reports where reported_at < now() - interval '48 hours'$$);

-- 7. REALTIME
alter publication supabase_realtime add table public.rain_reports;
