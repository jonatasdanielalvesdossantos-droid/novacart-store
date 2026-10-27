#!/usr/bin/env node
/**
 * Local safety checks for the NovaCart pre-launch catalog.
 * Run with: node scripts/validate-catalog.mjs
 * This script performs no network requests and never reads environment secrets.
 */
import { readFileSync } from "node:fs";

const fail = [];
const productsFile = new URL("../data/products.json", import.meta.url);
const htmlFile = new URL("../index.html", import.meta.url);
const apiFile = new URL("../functions/api/catalog.js", import.meta.url);

let registry;
let html;
let api;
const supplierApiFile = new URL("../functions/api/products.js", import.meta.url);
let supplierApi;
try {
  supplierApi = readFileSync(supplierApiFile, "utf8");
} catch (error) {
  console.error("FAIL: Could not read supplier API file:", error.message);
  process.exit(1);
}
try {
  registry = JSON.parse(readFileSync(productsFile, "utf8"));
  html = readFileSync(htmlFile, "utf8");
  api = readFileSync(apiFile, "utf8");
} catch (error) {
  console.error("FAIL: Could not read required catalog/storefront files:", error.message);
  process.exit(1);
}

if (!Array.isArray(registry.products)) fail.push("data/products.json must contain a products array.");

if (Array.isArray(registry.products)) {
  for (const p of registry.products) {
    if (p?.status !== "needs_verification" && p?.status !== "approved") continue;
    if (p.status === "needs_verification" && (
      p.pricing?.salePrice !== null ||
      p.pricing?.supplierCost !== null ||
      p.pricing?.shippingCost !== null ||
      (Array.isArray(p.images) && p.images.length > 0) ||
      (Array.isArray(p.variants) && p.variants.length > 0) ||
      p.verifiedAt !== null
    )) {
      fail.push(`${p.id || "Candidate product"}: unverified records must not contain sale price, supplier cost, shipping cost, images, variants, or verification date presented as verified.`);
    }
  }
}


const seenIds = new Set();
const seenSlugs = new Set();
for (const [index, p] of (registry.products ?? []).entries()) {
  const label = p?.id || `product at index ${index}`;
  if (!p || typeof p !== "object") {
    fail.push(`${label}: product record must be an object.`);
    continue;
  }
  if (typeof p.id !== "string" || !p.id.trim()) fail.push(`${label}: missing id.`);
  else if (seenIds.has(p.id)) fail.push(`${label}: duplicate id.`);
  else seenIds.add(p.id);

  if (typeof p.slug !== "string" || !p.slug.trim()) fail.push(`${label}: missing slug.`);
  else if (seenSlugs.has(p.slug)) fail.push(`${label}: duplicate slug.`);
  else seenSlugs.add(p.slug);

  if (p.status === "approved") {
    const price = p.pricing;
    const logistics = p.logistics;
    if (typeof p.name !== "string" || !p.name.trim()) fail.push(`${label}: approved product needs a name.`);
    if (price?.currency !== "USD" || !Number.isFinite(price?.salePrice) || price.salePrice <= 0) fail.push(`${label}: approved product needs a positive USD sale price.`);
    if (!Number.isFinite(logistics?.stock) || logistics.stock <= 0) fail.push(`${label}: approved product needs positive stock.`);
    if (logistics?.destinationCountry !== "US") fail.push(`${label}: approved product must be verified for US destination.`);
    if (!Number.isFinite(price?.shippingCost) || price.shippingCost < 0) fail.push(`${label}: approved product needs a verified shipping cost in pricing.shippingCost.`);
    if (!Number.isFinite(logistics?.processingDays) || logistics.processingDays < 0) fail.push(`${label}: approved product needs processing days.`);
    if (!Number.isFinite(logistics?.deliveryMinDays) || !Number.isFinite(logistics?.deliveryMaxDays) || logistics.deliveryMinDays < 0 || logistics.deliveryMaxDays < logistics.deliveryMinDays) fail.push(`${label}: approved product needs a valid delivery range.`);
    if (typeof logistics?.warehouse !== "string" || !logistics.warehouse.trim()) fail.push(`${label}: approved product needs a warehouse.`);
    if (typeof logistics?.shippingMethod !== "string" || !logistics.shippingMethod.trim()) fail.push(`${label}: approved product needs a shipping method.`);
    if (typeof logistics?.returnPolicy !== "string" || !logistics.returnPolicy.trim()) fail.push(`${label}: approved product needs return terms.`);
    if (typeof p.verifiedAt !== "string" || !p.verifiedAt.trim()) fail.push(`${label}: approved product needs a verification date.`);
    if (!Array.isArray(p.images) || p.images.length === 0 || p.images.some(image => typeof image?.url !== "string" || !image.url.startsWith("https://"))) fail.push(`${label}: approved product images must be non-empty HTTPS URLs.`);
    if (!Array.isArray(p.variants) || p.variants.length === 0) fail.push(`${label}: approved product needs at least one verified variant.`);
  } else if (p.status !== "needs_verification") {
    fail.push(`${label}: unknown status "${p.status}". Use needs_verification or approved.`);
  }
}

if (!/PRE-LAUNCH PREVIEW/i.test(html) || !/CHECKOUT IS NOT AVAILABLE/i.test(html)) {
  fail.push("Storefront must keep the pre-launch/checkout-disabled notice.");
}
if (!html.includes("/api/catalog")) fail.push("Storefront must request products from /api/catalog.");
if (!/<html[^>]*lang="en"/i.test(html)) fail.push("Storefront must declare its English document language.");
if (!/<meta[^>]+name="robots"[^>]+content="noindex, nofollow"/i.test(html)) fail.push("Pre-launch storefront must remain excluded from search indexing.");
if (/\b(?:stripe|checkout\.sessions|payment_intent)\b/i.test(html)) {
  fail.push("Unexpected payment/checkout implementation detected in storefront HTML.");
}
if (!api.includes('product?.status === "approved"')) fail.push("Catalog API must filter to approved products.");
if (!api.includes("pricing?.shippingCost")) fail.push("Catalog API must validate shipping cost in the pricing object.");
if (!api.includes("image.url.startsWith(\"https://\")")) fail.push("Catalog API must reject non-HTTPS product image URLs.");
if (/verifiedWarehouseOnly:\s*true/.test(supplierApi)) fail.push("Supplier API must not claim US warehouse stock is verified from a country filter alone.");
if (!supplierApi.includes("env.CJ_DEBUG_TOKEN")) fail.push("Supplier diagnostics must require the server-side CJ_DEBUG_TOKEN.");
if (!supplierApi.includes("Object.prototype.hasOwnProperty.call(SEARCHES, requested)")) fail.push("Supplier API must restrict public searches to the explicit allowlist.");
if (!supplierApi.includes('request.headers.get("X-CJ-Debug-Token")')) fail.push("Supplier diagnostics must read their access token from a request header, not the URL.");
if (/\b(?:sk_live_|sk_test_|Bearer\s+[A-Za-z0-9._-]{16,})/.test(supplierApi)) fail.push("Supplier API must not contain hardcoded payment secrets or bearer tokens.");

if (!supplierApi.includes('return json({ ok: false, error: "Not found." }, 404)')) fail.push("Unauthorized supplier diagnostics should return a non-revealing 404.");
if (!supplierApi.includes("The US country filter is not proof of US-warehouse stock")) fail.push("Supplier API must explain that country filtering does not verify warehouse stock.");
if (!api.includes("verificationNotes")) fail.push("Catalog API must omit internal verification notes from public output.");
if (!api.includes("supplierProductId") || !api.includes("supplierSku")) {
  fail.push("Catalog API should explicitly remove supplier identifiers from public output.");
}

if (fail.length) {
  console.error("NovaCart catalog checks FAILED:");
  for (const message of fail) console.error(`- ${message}`);
  process.exit(1);
}

const approved = (registry.products ?? []).filter(p => p.status === "approved").length;
const pending = (registry.products ?? []).filter(p => p.status === "needs_verification").length;
console.log("NovaCart catalog checks passed.");
console.log(`Products: ${registry.products.length}; approved: ${approved}; pending verification: ${pending}.`);
if (approved === 0) console.log("Safe state: no products are currently approved for public sale.");
