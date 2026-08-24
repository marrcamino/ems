// $lib/server/auth/password.ts
import {
  randomBytes,
  randomInt,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(":");
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  const stored = Buffer.from(hashHex, "hex");

  return derived.length === stored.length && timingSafeEqual(derived, stored);
}

// src/lib/validation/password.ts
export function getPasswordStrengthError(pw: string): string {
  if (!pw) return "Password is required";
  if (pw.length < 8) return "Must be at least 8 characters";
  if (!/[a-z]/.test(pw)) return "Include at least one lowercase letter";
  if (!/[A-Z]/.test(pw)) return "Include at least one uppercase letter";
  if (!/[0-9]/.test(pw)) return "Include at least one number";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Include at least one special character";
  return "";
}

/**
 * A password to hand to someone who has just been given an account, or whose
 * password an admin has reset. Always paired with mustChangePassword, so it
 * only ever survives until that person's first sign-in.
 *
 * Built one character from each required category first, then padded out at
 * random, so the result always satisfies getPasswordStrengthError() — a
 * generated password that the change-password page would then reject is a
 * dead end for whoever was handed it.
 */
const TEMPORARY_PASSWORD_LENGTH = 14;

export function generateTemporaryPassword(): string {
  const lower = "abcdefghijkmnopqrstuvwxyz"; // no l
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I, O
  const digits = "23456789"; // no 0, 1
  const symbols = "!@#$%*?";
  const all = lower + upper + digits + symbols;

  // Ambiguous characters are left out above because these are read off a
  // screen and typed in by hand, often from a note passed between desks.
  const picks = [
    pick(lower),
    pick(upper),
    pick(digits),
    pick(symbols),
    ...Array.from({ length: TEMPORARY_PASSWORD_LENGTH - 4 }, () => pick(all)),
  ];

  // Shuffle so the guaranteed characters aren't always in the same positions.
  for (let i = picks.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }

  return picks.join("");
}

function pick(charset: string): string {
  return charset[randomInt(charset.length)];
}
