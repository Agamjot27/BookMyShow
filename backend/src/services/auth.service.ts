import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { createUser, findPublicUserById, findUserByEmail, type PublicUser } from "../../db/repositories/users.repository.js";
import { env } from "../config/env.js";
import { ApiError } from "../lib/api-error.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import type { LoginInput, RegisterInput } from "../middleware/auth-validation.js";

// Missing users still undergo a password comparison, avoiding a cheap timing shortcut.
let dummyHash: Promise<string> | undefined;
function session(user: PublicUser) {
  return {
    access_token: jwt.sign({ role: user.role }, env.jwtSecret, {
      algorithm: "HS256", subject: user.user_id, issuer: env.jwtIssuer,
      audience: env.jwtAudience, expiresIn: env.jwtExpiresIn,
    }),
    expires_in: env.jwtExpiresIn,
    user,
  };
}

export async function register(input: RegisterInput) {
  const passwordHash = await hashPassword(input.password);
  try {
    return session(await createUser(input.name, input.email, passwordHash));
  } catch (error) {
    const dbError = error as { code?: string; constraint?: string };
    if (dbError.code === "23505" && dbError.constraint === "users_email_lower_key") {
      throw new ApiError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists");
    }
    throw error;
  }
}

export async function login(input: LoginInput) {
  const user = await findUserByEmail(input.email);
  if (!user) dummyHash ??= hashPassword(randomBytes(24).toString("hex"));
  const matches = await verifyPassword(input.password, user?.password_hash ?? await dummyHash!);
  if (!user || !matches) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  }
  const { user_id, name, email, role } = user;
  return session({ user_id, name, email, role });
}

export async function me(userId: string) {
  const user = await findPublicUserById(userId);
  if (!user) throw new ApiError(401, "UNAUTHORIZED", "This account is no longer available");
  return user;
}
