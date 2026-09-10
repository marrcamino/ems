import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import { assetType } from "$lib/server/db/schema";
import type { AssetType } from "@/types";
import { error, fail } from "@sveltejs/kit";
import { asc, eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

const METER_TYPES = ["odometer", "hour_meter", "none"] as const;
type MeterType = (typeof METER_TYPES)[number];

function readForm(form: FormData) {
  const assetTypeName = String(form.get("assetTypeName") ?? "").trim();
  const meterType = form.get("meterType") as MeterType;
  return { assetTypeName, meterType };
}

/**
 * Both writes below reject the same two things, so the check lives here
 * rather than being written twice and drifting apart. A blank name is what a
 * whitespace-only entry arrives as; an unrecognised meter type is only
 * reachable by a hand-built request, since the form offers three choices.
 */
function rejectionReason({
  assetTypeName,
  meterType,
}: ReturnType<typeof readForm>) {
  if (!assetTypeName) return "Enter a name for the asset type.";
  if (!METER_TYPES.includes(meterType)) return "Choose which meter it has.";
  return null;
}

/**
 * MySQL reports a broken unique index by number, and 1062 is the duplicate
 * one. Caught rather than pre-checked with a SELECT, because two people
 * saving the same new name at once would both pass the check and only the
 * index would stop the second.
 */
function isDuplicateName(err: unknown) {
  return (err as { errno?: number })?.errno === 1062;
}

export const load: PageServerLoad = async ({ locals }) => {
  if (!can(locals.permissions, "admin:view_assets")) {
    throw error(403, "You do not have permission to view this page.");
  }

  const assetTypes = await db
    .select()
    .from(assetType)
    .orderBy(asc(assetType.assetTypeName));

  return { assetTypes };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_assets")) {
      return fail(403, { error: "You do not have permission to do this." });
    }

    const values = readForm(await request.formData());
    const reason = rejectionReason(values);
    if (reason) return fail(400, { error: reason });

    let insertId: number;
    try {
      const result = await db.insert(assetType).values(values);
      insertId = result[0].insertId;
    } catch (err) {
      if (isDuplicateName(err)) {
        return fail(409, {
          error: `There is already an asset type called "${values.assetTypeName}".`,
        });
      }
      throw err;
    }

    const [newRow] = await db
      .select()
      .from(assetType)
      .where(eq(assetType.assetTypePk, insertId));

    if (!newRow) {
      return fail(500, {
        error: "It was saved, but could not be read back afterwards.",
      });
    }

    return { success: true, newRow: newRow satisfies AssetType };
  },

  update: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_assets")) {
      return fail(403, { error: "You do not have permission to do this." });
    }

    const form = await request.formData();
    const assetTypePk = Number(form.get("assetTypePk"));
    const status = form.get("status") === "inactive" ? "inactive" : "active";
    const values = readForm(form);

    const reason = rejectionReason(values);
    if (reason) return fail(400, { error: reason });

    try {
      await db
        .update(assetType)
        .set({ ...values, status, updatedAt: new Date() })
        .where(eq(assetType.assetTypePk, assetTypePk));
    } catch (err) {
      if (isDuplicateName(err)) {
        return fail(409, {
          error: `There is already an asset type called "${values.assetTypeName}".`,
        });
      }
      throw err;
    }

    const [updatedRow] = await db
      .select()
      .from(assetType)
      .where(eq(assetType.assetTypePk, assetTypePk));

    if (!updatedRow) {
      return fail(404, { error: "That asset type no longer exists." });
    }

    return { success: true, updatedRow: updatedRow satisfies AssetType };
  },
};
