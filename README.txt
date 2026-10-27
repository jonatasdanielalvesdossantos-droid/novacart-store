NOVACART — PRE-LAUNCH STOREFRONT PROTOTYPE

Current status
- The public storefront is still unchanged; work is being prepared on the `catalog-foundation` branch.
- The storefront must remain pre-launch until supplier, product, shipping, returns, tax, privacy and payment requirements are verified.
- The visible pre-launch notice is intentional. Checkout and payment processing are not available.
- Do not accept real orders or advertise products as available for purchase.

Files
- `index.html`: storefront preview; requests the approved public catalog from `/api/catalog`.
- `data/products.json`: internal candidate registry. Current candidates are all `needs_verification`; no sale prices, variants, images, shipping quotes or stock are approved.
- `functions/api/catalog.js`: serves only records meeting the public approval checks and omits supplier identifiers and internal verification notes.
- `docs/product-verification-checklist.md`: manual CJdropshipping verification checklist and shipping quote evidence table.

Catalog approval requirements
Before setting a product status to `approved`, verify the exact supplier product and variant, current supplier cost, inventory for the US destination, shipping method and cost, processing and delivery estimates, image/variant match, return terms and selling margin. Record the verification date. Never place API keys, access tokens or other secrets in tracked files or client-side code.

Safe development rules
- Keep changes on `catalog-foundation` until reviewed and explicitly authorized.
- Do not merge to `main`, deploy, remove the pre-launch notice, activate checkout, or enable live payments without explicit authorization.
- Keep credentials in the host's secret/environment-variable settings.
- Do not expose CJ or payment credentials in logs, API responses, HTML, commits or screenshots.
- Validate the API endpoint and storefront in a safe preview/test environment before considering release.

Official CJ API references
- Product API: https://developers.cjdropshipping.com/en/api/api2/api/product.html
- Logistics API: https://developers.cjdropshipping.com/en/api/api2/api/logistic.html
