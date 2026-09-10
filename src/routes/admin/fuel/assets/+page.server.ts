import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import { assetType } from "$lib/server/db/schema";
import { error } from "@sveltejs/kit";
import { asc, eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!can(locals.permissions, "admin:view_assets")) {
    throw error(403, "You do not have permission to view this page.");
  }

  // Only the count is needed here — the page links through to the types
  // screen rather than listing them. It is read so the link can say whether
  // there is anything behind it yet, which is the difference between "manage
  // the types" and "there are none, start here".
  const activeTypes = await db
    .select({ assetTypePk: assetType.assetTypePk })
    .from(assetType)
    .where(eq(assetType.status, "active"))
    .orderBy(asc(assetType.assetTypeName));

  return { activeAssetTypeCount: activeTypes.length };
};
