const SEARCHES = {
  scrubber: "electric spin scrubber",
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
      return json({ ok: false, error: "CJ authentication failed.", cjCode: auth?.code ?? null }, 502);
    }

    const params = new URLSearchParams({
      page: "1",
      size: "10",
      keyWord: SEARCHES[requested],
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
      return json({
        ok: false,
        error: "CJ product search failed.",
        httpStatus: productResponse.status,
        cjCode: payload?.code ?? null,
        message: typeof payload?.message === "string" ? payload.message : "Unexpected response from CJ."
      }, 502);
    }

    const root = payload.data;
    const contentGroups = Array.isArray(root?.content) ? root.content : [];
    const items = Array.isArray(root) ? root
      : Array.isArray(root?.list) ? root.list
      : contentGroups.length
        ? contentGroups.flatMap((group) => Array.isArray(group?.productList) ? group.productList : [])
        : Array.isArray(root?.records) ? root.records
        : [];

    const products = items.map((p) => ({
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

    return json({
      ok: true,
      search: requested,
      keyword: SEARCHES[requested],
      warehouseCountryFilter: "US",
      verifiedWarehouseOnly: true,
      count: products.length,
      products,
      note: "Verify the current variant, stock, shipping cost and delivery estimate in CJ before listing or selling."
    }, 200);
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
