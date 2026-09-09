import { parseInput } from "../lib/validation.js";
import { loginSchema, registrationSchema } from "../schemas/auth.schema.js";

export type { LoginInput, RegisterInput } from "../schemas/auth.schema.js";

// Shared with the local seed command; all validation rules live in the schemas.
const options = { source: "body" as const, objectErrorMessage: "A JSON object is required" };
export const parseRegistration = (body: unknown) => parseInput(registrationSchema, body, options);
export const parseLogin = (body: unknown) => parseInput(loginSchema, body, options);
