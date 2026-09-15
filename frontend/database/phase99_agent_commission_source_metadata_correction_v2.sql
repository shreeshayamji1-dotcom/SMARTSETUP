-- Phase 99 correction v2.
-- Corrects the source filename metadata and ensures the 1-year installment 45% matrix exactly matches the supplied commission PDF.
-- Source SHA-256: 907bfaff7333b6776eb6811fa4c20c7827f6531e0318ccced0915604cbe909c9
update public.agent_commission_schedules
set source_document='Agent Commission Structure V3 (1) (1).pdf', updated_at=now()
where source_sha256='907bfaff7333b6776eb6811fa4c20c7827f6531e0318ccced0915604cbe909c9';

update public.agent_commission_schedules
set tier_matrix=jsonb_set(tier_matrix,'{45,amounts}','[2200,5400,8100,10350,12600,14850,17100,19350,21600,23850,26100]'::jsonb,false),
    source_document='Agent Commission Structure V3 (1) (1).pdf', updated_at=now()
where freezone='ANCFZ' and service_request='new_registration' and pricing_mode='installment' and duration_years=1 and source_page=1 and is_active=true;
