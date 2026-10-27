const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  }
});

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function cleanText(value, max = 500) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text.slice(0, max) : null;
}

export async function onRequestPost({ request, env }) {
  if (!safeEqual(request.headers.get("X-NovaCart-Admin-Token"), env.NOVACART_ADMIN_TOKEN)) {
    return json({ ok: false, error: "Not found." }, 404);
  }

  // Never pretend a repository JSON file is writable at runtime. Persistence is explicit via Preview D1.
  if (!env.NOVACART_DB || typeof env.NOVACART_DB.prepare !== "function") {
    return json({
      ok: false,
      error: "Candidate storage is not configured. Bind a Preview-only D1 database as NOVACART_DB and apply migrations/0001_cj_candidates.sql."
    }, 503);
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ ok: false, error: "Expected a JSON body." }, 400);
  }

  const candidate = input?.candidate;
  const supplierProductId = cleanText(candidate?.supplierProductId, 120);
  const name = cleanText(candidate?.name, 300);
  const keyword = cleanText(input?.keyword, 100);
  if (!supplierProductId || !name || !keyword) {
    return json({ ok: false, error: "Candidate ID, name and search keyword are required." }, 400);
  }
  if (!/^[a-zA-Z0-9._:-]+$/.test(supplierProductId)) {
    return json({ ok: false, error: "Invalid supplier product ID." }, 400);
  }

  const sku = cleanText(candidate?.sku, 160);
  const image = cleanText(candidate?.image, 1000);
  const imageUrl = image && /^https:\/\//i.test(image) ? image : null;
  const indicativePrice = candidate?.indicativePrice == null ? null : cleanText(String(candidate.indicativePrice), 40);
  const currency = cleanText(candidate?.currency, 8) || "USD";
  const inventoryHint = candidate?.inventoryHint == null ? null : cleanText(String(candidate.inventoryHint), 80);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  try {
    const result = await env.NOVACART_DB.prepare(
      `INSERT INTO cj_candidates
       (id, supplier_product_id, name, sku, image_url, indicative_price, currency, inventory_hint, keyword, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'needs_verification', ?, ?)
       ON CONFLICT(supplier_product_id) DO NOTHING`
    ).bind(id, supplierProductId, name, sku, imageUrl, indicativePrice, currency, inventoryHint, keyword, now, now).run();

    const saved = await env.NOVACART_DB.prepare(
      "SELECT id, supplier_product_id, name, status, created_at FROM cj_candidates WHERE supplier_product_id = ?"
    ).bind(supplierProductId).first();

    if (!saved) return json({ ok: false, error: "Candidate could not be saved." }, 500);
    const inserted = Number(result?.meta?.changes ?? 0) > 0;
    return json({
      ok: true,
      inserted,
      duplicate: !inserted,
      candidate: {
        id: saved.id,
        supplierProductId: saved.supplier_product_id,
        name: saved.name,
        status: saved.status,
        createdAt: saved.created_at
      },
      note: "Saved as needs_verification only. Not published, priced for sale, or ordered."
    }, inserted ? 201 : 200);
  } catch {
    return json({ ok: false, error: "Candidate storage operation failed." }, 500);
  }
}
