-- SmartSetupUAE Phase 99 coupon authority reconciliation
-- Live migration applied to Supabase project smrsaedmuaizlesehpee.
-- Purpose: prevent the authenticated checkout recalculation RPC from directly
-- reading the RLS-denied public.coupons table. Coupon lookup remains isolated
-- inside the private SECURITY DEFINER helper.

create or replace function public.recalculate_checkout_order(p_order_id uuid)
returns table(order_id uuid, base_price numeric, addon_total numeric, discount_total numeric, grand_total numeric)
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  v_uid uuid := auth.uid();
  v_order public.checkout_orders%rowtype;
  v_package public.checkout_package_options%rowtype;
  v_base numeric := 0;
  v_addons numeric := 0;
  v_discount numeric := 0;
  v_grand numeric := 0;
  a record;
  v_addon_price numeric;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;

  select * into v_order
    from public.checkout_orders
   where id = p_order_id and user_id = v_uid
   for update;
  if not found then raise exception 'Order not found'; end if;

  select * into v_package
    from public.checkout_package_options
   where id = v_order.package_id;
  if not found then raise exception 'Selected package is no longer available'; end if;

  v_base := greatest(coalesce(v_package.base_price,0),0);

  -- Reprice every add-on from the live catalog. Never trust a browser price.
  for a in
    select * from public.checkout_order_addons
     where order_id = p_order_id and user_id = v_uid
     for update
  loop
    select coalesce(x.price,0) into v_addon_price
      from public.checkout_addon_options x
     where (a.addon_id is not null and x.id = a.addon_id)
        or (a.addon_id is null
            and lower(trim(x.addon_name)) = lower(trim(a.addon_name))
            and (x.freezone is null or lower(trim(x.freezone)) = lower(trim(v_package.freezone))))
     order by (case when a.addon_id is not null then 0 else 1 end)
     limit 1;
    v_addon_price := greatest(coalesce(v_addon_price,0),0);
    update public.checkout_order_addons
       set price = v_addon_price
     where id = a.id;
    v_addons := v_addons + v_addon_price;
  end loop;

  if nullif(trim(v_order.coupon_code),'') is not null then
    v_discount := private.checkout_coupon_discount(v_order.coupon_code, v_uid, v_base, v_addons);
  end if;

  v_grand := greatest(round(v_base + v_addons - v_discount,2),0);

  update public.checkout_orders
     set base_price = v_base,
         addons_total = v_addons,
         discount_total = v_discount,
         final_total = v_grand,
         freezone = v_package.freezone,
         package_name = v_package.package_name,
         currency = coalesce(v_package.currency,'AED'),
         visa_count = least(greatest(coalesce(v_order.visa_count,0),0), greatest(coalesce(v_package.visa_count,0),0)),
         updated_at = now()
   where id = p_order_id and user_id = v_uid;

  return query select p_order_id, v_base, v_addons, v_discount, v_grand;
end;
$function$;

revoke all on function public.recalculate_checkout_order(uuid) from public;
grant execute on function public.recalculate_checkout_order(uuid) to authenticated;
