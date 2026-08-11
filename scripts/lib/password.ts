/**
 * scripts/lib/password.ts
 *
 * Password generation + hashing shared by create-admin.ts and
 * reset-admin-password.ts.
 *
 * TEMPORARY: Node built-in scrypt, zero extra dependencies (fits offline
 * deployment). The app's login flow must use this same scheme to verify
 * these hashes.
 */

import {
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

const PASSWORD_CHARSET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";

export function generatePassword(length = 16): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += PASSWORD_CHARSET[randomInt(PASSWORD_CHARSET.length)];
  }
  return out;
}

export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/** Constant-time compare of two strings of possibly-different length. */
export function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  // Compare against fixed-length padded buffers either way so timing
  // doesn't leak the correct password's length.
  const paddedA = Buffer.alloc(64);
  const paddedB = Buffer.alloc(64);
  aBuf.copy(paddedA);
  bBuf.copy(paddedB);
  return aBuf.length === bBuf.length && timingSafeEqual(paddedA, paddedB);
}
