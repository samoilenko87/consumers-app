import { getDb, json } from "../../lib/db.js";

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