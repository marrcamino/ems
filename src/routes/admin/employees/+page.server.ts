// src/routes/admin/employees/+page.server.ts
import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import { employee, orgUnit, session, user } from "$lib/server/db/schema";
import { error, fail } from "@sveltejs/kit";
import { asc, eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import {
  CIVIL_STATUS_VALUES,
  EMPLOYMENT_STATUS_VALUES,
  SEX_VALUES,
  TENURE_STATUS_VALUES,
  type TenureStatus,
} from "./labels";

const NAME_MAX_LENGTH = 100;
const SUFFIX_MAX_LENGTH = 20;

/** A person born before this is almost certainly a typo in the year. */
const EARLIEST_BIRTH_YEAR = 1900;

/**
 * The columns the table needs, with the section name resolved and the
 * username of the login attached — the "Has login" column is the only thing
 * that reaches across to the Users page, and one left join answers it.
 */
const employeeRowColumns = {
  employeePk: employee.employeePk,
  firstName: employee.firstName,
  middleName: employee.middleName,
  lastName: employee.lastName,
  suffix: employee.suffix,
  positionTitle: employee.positionTitle,
  orgUnitFk: employee.orgUnitFk,
  orgUnitName: orgUnit.orgUnitName,
  orgUnitAbbr: orgUnit.abbr,
  birthDate: employee.birthDate,
  sex: employee.sex,
  civilStatus: employee.civilStatus,
  tenureStatus: employee.tenureStatus,
  employmentStatus: employee.employmentStatus,
  username: user.username,
};

function selectEmployeeRows() {
  return db
    .select(employeeRowColumns)
    .from(employee)
    .leftJoin(orgUnit, eq(employee.orgUnitFk, orgUnit.orgUnitPk))
    .leftJoin(user, eq(user.employeeFk, employee.employeePk));
}

async function readEmployeeRow(employeePk: number) {
  const [row] = await selectEmployeeRows().where(
    eq(employee.employeePk, employeePk),
  );
  return row;
}

/**
 * Reads one value out of a fixed list, or null. Anything not on the list is
 * treated as "not answered" rather than rejected — these are all optional,
 * and the only way to submit something else is to bypass the form.
 */
function readChoice<T extends string>(
  form: FormData,
  field: string,
  allowed: readonly T[],
): T | null {
  const value = ((form.get(field) as string) ?? "").trim();
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function readEmployeeForm(form: FormData) {
  const optionalText = (field: string) =>
    ((form.get(field) as string) ?? "").trim() || null;

  const orgUnitFkRaw = form.get("orgUnitFk");
  const employmentStatus = readChoice(
    form,
    "employmentStatus",
    EMPLOYMENT_STATUS_VALUES,
  );

  return {
    firstName: ((form.get("firstName") as string) ?? "").trim(),
    middleName: optionalText("middleName"),
    lastName: ((form.get("lastName") as string) ?? "").trim(),
    suffix: optionalText("suffix"),
    positionTitle: ((form.get("positionTitle") as string) ?? "").trim(),
    orgUnitFk: orgUnitFkRaw ? Number(orgUnitFkRaw) : null,
    birthDate: optionalText("birthDate"),
    sex: readChoice(form, "sex", SEX_VALUES),
    civilStatus: readChoice(form, "civilStatus", CIVIL_STATUS_VALUES),
    tenureStatus: readChoice(form, "tenureStatus", TENURE_STATUS_VALUES),

    employmentStatus: employmentStatus ?? "active",
  } as const;
}

type EmployeeInput = ReturnType<typeof readEmployeeForm>;

function validateEmployeeForm(input: EmployeeInput): string | null {
  if (!input.firstName) return "Enter a first name.";
  if (!input.lastName) return "Enter a last name.";
  if (!input.positionTitle) return "Enter this person's position.";

  // Required, not optional: everybody in the office is hired under one of
  // these, Contract of Service and Job Order included.
  if (input.tenureStatus === null) return "Choose how this person is hired.";

  if (
    input.firstName.length > NAME_MAX_LENGTH ||
    input.lastName.length > NAME_MAX_LENGTH ||
    (input.middleName?.length ?? 0) > NAME_MAX_LENGTH ||
    input.positionTitle.length > NAME_MAX_LENGTH
  ) {
    return `Names and the position can be at most ${NAME_MAX_LENGTH} characters.`;
  }

  if ((input.suffix?.length ?? 0) > SUFFIX_MAX_LENGTH) {
    return `The suffix can be at most ${SUFFIX_MAX_LENGTH} characters.`;
  }

  if (input.birthDate !== null) {
    // The browser sends "YYYY-MM-DD" from a date input. Parsed with an
    // explicit UTC midnight so the check does not move the day.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)) {
      return "Enter the birthday as a date, or leave it blank.";
    }

    const parsed = new Date(`${input.birthDate}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      return "That birthday isn't a real date.";
    }
    if (parsed.getTime() > Date.now()) {
      return "The birthday can't be in the future.";
    }
    if (parsed.getUTCFullYear() < EARLIEST_BIRTH_YEAR) {
      return "Check the year of the birthday.";
    }
  }

  return null;
}

/**
 * The row as it goes into the table. Only reachable once
 * validateEmployeeForm has passed, which is what rules out a missing tenure —
 * the types cannot see that on their own.
 */
function toEmployeeValues(input: EmployeeInput) {
  return { ...input, tenureStatus: input.tenureStatus as TenureStatus };
}

/**
 * Refuse a retired section unless the person is already in it — an admin
 * fixing a spelling mistake in somebody's name should not be forced to move
 * them out of a section that was retired after they were put there.
 */
async function validateSection(
  input: EmployeeInput,
  currentOrgUnitFk?: number | null,
): Promise<string | null> {
  if (input.orgUnitFk === null) return null;

  const [chosenUnit] = await db
    .select({ status: orgUnit.status })
    .from(orgUnit)
    .where(eq(orgUnit.orgUnitPk, input.orgUnitFk));

  if (!chosenUnit) return "That section no longer exists.";
  if (chosenUnit.status !== "active" && currentOrgUnitFk !== input.orgUnitFk) {
    return "That section is inactive and can't be assigned. Pick an active one.";
  }

  return null;
}

/** The login belonging to this person, if they have one. */
async function findLoginFor(employeePk: number) {
  const [row] = await db
    .select({ userPk: user.userPk, username: user.username })
    .from(user)
    .where(eq(user.employeeFk, employeePk));

  return row;
}

/**
 * Sign this person out of everything, if they have a login at all, and return
 * that login so the caller can name it.
 *
 * Used when somebody is marked as no longer employed. From that moment the
 * sign-in refuses them, but a session opened before the change would keep
 * working until it expired — up to eight hours after they left.
 */
async function endSessionsForEmployee(employeePk: number) {
  const login = await findLoginFor(employeePk);
  if (login) {
    await db.delete(session).where(eq(session.userFk, login.userPk));
  }
  return login;
}

export const load: PageServerLoad = async ({ locals }) => {
  // Viewing the page needs only view_employees; each action below separately
  // requires admin:manage_employees.
  if (!can(locals.permissions, "admin:view_employees")) {
    throw error(403, "You do not have permission to view this page.");
  }

  const employees = await selectEmployeeRows().orderBy(
    asc(employee.lastName),
    asc(employee.firstName),
  );

  const orgUnits = await db
    .select()
    .from(orgUnit)
    .orderBy(asc(orgUnit.orgUnitName));

  return { employees, orgUnits };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_employees")) {
      return fail(403, {
        error: "You do not have permission to add employees.",
      });
    }

    const form = await request.formData();
    const input = readEmployeeForm(form);

    const invalid = validateEmployeeForm(input);
    if (invalid) return fail(400, { error: invalid });

    const badSection = await validateSection(input);
    if (badSection) return fail(400, { error: badSection });

    // The admin is told about a repeated name in the dialog before saving, so
    // reaching here means they meant it.
    const result = await db.insert(employee).values(toEmployeeValues(input));

    const newRow = await readEmployeeRow(result[0].insertId);
    if (!newRow) {
      return fail(500, {
        error: "The employee was saved but could not be read back.",
      });
    }

    return { success: true, newRow };
  },

  update: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_employees")) {
      return fail(403, {
        error: "You do not have permission to edit employees.",
      });
    }

    const form = await request.formData();
    const employeePk = Number(form.get("employeePk"));
    const input = readEmployeeForm(form);

    const [existing] = await db
      .select()
      .from(employee)
      .where(eq(employee.employeePk, employeePk));

    if (!existing) {
      return fail(404, { error: "That employee no longer exists." });
    }

    const invalid = validateEmployeeForm(input);
    if (invalid) return fail(400, { error: invalid });

    const badSection = await validateSection(input, existing.orgUnitFk);
    if (badSection) return fail(400, { error: badSection });

    await db
      .update(employee)
      .set({ ...toEmployeeValues(input), updatedAt: new Date() })
      .where(eq(employee.employeePk, employeePk));

    // The editor can be the place somebody is marked as no longer employed,
    // just as the menu action can, so it signs them out the same way.
    if (
      input.employmentStatus !== "active" &&
      existing.employmentStatus === "active"
    ) {
      await endSessionsForEmployee(employeePk);
    }

    const updatedRow = await readEmployeeRow(employeePk);
    if (!updatedRow) {
      return fail(500, {
        error: "The employee was saved but could not be read back.",
      });
    }

    return { success: true, updatedRow };
  },

  /**
   * Marking somebody as no longer employed, without opening the whole editor.
   * This is the normal way a person leaves — deleting the record is for a row
   * that should never have existed.
   */
  separate: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_employees")) {
      return fail(403, {
        error: "You do not have permission to edit employees.",
      });
    }

    const form = await request.formData();
    const employeePk = Number(form.get("employeePk"));

    const [existing] = await db
      .select({ employeePk: employee.employeePk })
      .from(employee)
      .where(eq(employee.employeePk, employeePk));

    if (!existing) {
      return fail(404, { error: "That employee no longer exists." });
    }

    await db
      .update(employee)
      .set({ employmentStatus: "separated", updatedAt: new Date() })
      .where(eq(employee.employeePk, employeePk));

    const updatedRow = await readEmployeeRow(employeePk);
    if (!updatedRow) {
      return fail(500, {
        error: "The change was saved but the employee could not be read back.",
      });
    }

    // Their login is left in place — deleting an account is a decision made
    // on the Users page — but it stops working from here on: the sign-in
    // refuses anybody who no longer works here, and any session they still
    // have open is ended now rather than at its eight-hour expiry.
    const login = await endSessionsForEmployee(employeePk);

    return { success: true, updatedRow, login };
  },

  delete: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_employees")) {
      return fail(403, {
        error: "You do not have permission to delete employees.",
      });
    }

    const form = await request.formData();
    const employeePk = Number(form.get("employeePk"));

    const [existing] = await db
      .select({ employeePk: employee.employeePk })
      .from(employee)
      .where(eq(employee.employeePk, employeePk));

    if (!existing) {
      return fail(404, { error: "That employee no longer exists." });
    }

    /**
     * The login points at this row through a foreign key that restricts, so
     * MySQL would refuse the delete anyway. Catching it here means a sentence
     * that says what to do instead of a database error.
     */
    const login = await findLoginFor(employeePk);
    if (login) {
      return fail(409, {
        error: `This person still has the account "${login.username}". Delete that account on the Users page first, or mark this person as no longer employed instead.`,
      });
    }

    try {
      await db.delete(employee).where(eq(employee.employeePk, employeePk));
      return { success: true, deleted: true };
    } catch {
      return fail(409, {
        error:
          "This employee is still used elsewhere in the system and can't be deleted. Mark them as no longer employed instead.",
      });
    }
  },
};
