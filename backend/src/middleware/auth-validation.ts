import { ApiError } from "../lib/api-error.js";

export type LoginInput = { email: string; password: string };
export type RegisterInput = LoginInput & { name: string };

function parse(body: unknown, registration: boolean): RegisterInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "VALIDATION_ERROR", "A JSON object is required");
  }
  const input = body as Record<string, unknown>;
  const allowed = registration ? ["name", "email", "password"] : ["email", "password"];
  const errors: Record<string, string> = {};
  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) errors[key] = "Unexpected field";
  }
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address (maximum 254 characters)";
  }
  if (!password || Buffer.byteLength(password, "utf8") > 72) {
    errors.password = "Password is required and must not exceed 72 UTF-8 bytes";
  } else if (registration && ([...password].length < 12 || !password.trim())) {
    errors.password = "Use a password with at least 12 characters";
  }
  if (registration && (!name || name.length > 100)) {
    errors.name = "Name must contain 1 to 100 characters";
  }
  if (Object.keys(errors).length) {
    throw new ApiError(400, "VALIDATION_ERROR", "Check the submitted fields", errors);
  }
  return { email, password, name };
}
export const parseRegistration = (body: unknown): RegisterInput => parse(body, true);
export const parseLogin = (body: unknown): LoginInput => {
  const { email, password } = parse(body, false);
  return { email, password };
};
