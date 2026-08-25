// src/routes/admin/users/+page.server.ts
import { can } from "$lib/rbac/access";
import { SUPER_ADMIN_KEY } from "$lib/rbac/permission-tree";
import {
  generateTemporaryPassword,
  hashPassword,
} from "$lib/server/auth/password";
import { db } from "$lib/server/db";
import {
  employee,
  orgUnit,
  permission,
  role,
  rolePermission,
  session,
  user,
} from "$lib/server/db/schema";
import { PERMISSIONS, type PermissionKey } from "$lib/server/permissions";
import { getPasswordStrengthError } from "$lib/validation/password";
import { error, fail } from "@sveltejs/kit";
import { and, asc, eq, ne } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 50;

/** Letters, digits, and the separators a name-based username needs. */
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

/**
 * The super-admin role is found by the permission it holds, never by name —
 * there is no is_protected column, and the role's name is editable data.
 * Exactly one role may hold this key.
 */
async function getSuperAdminRolePk(): Promise<number | null> {
  const [row] = await db
    .select({ rolePk: rolePermission.roleFk })
    .from(rolePermission)
    .innerJoin(
      permission,
      eq(rolePermission.permissionFk, permission.permissionPk),
    )
    .where(eq(permission.key, SUPER_ADMIN_KEY));

  return row?.rolePk ?? null;
}

/**
 * How many active users can currently manage roles. The rule that this must
 * never reach zero is checked against this count before any change that would
 * move somebody out of that group.
 */
async function countActiveSuperAdminUsers(
  superAdminRolePk: number | null,
): Promise<number> {
  if (superAdminRolePk === null) return 0;

  const holders = await db
    .select({ userPk: user.userPk })
    .from(user)
    .where(
      and(
        eq(user.roleFk, superAdminRolePk),
        eq(user.accountStatus, "active"),
      ),
    );

  return holders.length;
}

/**
 * The columns the table needs. The login half comes from `user`; the name,
 * position, and section come from the `employee` row it points at, and are
 * kept in a nested object rather than flattened so it stays obvious which
 * table each field came from.
 *
 * The password hash and the failed-attempt counter are deliberately absent —
 * neither is anything the page shows, and everything selected here travels to
 * the browser with the rest of the load return.
 */
const userRowColumns = {
  userPk: user.userPk,
  employeeFk: user.employeeFk,
  username: user.username,
  roleFk: user.roleFk,
  roleName: role.roleName,
  accountStatus: user.accountStatus,
  mustChangePassword: user.mustChangePassword,
  lockedUntil: user.lockedUntil,
  lastLoginAt: user.lastLoginAt,
  employee: {
    employeePk: employee.employeePk,
    firstName: employee.firstName,
    middleName: employee.middleName,
    lastName: employee.lastName,
    suffix: employee.suffix,
    positionTitle: employee.positionTitle,
    employmentStatus: employee.employmentStatus,
    orgUnitFk: employee.orgUnitFk,
    orgUnitName: orgUnit.orgUnitName,
    orgUnitAbbr: orgUnit.abbr,
  },
};

function selectUserRows() {
  return db
    .select(userRowColumns)
    .from(user)
    .innerJoin(employee, eq(user.employeeFk, employee.employeePk))
    .innerJoin(role, eq(user.roleFk, role.rolePk))
    .leftJoin(orgUnit, eq(employee.orgUnitFk, orgUnit.orgUnitPk));
}

async function readUserRow(userPk: number) {
  const [row] = await selectUserRows().where(eq(user.userPk, userPk));
  return row;
}

async function isUsernameTaken(username: string, excludeUserPk?: number) {
  const clash = excludeUserPk
    ? and(eq(user.username, username), ne(user.userPk, excludeUserPk))
    : eq(user.username, username);

  const [existing] = await db
    .select({ userPk: user.userPk })
    .from(user)
    .where(clash);

  return existing !== undefined;
}

/**
 * Sign someone out everywhere. Permissions are read from the database once,
 * when a session is validated, so a role change or a switched-off account
 * would otherwise not reach that person until their current session expired —
 * up to eight hours of access they no longer have.
 */
async function endAllSessionsFor(userPk: number) {
  await db.delete(session).where(eq(session.userFk, userPk));
}

function readUserForm(form: FormData) {
  const employeeFkRaw = form.get("employeeFk");

  return {
    // Only read when adding. A login cannot be moved to a different person —
    // that is a new account, not an edit — so the update action ignores it.
    employeeFk: employeeFkRaw ? Number(employeeFkRaw) : null,
    username: ((form.get("username") as string) ?? "").trim(),
    roleFk: Number(form.get("roleFk")),
    accountStatus:
      form.get("accountStatus") === "inactive" ? "inactive" : "active",
  } as const;
}

type UserInput = ReturnType<typeof readUserForm>;

function validateUserForm(input: UserInput): string | null {
  if (!input.username) return "Enter a username.";
  if (input.username.length < USERNAME_MIN_LENGTH) {
    return `The username needs at least ${USERNAME_MIN_LENGTH} characters.`;
  }
  if (input.username.length > USERNAME_MAX_LENGTH) {
    return `The username can be at most ${USERNAME_MAX_LENGTH} characters.`;
  }
  if (!USERNAME_PATTERN.test(input.username)) {
    return "The username can only contain letters, numbers, dots, dashes, and underscores.";
  }
  if (!input.roleFk || Number.isNaN(input.roleFk)) {
    return "Choose a role for this person.";
  }
  return null;
}

/**
 * Check the person this account is being made for: they must exist, they must
 * not already have one, and they must still work here. All three are things
 * the dialog already prevents, so reaching one of these means the request did
 * not come from the form.
 */
async function validateEmployee(employeeFk: number | null): Promise<string | null> {
  if (!employeeFk || Number.isNaN(employeeFk)) {
    return "Choose the person this account is for.";
  }

  const [person] = await db
    .select({ employmentStatus: employee.employmentStatus })
    .from(employee)
    .where(eq(employee.employeePk, employeeFk));

  if (!person) return "That employee no longer exists.";

  if (person.employmentStatus !== "active") {
    return "That person is marked as no longer employed, so they can't be given an account.";
  }

  const [taken] = await db
    .select({ username: user.username })
    .from(user)
    .where(eq(user.employeeFk, employeeFk));

  if (taken) {
    return `That person already signs in as "${taken.username}". One person can have only one account.`;
  }

  return null;
}

/**
 * Check the chosen role still exists, and refuse a retired one unless the
 * person is already on it — an admin fixing a username should not be forced
 * to move somebody off a role that was retired after they were assigned to it.
 */
async function validateRole(
  input: UserInput,
  current?: { roleFk: number },
): Promise<string | null> {
  const [chosenRole] = await db
    .select({ status: role.status })
    .from(role)
    .where(eq(role.rolePk, input.roleFk));

  if (!chosenRole) return "That role no longer exists.";
  if (chosenRole.status !== "active" && current?.roleFk !== input.roleFk) {
    return "That role is inactive and can't be assigned. Pick an active one.";
  }

  return null;
}

export const load: PageServerLoad = async ({ locals }) => {
  // Viewing the page needs only view_users; each action below separately
  // requires admin:manage_users.
  if (!can(locals.permissions, "admin:view_users")) {
    throw error(403, "You do not have permission to view this page.");
  }

  const users = await selectUserRows().orderBy(
    asc(employee.lastName),
    asc(employee.firstName),
  );

  const roles = await db.select().from(role).orderBy(asc(role.roleName));

  const rolePermissionRows = await db
    .select({ roleFk: rolePermission.roleFk, key: permission.key })
    .from(rolePermission)
    .innerJoin(
      permission,
      eq(rolePermission.permissionFk, permission.permissionPk),
    );

  const keysByRole = new Map<number, PermissionKey[]>();
  for (const row of rolePermissionRows) {
    const keys = keysByRole.get(row.roleFk) ?? [];
    keys.push(row.key as PermissionKey);
    keysByRole.set(row.roleFk, keys);
  }

  /**
   * Each role goes down with the keys it holds. Whoever manages users cannot
   * open the Roles page — that page is limited to the one role that manages
   * roles — so without this they would be picking a role by its name alone.
   * The editor turns these keys into the plain list of pages the role opens.
   */
  const rolesWithPermissions = roles.map((r) => ({
    rolePk: r.rolePk,
    roleName: r.roleName,
    description: r.description,
    status: r.status,
    permissions: keysByRole.get(r.rolePk) ?? [],
  }));

  const orgUnits = await db
    .select()
    .from(orgUnit)
    .orderBy(asc(orgUnit.orgUnitName));

  /**
   * Everyone on file, with the username of their login attached when they
   * have one. The editor needs the whole list rather than only the people
   * without an account: somebody who already has one still has to appear,
   * greyed out, or an admin looking for them would think they were missing.
   */
  const employees = await db
    .select({
      employeePk: employee.employeePk,
      firstName: employee.firstName,
      middleName: employee.middleName,
      lastName: employee.lastName,
      suffix: employee.suffix,
      positionTitle: employee.positionTitle,
      employmentStatus: employee.employmentStatus,
      orgUnitName: orgUnit.orgUnitName,
      username: user.username,
    })
    .from(employee)
    .leftJoin(orgUnit, eq(employee.orgUnitFk, orgUnit.orgUnitPk))
    .leftJoin(user, eq(user.employeeFk, employee.employeePk))
    .orderBy(asc(employee.lastName), asc(employee.firstName));

  return {
    users,
    roles: rolesWithPermissions,
    orgUnits,
    employees,
    permissionDefs: PERMISSIONS,
    superAdminRolePk: await getSuperAdminRolePk(),
  };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_users")) {
      return fail(403, { error: "You do not have permission to add users." });
    }

    const form = await request.formData();
    const input = readUserForm(form);

    const invalid = validateUserForm(input);
    if (invalid) return fail(400, { error: invalid });

    const badEmployee = await validateEmployee(input.employeeFk);
    if (badEmployee) return fail(400, { error: badEmployee });

    const badRole = await validateRole(input);
    if (badRole) return fail(400, { error: badRole });

    /**
     * Only someone who can already manage roles may put another person on the
     * role that manages roles. Together with the rule that nobody changes
     * their own role, this leaves the bootstrap script and the existing
     * holders as the only ways onto it.
     */
    const superAdminRolePk = await getSuperAdminRolePk();
    if (
      input.roleFk === superAdminRolePk &&
      !can(locals.permissions, "admin:manage_roles")
    ) {
      return fail(403, {
        error:
          "Only someone already on that role can assign it. Ask them to add this account.",
      });
    }

    if (await isUsernameTaken(input.username)) {
      return fail(409, {
        error: `The username "${input.username}" is already taken. Pick a different one.`,
      });
    }

    // A typed password is optional: leaving it blank generates one, which is
    // the normal path. Either way it is temporary — mustChangePassword sends
    // this person straight to the change-password page on first sign-in.
    const typed = ((form.get("password") as string) ?? "").trim();
    if (typed) {
      const weak = getPasswordStrengthError(typed);
      if (weak) return fail(400, { error: weak });
    }

    const temporaryPassword = typed || generateTemporaryPassword();

    const result = await db.insert(user).values({
      employeeFk: input.employeeFk!,
      username: input.username,
      passwordHash: await hashPassword(temporaryPassword),
      roleFk: input.roleFk,
      accountStatus: input.accountStatus,
      mustChangePassword: true,
      createdByFk: locals.user?.userPk ?? null,
    });

    const newRow = await readUserRow(result[0].insertId);
    if (!newRow) {
      return fail(500, {
        error: "The account was saved but could not be read back.",
      });
    }

    return { success: true, newRow, temporaryPassword };
  },

  update: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_users")) {
      return fail(403, { error: "You do not have permission to edit users." });
    }

    const form = await request.formData();
    const userPk = Number(form.get("userPk"));
    const input = readUserForm(form);

    const [existing] = await db
      .select()
      .from(user)
      .where(eq(user.userPk, userPk));

    if (!existing) {
      return fail(404, { error: "That account no longer exists." });
    }

    const invalid = validateUserForm(input);
    if (invalid) return fail(400, { error: invalid });

    const badRole = await validateRole(input, existing);
    if (badRole) return fail(400, { error: badRole });

    /**
     * Switching an account on for somebody who has left is refused here as
     * well as being disabled in the editor. It would not let them in — the
     * sign-in checks employment — so all it could do is leave the Users page
     * claiming an account works when it does not.
     */
    if (
      input.accountStatus === "active" &&
      existing.accountStatus !== "active"
    ) {
      const [person] = await db
        .select({ employmentStatus: employee.employmentStatus })
        .from(employee)
        .where(eq(employee.employeePk, existing.employeeFk));

      if (person && person.employmentStatus !== "active") {
        return fail(409, {
          error:
            "This person is marked as no longer employed, so their account can't be switched back on. Mark them as employed again on the Employees page first.",
        });
      }
    }

    const isSelf = locals.user?.userPk === userPk;
    const roleChanged = existing.roleFk !== input.roleFk;

    /**
     * Nobody changes their own role, super-admins included. It stops
     * self-promotion, and it stops the quieter mistake in the other
     * direction — an admin moving themselves onto a role that cannot manage
     * users, and losing the only page that could undo it.
     */
    if (isSelf && roleChanged) {
      return fail(403, {
        error:
          "You can't change your own role. Ask another admin to do it for you.",
      });
    }

    // The same reasoning: switching off your own account locks you out of the
    // page that would switch it back on.
    if (isSelf && input.accountStatus === "inactive") {
      return fail(403, {
        error:
          "You can't deactivate your own account. Ask another admin to do it for you.",
      });
    }

    const superAdminRolePk = await getSuperAdminRolePk();

    // Moving somebody onto the role that manages roles and moving them off it
    // are equally restricted. Without the second half, whoever manages users
    // could still unilaterally demote one of two super-admins.
    if (
      roleChanged &&
      (input.roleFk === superAdminRolePk ||
        existing.roleFk === superAdminRolePk) &&
      !can(locals.permissions, "admin:manage_roles")
    ) {
      return fail(403, {
        error:
          "Only someone already on that role can assign or remove it. Ask them to make this change.",
      });
    }

    /**
     * There must always be at least one active account that can manage roles.
     * Both a role change and a deactivation can be the edit that empties that
     * group, so the check is on what the result would be rather than on which
     * field was touched.
     */
    const holdsNow =
      existing.roleFk === superAdminRolePk &&
      existing.accountStatus === "active";
    const holdsAfter =
      input.roleFk === superAdminRolePk && input.accountStatus === "active";

    if (holdsNow && !holdsAfter) {
      const holders = await countActiveSuperAdminUsers(superAdminRolePk);
      if (holders <= 1) {
        return fail(409, {
          error:
            "This is the last active account that can manage roles. Set up another one first, or nobody will be able to.",
        });
      }
    }

    if (await isUsernameTaken(input.username, userPk)) {
      return fail(409, {
        error: `The username "${input.username}" is already taken. Pick a different one.`,
      });
    }

    // Turning an account back on clears the failed-attempt lockout as well. An
    // admin reactivating an account means it should work, and a stale lockout
    // left behind would look like the change had not taken.
    const clearingLock = input.accountStatus === "active";

    // The name, position, and section are not here on purpose: they belong to
    // the person, not the login, and are edited on the Employees page.
    await db
      .update(user)
      .set({
        username: input.username,
        roleFk: input.roleFk,
        accountStatus: input.accountStatus,
        ...(clearingLock ? { failedLoginAttempts: 0, lockedUntil: null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(user.userPk, userPk));

    // A new role or a switched-off account takes effect now, not whenever
    // this person's current session happens to expire.
    if (roleChanged || input.accountStatus !== "active") {
      await endAllSessionsFor(userPk);
    }

    const updatedRow = await readUserRow(userPk);
    if (!updatedRow) {
      return fail(500, {
        error: "The account was saved but could not be read back.",
      });
    }

    return { success: true, updatedRow };
  },

  resetPassword: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_users")) {
      return fail(403, {
        error: "You do not have permission to reset passwords.",
      });
    }

    const form = await request.formData();
    const userPk = Number(form.get("userPk"));

    const [existing] = await db
      .select({ roleFk: user.roleFk })
      .from(user)
      .where(eq(user.userPk, userPk));

    if (!existing) {
      return fail(404, { error: "That account no longer exists." });
    }

    /**
     * A password reset hands over a way to sign in as that person, so it has
     * to respect the same boundary as assigning the role does. Otherwise the
     * front door would be shut while this stayed open: whoever manages users
     * could reset a super-admin's password and simply sign in as them.
     */
    const superAdminRolePk = await getSuperAdminRolePk();
    if (
      existing.roleFk === superAdminRolePk &&
      !can(locals.permissions, "admin:manage_roles")
    ) {
      return fail(403, {
        error:
          "Only someone on that role can reset this password. Ask them to do it.",
      });
    }

    const typed = ((form.get("password") as string) ?? "").trim();
    if (typed) {
      const weak = getPasswordStrengthError(typed);
      if (weak) return fail(400, { error: weak });
    }

    const temporaryPassword = typed || generateTemporaryPassword();

    await db
      .update(user)
      .set({
        passwordHash: await hashPassword(temporaryPassword),
        mustChangePassword: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(user.userPk, userPk));

    // Whoever knew the old password should not stay signed in on it.
    await endAllSessionsFor(userPk);

    const updatedRow = await readUserRow(userPk);
    if (!updatedRow) {
      return fail(500, {
        error: "The password was reset but the account could not be read back.",
      });
    }

    return { success: true, updatedRow, temporaryPassword };
  },

  unlock: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_users")) {
      return fail(403, {
        error: "You do not have permission to unlock accounts.",
      });
    }

    const form = await request.formData();
    const userPk = Number(form.get("userPk"));

    const [existing] = await db
      .select({ accountStatus: user.accountStatus })
      .from(user)
      .where(eq(user.userPk, userPk));

    if (!existing) {
      return fail(404, { error: "That account no longer exists." });
    }

    // Clears the failed-attempt lockout without touching the password. An
    // account an admin switched off stays off — that was a decision, not a
    // lockout, and it is undone from the editor instead.
    await db
      .update(user)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        ...(existing.accountStatus === "locked"
          ? { accountStatus: "active" as const }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(user.userPk, userPk));

    const updatedRow = await readUserRow(userPk);
    if (!updatedRow) {
      return fail(500, {
        error: "The account was unlocked but could not be read back.",
      });
    }

    return { success: true, updatedRow };
  },

  delete: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_users")) {
      return fail(403, {
        error: "You do not have permission to delete users.",
      });
    }

    const form = await request.formData();
    const userPk = Number(form.get("userPk"));

    if (locals.user?.userPk === userPk) {
      return fail(409, {
        error:
          "You can't delete your own account. Ask another admin to do it for you.",
      });
    }

    const [existing] = await db
      .select({ roleFk: user.roleFk, accountStatus: user.accountStatus })
      .from(user)
      .where(eq(user.userPk, userPk));

    if (!existing) {
      return fail(404, { error: "That account no longer exists." });
    }

    const superAdminRolePk = await getSuperAdminRolePk();

    // Deleting somebody off the role that manages roles changes who holds it,
    // so it needs the same standing as assigning it does.
    if (
      existing.roleFk === superAdminRolePk &&
      !can(locals.permissions, "admin:manage_roles")
    ) {
      return fail(403, {
        error:
          "Only someone on that role can delete this account. Ask them to do it.",
      });
    }

    if (
      existing.roleFk === superAdminRolePk &&
      existing.accountStatus === "active"
    ) {
      const holders = await countActiveSuperAdminUsers(superAdminRolePk);
      if (holders <= 1) {
        return fail(409, {
          error:
            "This is the last active account that can manage roles. Set up another one first, or nobody will be able to.",
        });
      }
    }

    // Session rows reference this user, so they go first — the foreign key
    // would otherwise refuse the delete.
    await endAllSessionsFor(userPk);

    // Roles this person created reference them through a foreign key declared
    // without a cascade, so MySQL would refuse the delete outright.
    await db
      .update(role)
      .set({ createdByFk: null })
      .where(eq(role.createdByFk, userPk));

    // Accounts they created record it in a plain column with no foreign key
    // behind it, so nothing would refuse the delete — but the number left
    // behind would point at a user_pk that no longer exists, and autoincrement
    // eventually hands that number to somebody else.
    await db
      .update(user)
      .set({ createdByFk: null })
      .where(eq(user.createdByFk, userPk));

    await db.delete(user).where(eq(user.userPk, userPk));

    return { success: true, deleted: true };
  },
};
