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

    // Everything else is the static page
    return env.ASSETS.fetch(request);
  },
};