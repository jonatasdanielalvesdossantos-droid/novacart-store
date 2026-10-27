# NovaCart — Product verification checklist

This file is an internal checklist. No product in the current registry is approved for sale.

## Candidate 1: CJ product ID 1480016958685581312
- Tentative public identification: rechargeable electric kitchen cleaning brush.
- Status: needs_verification.
- Public third-party listings are discovery clues only; the authenticated CJ record is authoritative.
- [ ] Open the exact product ID in CJ while signed in.
- [ ] Confirm product title, supplier product ID, SKU and all variants.
- [ ] Select one exact variant and record its variant ID/SKU, variant options and image.
- [ ] Record the current supplier cost for that exact variant.
- [ ] Confirm inventory and warehouse for destination country US.
- [ ] Quote shipping to ZIP 10001 (New York, NY) and ZIP 90001 (Los Angeles, CA), using the chosen variant.
- [ ] Record shipping method, shipping cost and quoted delivery range for each ZIP.
- [ ] Confirm processing time separately from transit time.
- [ ] Record weight, dimensions, battery details and any shipping restrictions.
- [ ] Confirm image-use permissions and that each image matches the chosen variant.
- [ ] Confirm applicable return/refund terms.
- [ ] Record checked-at date and evidence/reference.
- [ ] Calculate selling price and contribution margin using verified costs.
- [ ] Only then consider status=approved.

## Candidate 2: CJ product ID 2407020239431617500
- Status: needs_verification.
- Product identity has not been independently confirmed.
- [ ] Open this exact ID in the authenticated CJ catalog and confirm it is the intended product.
- [ ] Complete every verification item listed for Candidate 1.

## Candidate 3: CJ SKU CJSD3011193
- Tentative identity from prior API discovery: manual long-handle floor scrub brush/squeegee broom.
- It is not the electric spin scrubber concept.
- [ ] Confirm current SKU/product ID, exact variant, current price, US inventory, freight and delivery range before approval.

## Shipping quote evidence table

| Candidate / variant | ZIP | Warehouse/origin | Method | Item cost (USD) | Shipping (USD) | Processing days | Transit/delivery estimate | Checked at |
|---|---|---|---|---:|---:|---:|---|---|
| Pending | 10001 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| Pending | 90001 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |

## Approval rule
Never set a product to approved unless exact variant, current supplier cost, US inventory, shipping method/cost, delivery range, images, return terms and margin have been verified. Never copy a supplier token or secret into this file, source control, frontend or customer-visible output.

## CJ API reference
CJ's official API documents provide product detail/variant lookup and freight calculation endpoints. Freight calculation requires the selected variant ID (VID); shipping estimates must be tested with the actual product/variant and destination ZIP. See:
- https://developers.cjdropshipping.com/en/api/api2/api/product.html
- https://developers.cjdropshipping.com/en/api/api2/api/logistic.html
