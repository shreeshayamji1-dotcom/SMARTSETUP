-- SmartSetupUAE Phase 0 Pricing + Activities Foundation
-- Run this in Supabase SQL Editor first, then import CSV files from /database.

create extension if not exists pg_trgm;

create table if not exists public.activities_master (
  id uuid primary key default gen_random_uuid(),
  freezone text not null,
  activity_code text not null,
  activity_name text not null,
  industry_group text,
  keywords text,
  approval_required boolean default false,
  approval_authority text,
  is_active boolean default true,
  source text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (freezone, activity_code)
);

create table if not exists public.freezone_packages (
  id uuid primary key default gen_random_uuid(),
  freezone text not null,
  category text,
  package_name text not null,
  duration text default '1 Year',
  workspace text,
  original_price numeric,
  package_price numeric,
  offer_price numeric,
  currency text default 'AED',
  includes_visa text,
  source text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.package_benefits (
  id uuid primary key default gen_random_uuid(),
  freezone text not null,
  package_name text not null,
  sort_order integer default 1,
  benefit text not null,
  source text,
  is_active boolean default true
);

create table if not exists public.package_addons (
  id uuid primary key default gen_random_uuid(),
  freezone text not null,
  addon_name text not null,
  price numeric not null default 0,
  currency text default 'AED',
  unit text,
  notes text,
  source text,
  is_active boolean default true
);

create table if not exists public.package_discounts (
  id uuid primary key default gen_random_uuid(),
  freezone text not null,
  package_name text not null,
  duration text,
  discount_percent numeric,
  applies_to text,
  notes text,
  source text,
  is_active boolean default true
);

create index if not exists idx_activities_master_freezone on public.activities_master(freezone);
create index if not exists idx_activities_master_code on public.activities_master(activity_code);
create index if not exists idx_activities_master_name_trgm on public.activities_master using gin(activity_name gin_trgm_ops);
create index if not exists idx_activities_master_keywords_trgm on public.activities_master using gin(keywords gin_trgm_ops);
create index if not exists idx_freezone_packages_freezone on public.freezone_packages(freezone);
create index if not exists idx_freezone_packages_name on public.freezone_packages(package_name);
create index if not exists idx_package_addons_freezone on public.package_addons(freezone);

alter table public.activities_master enable row level security;
alter table public.freezone_packages enable row level security;
alter table public.package_benefits enable row level security;
alter table public.package_addons enable row level security;
alter table public.package_discounts enable row level security;

-- Public read policies. Admin write policies can be tightened in Phase 15.
do $$ begin
  create policy "activities_master_public_read" on public.activities_master for select using (is_active = true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "freezone_packages_public_read" on public.freezone_packages for select using (is_active = true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "package_benefits_public_read" on public.package_benefits for select using (is_active = true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "package_addons_public_read" on public.package_addons for select using (is_active = true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "package_discounts_public_read" on public.package_discounts for select using (is_active = true);
exception when duplicate_object then null; end $$;

create or replace function public.search_activities(q text, zone text default null, max_rows int default 20)
returns table (id uuid, freezone text, activity_code text, activity_name text, industry_group text, keywords text, score real)
language sql stable as $$
  select a.id, a.freezone, a.activity_code, a.activity_name, a.industry_group, a.keywords,
         greatest(similarity(a.activity_name, q), similarity(coalesce(a.keywords,''), q)) as score
  from public.activities_master a
  where a.is_active = true
    and (zone is null or lower(a.freezone) = lower(zone))
    and (a.activity_name ilike '%' || q || '%' or a.activity_code ilike '%' || q || '%' or coalesce(a.keywords,'') ilike '%' || q || '%' or similarity(a.activity_name, q) > 0.15)
  order by score desc, a.activity_name asc
  limit max_rows;
$$;
