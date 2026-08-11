/**
 * scripts/lib/env.ts
 *
 * Tiny hand-rolled .env parser — no dotenv dependency, keeps the offline
 * CLI scripts (create-admin.ts, reset-admin-password.ts) dependency-free.
 */

import * as p from "@clack/prompts";
import { existsSync, readFileSync } from "node:fs";

export function loadEnv(envPath: string): Record<string, string> {
  if (!existsSync(envPath)) {
    p.log.error(`.env not found at ${envPath}`);
    process.exit(1);
  }

  const env: Record<string, string> = {};
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

export function requireEnv(env: Record<string, string>, key: string): string {
  const value = env[key];
  if (!value) {
    p.log.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
  return value;
}
