import { getDb, json } from "../../lib/db.js";
import { requireKey } from "../../lib/auth.js";
import { ValidationError, readJson, today } from "../../lib/validate.js";
import { RULES, ageFrom } from "../../lib/consumer.js";

const FILTERS = ["first_name", "last_name", "email", "country"];

export async function onRequestGet({ request, env }) {
  try {
    const params = new URL(request.url).searchParams;
    const limit = Math.min(Math.max(Number(params.get("limit")) || 25, 1), 100);
    const offset = Math.max(Number(params.get("offset")) || 0, 0);

    const where = [];
    const args = [];
    for (const col of FILTERS) {
      const value = (params.get(col) || "").trim();
      if (value) {
        where.push(`${col} LIKE ? ESCAPE '\\'`);
        args.push(`%${value.replace(/[\\%_]/g, "\\$&")}%`);
      }
    }
    const clause = where.length ? "WHERE " + where.join(" AND ") : "";

    const db = getDb(env);
    const [total, rows] = await Promise.all([
      db.execute({ sql: `SELECT COUNT(*) AS n FROM users ${clause}`, args }),
      db.execute({
        sql: `SELECT user_id, first_name, last_name, email, country, city, subscription
              FROM users ${clause}
              ORDER BY user_id LIMIT ? OFFSET ?`,
        args: [...args, limit, offset],
      }),
    ]);

    return json({ total: Number(total.rows[0].n), rows: rows.rows });
  } catch (err) {
    console.error(err);
    return json({ error: "Internal server error" }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const denied = await requireKey(request, env);
  if (denied) return denied;

  try {
    const body = await readJson(request);

    // Same order as before, so the first problem reported is unchanged.
    const first_name = RULES.first_name(body);
    const last_name = RULES.last_name(body);
    const email = RULES.email(body);
    const date_of_birth = RULES.date_of_birth(body);
    const age = ageFrom(date_of_birth);
    const country = RULES.country(body);
    const city = RULES.city(body);
    const gender = RULES.gender(body);
    const phone = RULES.phone(body);
    const subscription = RULES.subscription(body);
    const notes = RULES.notes(body);

    const account_balance =
      body.account_balance === undefined || body.account_balance === null
        ? 0
        : RULES.account_balance(body);

    const referral_code =
      "REF" + (10000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 90000));

    const result = await getDb(env).execute({
      sql: `INSERT INTO users
              (first_name, last_name, email, date_of_birth, registration_date,
               last_login, age, is_active, account_balance, country, city,
               gender, phone, subscription, login_count, referral_code, notes)
            VALUES (?, ?, ?, ?, ?, NULL, ?, 1, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      args: [
        first_name, last_name, email, date_of_birth, today(),
        age, account_balance, country, city,
        gender, phone, subscription, referral_code, notes,
      ],
    });

    return json({ user_id: Number(result.lastInsertRowid), email }, 201);
  } catch (err) {
    if (err instanceof ValidationError) return json({ error: err.message }, 400);
    if (String(err?.message || err).includes("UNIQUE")) {
      return json({ error: "A consumer with this email already exists" }, 409);
    }
    console.error(err);
    return json({ error: "Internal server error" }, 500);
  }
}