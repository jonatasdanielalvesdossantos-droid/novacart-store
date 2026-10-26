export async function onRequestGet({ env }) {
  const apiKey = env.CJ_API_KEY;

  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    return json({ ok: false, error: "CJ_API_KEY is not configured as a runtime secret." }, 500);
  }

  try {
    const response = await fetch(
      "https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() })
      }
    );

    const payload = await response.json().catch(() => null);
    const success = response.ok && payload?.success === true && Boolean(payload?.data?.accessToken);

    if (!success) {
      return json({
        ok: false,
        error: "CJ authentication failed.",
        httpStatus: response.status,
        cjCode: payload?.code ?? null,
        message: typeof payload?.message === "string" ? payload.message : "Unexpected response from CJ."
      }, 502);
    }

    // Never return or log the API key, access token, or refresh token to the browser.
    return json({
      ok: true,
      service: "CJdropshipping",
      authenticated: true,
      tokenExpiry: payload.data.accessTokenExpiryDate ?? null
    }, 200);
  } catch {
    return json({ ok: false, error: "Could not reach CJdropshipping authentication service." }, 502);
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
