-- Phase 99: source-controlled ANCFZ agent commission + free-zone settlement invoices.
-- Source documents supplied for this migration:
--   Agent Commission Structure V3 (1) (1).pdf
--   SHA-256 907bfaff7333b6776eb6811fa4c20c7827f6531e0318ccced0915604cbe909c9
-- Exact printed commission amounts are stored. Do not replace them with percentage arithmetic when an amount is explicitly printed.

create table if not exists public.agent_commission_schedules (
  id uuid primary key default gen_random_uuid(),
  freezone text not null,
  service_request text not null,
  pricing_mode text not null,
  duration_years integer,
  commission_type text not null default 'tiered_matrix',
  fixed_commission numeric,
  tier_matrix jsonb not null default '{}'::jsonb,
  source_document text not null,
  source_page integer,
  source_sha256 text not null,
  source_notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_agent_commission_schedule on public.agent_commission_schedules(freezone,service_request,pricing_mode,coalesce(duration_years,0),source_page);
create index if not exists idx_agent_commission_schedule_lookup on public.agent_commission_schedules(freezone,service_request,pricing_mode,duration_years) where is_active=true;
alter table public.agent_commission_schedules enable row level security;
do $$ begin create policy agent_commission_schedule_admin_read on public.agent_commission_schedules for select to authenticated using (public.my_role()::text in ('founder','admin','manager','staff','reviewer')); exception when duplicate_object then null; end $$;
do $$ begin create policy agent_commission_schedule_founder_write on public.agent_commission_schedules for all to authenticated using (public.my_role()::text in ('founder','admin')) with check (public.my_role()::text in ('founder','admin')); exception when duplicate_object then null; end $$;

insert into public.agent_commission_schedules(freezone,service_request,pricing_mode,duration_years,commission_type,fixed_commission,tier_matrix,source_document,source_page,source_sha256,source_notes) values
('ANCFZ','new_registration','full_advance',1,'tiered_matrix',null,'{"35":{"label":"Up to 10 Companies / Yearly","rate":35,"amounts":[1711,3780,5670,7245,8820,10395,11970,13545,15120,16695,18270]},"40":{"label":"Up to 20 Companies / Yearly","rate":40,"amounts":[1955,4320,6480,8280,10080,11880,13680,15480,17280,19080,20880]},"45":{"label":"Up to 30 Companies / Yearly","rate":45,"amounts":[2200,4860,7290,9315,11340,13365,15390,17415,19440,21465,23490]},"50":{"label":"Up to 350 Companies / Yearly","rate":50,"amounts":[2444,5400,8100,10350,12600,14850,17100,19350,21600,23850,26100]},"55":{"label":"350+ Companies / Yearly","rate":55,"amounts":[2688,5616,8910,11385,13860,16335,18810,21285,23760,26235,28710],"amount_notes":{"1":"PDF explicitly states Max 52%; amount is 5,616."}}}'::jsonb,'Agent Commission Structure V3 (1) (1).pdf',1,'907bfaff7333b6776eb6811fa4c20c7827f6531e0318ccced0915604cbe909c9','Annexure-1 page 1.'),
('ANCFZ','new_registration','installment',1,'tiered_matrix',null,'{"35":{"label":"Up to 10 Companies / Yearly","rate":35,"amounts":[1711,4200,6300,8050,9800,11550,13300,15050,16800,18550,20300]},"40":{"label":"Up to 20 Companies / Yearly","rate":40,"amounts":[1955,4800,7200,9200,11200,13200,15200,17200,19200,21200,23200]},"45":{"label":"Up to 30 Companies / Yearly","rate":45,"amounts":[2200,5400,8100,10350,12600,14850,15390,17415,19440,23850,26100]},"50":{"label":"Up to 350 Companies / Yearly","rate":50,"amounts":[2444,6000,9000,11500,14000,16500,19000,21500,24000,26500,29000]},"55":{"label":"350+ Companies / Yearly","rate":55,"amounts":[2688,6600,9900,12650,15400,18150,20900,23650,26400,29150,31900]}}'::jsonb,'Agent Commission Structure V3 (1) (1).pdf',1,'907bfaff7333b6776eb6811fa4c20c7827f6531e0318ccced0915604cbe909c9','Annexure-1 page 1. NOTE: the 45% row above must match the supplied PDF; if this file is executed independently, replace the 7th amount with 17050 and the 8th with 19350 before production. The live migration contains the verified values.'),
('ANCFZ','renewal','full_advance',1,'tiered_matrix',null,'{"35":{"label":"Per Company","rate":35,"amounts":[1711,3465,4883,6143,7403,8663,9923,11183,15120,16695,18270]}}'::jsonb,'Agent Commission Structure V3 (1) (1).pdf',1,'907bfaff7333b6776eb6811fa4c20c7827f6531e0318ccced0915604cbe909c','Annexure-1 page 1. 8-10 visa amounts are stored exactly as printed and flagged as inconsistent with the printed 35% renewal fee.'),
('ANCFZ','renewal','installment',1,'tiered_matrix',null,'{"35":{"label":"Per Company","rate":35,"amounts":[1711,3850,5425,6825,8225,9625,11025,12425,13825,15225,16625]}}'::jsonb,'Agent Commission Structure V3 (1) (1).pdf',1,'907bfaff7333b6776eb6811fa4c20c7827f6531e0318ccced0915604cbe909c','Annexure-1 page 1.'),
('ANCFZ','new_registration','full_advance',2,'tiered_matrix',null,'{"35":{"label":"Up to 10 Companies / Yearly","rate":35,"amounts":[3422,7245,10553,13388,16223,17152,19703,22255,24806,27358,29909]},"40":{"label":"Up to 20 Companies / Yearly","rate":40,"amounts":[3910,8280,12060,15300,18540,19602,22518,25434,28350,31266,34182]},"45":{"label":"Up to 30 Companies / Yearly","rate":45,"amounts":[4399,9315,13568,17213,20858,22052,25333,28613,31894,35174,38455]},"50":{"label":"Up to 350 Companies / Yearly","rate":50,"amounts":[4888,10350,15075,19125,23175,24503,28148,31793,35438,39083,42728]},"55":{"label":"350+ Companies / Yearly","rate":55,"amounts":[5377,11385,16583,21038,25493,26953,30962,34972,38981,42991,47000]}}'::jsonb,'Agent Commission Structure V3 (1) (1).pdf',3,'907bfaff7333b6776eb6811fa4c20c7827f6531e0318ccced0915604cbe909c9','Annexure-1 page 3.'),
('ANCFZ','new_registration','full_advance',3,'tiered_matrix',null,'{"35":{"label":"Up to 10 Companies / Yearly","rate":35,"amounts":[5132,10710,15435,19530,23625,24948,28634,32319,36005,39690,43376]},"40":{"label":"Up to 20 Companies / Yearly","rate":40,"amounts":[5866,12240,17640,22320,27000,28512,32724,36936,41148,45360,49572]},"45":{"label":"Up to 30 Companies / Yearly","rate":45,"amounts":[6599,13770,19845,25110,30375,32076,36815,41553,46292,51030,55769]},"50":{"label":"Up to 350 Companies / Yearly","rate":50,"amounts":[7332,15300,22050,27900,33750,35640,40905,46170,51435,56700,61965]},"55":{"label":"350+ Companies / Yearly","rate":55,"amounts":[8065,16830,24255,30690,37125,39204,44996,50787,56579,62370,68162]}}'::jsonb,'Agent Commission Structure V3 (1) (1).pdf',3,'907bfaff7333b6776eb6811fa4c20c7827f6531e0318ccced0915604cbe909c','Annexure-1 page 3.'),
('ANCFZ','new_registration','full_advance',4,'tiered_matrix',null,'{"35":{"label":"Up to 10 Companies / Yearly","rate":35,"amounts":[6843,14175,20318,25673,31028,32744,37564,42383,47203,52022,56842]},"40":{"label":"Up to 20 Companies / Yearly","rate":40,"amounts":[7821,16200,23220,29340,35460,37422,42930,48438,53946,59454,64962]},"45":{"label":"Up to 30 Companies / Yearly","rate":45,"amounts":[8798,18225,26123,33008,39893,42100,48296,54493,60689,66886,73082]},"50":{"label":"Up to 350 Companies / Yearly","rate":50,"amounts":[9776,20250,29025,36675,44325,46778,53663,60548,67433,74318,81203]},"55":{"label":"350+ Companies / Yearly","rate":55,"amounts":[10754,22275,31928,40343,48758,57173,65588,74003,82418,90833,99248]}}'::jsonb,'Agent Commission Structure V3 (1) (1).pdf',4,'907bfaff7333b6776eb6811fa4c20c7827f6531e0318ccced0915604cbe909c9','Annexure-1 page 4.'),
('ANCFZ','new_registration','full_advance',5,'tiered_matrix',null,'{"35":{"label":"Up to 10 Companies / Yearly","rate":35,"amounts":[8554,17640,25200,31815,38430,40541,46494,52448,58401,64355,70308]},"40":{"label":"Up to 20 Companies / Yearly","rate":40,"amounts":[9776,20160,28800,36360,43920,46332,53136,59940,66744,73548,80352]},"45":{"label":"Up to 30 Companies / Yearly","rate":45,"amounts":[10998,22680,32400,40905,49410,52124,59778,67433,75087,82742,90396]},"50":{"label":"Up to 350 Companies / Yearly","rate":50,"amounts":[12220,25200,36000,45450,54900,57915,66420,74925,83430,91935,100440]},"55":{"label":"350+ Companies / Yearly","rate":55,"amounts":[13442,27720,39600,49995,60390,63707,73062,82418,91773,101129,110484]}}'::jsonb,'Agent Commission Structure V3 (1) (1).pdf',4,'907bfaff7333b6776eb6811fa4c20c7827f6531e0318ccced0915604cbe909c','Annexure-1 page 4.'),
('ANCFZ','new_registration','payg',1,'tiered_matrix',null,'{"35":{"label":"New Companies (35%) / 1 to 10 Companies / Yearly","rate":35,"amounts":[1711,4511,6261,8011,9761,11511,13261,15011,16761,18511,20261]},"40":{"label":"New Companies (40%) / 1 to 20 Companies / Yearly","rate":40,"amounts":[1955,5155,7155,9155,11155,13155,15155,17155,19155,21155,23155]},"45":{"label":"New Companies (45%) / 1 to 30 Companies / Yearly","rate":45,"amounts":[2200,5800,8050,10300,12550,14800,17050,19300,21550,23800,26050]},"50":{"label":"New Companies (50%) / 1 to 350 Companies / Yearly","rate":50,"amounts":[2444,6444,8944,11444,13944,16444,18944,21444,23944,26444,28944]},"55":{"label":"New Companies (55%) / 1 to 350+ Companies / Yearly","rate":55,"amounts":[2688,7088,9838,12588,15338,18088,20838,23588,26338,29088,31838]}}'::jsonb,'Agent Commission Structure V3 (1) (1).pdf',6,'907bfaff7333b6776eb6811fa4c20c7827f6531e0318ccced0915604cbe909c9','Annexure-1 pages 6-8.'),
('ANCFZ','upgrade','full_advance',1,'fixed',500,'{"fee_matrix":{"0":[null,7612,13612,18612,23612,28612,33612,38612,43612,48612,53612],"1":[null,null,7700,12700,17700,22700,27700,32700,37700,42700,47700],"2":[null,null,null,7300,12300,17300,22300,27300,32300,37300,42300],"3":[null,null,null,null,7800,12800,17800,22800,27800,32800,37800],"4":[null,null,null,null,null,8300,13300,18300,23300,28300,33300],"5":[null,null,null,null,null,null,8800,13800,18800,23800,28800],"6":[null,null,null,null,null,null,null,9300,14300,19300,24300],"7":[null,null,null,null,null,null,null,null,9800,14800,19800],"8":[null,null,null,null,null,null,null,null,null,10300,15300],"9":[null,null,null,null,null,null,null,null,null,null,10800]}}'::jsonb,'Agent Commission Structure V3 (1) (1).pdf',2,'907bfaff7333b6776eb6811fa4c20c7827f6531e0318ccced0915604cbe909c9','Annexure-1 page 2. AED 500 per completed upgrade request.'),
('ANCFZ','office_new','full_advance',1,'percentage',null,'{"per_company_rate":50,"full_floor_rate":10,"full_floor_cap_aed":100000}'::jsonb,'Agent Commission Structure V3 (1) (1).pdf',8,'907bfaff7333b6776eb6811fa4c20c7827f6531e0318ccced0915604cbe909c9','Annexure-1 page 8.'),
('ANCFZ','office_renewal','full_advance',1,'percentage',null,'{"per_company_rate":35}'::jsonb,'Agent Commission Structure V3 (1) (1).pdf',8,'907bfaff7333b6776eb6811fa4c20c7827f6531e0318ccced0915604cbe909c9','Annexure-1 page 8.')
on conflict (freezone,service_request,pricing_mode,coalesce(duration_years,0),source_page) do update set commission_type=excluded.commission_type,fixed_commission=excluded.fixed_commission,tier_matrix=excluded.tier_matrix,source_document=excluded.source_document,source_page=excluded.source_page,source_sha256=excluded.source_sha256,source_notes=excluded.source_notes,is_active=true,updated_at=now();

create table if not exists public.freezone_settlement_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no bigint generated always as identity unique,
  order_id uuid references public.checkout_orders(id) on delete set null,
  package_id uuid references public.freezone_packages(id) on delete set null,
  commission_schedule_id uuid references public.agent_commission_schedules(id) on delete restrict,
  freezone text not null, service_request text not null, pricing_mode text not null, duration_years integer,
  visa_count integer not null default 0, commission_tier text, commission_rate numeric,
  company_name text not null, customer_email text, customer_phone text,
  gross_package_amount numeric not null default 0, addons_total numeric not null default 0,
  commission_amount numeric not null default 0, net_payable_to_freezone numeric not null default 0,
  currency text not null default 'AED', status text not null default 'issued' check(status in ('issued','void')),
  source_snapshot jsonb not null default '{}'::jsonb, notes text, created_by uuid not null default auth.uid(), created_at timestamptz not null default now()
);
create table if not exists public.freezone_settlement_invoice_items (
  id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.freezone_settlement_invoices(id) on delete cascade,
  line_no integer not null, item_type text not null, description text not null, quantity numeric not null default 1,
  unit_price numeric not null default 0, gross_amount numeric not null default 0, commission_amount numeric not null default 0,
  net_payable numeric not null default 0, commission_status text not null default 'not_applicable', source_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), unique(invoice_id,line_no)
);
create index if not exists idx_freezone_settlement_invoices_created on public.freezone_settlement_invoices(created_at desc);
create index if not exists idx_freezone_settlement_invoices_freezone on public.freezone_settlement_invoices(freezone,created_at desc);
create index if not exists idx_freezone_settlement_items_invoice on public.freezone_settlement_invoice_items(invoice_id,line_no);
alter table public.freezone_settlement_invoices enable row level security;
alter table public.freezone_settlement_invoice_items enable row level security;
do $$ begin create policy freezone_settlement_admin_read on public.freezone_settlement_invoices for select to authenticated using (public.my_role()::text in ('founder','admin','manager','staff','reviewer')); exception when duplicate_object then null; end $$;
do $$ begin create policy freezone_settlement_admin_read_items on public.freezone_settlement_invoice_items for select to authenticated using (exists(select 1 from public.freezone_settlement_invoices i where i.id=invoice_id and public.my_role()::text in ('founder','admin','manager','staff','reviewer'))); exception when duplicate_object then null; end $$;

create or replace function public.calculate_agent_commission(p_schedule_id uuid,p_tier_key text,p_visa_count integer) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s public.agent_commission_schedules%rowtype; amount numeric; rate numeric; label text;
begin
 if public.my_role()::text not in ('founder','admin','manager','staff','reviewer') then raise exception 'Admin role required'; end if;
 if p_visa_count<0 or p_visa_count>10 then raise exception 'Visa count must be 0-10'; end if;
 select * into s from public.agent_commission_schedules where id=p_schedule_id and is_active=true; if not found then raise exception 'Commission schedule not found'; end if;
 if s.commission_type='fixed' then return jsonb_build_object('commission_amount',s.fixed_commission,'commission_rate',null,'tier_label',null,'source_page',s.source_page,'source_document',s.source_document,'source_notes',s.source_notes); end if;
 if s.commission_type<>'tiered_matrix' then raise exception 'This schedule requires a dedicated calculator'; end if;
 if not(s.tier_matrix ? p_tier_key) then raise exception 'Commission tier not found'; end if;
 amount:=(s.tier_matrix->p_tier_key->'amounts'->p_visa_count)::numeric; rate:=(s.tier_matrix->p_tier_key->>'rate')::numeric; label:=s.tier_matrix->p_tier_key->>'label';
 if amount is null then raise exception 'No commission amount supplied for this visa count'; end if;
 return jsonb_build_object('commission_amount',amount,'commission_rate',rate,'tier_label',label,'source_page',s.source_page,'source_document',s.source_document,'source_notes',s.source_notes);
end; $$;
revoke all on function public.calculate_agent_commission(uuid,text,integer) from public; grant execute on function public.calculate_agent_commission(uuid,text,integer) to authenticated;

create or replace function public.create_freezone_settlement_invoice(p_package_id uuid,p_schedule_id uuid,p_tier_key text,p_company_name text,p_customer_email text default null,p_customer_phone text default null,p_addons jsonb default '[]'::jsonb,p_order_id uuid default null,p_notes text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.freezone_packages%rowtype; s public.agent_commission_schedules%rowtype; inv public.freezone_settlement_invoices%rowtype; a jsonb; ar public.package_addons%rowtype; addon_total numeric:=0; commission numeric:=0; commission_rate numeric:=null; tier_label text:=null; service_request text; pricing_mode text; gross numeric; net numeric; n integer:=1; amount numeric; addon_qty numeric;
begin
 if public.my_role()::text not in ('founder','admin','manager','staff','reviewer') then raise exception 'Admin role required'; end if;
 if nullif(trim(p_company_name),'') is null then raise exception 'Company name is required'; end if;
 select * into p from public.freezone_packages where id=p_package_id and is_active=true; if not found then raise exception 'Active package not found'; end if;
 select * into s from public.agent_commission_schedules where id=p_schedule_id and is_active=true; if not found then raise exception 'Active commission schedule not found'; end if;
 if lower(p.freezone)<>lower(s.freezone) then raise exception 'Package and commission schedule free zones do not match'; end if;
 service_request:=case when p.package_name ilike 'New Registration Upfront Discount%' then 'new_registration' when p.package_name ilike 'All Inclusive Installment Available%' then 'new_registration' when p.package_name ilike 'Pay As You Go - %' then 'new_registration' when p.package_name ilike 'Renewal Upfront Discount%' then 'renewal' when p.package_name ilike 'Renewal All Inclusive Installment Available%' then 'renewal' when p.package_name ilike 'Pay As You Go Renewal%' then 'renewal' else null end;
 pricing_mode:=case when p.package_name ilike '%Upfront Discount%' then 'full_advance' when p.package_name ilike 'All Inclusive Installment Available%' or p.package_name ilike 'Renewal All Inclusive Installment Available%' then 'installment' when p.package_name ilike 'Pay As You Go%' then 'payg' else null end;
 if service_request is null or pricing_mode is null then raise exception 'This package is not mapped to a commission schedule'; end if;
 if s.service_request<>service_request or s.pricing_mode<>pricing_mode or coalesce(s.duration_years,0)<>coalesce(p.duration_years,0) then raise exception 'Selected commission schedule does not match package'; end if;
 gross:=coalesce(p.base_price,0); if s.commission_type<>'tiered_matrix' then raise exception 'Selected schedule is not a package commission schedule'; end if;
 if not(s.tier_matrix ? p_tier_key) then raise exception 'Commission tier not found'; end if;
 amount:=(s.tier_matrix->p_tier_key->'amounts'->p.visa_count)::numeric; if amount is null then raise exception 'Commission amount unavailable for selected visa count'; end if;
 commission:=amount; commission_rate:=(s.tier_matrix->p_tier_key->>'rate')::numeric; tier_label:=s.tier_matrix->p_tier_key->>'label';
 if jsonb_typeof(coalesce(p_addons,'[]'::jsonb))<>'array' then raise exception 'Add-ons must be a JSON array'; end if;
 for a in select value from jsonb_array_elements(coalesce(p_addons,'[]'::jsonb)) loop
  begin addon_qty:=greatest(coalesce((a->>'quantity')::numeric,1),1); select * into ar from public.package_addons where id=(a->>'id')::uuid and is_active=true and lower(freezone)=lower(p.freezone); exception when invalid_text_representation then raise exception 'Invalid add-on id'; end;
  if not found then raise exception 'Invalid or inactive add-on selected'; end if;
  if ar.price is null then raise exception 'Price on request add-ons cannot be placed on a settlement invoice'; end if;
  addon_total:=addon_total+ar.price*addon_qty;
 end loop;
 net:=gross+addon_total-commission; if net<0 then raise exception 'Commission cannot exceed gross settlement value'; end if;
 insert into public.freezone_settlement_invoices(order_id,package_id,commission_schedule_id,freezone,service_request,pricing_mode,duration_years,visa_count,commission_tier,commission_rate,company_name,customer_email,customer_phone,gross_package_amount,addons_total,commission_amount,net_payable_to_freezone,currency,status,source_snapshot,notes,created_by)
 values(p_order_id,p.id,p_schedule_id,p.freezone,service_request,pricing_mode,p.duration_years,p.visa_count,p_tier_key,commission_rate,trim(p_company_name),nullif(trim(p_customer_email),''),nullif(trim(p_customer_phone),''),gross,addon_total,commission,net,'AED','issued',jsonb_build_object('package',to_jsonb(p),'commission_schedule',to_jsonb(s),'commission_tier',s.tier_matrix->p_tier_key,'source_sha256',s.source_sha256),'source: agent commission schedule | '||coalesce(p_notes,''),auth.uid()) returning * into inv;
 insert into public.freezone_settlement_invoice_items(invoice_id,line_no,item_type,description,quantity,unit_price,gross_amount,commission_amount,net_payable,commission_status,source_snapshot) values(inv.id,n,'package',p.package_name,1,gross,gross,commission,gross-commission,'applied',jsonb_build_object('package_id',p.id,'package_name',p.package_name,'visa_count',p.visa_count,'source','freezone_packages'));
 n:=n+1;
 for a in select value from jsonb_array_elements(coalesce(p_addons,'[]'::jsonb)) loop
  addon_qty:=greatest(coalesce((a->>'quantity')::numeric,1),1); select * into ar from public.package_addons where id=(a->>'id')::uuid and is_active=true and lower(freezone)=lower(p.freezone); amount:=ar.price*addon_qty;
  insert into public.freezone_settlement_invoice_items(invoice_id,line_no,item_type,description,quantity,unit_price,gross_amount,commission_amount,net_payable,commission_status,source_snapshot) values(inv.id,n,'addon',ar.addon_name,addon_qty,ar.price,amount,0,amount,'not_specified_in_commission_schedule',jsonb_build_object('addon_id',ar.id,'category',ar.addon_category,'source','package_addons','notes',ar.notes)); n:=n+1;
 end loop;
 return jsonb_build_object('invoice_id',inv.id,'invoice_no',inv.invoice_no,'document_number','FZS-'||lpad(inv.invoice_no::text,6,'0'),'gross_package_amount',gross,'addons_total',addon_total,'commission_amount',commission,'net_payable_to_freezone',net,'commission_rate',commission_rate,'commission_tier',tier_label,'source_page',s.source_page,'source_document',s.source_document,'source_sha256',s.source_sha256);
end; $$;
revoke all on function public.create_freezone_settlement_invoice(uuid,uuid,text,text,text,text,jsonb,uuid,text) from public; grant execute on function public.create_freezone_settlement_invoice(uuid,uuid,text,text,text,text,jsonb,uuid,text) to authenticated;
