import { getDb, json } from "../../lib/db.js";

export async function onRequestGet({ request, env }) {
  try {
    const userId = Number(new URL(request.url).searchParams.get("user_id"));
    if (!Number.isInteger(userId) || userId <= 0) {
      return json({ error: "user_id must be a positive integer" }, 400);
    }
    const result = await getDb(env).execute({
      sql: `SELECT order_id, order_date, amount, status, product_category
            FROM orders WHERE user_id = ? ORDER BY order_date DESC`,
      args: [userId],
    });
    return json(result.rows);
  } catch (err) {
    console.error(err);
    return json({ error: "Internal server error" }, 500);
  }
}