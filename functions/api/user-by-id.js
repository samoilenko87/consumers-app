import { getDb, json, noStore } from "../../lib/db.js";
import { requireKey } from "../../lib/auth.js";
import { ValidationError, readJson } from "../../lib/validate.js";
import { RULES, ageFrom } from "../../lib/consumer.js";

// The shape the consumers list uses, returned after an edit so the page can refresh a row.
const LIST_COLUMNS = "user_id, first_name, last_name, email, country, city, subscription";

function idFrom(params) {
  const id = Number(params?.id);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// GET /api/users/:id
// Needs the admin key: it returns the full record (phone, notes, balance...),
// which the public list deliberately does not expose.
export async function onRequestGet({ request, env, params }) {
  const denied = await requireKey(request, env);
  if (denied) return denied;

  const id = idFrom(params);
  if (id === null) return json({ error: "Consumer not found" }, 404);

  try {
    const result = await getDb(env).execute({
      sql: "SELECT * FROM users WHERE user_id = ?",
      args: [id],
    });
    if (result.rows.length === 0) return json({ error: "Consumer not found" }, 404);
    return json(result.rows[0], 200, noStore);
  } catch (err) {
    console.error(err);
    return json({ error: "Internal server error" }, 500);
  }
}

// PATCH /api/users/:id
// Updates only the fields present in the body. null (or "") clears an optional
// field. Fields the system manages (id, registration date, last login, login
// count, referral code) are rejected rather than silently ignored.
export async function onRequestPatch({ request, env, params }) {
  const denied = await requireKey(request, env);
  if (denied) return denied;

  const id = idFrom(params);
  if (id === null) return json({ error: "Consumer not found" }, 404);

  try {
    const body = await readJson(request);
    const keys = Object.keys(body);
    if (keys.length === 0) throw new ValidationError("No fields to update");

    // Validate everything first; nothing is written unless every field is valid.
    const sets = [];
    const args = [];
    for (const key of keys) {
      if (!Object.hasOwn(RULES, key)) {
        throw new ValidationError(`${key.slice(0, 40)} is unknown or cannot be changed`);
      }
      const value = RULES[key](body);
      sets.push(`${key} = ?`); // key is one of our own rule names, never raw input
      args.push(value);
      if (key === "date_of_birth") {
        sets.push("age = ?");
        args.push(ageFrom(value));
      }
    }

    const result = await getDb(env).execute({
      sql: `UPDATE users SET ${sets.join(", ")} WHERE user_id = ? RETURNING ${LIST_COLUMNS}`,
      args: [...args, id],
    });
    if (result.rows.length === 0) return json({ error: "Consumer not found" }, 404);
    return json(result.rows[0], 200, noStore);
  } catch (err) {
    if (err instanceof ValidationError) return json({ error: err.message }, 400);
    if (String(err?.message || err).includes("UNIQUE")) {
      return json({ error: "A consumer with this email already exists" }, 409);
    }
    console.error(err);
    return json({ error: "Internal server error" }, 500);
  }
}
