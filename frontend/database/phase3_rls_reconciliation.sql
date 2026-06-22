-- =====================================================================
-- SmartSetupUAE — PHASE 3 RLS RECONCILIATION
-- Root cause: RLS enabled on catalog/lead tables with ZERO policies,
-- so the anon frontend reads nothing and cannot capture leads/orders.
-- Uses role `public` (covers anon + authenticated) for reliable matching.
-- Idempotent: safe to re-run.
-- =====================================================================

-- ---------- PUBLIC CATALOG: SELECT ----------
do $$
declare t text;
  read_tables text[] := array[
    'freezone_packages','package_benefits','package_addons','package_discounts',
    'service_addons','coupons','freezone_pricing','freezone_rules',
    'founder_club_tiers','founder_club_benefits','founder_club_discount_rules',
    'founder_club_events','founder_club_opportunities','founder_club_reviews',
    'early_bird_campaigns','platform_settings','scratch_cards'
  ];
begin
  foreach t in array read_tables loop
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=t) then
      execute format('alter table public.%I enable row level security;', t);
      execute format('drop policy if exists %I on public.%I;', t||'_public_read', t);
      execute format('create policy %I on public.%I as permissive for select to public using (true);', t||'_public_read', t);
    end if;
  end loop;
end $$;

-- ---------- PUBLIC SUBMIT: INSERT ----------
do $$
declare t text;
  insert_tables text[] := array[
    'leads','company_name_requests','checkout_orders','checkout_order_addons',
    'orders','payments','lead_recommendations'
  ];
begin
  foreach t in array insert_tables loop
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=t) then
      execute format('alter table public.%I enable row level security;', t);
      execute format('drop policy if exists %I on public.%I;', t||'_public_insert', t);
      execute format('create policy %I on public.%I as permissive for insert to public with check (true);', t||'_public_insert', t);
    end if;
  end loop;
end $$;

-- ---------- CHECKOUT ORDER UPDATE (bank-transfer proof, pre-auth flow) ----------
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='checkout_orders') then
    drop policy if exists checkout_orders_public_update on public.checkout_orders;
    create policy checkout_orders_public_update on public.checkout_orders
      as permissive for update to public using (true) with check (true);
  end if;
end $$;
