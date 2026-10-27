# CJ search diagnostics (pre-launch)

Use this procedure only in a private development session. It makes authenticated requests to CJ and should be run sparingly because the supplier API has rate limits. It does not approve products or verify warehouse stock.

## Prerequisites

- Work on the `catalog-foundation` branch.
- In Cloudflare Pages, configure `CJ_DEBUG_TOKEN` as a server-side secret for the development/preview environment. Do not put it in a URL, source file, browser code, commit, or screenshot.
- Keep the existing `CJ_API_KEY` server-side as a secret.
- Send the debug token only in the `X-CJ-Debug-Token` request header.

## 1. Confirm the protected route rejects anonymous diagnostics

Open the preview API endpoint with `?debug=1` but without the header. Expected result: HTTP 404 with a generic `Not found.` message. This is intentional. Do not interpret it as a CJ API failure.

## 2. Query diagnostics privately

From a trusted terminal, set the preview base URL and token in local environment variables, then use a header (not a query parameter) for the token. Example using curl:

```sh
curl --get "$NOVACART_PREVIEW_URL/api/products" \
  --data-urlencode "q=scrubber" \
  --data-urlencode "debug=1" \
  --data-urlencode "keyword=electric cleaning brush" \
  -H "X-CJ-Debug-Token: $CJ_DEBUG_TOKEN"
```

Try one query at a time from the supported diagnostic keyword list in `functions/api/products.js`, waiting at least 10 seconds between attempts if CJ reports a rate limit. Avoid running the full set repeatedly.

## 3. Interpret results conservatively

- `rawCandidateCount` is how many records the CJ endpoint returned for that query; it is not a relevance or availability guarantee.
- Candidate names and prices are preliminary. Confirm the exact CJ product and variant in the authenticated supplier catalog.
- `warehouseCountryFilter: "US"` is only a country filter. It does not prove that the selected variant is in a US warehouse.
- Verify stock, warehouse, shipping method/cost, processing time, delivery estimate, restrictions, image rights, and return terms.
- Keep products as `needs_verification` until every required field has evidence. Do not add guessed prices or claims.
- Never paste the debug response if it contains private supplier data or tokens into a public issue or chat.

## 4. Validate changes

Run `node scripts/validate-catalog.mjs` and check the **Catalog safety checks** workflow in GitHub Actions. A passing static check verifies repository guardrails only; it does not prove supplier data, shipping estimates, payment processing, or the storefront are production-ready.

## Safe release rule

Do not merge to `main`, deploy, remove the pre-launch notice, enable checkout, or activate live payments without explicit authorization.
