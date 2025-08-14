-- Create tables for restaurant business hours and closures
-- Run this in Supabase SQL editor

begin;

-- Restaurant settings: single-row config
create table if not exists public.restaurant_settings (
  id int primary key default 1,
  open_time text not null default '17:00',           -- HH:MM
  close_time text not null default '21:00',          -- HH:MM
  slot_interval_min int not null default 30,         -- minutes between slots
  dining_duration_min int not null default 90,       -- minimum dining duration in minutes
  updated_at timestamptz not null default now()
);

insert into public.restaurant_settings (id)
values (1)
on conflict (id) do nothing;

-- Closures (holidays/off days)
create table if not exists public.restaurant_closures (
  id bigserial primary key,
  date date not null unique,
  reason text
);

-- Enable RLS
alter table public.restaurant_settings enable row level security;
alter table public.restaurant_closures enable row level security;

-- Read-only policies for anonymous access; writes should use service role
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='restaurant_settings' and policyname='read_settings') then
    create policy read_settings on public.restaurant_settings
      for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='restaurant_closures' and policyname='read_closures') then
    create policy read_closures on public.restaurant_closures
      for select using (true);
  end if;
end $$;

commit;
