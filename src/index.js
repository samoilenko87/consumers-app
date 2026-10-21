import * as users from "../functions/api/users.js";
import * as orders from "../functions/api/orders.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/users" && request.method === "GET") {
      return users.onRequestGet({ request, env });
    }
    if (url.pathname === "/api/orders" && request.method === "GET") {
      return orders.onRequestGet({ request, env });
    }
    if (url.pathname.startsWith("/api/")) {
      return new Response("Not found", { status: 404 });
    }
	    if (url.pathname === "/api/debug") {
      let dbError = null;
      try {
        const { getDb } = await import("../lib/db.js");
        await getDb(env).execute("SELECT 1");
      } catch (e) {
        dbError = String(e.message || e);
      }
      return new Response(
        JSON.stringify({
          hasUrl: Boolean(env.TURSO_DATABASE_URL),
          hasToken: Boolean(env.TURSO_AUTH_TOKEN),
          urlStartsWith: (env.TURSO_DATABASE_URL || "").slice(0, 8),
          dbError,
        }),
        { headers: { "content-type": "application/json" } }
      );
    }

    // Everything else is the static page
    return env.ASSETS.fetch(request);
  },
};