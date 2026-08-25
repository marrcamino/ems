/**
 * scripts/create-admin.ts
 *
 * CLI-only bootstrap script for the very first Super Admin user. Run via:
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
  findSuperAdminRolePk,
  generatePassword,
  getActiveSuperAdmins,
  hashPassword,
  loadEnv,
  verifyDbPassword,
} from "./lib";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CANCEL_MESSAGE =
  "Super Admin bootstrap cancelled. No admin user was created.";
const TOO_MANY_ATTEMPTS_MESSAGE =
  "Super Admin bootstrap stopped — no admin user was created.";

async function main() {
  console.clear();
  console.log("\n");
  p.intro(color.bgCyan(color.black(" EMS Super Admin Bootstrap ")));

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

    const adminTemplate = ROLE_TEMPLATES.find(
      (t) => t.roleName === "Super Admin",
    );
    if (!adminTemplate) {
      seedSpinner.stop("Seeding failed.");
      throw new Error('"Super Admin" template not found in ROLE_TEMPLATES.');
    }

    // Seed from PERMISSIONS (every key defined in code), not just the Super Admin
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

    // ── Step 2: does any active user already hold the critical perm? ──
    const checkSpinner = p.spinner();
    checkSpinner.start("Checking for an existing super-admin");

    const existingHolders = await getActiveSuperAdmins(connection);

    if (existingHolders.length > 0) {
      checkSpinner.stop("An active super-admin already exists.");
      p.cancel(
        "An active user already holds admin:manage_roles.\n" +
          "This script only bootstraps the first Super Admin — use the app's admin UI to manage users from here on.",
      );
      process.exit(0);
    }
    checkSpinner.stop("No existing super-admin found.");

    // ── Step 3: ensure the super-admin role exists (create from template) ──
    // Looked up by the role holding admin:manage_roles, not by role name —
    // holding that key is what makes a role the super-admin role, and exactly
    // one role in the system may ever hold it.
    const roleSpinner = p.spinner();
    roleSpinner.start("Setting up the Super Admin role");

    const existingSuperAdminRolePk = await findSuperAdminRolePk(connection);

    let adminRolePk: number;

    if (existingSuperAdminRolePk !== null) {
      adminRolePk = existingSuperAdminRolePk;
      roleSpinner.stop("Super Admin role already exists — reusing it.");
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
        roleSpinner.stop("Super Admin role created from template.");
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
          message: "Username for the new Super Admin",
          validate: (value) => {
            if (!value || !value.trim()) return "Username cannot be empty.";
          },
        }),
        CANCEL_MESSAGE,
      ).trim();

      generatedPassword = generatePassword();
      passwordHash = hashPassword(generatedPassword);

      const createSpinner = p.spinner();
      createSpinner.start("Creating the Super Admin user");

      // Two rows now: the person, then the login pointing at them. Wrapped in
      // a transaction so a taken username does not leave an orphan employee
      // behind on the retry.
      await connection.beginTransaction();
      try {
        // Placeholder details. The position and tenure are required columns,
        // so the row cannot be written without them, but this script has no
        // way of knowing the real ones — whoever runs it corrects the record
        // on the Employees page afterwards.
        const [employeeInsert] = await connection.query<mysql.ResultSetHeader>(
          `
          INSERT INTO employee
            (first_name, last_name, position_title, tenure_status, employment_status)
          VALUES (?, ?, ?, ?, 'active')
          `,
          ["Admin", "User", "System Administrator", "permanent"],
        );

        await connection.query(
          `
          INSERT INTO user
            (employee_fk, username, password_hash, role_fk, account_status, must_change_password)
          VALUES (?, ?, ?, ?, 'active', 1)
          `,
          [employeeInsert.insertId, username, passwordHash, adminRolePk],
        );

        await connection.commit();
        createSpinner.stop("Super Admin user created.");
        break;
      } catch (err: any) {
        await connection.rollback();
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
      "Super Admin credentials",
    );
    p.log.warn("The user must change this password on first login.");
    p.log.warn(
      'This account was filed under the placeholder name "Admin User", position "System Administrator", tenure "Permanent". Correct it on the Employees page after signing in.',
    );
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
