import catalog from "../../data/products.json";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60"
    }
  });

function isPubliclyApproved(product) {
  const pricing = product?.pricing;
  const logistics = product?.logistics;

  return product?.status === "approved"
    && typeof product.id === "string"
    && product.id.trim().length > 0
    && typeof product.slug === "string"
    && product.slug.trim().length > 0
    && typeof product.name === "string"
    && product.name.trim().length > 0
    && typeof pricing?.salePrice === "number"
    && Number.isFinite(pricing.salePrice)
    && pricing.salePrice > 0
    && pricing.currency === "USD"
    && typeof pricing?.shippingCost === "number"
    && Number.isFinite(pricing.shippingCost)
    && pricing.shippingCost >= 0
    && typeof logistics?.warehouse === "string"
    && logistics.warehouse.trim().length > 0
    && typeof logistics?.stock === "number"
    && Number.isFinite(logistics.stock)
    && logistics.stock > 0
    && typeof logistics?.processingDays === "number"
    && Number.isFinite(logistics.processingDays)
    && logistics.processingDays >= 0
    && typeof logistics?.deliveryMinDays === "number"
    && Number.isFinite(logistics.deliveryMinDays)
    && typeof logistics?.deliveryMaxDays === "number"
    && Number.isFinite(logistics.deliveryMaxDays)
    && logistics.deliveryMinDays >= 0
    && logistics.deliveryMaxDays >= logistics.deliveryMinDays
    && logistics.destinationCountry === "US"
    && typeof logistics?.shippingMethod === "string"
    && logistics.shippingMethod.trim().length > 0
    && typeof logistics?.returnPolicy === "string"
    && logistics.returnPolicy.trim().length > 0
    && typeof product.verifiedAt === "string"
    && product.verifiedAt.trim().length > 0
    && Array.isArray(product.images)
    && product.images.length > 0
    && product.images.every((image) => typeof image?.url === "string" && image.url.startsWith("https://"))
    && Array.isArray(product.variants)
    && product.variants.length > 0;
}

export async function onRequestGet() {
  const products = Array.isArray(catalog?.products) ? catalog.products : [];
  const approved = products.filter(isPubliclyApproved);

  return json({
    products: approved.map(({ verificationNotes, supplierProductId, supplierSku, ...product }) => product),
    count: approved.length
  });
}
