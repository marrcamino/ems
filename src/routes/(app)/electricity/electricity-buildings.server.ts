import { db } from "$lib/server/db";
import { electricityBuilding } from "$lib/server/db/schema";
import { asc } from "drizzle-orm";

/**
 * Every building, active or not, in the order it was added, which is the
 * workbook's order. `order` is its place in that list, so a building keeps its
 * colour on the Summary when another one is made inactive.
 */
export async function allBuildings() {
  const rows = await db
    .select()
    .from(electricityBuilding)
    .orderBy(asc(electricityBuilding.electricityBuildingPk));
  return rows.map((b, order) => ({
    buildingPk: b.electricityBuildingPk,
    name: b.name,
    status: b.status,
    order,
  }));
}
