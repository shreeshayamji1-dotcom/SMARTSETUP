# SmartSetupUAE — Phase 90–99 Recheck / Phase 99 Controlled Audit

Date: 2026-09-15
Status: CONTROLLED HARDENING — NOT PRODUCTION CERTIFIED

## Scope

This recheck deliberately goes back over the Phase 90–99 live Supabase migration history and the current GitHub `main` source instead of trusting earlier PASS labels.

## Live migration evidence

The live Supabase project contains Phase 90–99 migrations including:

- `phase90_salary_slip_private_storage`
- `phase96_marketing_attribution`
- `phase97_business_hub_support`
- `20260915_phase93_crm_tenant_relationship_integrity`
- `phase94_employee_invitation_claim`
- `phase93_conversion_integrity_unique_lead_deal`
- `phase96_marketing_attribution_tenant_integrity`
- `phase95_atomic_crm_lead_assignment`
- `phase96_marketing_attribution_ingestion`
- `phase93_crm_tenant_integrity`
- `phase94_employee_invitation_claim`
- `phase95_atomic_crm_lead_assignment`
- `phase96_marketing_attribution`
- `phase96_marketing_attribution_tenant_integrity`
- `phase97_business_hub_support`
- `phase98_activity_stats_rpc_privilege_hardening`
- `phase99_company_accounting_scope`
- `phase99_fx_snapshot_metadata`

This proves that Phase 90–99 database work exists live, but the corresponding migration source files are not currently present in the GitHub `main` tree. This is a source-of-truth / release-package drift finding.

## Findings

### FINDING-99-001 — Coupon RPC/RLS mismatch — FIXED LIVE

`public.coupons` is intentionally denied to `anon` and `authenticated` through RLS. The previous `public.recalculate_checkout_order(uuid)` was `SECURITY INVOKER` but directly selected from `public.coupons`.

That combination could make authenticated coupon recalculation fail even though the private coupon helper already existed.

Resolution:

- Reworked `recalculate_checkout_order` to call `private.checkout_coupon_discount(...)`.
- Preserved `SECURITY INVOKER`.
- Preserved authenticated-only EXECUTE.
- Preserved owner-scoped order access.
- Preserved server-side add-on repricing.
- Live migration: `phase_99_coupon_authority_reconciliation_v2`.
- Repository migration source added at `frontend/database/phase99_coupon_authority_reconciliation_v2.sql`.

Verification:

- `anon_exec = false`
- `authenticated_exec = true`
- `SECURITY DEFINER = false`
- Function definition contains the private coupon helper call.

### FINDING-99-002 — Checkout frontend still contains obsolete hardcoded coupon UI — OPEN / HIGH

Current `frontend/src/pages/Checkout.jsx` still contains:

- `FIRST500` at 100%
- `SMARTSAVE12` at 12%
- `FOUNDER5` at 5%
- default coupon selection of `FIRST500`

These values conflict with the current 3% maximum scratch-card policy and the server-authoritative coupon model.

This is a genuine missed regression/gap despite the scratch-card component being capped at 3%.

Required next fix:

- remove obsolete hardcoded coupon catalog from Checkout;
- only display server-valid scratch/issued coupons;
- never calculate an authoritative discount from frontend constants;
- ensure the final displayed/charged amount comes from the server-authoritative order calculation.

### FINDING-99-003 — Checkout frontend pricing constants remain — OPEN / HIGH

Current `frontend/src/lib/checkoutSupabase.js` still contains hardcoded:

- prebooking amount AED 999
- visa price AED 5,912
- default service fee AED 1,500

The live `checkout_package_options` table is already canonical and contains visa-specific packages with database `base_price` and `visa_count`.

The server recalculation uses the selected package's database price and add-ons, while the current Checkout UI separately adds the hardcoded visa/service values. This can produce a visible frontend total that does not match the authoritative server total.

This must be corrected before production certification.

### FINDING-99-004 — Visa/package selection contract mismatch — OPEN / HIGH

`checkout_package_options` contains separate package records for different visa counts. The current frontend lets the user change `visa_count` independently from the selected package.

The authoritative server recalculation currently uses the selected package and clamps the stored visa count to that package's quota rather than resolving a matching package automatically.

Required next fix:

- make visa count selection choose a canonical matching package, or
- make the server resolve/reject mismatched package + visa selections deterministically.

Never silently accept a mismatch.

### FINDING-99-005 — Phase 90–99 migration source drift — OPEN / HIGH

Live Supabase has the Phase 90–99 migrations, but the current GitHub source does not contain corresponding migration files for those phases.

This violates the release requirement that the release package contain the migration source and makes reproducibility/rollback harder.

Required next fix:

- recover the exact migration SQL from the authoritative migration history/source;
- commit it to `frontend/database/` using the actual migration names;
- compare repository SQL with live schema before release.

Do not recreate historical migrations from memory when exact source can be recovered.

### FINDING-99-006 — Runtime/build evidence remains open

Earlier audit records explicitly state that full production dependency installation/build and real browser E2E were not completed. Therefore previous static/syntax PASS results must not be converted into production certification.

Required gates remain:

- clean install with lockfile
- frontend production build
- admin/backend production build
- browser E2E
- customer/admin consistency
- Stripe test E2E
- Stripe webhook/idempotency E2E
- Resend delivery verification
- document IDOR tests
- mobile regression
- Hostinger production-like deployment test

## Security verification performed in this recheck

### Checkout

- `checkout_orders`: RLS enabled.
- `checkout_order_addons`: RLS enabled.
- Customer order SELECT/INSERT is owner-scoped.
- Customer direct checkout-order UPDATE policy is absent.
- Bank-proof submission uses authenticated owner-scoped RPC.
- Recalculation RPC is authenticated-only.
- Coupons are not directly exposed to authenticated users.

### Phase 90–99 Business Hub data

The following live tables were checked:

- `business_salary_slips`
- `crm_leads`
- `crm_deals`
- `crm_activities`
- `business_hub_support_tickets`

All have RLS enabled and none currently has direct `anon`/`authenticated` table grants. This is consistent with server-mediated access and is a positive result.

## Phase 99 decision

Phase 99 is **NOT COMPLETE** yet.

The recheck found real issues that earlier testing did not close:

1. coupon UI still contains obsolete 5–100% values;
2. frontend contains hardcoded financial constants;
3. package/visa selection can diverge;
4. Phase 90–99 live migrations are not synchronized into the repository;
5. production build/browser/external-service gates remain unverified.

One backend security defect was found and fixed live during this phase: coupon recalculation now uses the private security-definer lookup rather than directly reading the RLS-denied coupon table.

## Rule for the next step

Do not mark any of the open findings PASS until the actual code/database/runtime evidence exists.
