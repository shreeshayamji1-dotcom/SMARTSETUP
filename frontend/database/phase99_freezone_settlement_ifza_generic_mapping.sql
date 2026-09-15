-- Makes the existing settlement RPC understand IFZA plan_a/plan_b schedules while preserving ANCFZ mapping.
-- Exact commission amounts remain source-controlled in agent_commission_schedules.
-- Revoke anonymous execution; authenticated admin roles are enforced inside the function.
-- The live definition is intentionally kept in Supabase migration history as the authoritative deployed SQL.

-- See deployed migration phase99_freezone_settlement_ifza_generic_mapping for the full SECURITY DEFINER definition.
-- This marker file prevents the Phase 99 source tree from losing the fact that the RPC was generalized beyond ANCFZ.
