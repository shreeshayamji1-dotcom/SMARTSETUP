-- Phase 100: generic Free Zone commercial/commission engine.
-- Customer pricing remains separate from partner commission.
-- Missing source data is intentionally not invented.
-- Commission tables/RPCs are admin-only; public/anon access is revoked.

create table if not exists public.freezone_registration_events (
  id uuid primary key default gen_random_uuid(),
  freezone text not null,
  company_name text not null,
  service_request text not null default 'new_registration' check (service_request in ('new_registration','renewal','upgrade','office_new','office_renewal')),
  registration_date date not null default current_date,
  status text not null default 'completed' check (status in ('completed','cancelled','reversed')),
  eligible_for_commission boolean not null default true,
  order_id uuid null,
  notes text null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists idx_freezone_registration_events_period on public.freezone_registration_events(freezone,registration_date,status,eligible_for_commission);
alter table public.freezone_registration_events enable row level security;
do $$ begin create policy freezone_registration_events_admin_read on public.freezone_registration_events for select to authenticated using (public.my_role()::text in ('founder','admin','manager','staff','reviewer')); exception when duplicate_object then null; end $$;
do $$ begin create policy freezone_registration_events_admin_insert on public.freezone_registration_events for insert to authenticated with check (public.my_role()::text in ('founder','admin','manager','staff')); exception when duplicate_object then null; end $$;
do $$ begin create policy freezone_registration_events_admin_update on public.freezone_registration_events for update to authenticated using (public.my_role()::text in ('founder','admin')) with check (public.my_role()::text in ('founder','admin')); exception when duplicate_object then null; end $$;

create or replace function public.get_freezone_annual_registration_summary(p_year integer default extract(year from current_date)::integer)
returns table(freezone text, completed_new_registrations bigint, completed_renewals bigint, eligible_new_registrations bigint, eligible_renewals bigint)
language sql security definer set search_path=''
as $$
  select f.freezone,
    count(e.*) filter(where e.status='completed' and e.service_request='new_registration')::bigint,
    count(e.*) filter(where e.status='completed' and e.service_request='renewal')::bigint,
    count(e.*) filter(where e.status='completed' and e.eligible_for_commission and e.service_request='new_registration')::bigint,
    count(e.*) filter(where e.status='completed' and e.eligible_for_commission and e.service_request='renewal')::bigint
  from (values ('ANCFZ'),('DAFZA'),('DMCC'),('IFZA'),('Meydan'),('RAKEZ'),('SHAMS'),('SPC')) f(freezone)
  left join public.freezone_registration_events e on lower(e.freezone)=lower(f.freezone) and e.registration_date >= make_date(p_year,1,1) and e.registration_date < make_date(p_year+1,1,1)
  where public.my_role()::text in ('founder','admin','manager','staff','reviewer')
  group by f.freezone order by f.freezone;
$$;
revoke all on function public.get_freezone_annual_registration_summary(integer) from public,anon;
grant execute on function public.get_freezone_annual_registration_summary(integer) to authenticated;

create or replace function public.record_freezone_registration(p_freezone text,p_company_name text,p_service_request text default 'new_registration',p_registration_date date default current_date,p_order_id uuid default null,p_notes text default null)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_id uuid;
begin
 if public.my_role()::text not in ('founder','admin','manager','staff') then raise exception 'Admin role required'; end if;
 if nullif(trim(p_freezone),'') is null or nullif(trim(p_company_name),'') is null then raise exception 'Free zone and company name are required'; end if;
 if p_service_request not in ('new_registration','renewal','upgrade','office_new','office_renewal') then raise exception 'Unsupported service request'; end if;
 insert into public.freezone_registration_events(freezone,company_name,service_request,registration_date,status,eligible_for_commission,order_id,notes,created_by)
 values(trim(p_freezone),trim(p_company_name),p_service_request,p_registration_date,'completed',true,p_order_id,nullif(trim(p_notes),''),auth.uid()) returning id into v_id;
 return v_id;
end;
$$;
revoke all on function public.record_freezone_registration(text,text,text,date,uuid,text) from public,anon;
grant execute on function public.record_freezone_registration(text,text,text,date,uuid,text) to authenticated;

create or replace function public.resolve_agent_commission_tier(p_schedule_id uuid,p_year integer default extract(year from current_date)::integer)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare s public.agent_commission_schedules%rowtype; v_count bigint; k text; r jsonb; v_min integer; v_max integer;
begin
 if public.my_role()::text not in ('founder','admin','manager','staff','reviewer') then raise exception 'Admin role required'; end if;
 select * into s from public.agent_commission_schedules where id=p_schedule_id and is_active=true; if not found then raise exception 'Commission schedule not found'; end if;
 if s.volume_rules is null or jsonb_typeof(s.volume_rules)<>'object' then return jsonb_build_object('resolved',false,'reason','No annual volume rule is supplied for this schedule'); end if;
 select count(*) into v_count from public.freezone_registration_events e where lower(e.freezone)=lower(s.freezone) and e.service_request='new_registration' and e.status='completed' and e.eligible_for_commission and e.registration_date>=make_date(p_year,1,1) and e.registration_date<make_date(p_year+1,1,1);
 for k in select key from jsonb_object_keys(s.volume_rules) key loop
   r:=s.volume_rules->k; v_min:=nullif((r->>'min'),'')::integer; v_max:=nullif((r->>'max'),'')::integer;
   if v_count>=coalesce(v_min,0) and (v_max is null or v_count<=v_max) then return jsonb_build_object('resolved',true,'tier_key',k,'company_count',v_count,'year',p_year,'rule',r,'label',coalesce(s.tier_matrix->k->>'label',k)); end if;
 end loop;
 return jsonb_build_object('resolved',false,'company_count',v_count,'year',p_year,'reason','No volume tier matched the current count');
end;
$$;
revoke all on function public.resolve_agent_commission_tier(uuid,integer) from public,anon;
grant execute on function public.resolve_agent_commission_tier(uuid,integer) to authenticated;

create or replace function public.calculate_freezone_service_commission(p_schedule_id uuid,p_from_visa integer default null,p_to_visa integer default null,p_service_amount numeric default null,p_volume_year integer default extract(year from current_date)::integer)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare s public.agent_commission_schedules%rowtype; tier jsonb; tier_key text; fee numeric; commission numeric; rate numeric; gross numeric;
begin
 if public.my_role()::text not in ('founder','admin','manager','staff','reviewer') then raise exception 'Admin role required'; end if;
 select * into s from public.agent_commission_schedules where id=p_schedule_id and is_active=true; if not found then raise exception 'Commission schedule not found'; end if;
 if s.commission_type='fixed' then
   if s.service_request='upgrade' then
     if p_from_visa is null or p_to_visa is null or p_to_visa<=p_from_visa then raise exception 'Valid upgrade visa counts are required'; end if;
     fee:=(s.tier_matrix->'fee_matrix'->p_from_visa::text->p_to_visa)::numeric; if fee is null then raise exception 'Upgrade fee is not published for this visa transition'; end if; gross:=fee;
   else gross:=coalesce(p_service_amount,0); end if;
   commission:=coalesce(s.fixed_commission,0); if gross<commission then raise exception 'Commission exceeds service amount'; end if;
   return jsonb_build_object('service_amount',gross,'commission_amount',commission,'net_payable',gross-commission,'commission_rate',null,'tier_key',null,'tier_label',null,'source_page',s.source_page,'source_document',s.source_document,'source_notes',s.source_notes,'from_visa',p_from_visa,'to_visa',p_to_visa);
 end if;
 if s.commission_type='percentage' then
   if p_service_amount is null or p_service_amount<0 then raise exception 'Service amount is required for percentage commission'; end if;
   gross:=p_service_amount; rate:=coalesce((s.tier_matrix->>'per_company_rate')::numeric,(s.tier_matrix->>'rate')::numeric); if rate is null then raise exception 'Percentage commission rate not supplied'; end if; commission:=round(gross*rate/100,2);
   return jsonb_build_object('service_amount',gross,'commission_amount',commission,'net_payable',gross-commission,'commission_rate',rate,'tier_key',null,'tier_label',null,'source_page',s.source_page,'source_document',s.source_document,'source_notes',s.source_notes);
 end if;
 tier:=public.resolve_agent_commission_tier(p_schedule_id,p_volume_year); if not coalesce((tier->>'resolved')::boolean,false) then return tier || jsonb_build_object('source_page',s.source_page,'source_document',s.source_document,'source_notes',s.source_notes); end if;
 tier_key:=tier->>'tier_key'; if p_to_visa is null or p_to_visa<0 or p_to_visa>10 then raise exception 'Visa count must be 0-10'; end if; commission:=(s.tier_matrix->tier_key->'amounts'->p_to_visa)::numeric; rate:=(s.tier_matrix->tier_key->>'rate')::numeric; if commission is null then raise exception 'No commission amount supplied for this visa count'; end if;
 return jsonb_build_object('resolved',true,'tier_key',tier_key,'tier_label',s.tier_matrix->tier_key->>'label','company_count',tier->>'company_count','year',p_volume_year,'commission_amount',commission,'commission_rate',rate,'source_page',s.source_page,'source_document',s.source_document,'source_notes',s.source_notes);
end;
$$;
revoke all on function public.calculate_freezone_service_commission(uuid,integer,integer,numeric,integer) from public,anon;
grant execute on function public.calculate_freezone_service_commission(uuid,integer,integer,numeric,integer) to authenticated;

create or replace function public.create_freezone_service_settlement_invoice(p_schedule_id uuid,p_company_name text,p_service_amount numeric default null,p_from_visa integer default null,p_to_visa integer default null,p_year integer default extract(year from current_date)::integer,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare s public.agent_commission_schedules%rowtype; calc jsonb; inv public.freezone_settlement_invoices%rowtype; gross numeric; comm numeric; net numeric;
begin
 if public.my_role()::text not in ('founder','admin','manager','staff') then raise exception 'Admin role required'; end if;
 select * into s from public.agent_commission_schedules where id=p_schedule_id and is_active=true; if not found then raise exception 'Commission schedule not found'; end if;
 if nullif(trim(p_company_name),'') is null then raise exception 'Company name is required'; end if;
 calc:=public.calculate_freezone_service_commission(p_schedule_id,p_from_visa,p_to_visa,p_service_amount,p_year); if coalesce((calc->>'resolved')::boolean,true)=false then raise exception '%',coalesce(calc->>'reason','Commission tier could not be resolved'); end if;
 gross:=(calc->>'service_amount')::numeric; comm:=(calc->>'commission_amount')::numeric; net:=gross-comm;
 insert into public.freezone_settlement_invoices(order_id,package_id,commission_schedule_id,freezone,service_request,pricing_mode,duration_years,visa_count,commission_tier,commission_rate,company_name,gross_package_amount,addons_total,commission_amount,net_payable_to_freezone,currency,status,source_snapshot,notes,created_by)
 values(null,null,s.id,s.freezone,s.service_request,s.pricing_mode,s.duration_years,coalesce(p_to_visa,0),calc->>'tier_key',(calc->>'commission_rate')::numeric,trim(p_company_name),gross,0,comm,net,'AED','issued',jsonb_build_object('commission_schedule',to_jsonb(s),'calculation',calc,'volume_year',p_year,'source_sha256',s.source_sha256),nullif(trim(p_notes),''),auth.uid()) returning * into inv;
 insert into public.freezone_settlement_invoice_items(invoice_id,line_no,item_type,description,quantity,unit_price,gross_amount,commission_amount,net_payable,commission_status,source_snapshot) values(inv.id,1,'service',s.service_request,1,gross,gross,comm,net,'applied',jsonb_build_object('schedule_id',s.id,'calculation',calc,'source_document',s.source_document,'source_page',s.source_page));
 return jsonb_build_object('invoice_id',inv.id,'invoice_no',inv.invoice_no,'document_number','FZS-'||lpad(inv.invoice_no::text,6,'0'),'freezone',s.freezone,'service_request',s.service_request,'service_amount',gross,'commission_amount',comm,'net_payable',net,'commission_rate',(calc->>'commission_rate')::numeric,'tier_key',calc->>'tier_key','tier_label',calc->>'tier_label','source_page',s.source_page,'source_document',s.source_document,'source_sha256',s.source_sha256,'volume_year',p_year,'company_count',calc->>'company_count');
end;
$$;
revoke all on function public.create_freezone_service_settlement_invoice(uuid,text,numeric,integer,integer,integer,text) from public,anon;
grant execute on function public.create_freezone_service_settlement_invoice(uuid,text,numeric,integer,integer,integer,text) to authenticated;

create or replace function public.create_freezone_package_settlement_invoice(p_package_id uuid,p_schedule_id uuid,p_tier_key text default null,p_company_name text default null,p_customer_email text default null,p_customer_phone text default null,p_addons jsonb default '[]'::jsonb,p_volume_year integer default extract(year from current_date)::integer,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare p public.freezone_packages%rowtype; s public.agent_commission_schedules%rowtype; inv public.freezone_settlement_invoices%rowtype; a jsonb; ar public.package_addons%rowtype; addon_total numeric:=0; commission numeric; rate numeric; tier_label text; resolved jsonb; tier text; gross numeric; net numeric; n integer:=1; q numeric; amount numeric;
begin
 if public.my_role()::text not in ('founder','admin','manager','staff') then raise exception 'Admin role required'; end if;
 select * into p from public.freezone_packages where id=p_package_id and is_active=true; if not found then raise exception 'Active package not found'; end if;
 select * into s from public.agent_commission_schedules where id=p_schedule_id and is_active=true; if not found then raise exception 'Active commission schedule not found'; end if;
 if lower(p.freezone)<>lower(s.freezone) then raise exception 'Package and commission schedule free zones do not match'; end if;
 if coalesce(s.duration_years,0)<>coalesce(p.duration_years,0) then raise exception 'Package duration does not match commission schedule'; end if;
 gross:=coalesce(p.base_price,0); if s.commission_type<>'tiered_matrix' then raise exception 'Package settlement requires a tiered commission schedule'; end if;
 if s.volume_rules is not null then resolved:=public.resolve_agent_commission_tier(s.id,p_volume_year); if not coalesce((resolved->>'resolved')::boolean,false) then raise exception '%',coalesce(resolved->>'reason','Commission tier could not be resolved from recorded completed registrations'); end if; tier:=resolved->>'tier_key'; else tier:=nullif(trim(p_tier_key),''); end if;
 if tier is null then raise exception 'Commission tier/plan is required because this schedule has no supplied annual-volume rule'; end if;
 if not (s.tier_matrix ? tier) then raise exception 'Commission tier not found'; end if;
 if p.visa_count<0 or p.visa_count>10 then raise exception 'Visa count must be 0-10'; end if;
 commission:=(s.tier_matrix->tier->'amounts'->p.visa_count)::numeric; if commission is null then raise exception 'Commission amount unavailable for selected visa band'; end if; rate:=(s.tier_matrix->tier->>'rate')::numeric; tier_label:=s.tier_matrix->tier->>'label';
 if jsonb_typeof(coalesce(p_addons,'[]'::jsonb))<>'array' then raise exception 'Add-ons must be a JSON array'; end if;
 for a in select value from jsonb_array_elements(coalesce(p_addons,'[]'::jsonb)) loop q:=greatest(coalesce((a->>'quantity')::numeric,1),1); select * into ar from public.package_addons where id=(a->>'id')::uuid and is_active=true and lower(freezone)=lower(p.freezone); if not found then raise exception 'Invalid or inactive add-on selected'; end if; if ar.price is null then raise exception 'Price on request add-ons cannot be placed on a settlement invoice'; end if; addon_total:=addon_total+ar.price*q; end loop;
 net:=gross+addon_total-commission; if net<0 then raise exception 'Commission cannot exceed settlement value'; end if;
 insert into public.freezone_settlement_invoices(order_id,package_id,commission_schedule_id,freezone,service_request,pricing_mode,duration_years,visa_count,commission_tier,commission_rate,company_name,customer_email,customer_phone,gross_package_amount,addons_total,commission_amount,net_payable_to_freezone,currency,status,source_snapshot,notes,created_by)
 values(null,p.id,s.id,s.freezone,s.service_request,s.pricing_mode,p.duration_years,p.visa_count,tier,rate,trim(p_company_name),nullif(trim(p_customer_email),''),nullif(trim(p_customer_phone),''),gross,addon_total,commission,net,'AED','issued',jsonb_build_object('package',to_jsonb(p),'commission_schedule',to_jsonb(s),'commission_tier',s.tier_matrix->tier,'volume_year',p_volume_year,'resolved_volume',coalesce(resolved,'{}'::jsonb),'source_sha256',s.source_sha256),nullif(trim(p_notes),''),auth.uid()) returning * into inv;
 insert into public.freezone_settlement_invoice_items(invoice_id,line_no,item_type,description,quantity,unit_price,gross_amount,commission_amount,net_payable,commission_status,source_snapshot) values(inv.id,n,'package',p.package_name,1,gross,gross,commission,gross-commission,'applied',jsonb_build_object('package_id',p.id,'source','freezone_packages','price_basis','base_price_source_published'));
 n:=n+1; for a in select value from jsonb_array_elements(coalesce(p_addons,'[]'::jsonb)) loop q:=greatest(coalesce((a->>'quantity')::numeric,1),1); select * into ar from public.package_addons where id=(a->>'id')::uuid and is_active=true and lower(freezone)=lower(p.freezone); amount:=ar.price*q; insert into public.freezone_settlement_invoice_items(invoice_id,line_no,item_type,description,quantity,unit_price,gross_amount,commission_amount,net_payable,commission_status,source_snapshot) values(inv.id,n,'addon',ar.addon_name,q,ar.price,amount,0,amount,'not_specified_in_commission_schedule',jsonb_build_object('addon_id',ar.id,'source','package_addons','notes',ar.notes)); n:=n+1; end loop;
 return jsonb_build_object('invoice_id',inv.id,'invoice_no',inv.invoice_no,'document_number','FZS-'||lpad(inv.invoice_no::text,6,'0'),'freezone',s.freezone,'service_request',s.service_request,'pricing_mode',s.pricing_mode,'gross_package_amount',gross,'addons_total',addon_total,'commission_amount',commission,'net_payable_to_freezone',net,'commission_rate',rate,'commission_tier',tier_label,'tier_key',tier,'source_page',s.source_page,'source_document',s.source_document,'source_sha256',s.source_sha256,'volume_year',p_volume_year,'company_count',coalesce(resolved->>'company_count',null));
end;
$$;
revoke all on function public.create_freezone_package_settlement_invoice(uuid,uuid,text,text,text,text,jsonb,integer,text) from public,anon;
grant execute on function public.create_freezone_package_settlement_invoice(uuid,uuid,text,text,text,text,jsonb,integer,text) to authenticated;

create or replace function public.admin_create_commission_schedule(p_freezone text,p_service_request text,p_pricing_mode text,p_duration_years integer,p_commission_type text,p_fixed_commission numeric,p_tier_matrix jsonb,p_volume_rules jsonb,p_source_document text,p_source_page integer,p_source_sha256 text,p_source_notes text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_id uuid;
begin
 if public.my_role()::text not in ('founder','admin') then raise exception 'Founder/Admin role required'; end if;
 if nullif(trim(p_freezone),'') is null or nullif(trim(p_service_request),'') is null or nullif(trim(p_pricing_mode),'') is null then raise exception 'Free zone, service request and pricing mode are required'; end if;
 if p_commission_type not in ('tiered_matrix','fixed','percentage') then raise exception 'Unsupported commission type'; end if;
 if p_tier_matrix is null or jsonb_typeof(p_tier_matrix)<>'object' then raise exception 'Tier/matrix JSON must be an object'; end if;
 insert into public.agent_commission_schedules(freezone,service_request,pricing_mode,duration_years,commission_type,fixed_commission,tier_matrix,volume_rules,source_document,source_page,source_sha256,source_notes,is_active)
 values(trim(p_freezone),trim(p_service_request),trim(p_pricing_mode),nullif(p_duration_years,0),p_commission_type,p_fixed_commission,p_tier_matrix,p_volume_rules,coalesce(nullif(trim(p_source_document),''),'Not supplied — admin source pending'),p_source_page,coalesce(nullif(trim(p_source_sha256),''),'not_supplied'),nullif(trim(p_source_notes),''),true) returning id into v_id;
 return v_id;
end;
$$;
revoke all on function public.admin_create_commission_schedule(text,text,text,integer,text,numeric,jsonb,jsonb,text,integer,text,text) from public,anon;
grant execute on function public.admin_create_commission_schedule(text,text,text,integer,text,numeric,jsonb,jsonb,text,integer,text,text) to authenticated;

-- Commission/volume/settlement tables are never directly writable by client roles.
revoke all on table public.agent_commission_schedules from anon,authenticated;
revoke all on table public.freezone_registration_events from anon,authenticated;
revoke all on table public.freezone_settlement_invoices from anon,authenticated;
revoke all on table public.freezone_settlement_invoice_items from anon,authenticated;
grant select on table public.agent_commission_schedules to authenticated;
grant select on table public.freezone_registration_events to authenticated;
grant select on table public.freezone_settlement_invoices to authenticated;
grant select on table public.freezone_settlement_invoice_items to authenticated;
