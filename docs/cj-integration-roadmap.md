# CJdropshipping integration — safe implementation plan

This integration is being built only on `catalog-foundation`. It is not a production release.

## Current foundation
- `POST /api/admin/cj/search` performs an authenticated CJ keyword search.
- `POST /api/admin/cj/import` saves a candidate to a Preview-only D1 table, deduplicated by supplier product ID. It returns a safe `503` until the `NOVACART_DB` binding exists.
- It requires the server-side `NOVACART_ADMIN_TOKEN` header and `CJ_API_KEY` Cloudflare Pages secrets.
- Search results are discovery candidates only. They are never automatically approved or published.
- The route returns generic errors and does not expose supplier access tokens or raw CJ payloads.

## Preview secrets
Configure these under Cloudflare Pages > Settings > Environment variables for Preview only:
- `CJ_API_KEY`: existing CJ API key.
- `NOVACART_ADMIN_TOKEN`: a long, random secret used in the `X-NovaCart-Admin-Token` request header.

Do not put either value in HTML, Git, URLs, query parameters, logs, screenshots, or this repository. Do not reuse the debug token as the admin token. Never configure this feature in Production as part of this work.

## Candidate import storage (Preview only)
1. Create a D1 database for Preview only in Cloudflare; do not bind it to Production.
2. Bind that database to the Pages Preview environment as `NOVACART_DB`.
3. Apply `migrations/0001_cj_candidates.sql` to that Preview database using the Cloudflare D1 migrations workflow.
4. Open `/admin/cj.html` behind Cloudflare Access and use **Import candidate (private)**. The unique supplier product ID prevents duplicate rows. Imports remain in `needs_verification` and are not connected to `data/products.json` or the public catalogue.
5. If the D1 binding is missing, import intentionally fails closed with HTTP 503. Do not add a GitHub token or write repository files from the runtime.

## Planned modules
1. Admin UI: search, review candidates, inspect product details, choose a specific variant, and import as `needs_verification`.
2. Product verification: record supplier product/variant IDs, source cost, currency, image match, warehouse, stock evidence, shipping quote, processing/transit estimates, return terms, checked-at timestamp and evidence.
3. Price calculation: derive proposed sale price from verified item cost, shipping, payment fees and a configurable margin. Keep the result a proposal until reviewed.
4. Inventory/pricing sync: scheduled or manually triggered server-side refresh, with rate-limit-aware backoff, stale-data indicators and audit history. Never mark a product approved solely because an API request succeeded.
5. Order preparation: create an internal draft only after a customer order flow exists. Keep checkout, payment capture, and CJ order submission disabled. No live order should be created by sync or import.
6. Release checks: validate catalogue schema and tests, review the Preview deployment, and obtain explicit authorization before any Production changes.

## Security and operational requirements
- Admin endpoints require the server-side admin token and should be used only behind Cloudflare Access in Preview.
- Do not expose supplier tokens, customer personal data, or internal verification notes through public endpoints.
- Apply request validation, payload size limits, rate limiting/backoff and audit records before adding mutation/sync/order endpoints.
- Supplier country filters do not prove stock at a particular warehouse.
- A passing software test does not verify commercial terms, shipping, taxes, returns, or payment compliance.
- Never merge to `main`, deploy to Production, enable checkout, collect payments, or submit real CJ orders without explicit authorization.

## Search endpoint
Send a POST request to `/api/admin/cj/search` with JSON body `{"keyword":"cleaning brush"}` and header `X-NovaCart-Admin-Token: <preview secret>`. The secret must only be supplied by a trusted admin client/terminal, never embedded in a public storefront. Results contain a `requiresVerification: true` flag by design.
