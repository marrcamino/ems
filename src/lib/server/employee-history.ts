/**
 * src/lib/server/employee-history.ts
 *
 * The only place `employee`, `employee_history` and
 * `employee_history_correction` are written.
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
 *
 * A name changes for two opposite reasons, and this file keeps them apart:
 *
 * - **Something was typed wrong.** It was never correct, so the version is
 *   written over and every document already using it is repaired at once.
 *   `updateEmployee` does this for the current version;
 *   `correctEmployeeVersion` does it for any single version, including a
 *   closed one. Both write a row to `employee_history_correction`, because
 *   writing over a version otherwise leaves no trace of what was there.
 * - **Something really changed.** A marriage, a promotion. The current version
 *   is closed and a new one starts, so documents filed earlier keep the old
 *   wording. `addEmployeeVersion` does this, and writes nothing to the
 *   correction log, because the new version already records who made it.
 *
 * Which of the two happened is not something this file can work out, and it
 * does not try. The screen the person used decides it: editing an employee
 * repairs, and the separate "add a change" action records a change.
 */

import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "./db";
import { employee, employeeHistory, employeeHistoryCorrection } from "./db/schema";

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
export type VersionedFields = {
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  positionTitle: string;
  positionShortForm: string | null;
};

/**
 * The same six fields, paired with the database column each one is called in
 * `employee_history_correction.field`. The log is read by typing SQL by hand,
 * so it names columns the way a SQL query does.
 */
const VERSIONED_FIELD_COLUMNS = {
  firstName: "first_name",
  middleName: "middle_name",
  lastName: "last_name",
  suffix: "suffix",
  positionTitle: "position_title",
  positionShortForm: "position_short_form",
} as const;

const VERSIONED_FIELD_NAMES = Object.keys(
  VERSIONED_FIELD_COLUMNS,
) as (keyof VersionedFields)[];

/**
 * Anything that carries the six printed fields — a form's values, or a row
 * already in `employee_history`. Both are pulled through `versionedFieldsOf`
 * so that a comparison between them is always like for like, with an absent
 * middle name and an empty one treated as the same thing.
 */
type VersionedFieldsSource = {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  suffix?: string | null;
  positionTitle: string;
  positionShortForm?: string | null;
};

function versionedFieldsOf(values: VersionedFieldsSource): VersionedFields {
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

/** Which of the six printed fields differ, and what they are changing from. */
function changedFields(
  before: VersionedFields,
  after: VersionedFields,
): { field: keyof VersionedFields; oldValue: string | null; newValue: string | null }[] {
  return VERSIONED_FIELD_NAMES.filter(
    (field) => before[field] !== after[field],
  ).map((field) => ({
    field,
    oldValue: before[field],
    newValue: after[field],
  }));
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
 * Writes new wording over a version that already exists, and records what was
 * lost. Returns the number of fields that actually changed, which is zero when
 * the caller passed the same wording that was already there.
 *
 * The dates are not touched. A repair is a claim that this version was always
 * meant to read this way, so the days it covers do not move, and every
 * document pointing at it reads the new wording immediately.
 *
 * The log rows are written in the same transaction as the update, so the table
 * cannot end up describing a repair that did not happen, or missing one that
 * did.
 */
async function writeOverVersion(
  tx: Transaction,
  version: typeof employeeHistory.$inferSelect,
  fields: VersionedFields,
  correctedByFk: number | null,
  { log }: { log: boolean } = { log: true },
): Promise<number> {
  const changes = changedFields(versionedFieldsOf(version), fields);
  if (changes.length === 0) return 0;

  await tx
    .update(employeeHistory)
    .set(fields)
    .where(eq(employeeHistory.employeeHistoryPk, version.employeeHistoryPk));

  if (log) {
    await tx.insert(employeeHistoryCorrection).values(
      changes.map((change) => ({
        employeeHistoryFk: version.employeeHistoryPk,
        field: VERSIONED_FIELD_COLUMNS[change.field],
        oldValue: change.oldValue,
        newValue: change.newValue,
        correctedByFk,
      })),
    );
  }

  return changes.length;
}

/**
 * Brings this person's versions in line with what was just saved by the
 * employee editor, which is the screen for **repairing** something typed
 * wrong.
 *
 * Three cases, in the order they are handled:
 *
 * 1. The person no longer works here. Their open version is closed today and
 *    no new one is started. This is what stops them appearing as a choice on
 *    documents filed after they left.
 * 2. They work here and have no open version, meaning they were away and are
 *    back. A new version is started today and the closed one is left alone,
 *    because an old document must keep pointing at what was true when it was
 *    filed. The exception is a version closed earlier the same day, which is
 *    reopened rather than replaced — see the comment where that is done.
 * 3. They work here and have an open version. It is written over with what was
 *    typed, and each changed field is recorded in the correction log. Nothing
 *    happens if none of the six printed fields differ, so editing a birthday
 *    still makes no version and writes no log row.
 *
 * Case 3 is where this differs from what the code used to do. It used to close
 * the open version and start a new one, which is right for a marriage and
 * wrong for a typing mistake, and this screen is now only ever used for the
 * mistake. A marriage goes through `addEmployeeVersion` instead.
 *
 * Only the open version is touched. If the same mistake also sits on a closed
 * version, that version keeps it, and a document dated inside its range keeps
 * printing it, until somebody repairs that version from the history screen
 * with `correctEmployeeVersion`. This was a deliberate decision: an edit
 * changes only the row the person is looking at.
 */
async function syncVersions(
  tx: Transaction,
  employeePk: number,
  values: EmployeeWriteValues,
  actorUserPk: number | null,
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
        .set({
          ...versionedFieldsOf(values),
          validUntil: null,
          createdByFk: actorUserPk,
        })
        .where(
          eq(employeeHistory.employeeHistoryPk, closedToday.employeeHistoryPk),
        );
      return;
    }

    await openVersion(tx, employeePk, values, on, actorUserPk);
    return;
  }

  await writeOverVersion(tx, open, versionedFieldsOf(values), actorUserPk);
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
 * Saves an edit made on the employee editor, which is the screen for repairing
 * something typed wrong.
 *
 * A change to a printed field writes over the person's current version and is
 * recorded in the correction log. A change to anything else touches no version
 * at all.
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
 * Records something that really changed — a marriage, a promotion. The current
 * version ends yesterday, a new one starts today, and `employee` is updated to
 * match the new one.
 *
 * Nothing is written to the correction log. Nothing was written over: the old
 * wording is still there on the closed version, which still records who made
 * it, and documents filed before today go on reading it. That is the whole
 * point of this action.
 *
 * Two cases are handled before the ordinary one:
 *
 * - **Nothing printed actually changed.** No version is made. Somebody opened
 *   the dialog, changed their mind, and saved; that is not a change worth
 *   recording.
 * - **The current version began today.** Closing it yesterday would leave a row
 *   whose last valid day came before its first. That version was never the
 *   truth on any earlier date, so no document can be pointing at it, and it is
 *   written over instead. No log row is written for the same reason: nothing
 *   that any document could have used was lost.
 */
export async function addEmployeeVersion(
  employeePk: number,
  values: EmployeeWriteValues,
  createdByFk: number | null,
): Promise<void> {
  await db.transaction(async (tx) => {
    const open = await findOpenVersion(tx, employeePk);
    const fields = versionedFieldsOf(values);
    const on = today();

    await tx
      .update(employee)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(employee.employeePk, employeePk));

    if (!open) {
      await openVersion(tx, employeePk, values, on, createdByFk);
      return;
    }

    if (changedFields(versionedFieldsOf(open), fields).length === 0) return;

    if (open.validFrom >= on) {
      await writeOverVersion(tx, open, fields, createdByFk, { log: false });
      return;
    }

    await closeVersion(tx, open.employeeHistoryPk, dayBefore(on));
    await openVersion(tx, employeePk, values, on, createdByFk);
  });
}

/**
 * Repairs one version, named directly, which is what the Name and position
 * history screen does. Works on a closed version as well as the current one,
 * and it is the only way to reach a closed one.
 *
 * If the version being repaired is the current one, `employee` is updated to
 * match, because those two hold the same wording and must never disagree. If
 * it is a closed version, `employee` is left alone: a closed version is not
 * what the person is called today, so repairing it says nothing about their
 * current name.
 *
 * Returns how many fields were actually changed, so the caller can tell a real
 * repair from a save that changed nothing.
 */
export async function correctEmployeeVersion(
  employeeHistoryPk: number,
  fields: VersionedFields,
  correctedByFk: number | null,
): Promise<number> {
  return db.transaction(async (tx) => {
    const [version] = await tx
      .select()
      .from(employeeHistory)
      .where(eq(employeeHistory.employeeHistoryPk, employeeHistoryPk));

    if (!version) {
      throw new Error(
        `No name and position entry with id ${employeeHistoryPk}.`,
      );
    }

    const changed = await writeOverVersion(tx, version, fields, correctedByFk);
    if (changed === 0) return 0;

    if (version.validUntil === null) {
      await tx
        .update(employee)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(employee.employeePk, version.employeeFk));
    }

    return changed;
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

/**
 * For each of these people, how many filed documents name their current
 * version — the wording the employee editor would write over.
 *
 * **This function exists to be replaced.** No document table has been built
 * yet, so nothing can be pointing at a version and the honest answer today is
 * zero for everybody. Whoever builds the first document that names a signatory
 * must come back here and count its rows, grouped by the person whose version
 * they hold. Nothing else needs to change: the screens already ask this
 * question and already word their warning around the answer.
 *
 * It takes the whole list rather than one person at a time so that replacing
 * it means writing one grouped query, rather than discovering that the
 * Employees page runs one query per row.
 *
 * The question is asked even though the answer is always zero, because paper
 * is typed into the system after it was signed. A slip filed next week can
 * carry last week's date, so the choice between repairing a version and
 * starting a new one matters long before any document exists.
 */
export async function countDocumentsUsingOpenVersions(
  employeePks: number[],
): Promise<Record<number, number>> {
  return Object.fromEntries(employeePks.map((employeePk) => [employeePk, 0]));
}

/**
 * The same count, asked about named versions rather than about people. The
 * history panel needs this one, because there it is a closed version that is
 * about to be written over and the person's current version is not involved.
 *
 * **Replace it at the same time as `countDocumentsUsingOpenVersions`.** Both
 * answer one question — how many filed documents hold this
 * `employee_history_pk` — and both return zero until a document table exists.
 */
export async function countDocumentsUsingVersions(
  employeeHistoryPks: number[],
): Promise<Record<number, number>> {
  return Object.fromEntries(employeeHistoryPks.map((pk) => [pk, 0]));
}
