/**
 * src/lib/server/employee-history.ts
 *
 * The only place `employee` and `employee_history` are written.
 *
 * `employee` holds the current copy of a person's name and position title so
 * that an ordinary lookup stays one simple read. `employee_history` holds
 * every version of the same two things, including the current one, with the
 * dates it was in use. A printed document points at a history row rather than
 * at `employee`, which is what keeps a slip filed last year showing the
 * surname it was printed with.
 *
 * The two can disagree, and if they ever do, a document prints something
 * different from what the employee screen shows and nobody can tell which is
 * right. Everything here therefore runs inside one transaction, and any other
 * code that needs to change a person's name calls these functions rather than
 * writing either table itself.
 */

import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "./db";
import { employee, employeeHistory } from "./db/schema";

/** The handle drizzle hands to the body of `db.transaction(...)`. */
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Everything an employee screen writes, minus the columns the table fills in. */
export type EmployeeWriteValues = Omit<
  typeof employee.$inferInsert,
  "employeePk" | "createdAt" | "updatedAt"
>;

/**
 * The six fields a version is made of. Changing any one of them makes a new
 * version; changing a birthday or a civil status does not, because no
 * document prints those.
 */
type VersionedFields = {
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  positionTitle: string;
  positionShortForm: string | null;
};

function versionedFieldsOf(values: EmployeeWriteValues): VersionedFields {
  return {
    firstName: values.firstName,
    middleName: values.middleName ?? null,
    lastName: values.lastName,
    suffix: values.suffix ?? null,
    positionTitle: values.positionTitle,
    positionShortForm: values.positionShortForm ?? null,
  };
}

/**
 * Today as a plain "YYYY-MM-DD" in the server's own timezone, which is the
 * office's. Built from the local parts rather than from `toISOString()`,
 * because that returns UTC and would name yesterday for most of the evening
 * here.
 */
function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * The day before a plain date, used to close the version a change replaces.
 * Done in UTC on purpose: these are calendar dates with no time, so the
 * arithmetic cannot be moved by a daylight-saving jump.
 */
function dayBefore(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return parsed.toISOString().slice(0, 10);
}

/**
 * The version that was closed on this exact day, if there is one. Only a
 * separation closes a version on the current day — replacing a version closes
 * it the day before — so at most one row can match.
 */
async function findVersionClosedOn(
  tx: Transaction,
  employeePk: number,
  day: string,
) {
  const [row] = await tx
    .select()
    .from(employeeHistory)
    .where(
      and(
        eq(employeeHistory.employeeFk, employeePk),
        eq(employeeHistory.validUntil, day),
      ),
    )
    .orderBy(desc(employeeHistory.employeeHistoryPk))
    .limit(1);

  return row;
}

/** The version in use now, if the person has one. */
async function findOpenVersion(tx: Transaction, employeePk: number) {
  const [row] = await tx
    .select()
    .from(employeeHistory)
    .where(
      and(
        eq(employeeHistory.employeeFk, employeePk),
        isNull(employeeHistory.validUntil),
      ),
    );

  return row;
}

function differsFromVersion(
  open: typeof employeeHistory.$inferSelect,
  fields: VersionedFields,
): boolean {
  return (
    open.firstName !== fields.firstName ||
    open.middleName !== fields.middleName ||
    open.lastName !== fields.lastName ||
    open.suffix !== fields.suffix ||
    open.positionTitle !== fields.positionTitle ||
    open.positionShortForm !== fields.positionShortForm
  );
}

async function openVersion(
  tx: Transaction,
  employeePk: number,
  values: EmployeeWriteValues,
  validFrom: string,
  createdByFk: number | null,
) {
  await tx.insert(employeeHistory).values({
    employeeFk: employeePk,
    ...versionedFieldsOf(values),
    validFrom,
    validUntil: null,
    createdByFk,
  });
}

/**
 * Ends a version. `lastValidDay` is inclusive: it is the last day the version
 * was still correct, not the first day it was wrong.
 */
async function closeVersion(
  tx: Transaction,
  employeeHistoryPk: number,
  lastValidDay: string,
) {
  await tx
    .update(employeeHistory)
    .set({ validUntil: lastValidDay })
    .where(eq(employeeHistory.employeeHistoryPk, employeeHistoryPk));
}

/**
 * Brings this person's versions in line with what was just saved. Shared by
 * editing and by bringing somebody back, because both end in the same
 * question: what should be open now?
 *
 * Four cases, in the order they are handled:
 *
 * 1. The person no longer works here. Their open version is closed today and
 *    no new one is started. This is what stops them appearing as a choice on
 *    documents filed after they left.
 * 2. They work here and have no open version, meaning they were away and are
 *    back. A new version is started today and the closed one is left alone,
 *    because an old document must keep pointing at what was true when it was
 *    filed. The exception is a version closed earlier the same day, which is
 *    reopened rather than replaced — see the comment where that is done.
 * 3. They work here, have an open version, and nothing printable changed.
 *    Nothing happens. Editing a birthday must not make a new version.
 * 4. Something printable changed. The old version's last valid day becomes
 *    yesterday and a new one starts today, so exactly one version matches any
 *    given date.
 *
 * Case 4 has one exception, handled inside it: a version that only started
 * today is corrected in place rather than replaced. Closing it yesterday
 * would leave a row whose end came before its beginning, and that version was
 * never the truth on an earlier date, so there is nothing a document could
 * have pointed at.
 */
async function syncVersions(
  tx: Transaction,
  employeePk: number,
  values: EmployeeWriteValues,
  createdByFk: number | null,
) {
  const open = await findOpenVersion(tx, employeePk);
  const stillEmployed = (values.employmentStatus ?? "active") === "active";
  const on = today();

  if (!stillEmployed) {
    if (open) await closeVersion(tx, open.employeeHistoryPk, on);
    return;
  }

  if (!open) {
    // Somebody separated earlier today and brought back the same day was
    // never actually gone: their old version still covers today, so starting
    // a second one from today would leave two versions valid on the same
    // date. Their one version is reopened and rewritten with what was just
    // typed instead. A version closed on any earlier day is left alone and a
    // new one is started below, because that one really was the truth for a
    // period that has ended.
    const closedToday = await findVersionClosedOn(tx, employeePk, on);
    if (closedToday) {
      await tx
        .update(employeeHistory)
        .set({ ...versionedFieldsOf(values), validUntil: null, createdByFk })
        .where(
          eq(employeeHistory.employeeHistoryPk, closedToday.employeeHistoryPk),
        );
      return;
    }

    await openVersion(tx, employeePk, values, on, createdByFk);
    return;
  }

  const fields = versionedFieldsOf(values);
  if (!differsFromVersion(open, fields)) return;

  if (open.validFrom >= on) {
    await tx
      .update(employeeHistory)
      .set({ ...fields, createdByFk })
      .where(eq(employeeHistory.employeeHistoryPk, open.employeeHistoryPk));
    return;
  }

  await closeVersion(tx, open.employeeHistoryPk, dayBefore(on));
  await openVersion(tx, employeePk, values, on, createdByFk);
}

/**
 * Adds a person and opens their first version in the same transaction, so
 * nobody can exist without one. Returns the new employee's id.
 */
export async function createEmployee(
  values: EmployeeWriteValues,
  createdByFk: number | null,
): Promise<number> {
  return db.transaction(async (tx) => {
    const result = await tx.insert(employee).values(values);
    const employeePk = result[0].insertId;
    const on = today();

    await openVersion(tx, employeePk, values, on, createdByFk);

    // The add form always sends "employed", so this is only reachable by a
    // request that did not come from it. The version is still opened first
    // and closed straight after, rather than skipped, so that the rule
    // "everybody has at least one version" holds for every row in the table
    // without exception.
    if ((values.employmentStatus ?? "active") !== "active") {
      const open = await findOpenVersion(tx, employeePk);
      if (open) await closeVersion(tx, open.employeeHistoryPk, on);
    }

    return employeePk;
  });
}

/**
 * Saves an edit. A change to a printable field makes a new version; a change
 * to anything else does not.
 */
export async function updateEmployee(
  employeePk: number,
  values: EmployeeWriteValues,
  createdByFk: number | null,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(employee)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(employee.employeePk, employeePk));

    await syncVersions(tx, employeePk, values, createdByFk);
  });
}

/**
 * Marks somebody as no longer employed and closes their open version today.
 *
 * Closing the version is the half that matters here. Leaving it open would
 * keep them appearing as a choice on documents filed after they left, because
 * a document asks who was valid on its own date rather than who is employed
 * now.
 */
export async function separateEmployee(
  employeePk: number,
  createdByFk: number | null,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(employee)
      .set({ employmentStatus: "separated", updatedAt: new Date() })
      .where(eq(employee.employeePk, employeePk));

    const open = await findOpenVersion(tx, employeePk);
    if (open) await closeVersion(tx, open.employeeHistoryPk, today());
  });
}

/**
 * Brings somebody back, writing over their details with what was just typed,
 * and opens a new version starting today.
 *
 * A new one, never the old one reopened: an old document has to keep pointing
 * at the version that was true when it was filed, and people rarely return to
 * the same job anyway.
 *
 * `createdByFk` is unused for the employee row itself because that row
 * already exists; it is the new version that records who brought them back.
 */
export async function reinstateEmployee(
  employeePk: number,
  values: EmployeeWriteValues,
  createdByFk: number | null,
): Promise<void> {
  await updateEmployee(
    employeePk,
    { ...values, employmentStatus: "active" },
    createdByFk,
  );
}
