export async function onRequestGet({ env }) {
  const hasCJApiKey =
    typeof env.CJ_API_KEY === "string" && env.CJ_API_KEY.trim().length > 0;

  return new Response(
    JSON.stringify({
      ok: true,
      service: "NovaCart API",
      cjApiKeyConfigured: hasCJApiKey
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}
