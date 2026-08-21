/**
 * scripts/create-admin.ts
 *
 * CLI-only bootstrap script for the very first Admin user. Run via:
 *   npm run create-admin   (→ tsx scripts/create-admin.ts)
 *
 * Runs on the production server post-build, reading source directly via
 * tsx (not through build output). Uses relative imports only — no $lib
 * alias, since tsx runs outside SvelteKit/Vite.
 *
 * SSH/physical server access is the security boundary for this script
 * The DB-password prompt below is a secondary verification gate only —
 * the actual DB connection always uses .env directly, regardless of
 * what's typed at the prompt.
 */

import * as p from "@clack/prompts";
import mysql from "mysql2/promise";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import color from "picocolors";
import { PERMISSIONS } from "../src/lib/server/permissions";
import { ROLE_TEMPLATES } from "../src/lib/server/role-templates";
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

const CANCEL_MESSAGE = "Admin bootstrap cancelled. No admin user was created.";
const TOO_MANY_ATTEMPTS_MESSAGE =
  "Admin bootstrap stopped — no admin user was created.";

async function main() {
  console.clear();
  console.log("\n");
  p.intro(color.bgCyan(color.black(" EMS Admin Bootstrap ")));

  const env = loadEnv(resolve(__dirname, "../.env"));

  const dbPasswordGate = await verifyDbPassword(env, {
    cancel: CANCEL_MESSAGE,
    tooManyAttempts: TOO_MANY_ATTEMPTS_MESSAGE,
  });

  const connection = await connectToDatabase(env, dbPasswordGate);

  try {
    // ── Step 1.5: ensure every defined permission exists in the DB ──
    const seedSpinner = p.spinner();
    seedSpinner.start("Seeding permissions");

    const adminTemplate = ROLE_TEMPLATES.find((t) => t.roleName === "Admin");
    if (!adminTemplate) {
      seedSpinner.stop("Seeding failed.");
      throw new Error('"Admin" template not found in ROLE_TEMPLATES.');
    }

    // Seed from PERMISSIONS (every key defined in code), not just the Admin
    // template's list, so bootstrap and scripts/sync-permissions.ts agree on
    // what the permission table should contain.
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
    seedSpinner.stop(`${PERMISSIONS.length} permission(s) ready.`);

    // ── Step 2: does any active user already hold both critical perms? ──
    const checkSpinner = p.spinner();
    checkSpinner.start("Checking for an existing super-admin");

    const existingHolders = await getActiveSuperAdmins(connection);

    if (existingHolders.length > 0) {
      checkSpinner.stop("An active super-admin already exists.");
      p.cancel(
        "An active user already holds both admin:manage_users and admin:manage_roles.\n" +
          "This script only bootstraps the first Admin — use the app's admin UI to manage users from here on.",
      );
      process.exit(0);
    }
    checkSpinner.stop("No existing super-admin found.");

    // ── Step 3: ensure the "Admin" role exists (create from template if not) ──
    const roleSpinner = p.spinner();
    roleSpinner.start("Setting up the Admin role");

    const [existingAdminRoleRows] = await connection.query<
      mysql.RowDataPacket[]
    >(`SELECT role_pk FROM role WHERE role_name = ? LIMIT 1`, ["Admin"]);

    let adminRolePk: number;

    if (existingAdminRoleRows.length > 0) {
      adminRolePk = existingAdminRoleRows[0].role_pk;
      roleSpinner.stop("Admin role already exists — reusing it.");
    } else {
      const [permRows] = await connection.query<mysql.RowDataPacket[]>(
        `SELECT permission_pk, \`key\` FROM permission WHERE \`key\` IN (?)`,
        [adminTemplate.permissions],
      );

      if (permRows.length !== adminTemplate.permissions.length) {
        const found = new Set(permRows.map((r) => r.key));
        const missing = adminTemplate.permissions.filter((k) => !found.has(k));
        roleSpinner.stop("Setup failed.");
        throw new Error(
          `Missing permission row(s) in the \`permission\` table: ${missing.join(", ")}.`,
        );
      }

      await connection.beginTransaction();
      try {
        const [roleInsert] = await connection.query<mysql.ResultSetHeader>(
          `INSERT INTO role (role_name, description, status) VALUES (?, ?, 'active')`,
          [adminTemplate.roleName, adminTemplate.description],
        );
        adminRolePk = roleInsert.insertId;

        for (const row of permRows) {
          await connection.query(
            `INSERT INTO role_permission (role_fk, permission_fk) VALUES (?, ?)`,
            [adminRolePk, row.permission_pk],
          );
        }

        await connection.commit();
        roleSpinner.stop("Admin role created from template.");
      } catch (err) {
        await connection.rollback();
        roleSpinner.stop("Setup failed.");
        throw err;
      }
    }

    // ── Step 4 & 5: username + password, retrying on duplicates ──
    let username = "";
    let generatedPassword = "";
    let passwordHash = "";

    while (true) {
      username = bailIfCancelled(
        await p.text({
          message: "Username for the new admin",
          validate: (value) => {
            if (!value || !value.trim()) return "Username cannot be empty.";
          },
        }),
        CANCEL_MESSAGE,
      ).trim();

      generatedPassword = generatePassword();
      passwordHash = hashPassword(generatedPassword);

      const createSpinner = p.spinner();
      createSpinner.start("Creating admin user");
      try {
        await connection.query(
          `
          INSERT INTO user
            (username, password_hash, first_name, last_name, role_fk, status, must_change_password)
          VALUES (?, ?, ?, ?, ?, 'active', 1)
          `,
          [username, passwordHash, "Admin", "User", adminRolePk],
        );
        createSpinner.stop("Admin user created.");
        break;
      } catch (err: any) {
        if (err?.code === "ER_DUP_ENTRY") {
          createSpinner.stop(`Username "${username}" is already taken.`);
          continue;
        }
        createSpinner.stop("User creation failed.");
        throw err;
      }
    }

    // ── Step 6: print credentials ──
    p.note(
      `${color.dim("Username")}  ${username}\n${color.dim("Password")}  ${generatedPassword}`,
      "Admin credentials",
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
