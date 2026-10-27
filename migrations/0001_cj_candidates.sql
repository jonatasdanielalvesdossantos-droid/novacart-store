-- NovaCart CJ discovery candidates. Apply to a Preview-only Cloudflare D1 database.
-- This table is deliberately separate from data/products.json and the public catalogue.
CREATE TABLE IF NOT EXISTS cj_candidates (
  id TEXT PRIMARY KEY,
  supplier_product_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sku TEXT,
  image_url TEXT,
  indicative_price TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  inventory_hint TEXT,
  keyword TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'needs_verification'
    CHECK (status = 'needs_verification'),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cj_candidates_created_at ON cj_candidates(created_at DESC);
