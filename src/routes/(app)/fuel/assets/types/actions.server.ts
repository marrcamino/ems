import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import { asset, assetType } from "$lib/server/db/schema";
import type { AssetType } from "@/types";
import { fail, type Actions } from "@sveltejs/kit";
import { asc, eq } from "drizzle-orm";
import { countUsage, inUseMessage, type TypeUsage } from "./types";

const METER_TYPES = ["odometer", "hour_meter", "none"] as const;
type MeterType = (typeof METER_TYPES)[number];

/**
 * How many assets each type is recorded on, with a few of their names for
 * the delete confirmation to quote. Read in one pass and grouped here: the
 * office has tens of assets, not thousands, so one plain select is simpler
 * than a grouped count plus a second query for the names.
 */
export async function assetsUsingEachType(): Promise<Map<number, TypeUsage>> {
  const rows = await db
    .select({ assetTypeFk: asset.assetTypeFk, assetName: asset.assetName })
    .from(asset)
    .orderBy(asc(asset.assetName));

  return countUsage(rows);
}

function readForm(form: FormData) {
  const assetTypeName = String(form.get("assetTypeName") ?? "").trim();
  const meterType = form.get("meterType") as MeterType;
  return { assetTypeName, meterType };
}

/**
 * Both writes reject the same two things, so the check lives here rather
 * than being written twice and drifting apart. A blank name is what a
 * whitespace-only entry arrives as; an unrecognised meter is only reachable
 * from a hand-built request, since the form offers three choices.
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
 * MySQL reports a broken constraint by number. 1062 is a duplicate value in
 * a unique index; 1451 is a row still referenced by a foreign key.
 *
 * These are caught rather than only pre-checked, because a pre-check and the
 * write are two separate moments. Two admins saving the same name at once
 * both pass the check, and only the index stops the second one.
 */
function mysqlErrno(err: unknown) {
  return (err as { errno?: number })?.errno;
}

async function findByName(assetTypeName: string) {
  const [row] = await db
    .select()
    .from(assetType)
    .where(eq(assetType.assetTypeName, assetTypeName));
  return row ?? null;
}

async function readBack(assetTypePk: number) {
  const [row] = await db
    .select()
    .from(assetType)
    .where(eq(assetType.assetTypePk, assetTypePk));
  return row ?? null;
}

/**
 * What to say when the name is taken. The two cases differ only in whether
 * the row in the way is still active, but that is the whole difference
 * between a dead end and an offer, so an inactive row is sent
 * back for the page to offer using it again.
 */
function nameClash(clash: AssetType) {
  if (clash.status === "inactive") {
    return fail(409, {
      error: `There is already a ${clash.assetTypeName}, but it is inactive.`,
      noLongerUsed: clash satisfies AssetType,
    });
  }

  return fail(409, {
    error: `There is already an asset type called ${clash.assetTypeName}.`,
  });
}

/**
 * The asset type writes, served from the assets page now that asset types
 * are managed in a dialog there instead of on a page of their own. Prefixed
 * with `Type` so they sit beside the asset actions without clashing.
 */
export const assetTypeActions = {
  createType: async ({ request, locals }) => {
    if (!can(locals.permissions, "assets:manage")) {
      return fail(403, { error: "You do not have permission to do this." });
    }

    const values = readForm(await request.formData());
    const reason = rejectionReason(values);
    if (reason) return fail(400, { error: reason });

    // Looked up before saving only to decide what the admin is told. The
    // unique index is what actually prevents a second row, and it is caught
    // below for the case where somebody saves the same name in between.
    const clash = await findByName(values.assetTypeName);
    if (clash) return nameClash(clash);

    let insertId: number;
    try {
      const result = await db.insert(assetType).values(values);
      insertId = result[0].insertId;
    } catch (err) {
      if (mysqlErrno(err) === 1062) {
        const saved = await findByName(values.assetTypeName);
        return saved
          ? nameClash(saved)
          : fail(409, { error: "That name was taken a moment ago." });
      }
      throw err;
    }

    const newRow = await readBack(insertId);
    if (!newRow) {
      return fail(500, {
        error: "It was saved, but could not be read back afterwards.",
      });
    }

    return { success: true, newRow: newRow satisfies AssetType };
  },

  updateType: async ({ request, locals }) => {
    if (!can(locals.permissions, "assets:manage")) {
      return fail(403, { error: "You do not have permission to do this." });
    }

    const form = await request.formData();
    const assetTypePk = Number(form.get("assetTypePk"));
    const status = form.get("status") === "inactive" ? "inactive" : "active";
    const values = readForm(form);

    const reason = rejectionReason(values);
    if (reason) return fail(400, { error: reason });

    const clash = await findByName(values.assetTypeName);
    if (clash && clash.assetTypePk !== assetTypePk) return nameClash(clash);

    try {
      await db
        .update(assetType)
        .set({ ...values, status, updatedAt: new Date() })
        .where(eq(assetType.assetTypePk, assetTypePk));
    } catch (err) {
      if (mysqlErrno(err) === 1062) {
        return fail(409, { error: "That name was taken a moment ago." });
      }
      throw err;
    }

    const updatedRow = await readBack(assetTypePk);
    if (!updatedRow) {
      return fail(404, { error: "That asset type no longer exists." });
    }

    return { success: true, updatedRow: updatedRow satisfies AssetType };
  },

  /**
   * Switching a type off on its own. Separate from `update` because the
   * confirmation that offers it has no name or meter to send — it acts on a
   * row the admin never opened.
   */
  setTypeStatus: async ({ request, locals }) => {
    if (!can(locals.permissions, "assets:manage")) {
      return fail(403, { error: "You do not have permission to do this." });
    }

    const form = await request.formData();
    const assetTypePk = Number(form.get("assetTypePk"));
    const status = form.get("status") === "inactive" ? "inactive" : "active";

    await db
      .update(assetType)
      .set({ status, updatedAt: new Date() })
      .where(eq(assetType.assetTypePk, assetTypePk));

    const updatedRow = await readBack(assetTypePk);
    if (!updatedRow) {
      return fail(404, { error: "That asset type no longer exists." });
    }

    return { success: true, updatedRow: updatedRow satisfies AssetType };
  },

  removeType: async ({ request, locals }) => {
    if (!can(locals.permissions, "assets:manage")) {
      return fail(403, { error: "You do not have permission to do this." });
    }

    const form = await request.formData();
    const assetTypePk = Number(form.get("assetTypePk"));

    const row = await readBack(assetTypePk);
    if (!row) return fail(404, { error: "That asset type no longer exists." });

    // Re-counted here rather than trusting the number the page was loaded
    // with, which may be minutes old by now.
    const usage = (await assetsUsingEachType()).get(assetTypePk);
    if (usage && usage.count > 0) {
      return fail(409, { error: inUseMessage(row.assetTypeName, usage) });
    }

    try {
      await db.delete(assetType).where(eq(assetType.assetTypePk, assetTypePk));
    } catch (err) {
      if (mysqlErrno(err) === 1451) {
        return fail(409, {
          error: `An asset was recorded as ${row.assetTypeName} a moment ago, so nothing was deleted.`,
        });
      }
      throw err;
    }

    return { success: true, deletedPk: assetTypePk };
  },
} satisfies Actions;
