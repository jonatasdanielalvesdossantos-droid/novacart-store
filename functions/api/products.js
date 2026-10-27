const SEARCHES = {
  scrubber: "electric cleaning brush",
  remote: "bluetooth scrolling remote",
  dishrack: "dish drying rack"
};

export async function onRequestGet({ request, env }) {
  const apiKey = env.CJ_API_KEY;
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    return json({ ok: false, error: "CJ_API_KEY is not configured." }, 500);
  }

  const url = new URL(request.url);
  const requested = (url.searchParams.get("q") || "scrubber").toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(SEARCHES, requested)) {
    return json({
      ok: false,
      error: "Choose a supported search.",
      availableSearches: Object.keys(SEARCHES)
    }, 400);
  }

  const debug = url.searchParams.get("debug") === "1";
  const debugKeywords = ["electric cleaning brush", "spin scrubber", "electric spin scrubber", "rotating scrubber", "electric scrub brush", "cordless scrubber", "power scrubber", "bathroom scrubber", "cleaning brush electric", "electric brush cleaner"];
  const debugKeyword = url.searchParams.get("keyword");
  const searchKeyword = debug && requested === "scrubber" && debugKeyword && debugKeywords.includes(debugKeyword)
    ? debugKeyword
    : SEARCHES[requested];

  // Cache normal catalog searches; debug requests bypass cache so they show fresh candidates.
  const cacheKey = new Request(new URL(`/api/products-cache-v2?q=${encodeURIComponent(requested)}`, url.origin).toString(), { method: "GET" });
  const cache = caches.default;
  if (!debug) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set("X-NovaCart-Cache", "HIT");
      return new Response(cached.body, { status: cached.status, headers });
    }
  }

  try {
    const authResponse = await fetch(
      "https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() })
      }
    );
    const auth = await authResponse.json().catch(() => null);
    const token = auth?.data?.accessToken;

    if (!authResponse.ok || auth?.success !== true || typeof token !== "string" || !token) {
      const limited = authResponse.status === 429 || auth?.code === 1600200;
      return json({ ok: false, error: limited ? "CJ rate limit reached. Wait at least 10 seconds before trying again." : "CJ authentication failed.", cjCode: auth?.code ?? null, retryAfterSeconds: limited ? 10 : null }, limited ? 429 : 502);
    }

    if (debug && url.searchParams.get("keyword") === "categories") {
      const categoryResponse = await fetch(
        "https://developers.cjdropshipping.com/api2.0/v1/product/getCategory",
        { headers: { "CJ-Access-Token": token } }
      );
      const categoryPayload = await categoryResponse.json().catch(() => null);
      if (!categoryResponse.ok || categoryPayload?.success !== true) {
        return json({ ok: false, error: "CJ category lookup failed.", httpStatus: categoryResponse.status, cjCode: categoryPayload?.code ?? null }, 502);
      }
      const matches = [];
      const visit = (value) => {
        if (Array.isArray(value)) {
          for (const item of value) visit(item);
          return;
        }
        if (!value || typeof value !== "object") return;
        const name = value.categoryName ?? value.categorySecondName ?? value.categoryFirstName ?? value.name ?? null;
        const id = value.categoryId ?? value.id ?? null;
        if (name && id && /clean|household|bath|kitchen|home improvement|tools|brush|personal care/i.test(String(name))) {
          matches.push({ name: String(name), id: String(id) });
        }
        for (const [key, child] of Object.entries(value)) {
          if (key !== "categoryName" && key !== "categorySecondName" && key !== "categoryFirstName" && key !== "categoryId" && key !== "id") visit(child);
        }
      };
      visit(categoryPayload.data);
      const unique = Array.from(new Map(matches.map((item) => [item.id, item])).values());
      return json({ ok: true, debug: true, search: "categories", matchingCategoryCount: unique.length, categories: unique }, 200);
    }

    const params = new URLSearchParams({
      page: "1",
      size: "30",
      keyWord: searchKeyword,
      countryCode: "US",
      verifiedWarehouse: "1",
      sort: "desc",
      orderBy: "0"
    });
    const productResponse = await fetch(
      "https://developers.cjdropshipping.com/api2.0/v1/product/listV2?" + params.toString(),
      { headers: { "CJ-Access-Token": token } }
    );
    const payload = await productResponse.json().catch(() => null);

    if (!productResponse.ok || payload?.success !== true) {
      const limited = productResponse.status === 429 || payload?.code === 1600200;
      return json({
        ok: false,
        error: limited ? "CJ rate limit reached. Wait at least 10 seconds before trying again." : "CJ product search failed.",
        httpStatus: productResponse.status,
        cjCode: payload?.code ?? null,
        retryAfterSeconds: limited ? 10 : null,
        message: typeof payload?.message === "string" ? payload.message : "Unexpected response from CJ."
      }, limited ? 429 : 502);
    }

    const root = payload.data;
    const contentGroups = Array.isArray(root?.content) ? root.content : [];
    const items = Array.isArray(root) ? root
      : Array.isArray(root?.list) ? root.list
      : contentGroups.length
        ? contentGroups.flatMap((group) => Array.isArray(group?.productList) ? group.productList : [])
        : Array.isArray(root?.records) ? root.records
        : [];

    const normalized = items.map((p) => ({
      id: p.id ?? p.pid ?? p.productId ?? p.productid ?? null,
      name: p.nameEn ?? p.nameen ?? p.productNameEn ?? p.productnameen ?? p.productName ?? p.name ?? "Unnamed product",
      sku: p.sku ?? p.productSku ?? p.productsku ?? null,
      image: p.bigImage ?? p.bigimg ?? p.bigimage ?? p.productImage ?? p.productImageUrl ?? p.image ?? p.img ?? null,
      price: p.sellPrice ?? p.sellprice ?? p.nowPrice ?? p.nowprice ?? p.discountPrice ?? p.discountprice ?? p.productPrice ?? p.price ?? null,
      currency: p.currency ?? "USD",
      inventory: p.totalInventory ?? p.totalinventory ?? p.warehouseInventoryNum ?? p.inventoryNum ?? p.stockNum ?? p.inventory ?? null,
      warehouseCountryFilter: "US",
      productUrl: p.productUrl ?? p.productLink ?? p.supplierlink ?? null
    }));
    if (debug) {
      return json({
        ok: true,
        debug: true,
        search: requested,
        keyword: searchKeyword,
        rawCandidateCount: normalized.length,
        candidates: normalized.map((p) => ({ name: p.name, sku: p.sku, price: p.price, inventory: p.inventory }))
      }, 200);
    }

    const terms = {
      scrubber: ["electric cleaning brush", "electric scrubber", "spin scrubber", "cordless cleaning brush", "rotating cleaning brush", "powered scrub brush", "electric spin scrubber", "rotating scrubber", "scrub brush"],
      remote: ["bluetooth scrolling remote", "page turner", "scrolling remote", "phone remote"],
      dishrack: ["dish drying rack", "dish rack", "drying rack", "drainer rack"]
    }[requested];
    const products = normalized.filter((p) => {
      const name = String(p.name || "").toLowerCase();
      if (requested === "scrubber") {
        const hasScrubberIntent = terms.some((term) => name.includes(term));
        const isAccessoryOrUnrelated = /filter|replacement|air purifier|water damage|seesaw|toy|heater|jack|massage|grinding|shaver|bidet|accessor|spare part|head only/i.test(name);
        return hasScrubberIntent && !isAccessoryOrUnrelated;
      }
      return terms.some((term) => name.includes(term));
    });

    const response = json({
      ok: true,
      search: requested,
      keyword: SEARCHES[requested],
      warehouseCountryFilter: "US",
      verifiedWarehouseOnly: true,
      count: products.length,
      products,
      rawCandidateCount: normalized.length,
      note: "Verify the current variant, stock, shipping cost and delivery estimate in CJ before listing or selling."
    }, 200);
    // Keep each category result for five minutes; no secret or token is cached.
    const cacheHeaders = new Headers(response.headers);
    cacheHeaders.set("Cache-Control", "public, max-age=300");
    cacheHeaders.set("X-NovaCart-Cache", "MISS");
    const cacheable = new Response(response.clone().body, { status: response.status, headers: cacheHeaders });
    await cache.put(cacheKey, cacheable);
    return new Response(response.body, { status: response.status, headers: cacheHeaders });
  } catch {
    return json({ ok: false, error: "Could not reach CJdropshipping." }, 502);
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
