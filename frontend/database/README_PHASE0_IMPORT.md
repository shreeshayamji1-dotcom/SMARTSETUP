# Phase 0 Pricing & Activities Files

Run `database/phase0_pricing_schema.sql` in Supabase SQL Editor first.

Then import these CSV files using Supabase Table Editor > matching table > Import data from CSV:

1. `activities_master_shams.csv` -> `activities_master`
2. `freezone_packages.csv` -> `freezone_packages`
3. `package_benefits.csv` -> `package_benefits`
4. `package_addons.csv` -> `package_addons`
5. `package_discounts.csv` -> `package_discounts`

The frontend fallback data is also added at `src/data/freezonePackages.js`.
