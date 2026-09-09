import type { RequestHandler } from "express";
import { parseRequest } from "../lib/validation.js";
import { requestOtpSchema, verifyOtpSchema, refreshSchema } from "../schemas/auth.schema.js";
import * as auth from "../services/auth.service.js";

const noCache: RequestHandler = (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); };
const OBJ = { objectErrorMessage: "A JSON object is required" };

/** POST /auth/request-otp — send OTP email */
export const requestOtp: RequestHandler = async (req, res) => {
  res.set("Cache-Control", "no-store");
  const input = parseRequest(req, "body", requestOtpSchema, OBJ);
  const result = await auth.requestOtp(input);
  res.json(result);
};

/** POST /auth/verify-otp — verify OTP, create/login user, return tokens */
export const verifyOtp: RequestHandler = async (req, res) => {
  res.set("Cache-Control", "no-store");
  const input = parseRequest(req, "body", verifyOtpSchema, OBJ);
  const result = await auth.verifyOtpAndLogin(input);
  res.json(result);
};

/** POST /auth/refresh — rotate refresh token, return new access token */
export const refreshToken: RequestHandler = async (req, res) => {
  res.set("Cache-Control", "no-store");
  const { refresh_token } = parseRequest(req, "body", refreshSchema, OBJ);
  const result = await auth.refresh(refresh_token);
  res.json(result);
};

/** POST /auth/logout — revoke all refresh tokens for the current user */
export const logout: RequestHandler = async (_req, res) => {
  res.set("Cache-Control", "no-store");
  await auth.logout(res.locals.auth.userId);
  res.status(204).end();
};

/** GET /auth/me — return current user */
export const me: RequestHandler = async (_req, res) => {
  res.json(await auth.me(res.locals.auth.userId));
};
