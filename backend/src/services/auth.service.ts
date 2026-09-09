import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "../lib/api-error.js";
import { sendOtpEmail } from "../lib/mailer.js";
import { createOtp, verifyOtp } from "../lib/otp.js";
import {
  findPublicUserById,
  issueRefreshToken,
  findRefreshToken,
  revokeRefreshTokens,
  upsertUserByEmail,
  type PublicUser,
} from "../../db/repositories/users.repository.js";
import type { RequestOtpInput, VerifyOtpInput } from "../schemas/auth.schema.js";

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

function signAccessToken(user: PublicUser): string {
  return jwt.sign({ role: user.role }, env.jwtSecret, {
    algorithm:  "HS256",
    subject:    user.user_id,
    issuer:     env.jwtIssuer,
    audience:   env.jwtAudience,
    expiresIn:  env.jwtExpiresIn,
  });
}

function session(user: PublicUser, refreshToken: string) {
  return {
    access_token:  signAccessToken(user),
    refresh_token: refreshToken,
    expires_in:    env.jwtExpiresIn,
    user,
  };
}

// ---------------------------------------------------------------------------
// Step 1 — request OTP
// ---------------------------------------------------------------------------

export async function requestOtp(input: RequestOtpInput): Promise<{ message: string }> {
  const otp = await createOtp(input.email);
  await sendOtpEmail(input.email, otp);
  // Always return the same message — don't reveal whether the email is registered.
  return { message: "OTP sent. Check your inbox." };
}

// ---------------------------------------------------------------------------
// Step 2 — verify OTP → issue tokens
// ---------------------------------------------------------------------------

export async function verifyOtpAndLogin(input: VerifyOtpInput) {
  const result = await verifyOtp(input.email, input.otp);

  if (!result.ok) {
    const messages = {
      expired: "OTP has expired. Request a new one.",
      invalid: "Incorrect OTP. Check your email and try again.",
      locked:  "Too many incorrect attempts. Request a new OTP.",
    };
    throw new ApiError(401, "OTP_INVALID", messages[result.reason]);
  }

  const { user, isNew } = await upsertUserByEmail(input.email, input.name);

  // New user must supply a name — if they didn't, their display name defaults
  // to the email prefix (handled in upsertUserByEmail). That's fine for now.

  const refreshToken = await issueRefreshToken(user.user_id);
  return { ...session(user, refreshToken), is_new_user: isNew };
}

// ---------------------------------------------------------------------------
// Refresh access token
// ---------------------------------------------------------------------------

export async function refresh(token: string) {
  const record = await findRefreshToken(token);
  if (!record) throw new ApiError(401, "REFRESH_TOKEN_INVALID", "Invalid or expired refresh token");

  const user = await findPublicUserById(record.user_id);
  if (!user) throw new ApiError(401, "UNAUTHORIZED", "This account is no longer available");

  // Rotate: issue new refresh token, revoke old one (already replaced by issueRefreshToken)
  const newRefreshToken = await issueRefreshToken(user.user_id);
  return session(user, newRefreshToken);
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

export async function logout(userId: string): Promise<void> {
  await revokeRefreshTokens(userId);
}

// ---------------------------------------------------------------------------
// Me
// ---------------------------------------------------------------------------

export async function me(userId: string): Promise<PublicUser> {
  const user = await findPublicUserById(userId);
  if (!user) throw new ApiError(401, "UNAUTHORIZED", "This account is no longer available");
  return user;
}
