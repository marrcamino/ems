/**
 * scripts/backfill-employee-history.ts
 *
 * Gives every employee already in the database their first row in
 * `employee_history`. Run once, via:
 *   npm run backfill-employee-history   (→ tsx scripts/backfill-employee-history.ts)
 *
 * Why this is needed. A printed document does not store a person's name as
 * text; it stores a link to one row of `employee_history`, and the name is
 * read from there. An employee with no history row can therefore never be
 * named on a document. Everybody on file before the table existed needs a
 * first row, and this script is that one-time job.
 *
 * Safe to run twice: an employee who already has any history row is skipped,
 * so a second run inserts nothing rather than giving everybody a duplicate
 * version of themselves.
 *
 * Same security posture as create-admin.ts and sync-permissions.ts:
 * SSH/physical server access is the real boundary; the DB-password prompt is
 * a secondary verification gate only.
 */

import * as p from "@clack/prompts";
import mysql from "mysql2/promise";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import color from "picocolors";
import { connectToDatabase, loadEnv, verifyDbPassword } from "./lib";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CANCEL_MESSAGE = "Backfill cancelled. Nothing was changed.";
const TOO_MANY_ATTEMPTS_MESSAGE = "Backfill stopped. Nothing was changed.";

/**
 * The date every backfilled version starts from.
 *
 * This is NOT a claim that anybody was employed in the year 2000. A document
 * asks who was valid on the date written on the paper, not who is employed
 * today, and paper is always typed into the system after it was signed. If a
 * backfilled row started on the day this script happens to run, then a slip
 * filed a week earlier would find nobody and could not be completed.
 *
 * So the date only has to be earlier than any document anyone will ever enter.
 * Reports for periods before the system goes live are out of scope, so nothing
 * is lost by reaching further back than the truth.
 */
const BACKFILL_VALID_FROM = "2000-01-01";

interface EmployeeRow extends mysql.RowDataPacket {
  employee_pk: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  position_title: string;
}

async function main() {
  console.clear();
  console.log("\n");
  p.intro(color.bgCyan(color.black(" EMS Employee History Backfill ")));

  const env = loadEnv(resolve(__dirname, "../.env"));

  const dbPasswordGate = await verifyDbPassword(env, {
    cancel: CANCEL_MESSAGE,
    tooManyAttempts: TOO_MANY_ATTEMPTS_MESSAGE,
  });

  const connection = await connectToDatabase(env, dbPasswordGate);

  try {
    const readSpinner = p.spinner();
    readSpinner.start("Looking for employees with no history row");

    // Separated employees are included. Their version is still opened here
    // rather than closed, because this script cannot know the date they
    // left — closing a row needs that date, and inventing one would put a
    // wrong end date on the record. Closing them is a follow-up decision.
    const [rows] = await connection.query<EmployeeRow[]>(
      `
      SELECT e.employee_pk, e.first_name, e.middle_name, e.last_name,
             e.suffix, e.position_title
      FROM employee e
      LEFT JOIN employee_history h ON h.employee_fk = e.employee_pk
      WHERE h.employee_history_pk IS NULL
      GROUP BY e.employee_pk
      ORDER BY e.last_name, e.first_name
      `,
    );

    if (rows.length === 0) {
      readSpinner.stop("Every employee already has a history row.");
      p.outro(color.green("Nothing to do."));
      return;
    }

    readSpinner.stop(`${rows.length} employee(s) need a first history row.`);

    const writeSpinner = p.spinner();
    writeSpinner.start("Writing history rows");

    // One transaction for the whole backfill: a half-finished run would
    // leave some people with a version and some without, which is the exact
    // state this script exists to remove.
    await connection.beginTransaction();
    try {
      for (const row of rows) {
        await connection.query(
          `
          INSERT INTO employee_history
            (employee_fk, first_name, middle_name, last_name, suffix,
             position_title, position_short_form, valid_from, valid_until,
             created_by_fk)
          VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL, NULL)
          `,
          [
            row.employee_pk,
            row.first_name,
            row.middle_name,
            row.last_name,
            row.suffix,
            row.position_title,
            BACKFILL_VALID_FROM,
          ],
        );
      }
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      writeSpinner.stop("Backfill failed. Nothing was written.");
      throw err;
    }

    writeSpinner.stop(`${rows.length} history row(s) written.`);

    // `position_short_form` is deliberately left empty. Nobody has typed a
    // short form yet, and no rule turns a full position title into one
    // reliably, so inventing values here would put guesses on printed paper.
    p.note(
      rows
        .map(
          (row) =>
            `${row.last_name}, ${row.first_name} — ${row.position_title}`,
        )
        .join("\n"),
      `Opened from ${BACKFILL_VALID_FROM}, short form left empty`,
    );

    // The plan's own check, run here so nobody has to type it by hand.
    const [bad] = await connection.query<mysql.RowDataPacket[]>(
      `
      SELECT e.employee_pk, e.last_name,
             COUNT(h.employee_history_pk) AS versions
      FROM employee e
      LEFT JOIN employee_history h ON h.employee_fk = e.employee_pk
      GROUP BY e.employee_pk, e.last_name
      HAVING versions <> 1
      `,
    );

    if (bad.length > 0) {
      p.log.warn(
        `${bad.length} employee(s) do not have exactly one history row.\n` +
          "That is expected only if somebody has already been edited since\n" +
          "the backfill. Check them before building anything on top of this.",
      );
      p.note(
        bad
          .map((row) => `${row.last_name} (id ${row.employee_pk}): ${row.versions}`)
          .join("\n"),
        "Employees without exactly one version",
      );
    } else {
      p.log.success("Every employee has exactly one history row.");
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
