import { can } from "$lib/rbac/access";
import { getConfigValues } from "$lib/server/config";
import { db } from "$lib/server/db";
import { config, CONFIG_KEYS, employee, orgUnit } from "$lib/server/db/schema";
import { error, fail } from "@sveltejs/kit";
import { and, asc, eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!can(locals.permissions, "admin:view_signatories")) {
    throw error(403, "You do not have permission to view this page.");
  }

  // Read through src/lib/server/config.ts, so both settings arrive as numbers
  // rather than as the text they are stored in.
  const settings = await getConfigValues([
    CONFIG_KEYS.gsuUnit,
    CONFIG_KEYS.fuelUsualApprover,
  ]);

  // Only active units are offered. An inactive one cannot be chosen here, and
  // the guard in src/lib/server/org-unit-guard.ts is what stops a unit already
  // chosen from being deactivated underneath this setting.
  const orgUnits = await db
    .select()
    .from(orgUnit)
    .where(eq(orgUnit.status, "active"))
    .orderBy(asc(orgUnit.orgUnitName));

  // Anybody still working at the agency may be the approver. Somebody marked
  // separated is left out, which is also what clears a stale setting below.
  const employees = await db
    .select({
      employeePk: employee.employeePk,
      firstName: employee.firstName,
      middleName: employee.middleName,
      lastName: employee.lastName,
      suffix: employee.suffix,
      positionTitle: employee.positionTitle,
    })
    .from(employee)
    .where(eq(employee.employmentStatus, "active"))
    .orderBy(asc(employee.lastName), asc(employee.firstName));

  // A setting pointing at somebody who has left reads as empty rather than
  // naming them. Nothing warns anybody: the approver simply comes up blank,
  // and whoever prepares the next document picks who signs now.
  const storedApprover = settings[CONFIG_KEYS.fuelUsualApprover];
  const approverStillHere = employees.some(
    ({ employeePk }) => employeePk === storedApprover,
  );

  // Back to strings here, and only here, because that is what the selects on
  // the page bind to.
  const asValue = (id: number | null) => (id === null ? "" : String(id));

  return {
    gsuUnitPk: asValue(settings[CONFIG_KEYS.gsuUnit]),
    usualApproverPk: approverStillHere ? asValue(storedApprover) : "",
    orgUnits,
    employees,
  };
};

/** Writes one setting, creating the row the first time. */
async function writeSetting(
  key: string,
  value: string | null,
  userPk: number | null,
) {
  await db
    .insert(config)
    .values({ configKey: key, configValue: value, updatedByFk: userPk })
    .onDuplicateKeyUpdate({
      set: { configValue: value, updatedByFk: userPk, updatedAt: new Date() },
    });
}

const NO_PERMISSION = "You do not have permission to change signatories.";
const GONE = "That item is no longer there. Refresh the page and try again.";

export const actions: Actions = {
  setGsuUnit: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_signatories")) {
      return fail(403, { error: NO_PERMISSION });
    }

    const form = await request.formData();
    const raw = ((form.get("orgUnitPk") as string) ?? "").trim();

    // Empty clears the setting. The page then offers nobody for the blocks
    // that read it, which is better than quietly keeping a stale unit.
    let value: string | null = null;

    if (raw) {
      const orgUnitPk = Number(raw);

      // The browser only ever offers real, active units, so this is here for a
      // request sent by hand rather than for anything the page can produce.
      const [chosen] = await db
        .select({ pk: orgUnit.orgUnitPk })
        .from(orgUnit)
        .where(
          and(eq(orgUnit.orgUnitPk, orgUnitPk), eq(orgUnit.status, "active")),
        );

      if (!chosen) return fail(409, { error: GONE });

      value = String(orgUnitPk);
    }

    await writeSetting(CONFIG_KEYS.gsuUnit, value, locals.user?.userPk ?? null);
    return { success: true };
  },

  setUsualApprover: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_signatories")) {
      return fail(403, { error: NO_PERMISSION });
    }

    const form = await request.formData();
    const raw = ((form.get("employeePk") as string) ?? "").trim();

    // This one is optional by design, so clearing it is an ordinary thing to
    // do rather than an error. The two "Approved by" blocks then start empty.
    let value: string | null = null;

    if (raw) {
      const employeePk = Number(raw);

      const [chosen] = await db
        .select({ pk: employee.employeePk })
        .from(employee)
        .where(
          and(
            eq(employee.employeePk, employeePk),
            eq(employee.employmentStatus, "active"),
          ),
        );

      if (!chosen) return fail(409, { error: GONE });

      value = String(employeePk);
    }

    await writeSetting(
      CONFIG_KEYS.fuelUsualApprover,
      value,
      locals.user?.userPk ?? null,
    );
    return { success: true };
  },
};
