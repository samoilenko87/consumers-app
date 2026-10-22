import { getDb, json } from "../../lib/db.js";
import { requireKey } from "../../lib/auth.js";
import { ValidationError, readJson, str, isoDate, money } from "../../lib/validate.js";

const STATUSES = ["Cancelled", "Completed", "Pending", "Refunded"];
const CATEGORIES = ["Books", "Clothing", "Electronics", "Home", "Sports"];

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

export async function onRequestPost({ request, env }) {
  const denied = await requireKey(request, env);
  if (denied) return denied;

  try {
    const body = await readJson(request);

    const userId = body.user_id;
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new ValidationError("user_id must be a positive integer");
    }
    const order_date = isoDate(body, "order_date");

    const status = str(body, "status", { required: true, max: 20 });
    if (!STATUSES.includes(status)) {
      throw new ValidationError(`status must be one of: ${STATUSES.join(", ")}`);
    }
    const category = str(body, "product_category", { required: true, max: 30 });
    if (!CATEGORIES.includes(category)) {
      throw new ValidationError(
        `product_category must be one of: ${CATEGORIES.join(", ")}`
      );
    }
    const amount = money(body.amount, "amount", { min: 0.01, max: 1000000 });

    // Insert only if the consumer exists, in a single atomic statement.
    const result = await getDb(env).execute({
      sql: `INSERT INTO orders (user_id, order_date, amount, status, product_category)
            SELECT ?, ?, ?, ?, ?
            WHERE EXISTS (SELECT 1 FROM users WHERE user_id = ?)`,
      args: [userId, order_date, amount, status, category, userId],
    });
    if (result.rowsAffected === 0) {
      return json({ error: "Consumer not found" }, 404);
    }

    return json({ order_id: Number(result.lastInsertRowid) }, 201);
  } catch (err) {
    if (err instanceof ValidationError) return json({ error: err.message }, 400);
    console.error(err);
    return json({ error: "Internal server error" }, 500);
  }
}