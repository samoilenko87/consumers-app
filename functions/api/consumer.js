import { ValidationError, str, isoDate, ageFrom, money } from "./validate.js";

export const GENDERS = ["Male", "Female", "Other"];

// One rule per editable column. A rule reads its own key from the request body
// and returns the cleaned value to store (null clears an optional column).
// Creating (POST) and editing (PATCH) share these, so both enforce the same limits.
export const RULES = {
  first_name: (b) => str(b, "first_name", { required: true }),
  last_name: (b) => str(b, "last_name", { required: true }),

  email(b) {
    const email = str(b, "email", { required: true, max: 254 }).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidationError("email is not valid");
    }
    return email;
  },

  date_of_birth(b) {
    const dob = isoDate(b, "date_of_birth");
    const age = ageFrom(dob);
    // isoDate lets "tomorrow" through (for time zones ahead of UTC), which would give age -1.
    if (age < 0) throw new ValidationError("date_of_birth cannot be in the future");
    if (age > 120) throw new ValidationError("date_of_birth is not realistic");
    return dob;
  },

  country: (b) => str(b, "country", { required: true }),
  city: (b) => str(b, "city", { required: true }),

  gender(b) {
    const gender = str(b, "gender", { max: 20 });
    if (gender && !GENDERS.includes(gender)) {
      throw new ValidationError(`gender must be one of: ${GENDERS.join(", ")}`);
    }
    return gender;
  },

  phone(b) {
    const phone = str(b, "phone", { max: 25 });
    if (phone && !/^\+?[0-9 ()-]{5,25}$/.test(phone)) {
      throw new ValidationError("phone is not valid");
    }
    return phone;
  },

  subscription: (b) => str(b, "subscription", { max: 30 }),
  notes: (b) => str(b, "notes", { max: 500 }),

  account_balance: (b) =>
    money(b.account_balance, "account_balance", { min: 0, max: 1000000000 }),

  // Stored as 0/1. Only editing uses it (new consumers always start active).
  is_active(b) {
    const v = b.is_active;
    if (v === true || v === 1) return 1;
    if (v === false || v === 0) return 0;
    throw new ValidationError("is_active must be true or false");
  },
};

// Re-exported so callers need a single import for everything consumer-related.
export { ageFrom };
