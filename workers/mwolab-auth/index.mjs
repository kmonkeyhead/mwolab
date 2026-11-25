const site = "https://kmonkeyhead.github.io";
const endpoints = {
  "/login": "https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp",
  "/refresh": "https://securetoken.googleapis.com/v1/token",
};

const headers = {
  "Access-Control-Allow-Origin": site,
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "Vary": "Origin",
};

function reply(body, status) {
  return Response.json(body, { status, headers });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (!Object.hasOwn(endpoints, pathname)) return reply({}, 404);
    if (request.headers.get("Origin") !== site) return new Response(null, { status: 403 });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return reply({}, 405);
    if (!env.FIREBASE_WEB_API_KEY) return reply({ error: "unavailable" }, 503);
    if (!request.headers.get("Content-Type")?.startsWith("application/json")) return reply({}, 415);
    if (Number(request.headers.get("Content-Length")) > 16384) return reply({}, 413);
    const reader = request.body?.getReader();
    if (!reader) return reply({}, 400);
    let size = 0;
    let text = "";
    const decoder = new TextDecoder();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) {
        await reader.cancel();
        return reply({}, 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    let data;
    try { data = JSON.parse(text + decoder.decode()); }
    catch { return reply({}, 400); }
    const token = data?.token;
    if (typeof token !== "string" || !token || token.length > 8192) return reply({}, 400);

    const login = pathname === "/login";
    const body = login ? JSON.stringify({
      requestUri: site + "/mwolab/",
      postBody: new URLSearchParams({ providerId: "google.com", access_token: token }).toString(),
      returnSecureToken: true,
    }) : new URLSearchParams({ grant_type: "refresh_token", refresh_token: token });
    const url = new URL(endpoints[pathname]);
    url.searchParams.set("key", env.FIREBASE_WEB_API_KEY);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": login ? "application/json" : "application/x-www-form-urlencoded" },
        body,
        redirect: "error",
      });
      const payload = await response.json();
      if (!response.ok) {
        const code = payload.error?.message?.split(" : ")[0];
        const expired = ["TOKEN_EXPIRED", "INVALID_REFRESH_TOKEN", "INVALID_GRANT", "USER_DISABLED", "USER_NOT_FOUND"].includes(code);
        if (!login && expired) return reply({ error: "session-expired" }, 401);
        return reply({ error: "auth-failed" }, response.status);
      }
      const session = {
        uid: login ? payload.localId : payload.user_id,
        idToken: login ? payload.idToken : payload.id_token,
        refreshToken: login ? payload.refreshToken : payload.refresh_token,
        expiresIn: Number(login ? payload.expiresIn : payload.expires_in),
      };
      if (!session.uid || !session.idToken || !session.refreshToken || !(session.expiresIn > 0)) return reply({}, 502);
      return reply(session, 200);
    } catch {
      return reply({ error: "unavailable" }, 502);
    }
  },
};
