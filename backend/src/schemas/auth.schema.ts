import { z } from "zod";

const emailMessage = "Enter a valid email address (maximum 254 characters)";
export const emailSchema = z.string({ error: emailMessage }).trim().toLowerCase().refine(
  value => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  { message: emailMessage },
);

const nameMessage = "Name must contain 1 to 100 characters";
const nameSchema = z.string({ error: nameMessage }).trim().refine(
  value => value.length > 0 && value.length <= 100,
  { message: nameMessage },
);

const otpMessage = "OTP must be exactly 6 digits";
const otpSchema = z.string({ error: otpMessage }).trim().regex(/^\d{6}$/, { message: otpMessage });

// Step 1 — user submits email to receive OTP
export const requestOtpSchema = z.strictObject({ email: emailSchema });

// Step 2 — user submits OTP + (optional) name for first-time registration
export const verifyOtpSchema = z.strictObject({
  email: emailSchema,
  otp:   otpSchema,
  name:  nameSchema.optional(), // required only when creating a new account
});

// Refresh access token using a long-lived refresh token
export const refreshSchema = z.strictObject({ refresh_token: z.string().min(1) });

export type RequestOtpInput = z.output<typeof requestOtpSchema>;
export type VerifyOtpInput  = z.output<typeof verifyOtpSchema>;
export type RefreshInput    = z.output<typeof refreshSchema>;

// ── Legacy schemas kept so existing seed + password utilities still compile ──
// These are no longer used by the auth routes.
const passwordMessage = "Password is required and must not exceed 72 UTF-8 bytes";
const password = z.custom<string>(
  value => typeof value === "string" && value.length > 0 && Buffer.byteLength(value, "utf8") <= 72,
  { message: passwordMessage },
);
export const loginSchema        = z.strictObject({ email: emailSchema, password });
export const registrationSchema = z.strictObject({ name: nameSchema,  email: emailSchema, password });
export type LoginInput    = z.output<typeof loginSchema>;
export type RegisterInput = z.output<typeof registrationSchema>;
