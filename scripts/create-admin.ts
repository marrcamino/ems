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
// The seven ways somebody is hired, with the wording the Employees page uses
// for each. Read from that file rather than listed again here, so the choice
// offered on the server can never drift from the choice offered in the app.
import {
  TENURE_STATUS_LABELS,
  TENURE_STATUS_VALUES,
  type TenureStatus,
} from "../src/routes/admin/employees/labels";
import {
  bailIfCancelled,
  connectToDatabase,
  findSuperAdminRolePk,
  generatePassword,
  getActiveSuperAdmins,
  hashPassword,
  loadEnv,
  verifyDbPassword,
  wrap,
} from "./lib";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CANCEL_MESSAGE = "Cancelled. Your account was not created.";
const TOO_MANY_ATTEMPTS_MESSAGE = "Your account was not created.";

// The column widths in `src/lib/server/db/schema/employee.ts`. Checked here
// so an over-long answer is refused at the question rather than by MySQL
// after several more questions have already been answered.
const NAME_MAX_LENGTH = 100;
const SUFFIX_MAX_LENGTH = 20;

// The same floor the Employees page uses. A year below it is a typed year,
// not a birth year.
const EARLIEST_BIRTH_YEAR = 1900;

/** Today as a plain "YYYY-MM-DD" string, with no time and no timezone. */
function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Asks for something the employee record cannot be written without. */
async function askRequiredText(
  message: string,
  maxLength: number,
): Promise<string> {
  return bailIfCancelled(
    await p.text({
      message,
      validate: (value) => {
        if (!value || !value.trim()) return "This cannot be left empty.";
        if (value.trim().length > maxLength)
          return `This can be at most ${maxLength} characters.`;
      },
    }),
    CANCEL_MESSAGE,
  ).trim();
}

/** Asks for something that may be left blank. Blank is stored as nothing. */
async function askOptionalText(
  message: string,
  maxLength: number,
): Promise<string | null> {
  const answer = bailIfCancelled(
    await p.text({
      message,
      placeholder: "Leave empty if there is none",
      validate: (value) => {
        if (value && value.trim().length > maxLength)
          return `This can be at most ${maxLength} characters.`;
      },
    }),
    CANCEL_MESSAGE,
  ).trim();

  return answer === "" ? null : answer;
}

/**
 * Asks for the birthday, as a plain "YYYY-MM-DD" string.
 *
 * The checks are the same ones the Employees page makes, because the record
 * written here has to be as trustworthy as one added later from inside the
 * app. The birthday is what tells two people with the same name apart, so a
 * wrong one is worse than an awkward question.
 */
async function askBirthDate(): Promise<string> {
  return bailIfCancelled(
    await p.text({
      message: "Your birthday, written as year-month-day",
      placeholder: "1985-04-09",
      validate: (value) => {
        const answer = value?.trim() ?? "";
        if (!answer) return "This cannot be left empty.";
        if (!/^\d{4}-\d{2}-\d{2}$/.test(answer))
          return "Write it as year-month-day, for example 1985-04-09.";

        // Read at midnight UTC so the check cannot move the day.
        const parsed = new Date(`${answer}T00:00:00Z`);
        if (Number.isNaN(parsed.getTime())) return "That is not a real date.";
        if (parsed.getTime() > Date.now())
          return "A birthday cannot be in the future.";
        if (parsed.getUTCFullYear() < EARLIEST_BIRTH_YEAR)
          return "Check the year.";
      },
    }),
    CANCEL_MESSAGE,
  ).trim();
}

async function main() {
  console.clear();
  console.log("\n");
  p.intro(color.bgCyan(color.black(" Set Up Your EMS Admin Account ")));

  const env = loadEnv(resolve(__dirname, "../.env"));

  const dbPasswordGate = await verifyDbPassword(env, {
    cancel: CANCEL_MESSAGE,
    tooManyAttempts: TOO_MANY_ATTEMPTS_MESSAGE,
  });

  const connection = await connectToDatabase(env, dbPasswordGate);

  try {
    // ── Step 1.5: ensure every defined permission exists in the DB ──
    const seedSpinner = p.spinner();
    seedSpinner.start("Preparing permissions");

    const adminTemplate = ROLE_TEMPLATES.find(
      (t) => t.roleName === "Super Admin",
    );
    if (!adminTemplate) {
      seedSpinner.stop("Could not prepare permissions.");
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
    checkSpinner.start("Checking whether an account already exists");

    const existingHolders = await getActiveSuperAdmins(connection);

    if (existingHolders.length > 0) {
      checkSpinner.stop("An admin account already exists.");
      p.cancel(
        wrap(
          "Someone already has the admin account for this system.\nThis setup only ever creates the very first account. Everyone else is added from inside the app.",
        ),
      );
      process.exit(0);
    }
    checkSpinner.stop("No account exists yet.");

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
        roleSpinner.stop("Could not set up the Super Admin role.");
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
        roleSpinner.stop("Super Admin role created.");
      } catch (err) {
        await connection.rollback();
        roleSpinner.stop("Could not set up the Super Admin role.");
        throw err;
      }
    }

    // ── Step 4: who this account belongs to ──
    // Asked before the username, because a username is usually made out of
    // the person's own name. Nothing is written until every answer is in.
    p.log.info(
      wrap(
        "Enter the following personal details and employment information. This becomes your employee record.",
      ),
    );

    const firstName = await askRequiredText("First name", NAME_MAX_LENGTH);
    const middleName = await askOptionalText("Middle name", NAME_MAX_LENGTH);
    const lastName = await askRequiredText("Last name", NAME_MAX_LENGTH);
    const suffix = await askOptionalText(
      "Suffix, such as Jr. or III",
      SUFFIX_MAX_LENGTH,
    );
    const positionTitle = await askRequiredText(
      "Position or designation",
      NAME_MAX_LENGTH,
    );

    const tenureStatus = bailIfCancelled(
      await p.select<TenureStatus>({
        message: "Type of appointment",
        options: TENURE_STATUS_VALUES.map((value) => ({
          value,
          label: TENURE_STATUS_LABELS[value],
        })),
      }),
      CANCEL_MESSAGE,
    );

    const birthDate = await askBirthDate();

    // ── Step 5: username + password, retrying on duplicates ──
    let username = "";
    let generatedPassword = "";
    let passwordHash = "";

    while (true) {
      username = bailIfCancelled(
        await p.text({
          message: "Choose the username you will sign in with",
          validate: (value) => {
            if (!value || !value.trim())
              return "Your username cannot be empty.";
          },
        }),
        CANCEL_MESSAGE,
      ).trim();

      generatedPassword = generatePassword();
      passwordHash = hashPassword(generatedPassword);

      const createSpinner = p.spinner();
      createSpinner.start("Creating your account...");

      // Two rows now: the person, then the login pointing at them. Wrapped in
      // a transaction so a taken username does not leave an orphan employee
      // behind on the retry.
      await connection.beginTransaction();
      try {
        // The answers given above, written as they were given. Nothing here
        // is invented: the division or section is the only field left empty,
        // and that is because none exist yet on a new database.
        //
        // The short-form position title is also left empty. It exists only to
        // be printed on a form, and no form has been built yet.
        const [employeeInsert] = await connection.query<mysql.ResultSetHeader>(
          `
          INSERT INTO employee
            (first_name, middle_name, last_name, suffix,
             position_title, birth_date, tenure_status, employment_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
          `,
          [
            firstName,
            middleName,
            lastName,
            suffix,
            positionTitle,
            birthDate,
            tenureStatus,
          ],
        );

        const [userInsert] = await connection.query<mysql.ResultSetHeader>(
          `
          INSERT INTO user
            (employee_fk, username, password_hash, role_fk, account_status, must_change_password)
          VALUES (?, ?, ?, ?, 'active', 1)
          `,
          [employeeInsert.insertId, username, passwordHash, adminRolePk],
        );

        // Every person in the system has at least one version of their name
        // and position title, and a document names a version rather than the
        // person. The Employees page opens that first version whenever it
        // adds somebody, so this script opens one too — otherwise the first
        // person on file would be the one person no document could name.
        //
        // It is credited to the account created a moment ago, which is the
        // truthful answer: whoever ran this script is the person that account
        // belongs to.
        await connection.query(
          `
          INSERT INTO employee_history
            (employee_fk, first_name, middle_name, last_name, suffix,
             position_title, position_short_form, valid_from, valid_until,
             created_by_fk)
          VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?)
          `,
          [
            employeeInsert.insertId,
            firstName,
            middleName,
            lastName,
            suffix,
            positionTitle,
            today(),
            userInsert.insertId,
          ],
        );

        await connection.commit();
        createSpinner.stop("Your account is ready.");
        break;
      } catch (err: any) {
        await connection.rollback();
        if (err?.code === "ER_DUP_ENTRY") {
          createSpinner.stop(`The username "${username}" is already taken.`);
          continue;
        }
        createSpinner.stop("Could not create your account.");
        throw err;
      }
    }

    // ── Step 6: print credentials ──
    // The one drawn box in this script, and deliberately so. A generated
    // password has to be copied down before the window is closed, and the
    // border is what stops it reading as one more line scrolling past. Every
    // other message here is ordinary text and prints without a box.
    p.note(
      `${color.dim("Username")}  ${username}\n${color.dim("Password")}  ${generatedPassword}`,
      "Your sign-in details",
    );
    p.log.info(
      wrap("Your first sign-in will start with setting a new password."),
    );
    // The one field left empty, said plainly. This replaces the old warning,
    // which asked the reader to go and correct a made-up record.
    p.log.info(
      wrap(
        "One thing is still missing from your record: the division, section or unit you belong to. A new database has none yet. Create yours on the Organizational Structure page, then set it on the Employees page.",
      ),
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
