/**
 * scripts/reset-admin-password.ts
 *
 * CLI-only recovery script for resetting the password of an existing
 * active super-admin (a user whose role holds both admin:manage_users
 * and admin:manage_roles). Run via:
 *   npm run reset-admin-password   (→ tsx scripts/reset-admin-password.ts)
 *
 * Runs on the production server, reading source directly via tsx (not
 * through build output). Uses relative imports only — no $lib alias,
 * since tsx runs outside SvelteKit/Vite.
 *
 * SSH/physical server access is the security boundary for this script.
 * The DB-password prompt below is a secondary verification gate only —
 * the actual DB connection always uses .env directly, regardless of
 * what's typed at the prompt.
 *
 * If no active super-admin exists yet, use create-admin.ts instead —
 * this script only resets an existing one.
 */

import * as p from "@clack/prompts";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import color from "picocolors";
import {
  bailIfCancelled,
  connectToDatabase,
  generatePassword,
  getActiveSuperAdmins,
  hashPassword,
  loadEnv,
  verifyDbPassword,
} from "./lib";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CANCEL_MESSAGE = "Password reset cancelled. No password was changed.";
const TOO_MANY_ATTEMPTS_MESSAGE =
  "Password reset stopped — no password was changed.";

async function main() {
  console.clear();
  console.log("\n");
  p.intro(color.bgCyan(color.black(" EMS Admin Password Reset ")));

  const env = loadEnv(resolve(__dirname, "../.env"));

  const dbPasswordGate = await verifyDbPassword(env, {
    cancel: CANCEL_MESSAGE,
    tooManyAttempts: TOO_MANY_ATTEMPTS_MESSAGE,
  });

  const connection = await connectToDatabase(env, dbPasswordGate);

  try {
    // ── Step 2: find active users holding both critical permissions ──
    const checkSpinner = p.spinner();
    checkSpinner.start("Looking for active super-admins");

    const holders = await getActiveSuperAdmins(connection);

    if (holders.length === 0) {
      checkSpinner.stop("No active super-admin found.");
      p.cancel(
        "No active user currently holds both admin:manage_users and admin:manage_roles.\n" +
          "Run `npm run create-admin` instead to bootstrap the first Admin.",
      );
      process.exit(0);
    }
    checkSpinner.stop(
      `Found ${holders.length} active super-admin${holders.length === 1 ? "" : "s"}.`,
    );

    // ── Step 3–5: select a user, confirm, loop back to selection on "No" ──
    let selectedUserPk: number | null = null;
    let selectedUsername = "";

    while (selectedUserPk === null) {
      const userPk = bailIfCancelled(
        await p.select({
          message: "Select a user to reset the password for",
          options: holders.map((h) => ({
            value: h.userPk,
            label: h.username,
          })),
        }),
        CANCEL_MESSAGE,
      );

      const candidate = holders.find((h) => h.userPk === userPk)!;

      const confirmed = bailIfCancelled(
        await p.confirm({
          message: `Reset password for ${candidate.username}?`,
        }),
        CANCEL_MESSAGE,
      );

      if (confirmed) {
        selectedUserPk = candidate.userPk;
        selectedUsername = candidate.username;
      }
      // else: loop back to the selection prompt (Ctrl+C cancels out entirely)
    }

    // ── Step 6: generate + hash the new password, update the user row ──
    const newPassword = generatePassword();
    const passwordHash = hashPassword(newPassword);

    const resetSpinner = p.spinner();
    resetSpinner.start(`Resetting password for ${selectedUsername}`);
    await connection.query(
      `
      UPDATE user
      SET password_hash = ?,
          must_change_password = 1,
          failed_login_attempts = 0,
          locked_until = NULL
      WHERE user_pk = ?
      `,
      [passwordHash, selectedUserPk],
    );
    resetSpinner.stop("Password reset.");

    // ── Step 7: print the new credentials ──
    p.note(
      `${color.dim("Username")}  ${selectedUsername}\n${color.dim("Password")}  ${newPassword}`,
      "New admin credentials",
    );
    p.log.warn("The user must change this password on first login.");
    p.outro(color.green("Done."));
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  p.log.error("Unexpected error:");
  console.error(err);
  process.exit(1);
});
