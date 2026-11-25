import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import {
  electricityBuilding,
  electricityConsumption,
} from "$lib/server/db/schema";
import { error, fail } from "@sveltejs/kit";
import { asc, count, eq } from "drizzle-orm";
import type { ElectricityBuilding } from "../electricity-types";
import type { Actions, PageServerLoad } from "./$types";

/**
 * The buildings whose electricity is recorded on their own, kept by whoever
 * records electricity (cards/electricity.md). A building is never deleted,
 * only made inactive, because entries point at it.
 */

const MAX_NAME = 100;

function deny(locals: App.Locals) {
  if (!can(locals.permissions, "electricity:manage")) {
    return fail(403, { error: "You do not have permission to do this." });
  }
  return null;
}

/** The name from the form, checked. */
function readName(form: FormData): { name: string } | { error: string } {
  const name = String(form.get("name") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!name) return { error: "Enter the building's name." };
  if (name.length > MAX_NAME) {
    return { error: `Shorten the name to ${MAX_NAME} characters.` };
  }
  return { name };
}

/** The building with this name, ignoring case, as MySQL compares it. */
async function findByName(name: string) {
  const [row] = await db
    .select()
    .from(electricityBuilding)
    .where(eq(electricityBuilding.name, name));
  return row ?? null;
}

function taken(existing: { status: string }) {
  return existing.status === "inactive"
    ? "This building is already on the list, as inactive. Make it active instead."
    : "This building is already on the list.";
}

export const load: PageServerLoad = async ({ locals }) => {
  if (!can(locals.permissions, "electricity:view")) {
    throw error(403, "You do not have permission to view this page.");
  }

  const rows = await db
    .select({
      building: electricityBuilding,
      entries: count(electricityConsumption.electricityConsumptionPk),
    })
    .from(electricityBuilding)
    .leftJoin(
      electricityConsumption,
      eq(
        electricityConsumption.electricityBuildingFk,
        electricityBuilding.electricityBuildingPk,
      ),
    )
    .groupBy(electricityBuilding.electricityBuildingPk)
    .orderBy(asc(electricityBuilding.electricityBuildingPk));

  const buildings: ElectricityBuilding[] = rows.map(
    ({ building: b, entries }, order) => ({
      buildingPk: b.electricityBuildingPk,
      name: b.name,
      status: b.status,
      order,
      entries,
    }),
  );

  return { buildings };
};

export const actions: Actions = {
  add: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const read = readName(await request.formData());
    if ("error" in read) return fail(400, { error: read.error });

    const existing = await findByName(read.name);
    if (existing) return fail(409, { error: taken(existing) });

    await db
      .insert(electricityBuilding)
      .values({ name: read.name, createdByFk: locals.user!.userPk });
    return { success: true };
  },

  // A new name shows on every entry of the building, past months included:
  // it corrects the name, it does not make a new building.
  edit: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const form = await request.formData();
    const buildingPk = Number(form.get("buildingPk"));
    const read = readName(form);
    if ("error" in read) return fail(400, { error: read.error });

    const existing = await findByName(read.name);
    if (existing && existing.electricityBuildingPk !== buildingPk) {
      return fail(409, { error: taken(existing) });
    }

    const result = await db
      .update(electricityBuilding)
      .set({ name: read.name, updatedAt: new Date() })
      .where(eq(electricityBuilding.electricityBuildingPk, buildingPk));
    if (result[0].affectedRows === 0) {
      return fail(404, { error: "That building no longer exists." });
    }
    return { success: true };
  },

  setStatus: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const form = await request.formData();
    const buildingPk = Number(form.get("buildingPk"));
    const status = form.get("status") === "inactive" ? "inactive" : "active";
    const result = await db
      .update(electricityBuilding)
      .set({ status, updatedAt: new Date() })
      .where(eq(electricityBuilding.electricityBuildingPk, buildingPk));
    if (result[0].affectedRows === 0) {
      return fail(404, { error: "That building no longer exists." });
    }
    return { success: true };
  },
};
