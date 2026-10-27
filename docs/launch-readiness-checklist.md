# NovaCart launch-readiness checklist

This checklist is intentionally conservative. The storefront remains a pre-launch preview until each applicable item is verified. Do not deploy, enable checkout, or remove the pre-launch notice merely because this checklist exists.

## 1. Catalog and supplier verification

- [ ] Confirm the exact CJdropshipping product record and product/variant IDs while authenticated.
- [ ] Confirm the exact variant, dimensions, package weight, included accessories, and product claims.
- [ ] Confirm live supplier cost and stock for the selected warehouse.
- [ ] Check shipping method, shipping cost, delivery estimate, and restrictions to the intended destination.
- [ ] Compare delivery estimates and shipping costs for representative destinations; record the date and source.
- [ ] Confirm supplier return/refund conditions and how defective, missing, or delayed orders are handled.
- [ ] Add only verified HTTPS product images that are permitted for storefront use.
- [ ] Calculate price and contribution margin including supplier cost, shipping, payment processing, refunds/chargebacks, taxes, and other applicable costs.
- [ ] Record `verifiedAt` and verification notes; keep uncertain products at `needs_verification`.
- [ ] Run `node scripts/validate-catalog.mjs` after catalog edits.

## 2. Application and security

- [ ] Confirm `/api/catalog` returns only approved, complete products and never supplier identifiers or internal verification notes.
- [ ] Confirm malformed or incomplete approved records are excluded safely.
- [ ] Review every public API route for accidental exposure of supplier identifiers, inventory diagnostics, internal errors, or privileged operations.
- [ ] Ensure secret values and access tokens are never included in responses, logs, commits, or client-side code.
- [ ] Verify rate limiting and caching behavior for supplier API routes; avoid repeated manual calls that could trigger supplier limits.
- [ ] Keep supplier diagnostics behind the `CJ_DEBUG_TOKEN` Cloudflare secret and the `X-CJ-Debug-Token` request header; never put the token in a URL. Normal public searches must not expose debug candidates.
- [ ] Add automated tests for catalog validation, public-field sanitization, empty-catalog behavior, and API error handling.
- [ ] Review dependencies and run the project's available checks before release.
- [ ] Confirm there is no active cart, checkout, payment, order creation, or customer-data collection before those flows are deliberately implemented and tested.

## 3. Business readiness

- [ ] Choose the actual markets and destinations to serve.
- [ ] Prepare accurate shipping, returns/refunds, privacy, terms, and contact information appropriate to the business and target markets; obtain qualified advice where needed.
- [ ] Confirm tax, consumer-protection, product-safety, and import obligations for the selected markets.
- [ ] Define customer support ownership and escalation for supplier issues, refunds, and chargebacks.
- [ ] Define order reconciliation and fulfillment steps before accepting any orders.

## 4. Admin and payments

- [ ] Choose database, hosting/region, and backup/retention approach before storing orders or customer information.
- [ ] Implement authenticated admin access with least privilege, server-side authorization, secure sessions, CSRF protection where applicable, and an audit trail.
- [ ] Keep payment processing on a hosted/tokenized provider flow; never store card numbers or CVC.
- [ ] Test checkout, webhooks, order state transitions, refunds, and failure cases in payment test mode first.
- [ ] Verify that production secrets are configured only in the server-side secret manager and separated from test credentials.

## 5. Release gate

- [ ] Run the full test suite and manually review the preview on desktop and mobile.
- [ ] Verify accessibility basics, links, metadata, empty states, and loading/error states.
- [ ] Confirm the catalog contains only products that passed supplier verification.
- [ ] Review deployment changes and rollback steps.
- [ ] Obtain explicit authorization before deploying, merging into `main`, enabling real checkout/payments, or removing the pre-launch notice.

## Current status

This document is a checklist, not evidence that the items are complete. Unverified products must not be represented as available for sale.