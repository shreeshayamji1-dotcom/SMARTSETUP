# SmartSetupUAE — PRD & Progress

## Product
UAE business-setup platform. Stack: React 18 (CRA+CRACO) + Supabase (PostgREST). No Python backend.
Preview: https://dataflow-audit-1.preview.emergentagent.com

## Root cause fixed (Phase 3)
Supabase RLS was ON with ZERO policies → all catalog reads empty + all writes denied. Added public SELECT/INSERT policies (`database/phase3_rls_reconciliation.sql`), fixed lead/checkout column mapping, fixed `recalculate_checkout_order` function.

## Done (with dates)
- 2026-06-22: Phase 0 audit; Phase 1 scroll-reset + global ErrorBoundary; Phase 2 branding clean.
- 2026-06-22: Phase 3 RLS reconciliation — live pricing flows, lead capture (return=minimal), checkout order writes.
- 2026-06-22: Phase 8 Compare page (/compare); Phase 15 Founder Club page (/founder-club).
- 2026-06-22: Checkout dual payment (Pay Full Amount vs Reserve AED 999); OAuth wiring (Google/Facebook via Supabase, /auth/callback) — NEEDS provider config in Supabase dashboard.
- 2026-06-22: Data fixes — Meydan visa_count (0–5 tiers), SPC official pricing (Basic 5760/0, Growth 13175/1, Premium 15000/2), package_benefits is_active.
- 2026-06-22: Free zone pages show 3 popular packages (Basic/Growth/Premium = 0/1/2 visa) + dropdown for rest; Visa Options section; cleaned copy.
- 2026-06-22: Navbar redesign — 5 groups (Business Setup, Visa Services, Corporate Services, Resources, Company). New ServicePage (investor/employment/family visa, VAT, corporate tax, accounting, PRO, compliance) + FAQs page. Hero Founder Club teaser. Universal Lead Enquiry → centered modal.

## Pending / Backlog (next phases)
- P0: Enable Google + Facebook providers in Supabase dashboard (Auth → Providers) + add redirect URL https://<domain>/auth/callback. Without this, social login button redirects but provider errors.
- P1: Phase 6 — activity-limit enforcement in checkout (activities_allowed). Phase 7 AI search polish (preselect checkout). Phase 9 cost calculator dynamic. Phase 10 full checkout (3 company names + AED 999 reservation already done; add name reservation fee logic). 
- P1: Compare page → card layout matching reference (badges, chips, View Benefits/Get Details).
- P2: Phase 11 mainland detail pages; Phase 13 blog detail/categories + Guides; Phase 14 chatbot DB-grounded; Phase 16 client dashboard; Phase 17 admin CRUD; Phase 18 final QA reports.
- Data: confirm pricing for remaining COMING_SOON jurisdictions.

## Key files
- Navbar: src/components/Navbar.jsx | Hero: src/components/Hero.jsx
- Free zone: src/pages/FreeZoneDetail.jsx, src/pages/FreeZones.jsx
- Checkout: src/pages/Checkout.jsx, src/lib/checkoutSupabase.js
- Pricing: src/lib/pricingService.js | Leads: src/lib/supabaseRest.js
- Services: src/pages/ServicePage.jsx, src/pages/FAQs.jsx, src/pages/Compare.jsx, src/pages/FounderClub.jsx
- Auth: src/context/AuthContext.jsx, src/pages/AuthCallback.jsx
- SQL: src/../database/phase3_rls_reconciliation.sql
