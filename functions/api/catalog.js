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
    && typeof product.slug === "string"
    && typeof product.name === "string"
    && typeof pricing?.salePrice === "number"
    && Number.isFinite(pricing.salePrice)
    && pricing.salePrice > 0
    && pricing.currency === "USD"
    && typeof logistics?.warehouse === "string"
    && typeof logistics?.stock === "number"
    && logistics.stock > 0
    && typeof logistics?.shippingCost === "number"
    && Number.isFinite(logistics.shippingCost)
    && typeof logistics?.processingDays === "number"
    && typeof logistics?.deliveryMinDays === "number"
    && typeof logistics?.deliveryMaxDays === "number"
    && logistics.deliveryMinDays >= 0
    && logistics.deliveryMaxDays >= logistics.deliveryMinDays
    && logistics.destinationCountry === "US"
    && typeof logistics?.shippingMethod === "string"
    && typeof logistics?.returnPolicy === "string"
    && typeof product.verifiedAt === "string"
    && Array.isArray(product.images)
    && product.images.length > 0
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
