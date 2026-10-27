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

export async function onRequestPost({ request, env }) {
  // Admin operations require a server-side token; never accept credentials in query parameters.
  if (!safeEqual(request.headers.get("X-NovaCart-Admin-Token"), env.NOVACART_ADMIN_TOKEN)) {
    return json({ ok: false, error: "Not found." }, 404);
  }

  const apiKey = env.CJ_API_KEY;
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    return json({ ok: false, error: "CJ_API_KEY is not configured." }, 500);
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ ok: false, error: "Expected a JSON body." }, 400);
  }

  const keyword = typeof input?.keyword === "string" ? input.keyword.trim() : "";
  if (!keyword || keyword.length > 100) {
    return json({ ok: false, error: "Provide a keyword up to 100 characters." }, 400);
  }

  try {
    const authResponse = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ apiKey: apiKey.trim() })
    });
    const auth = await authResponse.json().catch(() => null);
    const token = auth?.data?.accessToken;
    if (!authResponse.ok || auth?.success !== true || typeof token !== "string" || !token) {
      const limited = authResponse.status === 429 || auth?.code === 1600200;
      return json({ ok: false, error: limited ? "CJ rate limit reached; wait before retrying." : "CJ authentication failed.", retryAfterSeconds: limited ? 10 : null }, limited ? 429 : 502);
    }

    const params = new URLSearchParams({
      page: "1",
      size: "30",
      keyWord: keyword,
      countryCode: "US",
      sort: "desc",
      orderBy: "0"
    });
    const response = await fetch("https://developers.cjdropshipping.com/api2.0/v1/product/listV2?" + params.toString(), {
      headers: { "CJ-Access-Token": token }
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success !== true) {
      const limited = response.status === 429 || payload?.code === 1600200;
      return json({ ok: false, error: limited ? "CJ rate limit reached; wait before retrying." : "CJ product search failed.", retryAfterSeconds: limited ? 10 : null }, limited ? 429 : 502);
    }

    const root = payload.data;
    const groups = Array.isArray(root?.content) ? root.content : [];
    const items = Array.isArray(root) ? root
      : Array.isArray(root?.list) ? root.list
      : groups.length ? groups.flatMap(group => Array.isArray(group?.productList) ? group.productList : [])
      : Array.isArray(root?.records) ? root.records : [];

    // Return discovery candidates only. A search result is never a verified or sale-ready product.
    const candidates = items.map(p => ({
      supplierProductId: String(p.id ?? p.pid ?? p.productId ?? ""),
      name: String(p.nameEn ?? p.nameen ?? p.productNameEn ?? p.productnameen ?? p.productName ?? p.name ?? "Unnamed product"),
      sku: p.sku ?? p.productSku ?? p.productsku ?? null,
      image: p.bigImage ?? p.bigimg ?? p.bigimage ?? p.productImage ?? p.productImageUrl ?? p.image ?? p.img ?? null,
      indicativePrice: p.sellPrice ?? p.sellprice ?? p.nowPrice ?? p.nowprice ?? p.discountPrice ?? p.discountprice ?? p.productPrice ?? p.price ?? null,
      currency: p.currency ?? "USD",
      inventoryHint: p.totalInventory ?? p.totalinventory ?? p.warehouseInventoryNum ?? p.inventoryNum ?? p.stockNum ?? p.inventory ?? null,
      requiresVerification: true
    })).filter(p => p.supplierProductId);

    return json({ ok: true, candidates, count: candidates.length, note: "Discovery only: confirm exact variant, warehouse stock, current cost, shipping, delivery and returns before approval." });
  } catch {
    return json({ ok: false, error: "Could not reach CJdropshipping." }, 502);
  }
}
