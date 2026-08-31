// src/routes/admin/employees/+page.server.ts
import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import { employee, orgUnit, session, user } from "$lib/server/db/schema";
import {
  createEmployee,
  reinstateEmployee,
  separateEmployee,
  updateEmployee,
} from "$lib/server/employee-history";
import { error, fail } from "@sveltejs/kit";
import { asc, eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import {
  alreadyEmployedMessage,
  findDuplicate,
  nameWithBirthDate,
  wouldDuplicateMessage,
} from "./duplicate-check";
import {
  CIVIL_STATUS_VALUES,
  EMPLOYMENT_STATUS_VALUES,
  SEX_VALUES,
  TENURE_STATUS_VALUES,
  type TenureStatus,
} from "./labels";

const NAME_MAX_LENGTH = 100;
const SUFFIX_MAX_LENGTH = 20;
const SHORT_FORM_MAX_LENGTH = 50;

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
  positionShortForm: employee.positionShortForm,
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
    positionShortForm: optionalText("positionShortForm"),
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

  // Left optional on purpose. Nobody already in the system has one, and
  // requiring it here would block an admin from correcting a birthday
  // until they had invented a short form for that person.
  if ((input.positionShortForm?.length ?? 0) > SHORT_FORM_MAX_LENGTH) {
    return `The short form can be at most ${SHORT_FORM_MAX_LENGTH} characters.`;
  }

  // Required of every person, because it is what the duplicate check is
  // anchored on. The column itself stays nullable: scripts/create-admin.ts
  // writes one placeholder row before anybody can sign in, and leaving that
  // row's birthday empty is more honest than inventing a date for it.
  if (input.birthDate === null) {
    return "Enter this person's birthday. It is what tells two people with the same name apart.";
  }

  // The browser sends "YYYY-MM-DD" from a date input. Parsed with an
  // explicit UTC midnight so the check does not move the day.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)) {
    return "Enter the birthday as a date.";
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

  return null;
}

/**
 * Everybody the new or edited record has to be compared against: the whole
 * table, people who no longer work here included. Somebody returning to the
 * office must be recognised rather than added a second time.
 *
 * Reading the lot is deliberate. This is one office of at most a few hundred
 * rows, so a single unfiltered read is cheaper than the several indexed
 * queries the three matching rules would otherwise need.
 */
async function readComparablePeople() {
  return db
    .select({
      employeePk: employee.employeePk,
      firstName: employee.firstName,
      lastName: employee.lastName,
      birthDate: employee.birthDate,
      employmentStatus: employee.employmentStatus,
    })
    .from(employee);
}

/**
 * The server's own duplicate check, returning the sentence to refuse with or
 * null to carry on.
 *
 * The dialog runs the same rules and offers the admin a way forward, but it
 * can be bypassed, so an exact match is stopped here too. Only exact matches
 * are stopped: a possible match is something the admin is allowed to overrule,
 * and by the time a request arrives they already have.
 */
async function refuseIfDuplicate(
  input: EmployeeInput,
  ignoreEmployeePk: number | null,
  wording: "create" | "update",
): Promise<string | null> {
  const found = findDuplicate(
    input,
    await readComparablePeople(),
    ignoreEmployeePk,
  );

  if (found?.kind !== "exact") return null;

  if (found.person.employmentStatus !== "active") {
    return `${nameWithBirthDate(found.person)} is already in the system, marked as no longer employed. Open that person's record and set them back to employed instead of adding them again.`;
  }

  return wording === "create"
    ? alreadyEmployedMessage(found.person)
    : wouldDuplicateMessage(found.person);
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

    const duplicate = await refuseIfDuplicate(input, null, "create");
    if (duplicate) return fail(409, { error: duplicate });

    // A possible match is deliberately not stopped. The dialog showed it and
    // the admin answered that these are two different people.
    const employeePk = await createEmployee(
      toEmployeeValues(input),
      locals.user?.userPk ?? null,
    );

    const newRow = await readEmployeeRow(employeePk);
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

    // Renaming somebody, or correcting their birthday, can collide with a
    // record already in the system just as adding can. This row is left out of
    // its own comparison, or every edit would match itself.
    //
    // Skipped entirely when the three identifying fields are untouched. Such
    // an edit cannot create a new collision, and checking anyway would trap an
    // admin trying to correct one of two records that already match — they
    // would be refused on both, with no way to fix either.
    const identityUnchanged =
      input.firstName === existing.firstName &&
      input.lastName === existing.lastName &&
      input.birthDate === existing.birthDate;

    if (!identityUnchanged) {
      const duplicate = await refuseIfDuplicate(input, employeePk, "update");
      if (duplicate) return fail(409, { error: duplicate });
    }

    await updateEmployee(
      employeePk,
      toEmployeeValues(input),
      locals.user?.userPk ?? null,
    );

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
   * Bringing back somebody who used to work here.
   *
   * An admin whose colleague rejoins the office does not think "I will set her
   * back to employed" — they open the add form and type her details. The
   * duplicate check stops that save, and this action is the way forward it
   * offers instead: the record already in the system is set back to employed,
   * and the details just typed are written over it, because people rarely
   * return to the same job.
   *
   * Without this the admin would be at a dead end, and the way around a dead
   * end is to change a spelling until the save goes through — creating the
   * very duplicate the check exists to prevent.
   */
  reinstate: async ({ request, locals }) => {
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

    if (existing.employmentStatus === "active") {
      return fail(409, {
        error: "That person is already marked as employed.",
      });
    }

    const invalid = validateEmployeeForm(input);
    if (invalid) return fail(400, { error: invalid });

    const badSection = await validateSection(input, existing.orgUnitFk);
    if (badSection) return fail(400, { error: badSection });

    // Somebody else in the table could match exactly as well. This one is left
    // out because it is the record being brought back.
    const duplicate = await refuseIfDuplicate(input, employeePk, "update");
    if (duplicate) return fail(409, { error: duplicate });

    await reinstateEmployee(
      employeePk,
      toEmployeeValues(input),
      locals.user?.userPk ?? null,
    );

    const updatedRow = await readEmployeeRow(employeePk);
    if (!updatedRow) {
      return fail(500, {
        error: "The change was saved but the employee could not be read back.",
      });
    }

    return { success: true, updatedRow, reinstated: true };
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

    await separateEmployee(employeePk, locals.user?.userPk ?? null);

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
