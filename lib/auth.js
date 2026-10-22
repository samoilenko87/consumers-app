import { json } from "./db.js";

async function digest(text) {
  const data = new TextEncoder().encode(text);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", data));
}

// Returns a Response when the request must be rejected, or null when allowed.
export async function requireKey(request, env) {
  if (!env.ADMIN_KEY) {
    // Fail closed: without a configured key nobody can write.
    return json({ error: "Writing is not configured" }, 503);
  }
  const provided = request.headers.get("x-admin-key") || "";
  const [a, b] = await Promise.all([digest(provided), digest(env.ADMIN_KEY)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  if (diff !== 0) return json({ error: "Invalid admin key" }, 401);
  return null;
}