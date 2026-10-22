export class ValidationError extends Error {}

export const today = () => new Date().toISOString().slice(0, 10);

export async function readJson(request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 10000) throw new ValidationError("Request body is too large");
  let body;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Body must be valid JSON");
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Body must be a JSON object");
  }
  return body;
}

// Trimmed text field. Returns null for empty optional fields.
export function str(body, key, { required = false, max = 100 } = {}) {
  const raw = body[key];
  if (raw === undefined || raw === null || raw === "") {
    if (required) throw new ValidationError(`${key} is required`);
    return null;
  }
  if (typeof raw !== "string") throw new ValidationError(`${key} must be text`);
  const value = raw.trim();
  if (!value) {
    if (required) throw new ValidationError(`${key} is required`);
    return null;
  }
  if (value.length > max) {
    throw new ValidationError(`${key} is too long (max ${max} characters)`);
  }
  return value;
}

// YYYY-MM-DD. Dates up to one day ahead of UTC are accepted so that
// users east of UTC can enter "today" late in the evening.
export function isoDate(body, key, { required = true } = {}) {
  const value = str(body, key, { required, max: 10 });
  if (value === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`${key} must be a date in YYYY-MM-DD format`);
  }
  const parsed = new Date(value + "T00:00:00Z");
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ValidationError(`${key} is not a valid date`);
  }
  const limit = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (value > limit) throw new ValidationError(`${key} cannot be in the future`);
  return value;
}

export function ageFrom(dob) {
  const [y, m, d] = dob.split("-").map(Number);
  const now = new Date();
  let age = now.getUTCFullYear() - y;
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  if (month < m || (month === m && day < d)) age--;
  return age;
}

export function money(value, key, { min, max }) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError(`${key} must be a number`);
  }
  if (value < min || value > max) {
    throw new ValidationError(`${key} must be between ${min} and ${max}`);
  }
  return Math.round(value * 100) / 100;
}