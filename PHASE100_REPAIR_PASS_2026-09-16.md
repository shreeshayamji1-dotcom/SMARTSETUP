# SmartSetupUAE — Phase 100 Repair Pass Checkpoint

Date: 2026-09-16
Status: **OPEN — not certified**

## Repairs applied in this checkpoint

### 1. Checkout commercial authority — partial repair
- Removed the browser-side AED 5,912 visa price authority from `frontend/src/lib/checkoutSupabase.js`.
- `getVisaPrice()` remains only as a legacy UI compatibility function and returns `0`; the published package `base_price` is the authoritative package amount.
- Bank-transfer proof notes no longer contain a hardcoded AED 999 string; the reserve amount is rendered from `getPrebookingAmount()`.
- Added live coupon reconciliation in `createCheckoutOrder()`: the browser-provided/local coupon code is checked through the authenticated `validate_checkout_coupon` RPC and invalid/obsolete codes are persisted as `NULL`. The `coupons` table remains inaccessible directly to ordinary clients.
- The server-side `recalculate_checkout_order` remains the financial authority and reprices the package/add-ons from Supabase.
- **Still open:** `Checkout.jsx` itself still contains the obsolete hardcoded coupon definitions and local percentage-based display calculation. The UI therefore has not yet been fully refactored to render the live coupon catalogue/discount result. This remains a source-level repair item even though order persistence now rejects obsolete codes at the authority boundary.

### 2. Bank-transfer proof success path — targeted repair applied
- `markBankTransferSubmitted()` now redirects to `/checkout/success?bank=true&reference=...` only after the `submit_bank_transfer_proof` RPC succeeds.
- This bypasses the invalid React `step(5)` state and lands on the existing visible `CheckoutSuccess` confirmation route.
- **Still requires browser/E2E verification** to prove the upload, RPC, redirect, and success page work together in the deployed environment.

### 3. Footer dead controls — repaired
- Removed the four `href="#"` social icon anchors from `frontend/src/components/Footer.jsx`.
- Replaced them with working `mailto:` and `tel:` actions based on `COMPANY_INFO`.
- Footer legal/resource links remain routed through React Router.

### 4. Header branding — repaired
- Removed the `Axiscrest Global FZE LLC` secondary brand from the primary Navbar header.
- Header now presents SmartSetupUAE as the customer-facing brand and uses the neutral descriptor `UAE Business Setup Platform`.
- Added explicit `type="button"` to interactive header buttons to avoid accidental form submission semantics.

## Evidence checked during this pass
- Live `checkout_package_options` rows show package `base_price` and `visa_count` are stored together; the checkout server recalculation uses `checkout_package_options.base_price` as the authoritative base amount.
- Live `coupons` table currently contains active codes including `SMARTSAVE1`, `SMARTSAVE2`, `SMARTSAVE3`, `SMARTUAE10`, and a one-use `MURTAZA20000`; the old browser-only `FIRST500`, `SMARTSAVE12`, and `FOUNDER5` definitions do not match the live coupon catalog.
- The live coupon table is not granted to `anon` or `authenticated` through ordinary table privileges, so coupon validation remains behind the narrowly scoped server-side RPC.
- The repository now contains the live-coupon reconciliation code and bank-proof redirect repair in commit `81b17028a2e07fa976a48b54e7c6bced96e18e84`.

## Remaining high-priority repair order
1. Replace Checkout coupon dropdown/discount calculation with server-authoritative validation and remove `FIRST500`, `SMARTSAVE12`, and `FOUNDER5` from `Checkout.jsx`.
2. Align checkout package/visa selector so the selected package's published visa count and base price cannot diverge from the displayed total.
3. Browser-verify the bank-proof flow: file selection → proof RPC → redirect → visible confirmation.
4. Restrict the Free Zone Commercial admin UI to Founder/Admin while preserving database RLS as the security boundary.
5. Continue route/menu/submenu/button inventory and remove any remaining dead links or misleading CTAs.
6. Audit dashboard, cost calculator, service pages, AI search, Business Hub/CRM, invoicing, document vault, auth callback, and all external integration entry points.
7. Run production build, browser/mobile E2E, Stripe/Resend tests, negative authorization tests, and final security gate retesting before Phase 100 can close.

## Certification rule
Phase 100 remains **OPEN**. No production PASS, security PASS, financial PASS, or integration PASS is claimed from this checkpoint alone.
