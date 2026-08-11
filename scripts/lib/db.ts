/**
 * scripts/lib/db.ts
 *
 * DB-password verification gate + connection helper shared by
 * create-admin.ts and reset-admin-password.ts.
 *
 * The verification gate compares a typed password against DB_PASSWORD
 * from .env; it does NOT establish the DB connection — that always uses
 * .env directly. SSH/physical server access is the real security
 * boundary for these scripts.
 */

import * as p from "@clack/prompts";
import color from "picocolors";
import mysql from "mysql2/promise";
import { requireEnv } from "./env";
import { bailIfCancelled } from "./cli";
import { safeEqual } from "./password";

export interface VerifyMessages {
  /** Shown on Ctrl+C / Esc during the password prompt. */
  cancel: string;
  /** Appended after "Too many failed attempts." on the 3rd wrong try. */
  tooManyAttempts: string;
}

/** Prompts for the DB password up to 3 times, comparing against DB_PASSWORD. */
export async function verifyDbPassword(
  env: Record<string, string>,
  messages: VerifyMessages,
): Promise<string> {
  const dbPasswordGate = requireEnv(env, "DB_PASSWORD");

  for (let attempt = 1; attempt <= 3; attempt++) {
    const label = "Enter database password";
    const typed = bailIfCancelled(
      await p.password({
        message:
          attempt === 1
            ? label
            : `${label} ${color.dim(`(attempt ${attempt}/3)`)}`,
      }),
      messages.cancel,
    );

    if (safeEqual(typed, dbPasswordGate)) {
      p.log.success("Database password verified.");
      return dbPasswordGate;
    }

    if (attempt < 3) {
      p.log.error("Incorrect password.");
    }
  }

  p.cancel(`Too many failed attempts. ${messages.tooManyAttempts}`);
  process.exit(1);
}

/** Opens a standalone single-use connection (not the app's pool). */
export async function connectToDatabase(
  env: Record<string, string>,
  dbPasswordGate: string,
): Promise<mysql.Connection> {
  const connectSpinner = p.spinner();
  connectSpinner.start("Connecting to database");
  try {
    const connection = await mysql.createConnection({
      host: requireEnv(env, "DB_HOST"),
      port: Number(requireEnv(env, "DB_PORT")),
      user: requireEnv(env, "DB_USER"),
      password: dbPasswordGate,
      database: requireEnv(env, "DB_NAME"),
    });
    connectSpinner.stop("Connected to database.");
    return connection;
  } catch (err) {
    connectSpinner.stop("Connection failed.");
    p.log.error(
      "Could not connect to the database. Check DB_HOST/DB_PORT/DB_USER/DB_NAME and that MySQL is running.",
    );
    p.cancel(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
