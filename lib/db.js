import { createClient } from "@libsql/client/web";

export function getDb(env) {
  return createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

// For responses that carry private data: keep them out of any cache.
export const noStore = { "cache-control": "no-store" };