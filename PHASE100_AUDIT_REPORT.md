# Phase 100 — Commercial Engine + Regression/Security Audit

## Scope

Phase 100 starts after Phase 99. Checkout authority was not reopened or changed except where required to add the separate admin-only Free Zone commercial/commission engine.

### User/source rules preserved
- Do not replace the existing Free Zone price lists unless a verified source requires it.
- Do not invent missing commission rates, annual-volume thresholds, package components or visa fees.
- Commission is an internal/admin value only and must never appear in the customer checkout/pricing UI.
- ANCFZ new registration, renewal and upgrade are separate service types.
- ANCFZ upgrade fees are customer/service fees; the published AED 500 upgrade commission is a separate value.
- Annual commission tiers must use recorded completed eligible registrations, not a client-entered volume.
- Source-published exact commission amounts take precedence over percentage arithmetic where the source prints an exact amount.

## Implemented

### ANCFZ
- Preserved existing package prices, including the separate new-registration and renewal ladders.
- Preserved the live PAYG renewal values already in the price database, including the known 8-visa anomaly; no silent correction was made.
- Loaded the published PAYG component breakdown from `Agent Commission Structure V3 (1) (1).pdf`, including the one-visa AED 8,000 visa-fee total.
- Verified the component arithmetic: Pre Security Approval 200 + Establishment Card 500 + E-Channel 2,300 + Visa Allocation 1,000 + Entry Permit 950 + Visa Status Change 800 + Medical 350 + EID/Residence 1,900 = AED 8,000.
- Kept the source conflict between the commission PDF's printed AED 10,088 one-visa renewal PAYG total and the separately supplied AED 10,588 price source explicitly flagged instead of silently reconciling it.
- Kept the ANCFZ upgrade matrix separate from normal registration pricing. Example: 0→1 visa published upgrade service fee AED 7,612; separate upgrade commission AED 500.
- Annual tiers are stored as source rules: 1–10, 11–20, 21–30, 31–350, 351+ eligible new registrations.
- Renewal schedules remain separate and do not consume the new-registration annual volume tier.

### IFZA
- May 2026 package rows remain source-controlled in the live pricing data for 1/2/3/5 years and 0/1/2/3/4+ visa bands.
- Plan A and Plan B exact one-year commission amounts are stored.
- The supplied IFZA extract does not establish a verified annual-volume trigger for Plan A vs Plan B; the admin UI therefore requires a source plan selection and explicitly warns that no threshold is being invented.
- 4+ remains a source band; no fabricated 5/6/7 visa price is generated.
- Package benefits/entitlements and excluded fees remain separate from commission.

### Other Free Zones
- DAFZA, DMCC, Meydan, RAKEZ, SHAMS and SPC existing price lists were not changed.
- The same commercial admin engine exposes all eight Free Zones.
- Where no verified commission source exists, the UI states that no commission source is loaded and leaves the existing price data untouched.
- Admins with the required role can add a verified commission schedule later; the source document/page/hash and notes are captured.

## Annual volume engine

`freezone_registration_events` records completed eligible registrations with date, Free Zone, service type and company name.

`get_freezone_annual_registration_summary(year)` provides counts for all eight Free Zones.

For schedules with `volume_rules`, the database resolves the applicable commission tier from recorded completed eligible new registrations. The package settlement RPC ignores a client-entered tier when annual volume rules exist.

This prevents a UI user from typing an arbitrary company count to obtain a higher commission tier.

## Settlement/invoicing

- Package settlement uses the source `base_price` as the published commission/settlement basis; customer promotional price is not substituted into the partner commission calculation.
- Exact commission amount is stored on the settlement invoice.
- Add-ons without an explicit commission rule remain `not_specified_in_commission_schedule`.
- Upgrade/service settlement supports the ANCFZ fixed AED 500 commission and source fee matrix.
- Settlement documents are internal partner settlement documents, not customer tax invoices.

## Security / ACL checks

The following tables have RLS enabled:
- `agent_commission_schedules`
- `freezone_registration_events`
- `freezone_settlement_invoices`
- `freezone_settlement_invoice_items`
- `freezone_fee_components`

For commission/settlement tables, direct `anon` and direct client writes were revoked. Authenticated users receive only the required SELECT privilege, with RLS restricting rows to authorised admin roles. Settlement creation and registration recording use security-definer RPCs with role checks and pinned `search_path`.

The old direct commission admin page was removed and both `/admin/commission` and `/admin/freezone-commercial` now resolve to the same generic commercial admin engine.

## Front-end regression findings addressed

A real existing defect was found in `AdminPanel.jsx`: its effects referenced `loadLeads`, `loadActivities`, `loadPackages`, `loadOrders` and `loadRoles` before those `const` callbacks were initialized. The panel was rewritten so callbacks are declared before the effects, eliminating the temporal-dead-zone runtime failure.

The main Admin Panel now has a visible **Free Zone Commercial** entry point, so the new engine is not a hidden/unreachable route.

The generic commercial page has separate tabs for:
- Calculator
- Annual Volume
- Settlement Invoices
- Add Commission Source (Founder/Admin only)

## Verification completed

### Database/source verification
- ANCFZ one-visa PAYG component sum verified at AED 8,000.
- ANCFZ annual volume rule records verified in live database.
- IFZA Plan A one-visa commission verified at AED 3,000.
- IFZA Plan B one-visa commission verified at AED 4,500.
- ANCFZ upgrade schedule and separate AED 500 commission are present.
- RLS is enabled on commission/settlement tables.
- Direct anonymous/client table grants were hardened.
- Existing Free Zone package data was not globally rewritten by this phase.

### Front-end/static verification
- Generic commercial admin route is present.
- Legacy ANCFZ-only commission route now resolves to the generic engine.
- Superseded commercial admin files were removed.
- Main Admin Panel exposes the commercial engine.
- No remaining source import was found for the removed `AgentCommissionAdmin` page during repository search.

## Not yet certified

**Phase 100 is not production-certified yet.**

A production `npm run build` and real browser E2E pass have not been executed in this environment after the latest frontend changes. Therefore this report does **not** claim:
- build PASS,
- browser PASS,
- mobile PASS,
- Stripe/Resend E2E PASS,
- production Hostinger PASS,
- final visual regression PASS.

Those remain the final Phase 100 gate. The next verification pass must test every visible button, menu, tab and route; customer pricing must remain commission-free; admin commission data must remain inaccessible to customer/anonymous roles; settlement generation must produce the expected invoice; and mobile layouts must be checked before Phase 100 is closed.
