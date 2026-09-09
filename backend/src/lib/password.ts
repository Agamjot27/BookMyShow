import bcrypt from "bcrypt";

// Async bcrypt with per-password salts. Inputs are capped at bcrypt's 72-byte limit.
const COST = 12;
export const hashPassword = (password: string) => bcrypt.hash(password, COST);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);
