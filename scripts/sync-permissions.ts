/**
 * scripts/sync-permissions.ts
 *
 * Reconciles the `permission` table with PERMISSION_DEFS in
 * src/lib/server/permissions.ts. Run via:
 *   npm run sync-permissions   (→ tsx scripts/sync-permissions.ts)
 *
 * Run this after any change to PERMISSION_DEFS. Without it a newly defined
 * permission exists only in TypeScript — the roles UI would offer it, but the
 * `inArray(permission.key, ...)` lookup that saves a role silently drops any
 * key with no row here, so the grant would vanish without an error.
 *
 * Three things happen, in order:
 *   1. Upsert every key in PERMISSIONS.
 *   2. Report keys still in the DB but no longer defined in code. REPORT ONLY —
 *      deleting a permission row cascades into role_permission and would
 *      silently strip access from live roles. Removal stays a manual decision.
 *   3. Re-normalize every role to the implication closure of what it already
 *      holds, so existing roles pick up newly implied permissions.
 *
 * Same security posture as create-admin.ts: SSH/physical server access is the
 * real boundary; the DB-password prompt is a secondary verification gate only.
 */

import * as p from "@clack/prompts";
import mysql from "mysql2/promise";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import color from "picocolors";
import { expandPermissions, PERMISSIONS } from "../src/lib/server/permissions";
import {
  connectToDatabase,
  loadEnv,
  verifyDbPassword,
} from "./lib";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CANCEL_MESSAGE = "Permission sync cancelled. Nothing was changed.";
const TOO_MANY_ATTEMPTS_MESSAGE = "Permission sync stopped. Nothing was changed.";

async function main() {
  console.clear();
  console.log("\n");
  p.intro(color.bgCyan(color.black(" EMS Permission Sync ")));

  const env = loadEnv(resolve(__dirname, "../.env"));

  const dbPasswordGate = await verifyDbPassword(env, {
    cancel: CANCEL_MESSAGE,
    tooManyAttempts: TOO_MANY_ATTEMPTS_MESSAGE,
  });

  const connection = await connectToDatabase(env, dbPasswordGate);

  try {
    // ── Step 1: upsert every permission defined in code ──
    const upsertSpinner = p.spinner();
    upsertSpinner.start("Syncing permission definitions");

    const [beforeRows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT `key` FROM permission",
    );
    const before = new Set(beforeRows.map((r) => r.key as string));

    for (const permission of PERMISSIONS) {
      await connection.query(
        `
        INSERT INTO permission (\`key\`, module, description)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          module = VALUES(module),
          description = VALUES(description)
        `,
        [permission.key, permission.module, permission.description],
      );
    }

    const added = PERMISSIONS.filter((perm) => !before.has(perm.key));
    upsertSpinner.stop(
      `${PERMISSIONS.length} permission(s) synced, ${added.length} new.`,
    );

    if (added.length > 0) {
      p.note(added.map((perm) => perm.key).join("\n"), "Added");
    }

    // ── Step 2: report orphans, never delete them ──
    const defined = new Set<string>(PERMISSIONS.map((perm) => perm.key));
    const orphans = [...before].filter((key) => !defined.has(key));

    if (orphans.length > 0) {
      p.note(orphans.join("\n"), "In the database but no longer defined in code");
      p.log.warn(
        "These were NOT deleted. Removing a permission cascades into role_permission\n" +
          "and would strip access from any role holding it — remove them by hand once\n" +
          "you have confirmed no role still depends on them.",
      );
    }

    // ── Step 3: re-normalize existing roles to the implication closure ──
    const normalizeSpinner = p.spinner();
    normalizeSpinner.start("Re-normalizing roles");

    const [roleRows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT role_pk, role_name FROM role",
    );

    // key → permission_pk, for turning implied keys back into FK values
    const [permRows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT permission_pk, `key` FROM permission",
    );
    const pkByKey = new Map<string, number>(
      permRows.map((r) => [r.key as string, r.permission_pk as number]),
    );

    const changed: string[] = [];

    for (const roleRow of roleRows) {
      const rolePk = roleRow.role_pk as number;

      const [heldRows] = await connection.query<mysql.RowDataPacket[]>(
        `
        SELECT p.\`key\`
        FROM role_permission rp
        JOIN permission p ON p.permission_pk = rp.permission_fk
        WHERE rp.role_fk = ?
        `,
        [rolePk],
      );

      const held = new Set(heldRows.map((r) => r.key as string));
      if (held.size === 0) continue;

      const missing = [...expandPermissions(held)].filter(
        (key) => !held.has(key) && pkByKey.has(key),
      );
      if (missing.length === 0) continue;

      await connection.beginTransaction();
      try {
        for (const key of missing) {
          await connection.query(
            "INSERT INTO role_permission (role_fk, permission_fk) VALUES (?, ?)",
            [rolePk, pkByKey.get(key)],
          );
        }
        await connection.commit();
      } catch (err) {
        await connection.rollback();
        normalizeSpinner.stop("Re-normalizing failed.");
        throw err;
      }

      changed.push(`${roleRow.role_name}: +${missing.join(", +")}`);
    }

    normalizeSpinner.stop(
      changed.length > 0
        ? `${changed.length} role(s) gained implied permissions.`
        : "All roles already hold their implied permissions.",
    );

    if (changed.length > 0) {
      p.note(changed.join("\n"), "Roles updated");
    }

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
