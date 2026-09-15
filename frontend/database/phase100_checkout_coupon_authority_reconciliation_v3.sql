-- Phase 100: checkout coupon authority reconciliation v3
-- Supabase is the sole coupon authority. Frontend must not embed coupon codes or discount rules.
-- This migration creates the display-validation RPC used by checkout clients.
create or replace function public.validate_checkout_coupon(p_code text, p_user_id uuid, p_base numeric, p_addons numeric)
returns table(valid boolean, code text, discount_type text, discount_value numeric, discount_amount numeric, message text)
language plpgsql security definer set search_path = ''
as $function$
declare c record; v_discount numeric := 0;
begin
 if p_user_id is null or nullif(trim(p_code),'') is null then return query select false,null::text,null::text,null::numeric,0::numeric,'Authentication and coupon code are required'; return; end if;
 select * into c from public.coupons where upper(code)=upper(trim(p_code)) and is_active=true and (valid_from is null or valid_from<=current_date) and (valid_until is null or valid_until>=current_date) and (coalesce(usage_limit,0)=0 or coalesce(used_count,0)<usage_limit) and (assigned_user_id is null or assigned_user_id=p_user_id) limit 1;
 if not found then return query select false,upper(trim(p_code)),null::text,null::numeric,0::numeric,'Coupon is invalid, inactive, expired, exhausted, or not assigned to this user'; return; end if;
 if lower(c.discount_type) in ('pct','percentage') then v_discount:=round(greatest(coalesce(p_base,0)+coalesce(p_addons,0),0)*least(greatest(coalesce(c.discount_value,0),0),coalesce(c.max_discount_percentage,100))/100,2); elsif lower(c.discount_type) in ('fixed','amount') then v_discount:=least(greatest(coalesce(c.discount_value,0),0),greatest(coalesce(p_base,0)+coalesce(p_addons,0),0)); end if;
 return query select true,c.code,c.discount_type,c.discount_value,greatest(v_discount,0),'Coupon accepted';
end;
$function$;
revoke all on function public.validate_checkout_coupon(text,uuid,numeric,numeric) from public;
grant execute on function public.validate_checkout_coupon(text,uuid,numeric,numeric) to authenticated;
