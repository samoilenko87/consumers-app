import * as users from "../functions/api/users.js";
import * as orders from "../functions/api/orders.js";

const routes = {
  "/api/users": users,
  "/api/orders": orders,
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const mod = routes[url.pathname];
    if (mod) {
      const handlers = { GET: mod.onRequestGet, POST: mod.onRequestPost };
      const handler = handlers[request.method];
      if (handler) return handler({ request, env });
      return new Response("Method not allowed", {
        status: 405,
        headers: { allow: "GET, POST" },
      });
    }

    if (url.pathname.startsWith("/api/")) {
      return new Response("Not found", { status: 404 });
    }

    // Everything else is the static page
    return env.ASSETS.fetch(request);
  },
};