// $lib/server/auth/password.ts
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
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
