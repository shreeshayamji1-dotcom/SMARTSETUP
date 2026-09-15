-- Phase 99 security correction: commission calculation/settlement RPCs must not be callable by anon.
revoke all on function public.calculate_agent_commission(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.calculate_agent_commission(uuid,text,integer) to authenticated;
revoke all on function public.create_freezone_settlement_invoice(uuid,uuid,text,text,text,text,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.create_freezone_settlement_invoice(uuid,uuid,text,text,text,text,jsonb,uuid,text) to authenticated;
