import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import { config, CONFIG_KEYS, orgUnit } from "$lib/server/db/schema";
import { error, fail } from "@sveltejs/kit";
import { and, asc, eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!can(locals.permissions, "admin:view_settings")) {
    throw error(403, "You do not have permission to view this page.");
  }

  const [gsuUnitSetting] = await db
    .select()
    .from(config)
    .where(eq(config.configKey, CONFIG_KEYS.gsuUnit));

  // Only active units are offered. An inactive one cannot be chosen here, and
  // the guard in src/lib/server/org-unit-guard.ts is what stops a unit already
  // chosen from being deactivated underneath this setting.
  const orgUnits = await db
    .select()
    .from(orgUnit)
    .where(eq(orgUnit.status, "active"))
    .orderBy(asc(orgUnit.orgUnitName));

  return {
    // A string, because that is what the select on the page binds to.
    gsuUnitPk: gsuUnitSetting?.configValue ?? "",
    orgUnits,
  };
};

export const actions: Actions = {
  setGsuUnit: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_settings")) {
      return fail(403, {
        error: "You do not have permission to change settings.",
      });
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

      if (!chosen) {
        return fail(409, {
          error: "That item is no longer there. Refresh the page and try again.",
        });
      }

      value = String(orgUnitPk);
    }

    await db
      .insert(config)
      .values({
        configKey: CONFIG_KEYS.gsuUnit,
        configValue: value,
        updatedByFk: locals.user?.userPk ?? null,
      })
      .onDuplicateKeyUpdate({
        set: {
          configValue: value,
          updatedByFk: locals.user?.userPk ?? null,
          updatedAt: new Date(),
        },
      });

    return { success: true };
  },
};
