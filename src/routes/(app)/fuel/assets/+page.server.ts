import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import { asset, assetType } from "$lib/server/db/schema";
import { error, fail } from "@sveltejs/kit";
import { and, asc, eq, ne } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import type { AssetRow } from "./asset-row";
import { assetsUsingEachType, assetTypeActions } from "./types/actions.server";

const FUEL_TYPES = ["gasoline", "diesel"] as const;
type FuelType = (typeof FUEL_TYPES)[number];

/**
 * MySQL reports a broken constraint by number. 1062 is a duplicate value in
 * a unique index; 1451 is a row still referenced by a foreign key.
 */
function mysqlErrno(err: unknown) {
  return (err as { errno?: number })?.errno;
}

/** Every asset with the name and meter of its type, ordered for the table. */
function selectRows() {
  return db
    .select({
      assetPk: asset.assetPk,
      assetTypeFk: asset.assetTypeFk,
      assetName: asset.assetName,
      plateNumber: asset.plateNumber,
      propertyNumber: asset.propertyNumber,
      fuelType: asset.fuelType,
      status: asset.status,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      assetTypeName: assetType.assetTypeName,
      meterType: assetType.meterType,
    })
    .from(asset)
    .innerJoin(assetType, eq(asset.assetTypeFk, assetType.assetTypePk));
}

async function readBack(assetPk: number): Promise<AssetRow | null> {
  const [row] = await selectRows().where(eq(asset.assetPk, assetPk));
  return row ?? null;
}

function readForm(form: FormData) {
  // An empty plate is stored as NULL rather than "", because the unique
  // index treats every "" as the same value and only one asset could go
  // without a plate. Upper-cased so "sab 1234" and "SAB 1234" read alike in
  // the table; the index already treats them as the same.
  const plate = String(form.get("plateNumber") ?? "")
    .trim()
    .toUpperCase();

  return {
    assetTypeFk: Number(form.get("assetTypeFk")),
    assetName: String(form.get("assetName") ?? "").trim(),
    plateNumber: plate || null,
    propertyNumber: String(form.get("propertyNumber") ?? "").trim(),
    fuelType: form.get("fuelType") as FuelType,
  };
}

type FormValues = ReturnType<typeof readForm>;

/**
 * Checks shared by both writes. The type is looked up here because the
 * plate rule depends on its meter, and because only an active type may
 * be picked — except the one an asset already has, so an asset whose type
 * was switched off can still be edited without being forced onto another.
 */
async function rejectionReason(values: FormValues, currentTypeFk?: number) {
  if (!values.assetTypeFk) return "Choose the asset type.";
  if (!values.assetName) return "Enter a name for the asset.";
  if (!values.propertyNumber) return "Enter the property number.";
  if (!FUEL_TYPES.includes(values.fuelType)) {
    return "Choose gasoline or diesel.";
  }

  const [type] = await db
    .select()
    .from(assetType)
    .where(eq(assetType.assetTypePk, values.assetTypeFk));
  if (!type) return "That asset type no longer exists.";
  if (type.status === "inactive" && type.assetTypePk !== currentTypeFk) {
    return `${type.assetTypeName} is inactive.`;
  }
  if (type.meterType === "odometer" && !values.plateNumber) {
    return `Enter the plate number. A ${type.assetTypeName} runs on the road, so it has one.`;
  }
  return null;
}

/**
 * Which unique value is already taken, worded for the admin. Looked up
 * rather than read from the MySQL error, whose message names the index and
 * not anything the admin typed.
 */
async function duplicateMessage(values: FormValues, exceptPk?: number) {
  const notSelf = exceptPk ? ne(asset.assetPk, exceptPk) : undefined;

  const [byProperty] = await db
    .select({ assetName: asset.assetName })
    .from(asset)
    .where(and(eq(asset.propertyNumber, values.propertyNumber), notSelf));
  if (byProperty) {
    return `Property number ${values.propertyNumber} is already on ${byProperty.assetName}.`;
  }

  if (values.plateNumber) {
    const [byPlate] = await db
      .select({ assetName: asset.assetName })
      .from(asset)
      .where(and(eq(asset.plateNumber, values.plateNumber), notSelf));
    if (byPlate) {
      return `Plate number ${values.plateNumber} is already on ${byPlate.assetName}.`;
    }
  }
  return null;
}

export const load: PageServerLoad = async ({ locals }) => {
  if (!can(locals.permissions, "assets:view")) {
    throw error(403, "You do not have permission to view this page.");
  }

  const assets = await selectRows().orderBy(
    asc(asset.assetName),
    asc(asset.plateNumber),
  );

  // All types, not only active ones: the asset types dialog lists every one,
  // and an asset being edited may sit under a type that has since been
  // deactivated, so its current type still has to show in the picker.
  const typeRows = await db
    .select()
    .from(assetType)
    .orderBy(asc(assetType.assetTypeName));

  // Counted once for the whole page rather than when Delete is pressed, so
  // the confirmation opens already knowing which of its two forms to take.
  // The delete action re-checks, so a stale count costs a refused delete,
  // never a wrong one.
  const usage = await assetsUsingEachType();
  const assetTypes = typeRows.map((row) => ({
    ...row,
    usage: usage.get(row.assetTypePk) ?? { count: 0, sample: [] },
  }));

  return { assets, assetTypes };
};

export const actions: Actions = {
  ...assetTypeActions,

  create: async ({ request, locals }) => {
    if (!can(locals.permissions, "assets:manage")) {
      return fail(403, { error: "You do not have permission to do this." });
    }

    const values = readForm(await request.formData());
    const reason = await rejectionReason(values);
    if (reason) return fail(400, { error: reason });

    // Checked before saving only to word the message. The unique indexes
    // are what actually stop a duplicate, caught below for the case where
    // somebody saves the same number in between.
    const duplicate = await duplicateMessage(values);
    if (duplicate) return fail(409, { error: duplicate });

    let insertId: number;
    try {
      const result = await db.insert(asset).values(values);
      insertId = result[0].insertId;
    } catch (err) {
      if (mysqlErrno(err) === 1062) {
        return fail(409, {
          error:
            (await duplicateMessage(values)) ??
            "That number was taken a moment ago.",
        });
      }
      throw err;
    }

    const newRow = await readBack(insertId);
    if (!newRow) {
      return fail(500, {
        error: "It was saved, but could not be read back afterwards.",
      });
    }

    return { success: true, newRow: newRow satisfies AssetRow };
  },

  update: async ({ request, locals }) => {
    if (!can(locals.permissions, "assets:manage")) {
      return fail(403, { error: "You do not have permission to do this." });
    }

    const form = await request.formData();
    const assetPk = Number(form.get("assetPk"));
    const status = form.get("status") === "inactive" ? "inactive" : "active";
    const values = readForm(form);

    const current = await readBack(assetPk);
    if (!current) return fail(404, { error: "That asset no longer exists." });

    const reason = await rejectionReason(values, current.assetTypeFk);
    if (reason) return fail(400, { error: reason });

    const duplicate = await duplicateMessage(values, assetPk);
    if (duplicate) return fail(409, { error: duplicate });

    try {
      await db
        .update(asset)
        .set({ ...values, status, updatedAt: new Date() })
        .where(eq(asset.assetPk, assetPk));
    } catch (err) {
      if (mysqlErrno(err) === 1062) {
        return fail(409, {
          error:
            (await duplicateMessage(values, assetPk)) ??
            "That number was taken a moment ago.",
        });
      }
      throw err;
    }

    const updatedRow = await readBack(assetPk);
    if (!updatedRow) {
      return fail(404, { error: "That asset no longer exists." });
    }

    return { success: true, updatedRow: updatedRow satisfies AssetRow };
  },

  /**
   * Switching an asset on or off from the row menu, without opening the
   * edit dialog. Separate from `update` because the menu has no name, plate
   * or fuel to send, only the new status.
   */
  setStatus: async ({ request, locals }) => {
    if (!can(locals.permissions, "assets:manage")) {
      return fail(403, { error: "You do not have permission to do this." });
    }

    const form = await request.formData();
    const assetPk = Number(form.get("assetPk"));
    const status = form.get("status") === "inactive" ? "inactive" : "active";

    await db
      .update(asset)
      .set({ status, updatedAt: new Date() })
      .where(eq(asset.assetPk, assetPk));

    const updatedRow = await readBack(assetPk);
    if (!updatedRow) {
      return fail(404, { error: "That asset no longer exists." });
    }

    return { success: true, updatedRow: updatedRow satisfies AssetRow };
  },

  remove: async ({ request, locals }) => {
    if (!can(locals.permissions, "assets:manage")) {
      return fail(403, { error: "You do not have permission to do this." });
    }

    const form = await request.formData();
    const assetPk = Number(form.get("assetPk"));

    const row = await readBack(assetPk);
    if (!row) return fail(404, { error: "That asset no longer exists." });

    // Nothing points at an asset yet. Once fuel records do, the foreign key
    // refuses the delete. The page does not load fuel records, so the check
    // happens here, and the delete dialog shows the refusal with Deactivate
    // in place of Delete. `deactivateInstead` is false when the asset is
    // already inactive, because then there is nothing left to offer.
    try {
      await db.delete(asset).where(eq(asset.assetPk, assetPk));
    } catch (err) {
      if (mysqlErrno(err) === 1451) {
        const active = row.status === "active";
        return fail(409, {
          error: active
            ? "Fuel is already recorded for this asset. Deactivate it instead."
            : "Fuel is already recorded for this asset, so it stays in the system.",
          deactivateInstead: active,
        });
      }
      throw err;
    }

    return { success: true, deletedPk: assetPk };
  },
};
