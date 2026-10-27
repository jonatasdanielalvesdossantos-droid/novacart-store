# NovaCart administrative architecture plan

Status: planning only. No admin dashboard, database, customer-data collection or payment processing is enabled by this document.

## Current known architecture
- Static storefront: `index.html`.
- Cloudflare Pages Functions API: `functions/api/catalog.js`.
- Candidate catalog source: `data/products.json`.
- CJ integration exists separately in `functions/api/products.js`; credentials must remain in Cloudflare environment secrets.
- Catalog candidates remain `needs_verification`; the public catalog should expose approved records only.
- Pre-launch notice must remain visible. No live orders or payments.

## Proposed admin modules
1. **Overview:** verified orders, gross sales, refunds, supplier costs and contribution margin. Only show metrics backed by real data; do not fabricate demo numbers.
2. **Products:** candidate/approved/paused status, supplier product ID and variant, supplier cost, images, stock, US shipping quote, processing/delivery estimates, return terms, verification date and approval history.
3. **Pricing:** sale price, landed cost, payment fees, estimated taxes/other costs, contribution margin and margin percentage. Clearly distinguish estimates from realized costs.
4. **Orders:** order state machine (pending payment, paid, supplier processing, shipped, delivered, cancelled, refund requested, refunded, exception). Only add actual order actions after payment and database architecture are approved.
5. **Supplier operations:** product/variant mapping, shipping quote evidence, inventory refresh time, fulfillment status and manual exception handling.
6. **Customer support:** minimum necessary customer details, order-linked messages and privacy-conscious retention.
7. **Settings/audit:** role-based access, change history, integration health and non-sensitive logs.

## Security requirements before building an admin
- Admin routes must require server-side authentication; hiding UI controls is not access control.
- Use least-privilege roles and deny access by default.
- Never put CJ or Stripe secrets in client-side code, JSON files, commits, logs or API responses.
- Validate and authorize every mutation on the server.
- Add CSRF protection where cookie-based sessions are used, rate limits on sensitive endpoints, secure session cookies, and audit records for product approval and order/refund actions.
- Do not store card numbers or CVC. Use the payment provider's hosted/tokenized payment flow when authorized.
- Do not collect customer personal data before the privacy notice, retention rules and operational need are defined.
- Keep separate test and production credentials and environments.
- Backups, deletion/export procedures, incident handling and access revocation must be defined before launch.

## Decisions required before implementation
1. Database/provider and region.
2. Admin authentication provider and initial owner account setup.
3. Whether the store will use Stripe Checkout or another hosted checkout.
4. Exact order and refund workflows.
5. Shipping, taxes, returns and privacy policy approved for the target market.
6. Whether supplier fulfillment is manual first or automated after a monitored pilot.

## Safe implementation sequence
1. Verify supplier product and freight data.
2. Establish schema and migration/versioning strategy.
3. Build authenticated read-only admin views against test data.
4. Add audited product approval and pricing changes.
5. Add test-mode payment and webhook handling only after explicit authorization.
6. Add order operations and supplier sync in a test environment.
7. Security review and end-to-end tests.
8. Production release only after explicit approval.

## Current safety boundary
This plan does not authorize production checkout, live payments, customer-data collection, deployment, merging to `main`, or removal of the pre-launch banner.
