-- SmartSetupUAE Phase 36-41 security hardening
-- Apply to the production Supabase project after reviewing in staging.
-- This migration records the security controls implemented during the repository migration audit.

alter table public.checkout_orders add column if not exists coupon_code text;
alter table public.checkout_order_addons add column if not exists addon_id uuid;

-- Never allow anonymous users to create or modify checkout child rows.
drop policy if exists checkout_order_addons_public_insert on public.checkout_order_addons;
drop policy if exists checkout_orders_public_insert on public.checkout_orders;
drop policy if exists checkout_orders_public_update on public.checkout_orders;

-- Checkout order children belong to the authenticated order owner.
drop policy if exists customer_insert_own_order_addons_phase36 on public.checkout_order_addons;
create policy customer_insert_own_order_addons_phase36
on public.checkout_order_addons for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.checkout_orders o
    where o.id = checkout_order_addons.order_id
      and o.user_id = (select auth.uid())
  )
);

drop policy if exists customer_select_own_order_addons_phase8 on public.checkout_order_addons;
drop policy if exists customer_select_own_order_addons_phase36 on public.checkout_order_addons;
create policy customer_select_own_order_addons_phase36
on public.checkout_order_addons for select to authenticated
using ((select auth.uid()) = user_id);

-- Customers must not be able to PATCH price/status/payment columns directly.
drop policy if exists customer_update_own_checkout_orders_phase8 on public.checkout_orders;

create or replace function public.submit_bank_transfer_proof(p_order_id uuid, p_note text)
returns public.checkout_orders
language plpgsql
security invoker
set search_path = public, pg_temp
as $fn$
declare v_order public.checkout_orders;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.checkout_orders
     set status='payment_review', notes=left(coalesce(p_note,''),2000)
   where id=p_order_id and user_id=auth.uid()
   returning * into v_order;
  if not found then raise exception 'Order not found'; end if;
  return v_order;
end;
$fn$;
revoke all on function public.submit_bank_transfer_proof(uuid,text) from public;
grant execute on function public.submit_bank_transfer_proof(uuid,text) to authenticated;

-- Views must respect the RLS of their underlying tables.
alter view public.checkout_package_options set (security_invoker = true);
alter view public.checkout_addon_options set (security_invoker = true);

-- Scratch-card rewards are capped at 3% at the data layer as well as in the UI.
insert into public.coupons(code,discount_type,discount_value,usage_limit,used_count,is_active,is_one_time,max_discount_percentage,coupon_scope)
values
  ('SMARTSAVE1','pct',1,0,0,true,true,3,'business_setup'),
  ('SMARTSAVE2','pct',2,0,0,true,true,3,'business_setup'),
  ('SMARTSAVE3','pct',3,0,0,true,true,3,'business_setup')
on conflict (code) do update set discount_type=excluded.discount_type,discount_value=excluded.discount_value,is_active=true,max_discount_percentage=3;

-- Private coupon lookup helper. It is deliberately outside the exposed public schema.
create schema if not exists private;
create or replace function private.checkout_coupon_discount(p_code text,p_user_id uuid,p_base numeric,p_addons numeric)
returns numeric
language plpgsql
security definer
set search_path = ''
as $fn$
declare c record; v numeric:=0;
begin
  if p_user_id is null or nullif(trim(p_code),'') is null then return 0; end if;
  select * into c from public.coupons
  where upper(code)=upper(trim(p_code)) and is_active=true
    and (valid_from is null or valid_from<=current_date)
    and (valid_until is null or valid_until>=current_date)
    and (coalesce(usage_limit,0)=0 or coalesce(used_count,0)<usage_limit)
    and (assigned_user_id is null or assigned_user_id=p_user_id)
  limit 1;
  if not found then return 0; end if;
  if lower(c.discount_type) in ('pct','percentage') then
    v:=round(greatest(p_base+p_addons,0)*least(greatest(coalesce(c.discount_value,0),0),coalesce(c.max_discount_percentage,100))/100,2);
  elsif lower(c.discount_type) in ('fixed','amount') then
    v:=least(greatest(coalesce(c.discount_value,0),0),greatest(p_base+p_addons,0));
  end if;
  return greatest(v,0);
end;
$fn$;
revoke all on function private.checkout_coupon_discount(text,uuid,numeric,numeric) from public;
grant usage on schema private to authenticated;
grant execute on function private.checkout_coupon_discount(text,uuid,numeric,numeric) to authenticated;
