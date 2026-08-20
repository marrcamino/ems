// src/routes/admin/org-units/+page.server.ts
import { db } from "$lib/server/db";
import { orgUnit, user } from "$lib/server/db/schema";
import type { OrgUnit } from "@/types";
import { fail } from "@sveltejs/kit";
import { and, asc, eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { nextLevel } from "./context.svelte";

export const load: PageServerLoad = async () => {
  const orgUnits = await db
    .select()
    .from(orgUnit)
    .orderBy(asc(orgUnit.orgUnitName));
  return { orgUnits };
};

export const actions: Actions = {
  create: async ({ request }) => {
    const form = await request.formData();
    const level = form.get("level") as
      | "office"
      | "division"
      | "section"
      | "unit";
    let parentFk = form.get("parentFk") ? Number(form.get("parentFk")) : null;
    const orgUnitName = form.get("orgUnitName") as string;
    const abbr = (form.get("abbr") as string) || null;

    if (level === "division") {
      const [officeParentFk] = await db
        .select()
        .from(orgUnit)
        .where(eq(orgUnit.level, "office"));
      parentFk = officeParentFk.orgUnitPk;
    }
    const result = await db
      .insert(orgUnit)
      .values({ orgUnitName, abbr, level, parentFk });

    const [newRow] = await db
      .select()
      .from(orgUnit)
      .where(eq(orgUnit.orgUnitPk, result[0].insertId));

    if (!newRow)
      return fail(500, {
        error: "Insert succeeded but row could not be read back.",
      });

    return { success: true, newRow };
  },

  update: async ({ request }) => {
    async function getUpdatedRow(orgUnitPk: number) {
      const [updatedRow] = await db
        .select()
        .from(orgUnit)
        .where(eq(orgUnit.orgUnitPk, orgUnitPk));
      return updatedRow;
    }

    const form = await request.formData();
    const orgUnitPk = Number(form.get("orgUnitPk"));
    const status = form.get("status") as "active" | "inactive";

    // Check what is the current status of the org unit
    // If user wants to set to active again
    if (status === "active") {
      const [orgUnitCurrentStatus] = await db
        .select({ status: orgUnit.status })
        .from(orgUnit)
        .where(eq(orgUnit.orgUnitPk, orgUnitPk));

      if (orgUnitCurrentStatus.status === "inactive") {
        await db
          .update(orgUnit)
          .set({ status: "active" })
          .where(eq(orgUnit.orgUnitPk, orgUnitPk));

        return { success: true, updatedRow: await getUpdatedRow(orgUnitPk) };
      }
    }

    // Declared here because some enrty value will missing if the status is active
    // Having inactive in the UI will set the inputs disabled
    const orgUnitName = form.get("orgUnitName") as string;
    const parentFk = form.get("parentFk") ? Number(form.get("parentFk")) : null;
    const abbr = (form.get("abbr") as string) || null;
    const level = form.get("level") as OrgUnit["level"];

    if (status === "inactive") {
      const [activeChild] = await db
        .select({ pk: orgUnit.orgUnitPk })
        .from(orgUnit)
        .where(
          and(eq(orgUnit.parentFk, orgUnitPk), eq(orgUnit.status, "active")),
        );

      if (activeChild) {
        return fail(409, {
          error: `This ${level} still has active ${nextLevel(level)}s under it. Move or deactivate them first.`,
        });
      }
    }

    await db
      .update(orgUnit)
      .set({ orgUnitName, parentFk, status, abbr })
      .where(eq(orgUnit.orgUnitPk, orgUnitPk));

    return { success: true, updatedRow: await getUpdatedRow(orgUnitPk) };
  },

  delete: async ({ request }) => {
    const form = await request.formData();
    const orgUnitPk = Number(form.get("orgUnitPk"));
    const level = form.get("level") as OrgUnit["level"];

    const [anyChild] = await db
      .select({ pk: orgUnit.orgUnitPk })
      .from(orgUnit)
      .where(eq(orgUnit.parentFk, orgUnitPk));

    if (anyChild) {
      return fail(409, {
        error: `This ${level} still has ${nextLevel(level)}s under it and can't be deleted. You can mark it inactive from the edit menu instead.`,
      });
    }

    const [linkedUser] = await db
      .select({ pk: user.userPk })
      .from(user)
      .where(eq(user.orgUnitFk, orgUnitPk));

    if (linkedUser) {
      return fail(409, {
        error:
          "One or more users are assigned to this item and it can't be deleted. You can mark it inactive from the edit menu instead.",
      });
    }

    try {
      await db.delete(orgUnit).where(eq(orgUnit.orgUnitPk, orgUnitPk));
      return { success: true, deleted: true };
    } catch (err) {
      return fail(409, { error: "This item is in use and can't be deleted." });
    }
  },
};
