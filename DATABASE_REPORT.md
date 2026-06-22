# SmartSetupUAE — DATABASE & SUPABASE REPORT (Phase 3)

**Project:** `smrsaedmuaizlesehpee.supabase.co` (Postgres via `aws-1-ap-southeast-1` pooler)
**Connection:** Postgres URI provided by client (not stored in repo).

---

## ⚠️ Correction to Phase 0 audit

Phase 0 (run with the **anon key only**) concluded the catalog tables were "empty". With full DB access this was proven **incorrect**: the data exists. The anon client saw empty arrays purely because **RLS was enabled with ZERO policies**, so PostgREST returned `[]` for every catalog read and rejected every write.

---

## Root Cause (single, systemic)

`Row Level Security` was **ON** for the catalog and lead/order tables, but **no policies existed** for the `anon`/`authenticated` roles. Effects:
- Every catalog `SELECT` → `[]` → frontend fell back to hardcoded `data/zones.js`.
- Every `INSERT` (leads, checkout_orders) → `42501 RLS violation` → lead capture and checkout silently failed.

### Fix applied — `database/phase3_rls_reconciliation.sql`
- Added `SELECT to public using (true)` on: freezone_packages, package_benefits, package_addons, package_discounts, service_addons, coupons, freezone_pricing, freezone_rules, founder_club_tiers/benefits/discount_rules/events/opportunities/reviews, early_bird_campaigns, platform_settings, scratch_cards.
- Added `INSERT to public with check (true)` on: leads, company_name_requests, checkout_orders, checkout_order_addons, orders, payments, lead_recommendations.
- Added `UPDATE to public` on checkout_orders (bank-transfer proof flow).
- Added owner-scoped self read/insert/update on `profiles` for authenticated users.
- Fixed `recalculate_checkout_order()` which referenced non-existent columns (`addon_total`/`grand_total` → corrected to `addons_total`/`final_total`).

> Used role `public` (covers anon+authenticated). For writes, targeting `anon, authenticated` directly failed RLS WITH CHECK matching in this project; `public` resolves it reliably.

---

## Live Data Inventory (verified)

| Table | Rows | Notes |
|-------|------|-------|
| activities_master | 12,719 | 8+ free zones of activities |
| freezone_packages | 115 | ANCFZ 54, SHAMS 22, Meydan 12, DMCC 9, DAFZA 8, IFZA 4, SPC 3, RAKEZ 3 |
| package_benefits | 1,455 | |
| package_addons | 81 | |
| package_discounts | 27 | |
| service_addons | 24 | |
| coupons | 2 | active |
| founder_club_tiers | 2 | Pioneer AED 999, Annual AED 1,051 |
| founder_club_benefits | 48 | |
| leads / orders / checkout_orders | 0 | now writable |

41 tables total (incl. checkout_* views, founder_club_* suite, documents, payments, notifications, admin/lead assignment).

---

## Authoritative Schemas (key tables)

**leads**: id(text,PK,no default), name(NOT NULL), email, phone(NOT NULL), whatsapp, nationality, zone, biz_type, activities(text[]), company_names(text[]), booking_type, amount_paid, full_total, pay_method, coupon, status, source, notes, created_at, assigned_* …
→ Frontend `captureLead` previously sent `source_page/freezone_name/business_activity/budget/raw_payload` (none exist). **Fixed** to map to real columns, auto-generate `id`, fold extras into `notes`, insert with `return=minimal` (no SELECT policy needed → preserves lead privacy).

**freezone_packages**: id(uuid), freezone, package_name, package_type, duration_years, visa_count, shareholder_count, base_price, discount_price, promotion_price, currency, is_active, notes.
→ `pricingService` reads `base_price` (+ now `promotion_price/discount_price`). Works.

**checkout_orders**: id(uuid, default), customer_*, freezone(NOT NULL), package_id, package_name, duration_years, visa_count, shareholder_count, base_price, addons_total, discount_total, final_total, currency, status, notes, created_at.
→ `checkoutSupabase` **rewritten** to match (client-generated uuid, `return=minimal`, extras → notes).

**checkout_order_addons**: id, order_id, addon_name(NOT NULL), addon_category, price, currency, created_at. → mapper fixed.

---

## Remaining DB items (backlog)
- `client_profiles` referenced by AuthContext fallback does not exist (harmless — `profiles` path used first; `.catch` swallows).
- Admin write policies (RLS) for admin CRUD modules — to be defined in Admin phase.
- Jurisdiction status enum (ACTIVE/COMING_SOON/…) not yet a DB column — currently only 8 zones have data; others should render "Pricing verification in progress / Request quotation".
