import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import { purchaseOrder, supplier } from "$lib/server/db/schema";
import type { Supplier } from "@/types";
import { fail, type Actions } from "@sveltejs/kit";
import { and, asc, count, eq, ne } from "drizzle-orm";
import { groupTin, normalizeTin, TIN_FORMAT_ERROR } from "./tin";

export type SupplierStatus = "active" | "archived";

/**
 * The suppliers with one status, by name. Only active ones come with the
 * page; archived ones are fetched when the dialog is switched to show them,
 * because the archive only grows and is rarely looked at.
 */
export function selectSuppliers(status: SupplierStatus) {
  return db
    .select()
    .from(supplier)
    .where(eq(supplier.status, status))
    .orderBy(asc(supplier.supplierName));
}


function readForm(form: FormData) {
  const philgeps = String(form.get("philgepsNumber") ?? "").trim();
  return {
    supplierName: String(form.get("supplierName") ?? "").trim(),
    businessAddress: String(form.get("businessAddress") ?? "").trim(),
    // Null when it cannot be read as a TIN, which rejectionReason reports.
    tin: normalizeTin(String(form.get("tin") ?? "")),
    // Stored as NULL rather than "" when left empty, the same as an asset's
    // plate number.
    philgepsNumber: philgeps || null,
  };
}

type FormValues = ReturnType<typeof readForm>;

/**
 * What is wrong with the form, as `{ field, error }` so the dialog can show
 * the message under the field it belongs to. Only reachable with the
 * browser's own checks bypassed, except for the TIN shape.
 */
function rejectionReason(values: FormValues) {
  if (!values.supplierName) {
    return { field: "supplierName", error: "Enter the supplier's name." };
  }
  if (!values.businessAddress) {
    return { field: "businessAddress", error: "Enter the business address." };
  }
  if (!values.tin) return { field: "tin", error: TIN_FORMAT_ERROR };
  return null;
}

/**
 * MySQL reports a broken constraint by number. 1062 is a duplicate value in
 * a unique index; 1451 is a row still referenced by a foreign key.
 */
function mysqlErrno(err: unknown) {
  return (err as { errno?: number })?.errno;
}

/**
 * Which supplier already has this TIN, worded for the admin. Looked up
 * rather than read from the MySQL error, whose message names the index and
 * not the supplier. An archived one is named as such, because it is hidden
 * on the Active tab and the admin would otherwise not find it.
 */
async function tinClash(tin: string, exceptPk?: number) {
  const [row] = await db
    .select({ supplierName: supplier.supplierName, status: supplier.status })
    .from(supplier)
    .where(
      and(
        eq(supplier.tin, tin),
        exceptPk ? ne(supplier.supplierPk, exceptPk) : undefined,
      ),
    );
  if (!row) return null;
  const error =
    row.status === "archived"
      ? `TIN ${groupTin(tin)} is already on ${row.supplierName}, which is archived. Restore it instead.`
      : `TIN ${groupTin(tin)} is already on ${row.supplierName}.`;
  return { field: "tin", error };
}

function namedOnPos(supplierName: string, total: number) {
  const pos = total === 1 ? "1 purchase order names it" : `${total} purchase orders name it`;
  return `${supplierName} can't be deleted because ${pos}. Archive it instead.`;
}

async function readBack(supplierPk: number) {
  const [row] = await db
    .select()
    .from(supplier)
    .where(eq(supplier.supplierPk, supplierPk));
  return row ?? null;
}

/**
 * The supplier writes, served from the purchase orders page, where suppliers
 * are managed in a dialog. Prefixed with `Supplier` so they sit beside the
 * purchase order actions without clashing.
 */
export const supplierActions = {
  createSupplier: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_purchase_orders")) {
      return fail(403, { error: "You do not have permission to do this." });
    }

    const values = readForm(await request.formData());
    const reason = rejectionReason(values);
    if (reason) return fail(400, reason);
    const tin = values.tin!;

    // Checked before saving only to word the message. The unique index is
    // what actually stops a duplicate, caught below for the case where
    // somebody saves the same TIN in between.
    const clash = await tinClash(tin);
    if (clash) return fail(409, clash);

    let insertId: number;
    try {
      const result = await db.insert(supplier).values({ ...values, tin });
      insertId = result[0].insertId;
    } catch (err) {
      if (mysqlErrno(err) === 1062) {
        return fail(
          409,
          (await tinClash(tin)) ?? {
            field: "tin",
            error: "That TIN was taken a moment ago.",
          },
        );
      }
      throw err;
    }

    const newRow = await readBack(insertId);
    if (!newRow) {
      return fail(500, {
        error: "It was saved, but could not be read back afterwards.",
      });
    }

    return { success: true, newRow: newRow satisfies Supplier };
  },

  updateSupplier: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_purchase_orders")) {
      return fail(403, { error: "You do not have permission to do this." });
    }

    const form = await request.formData();
    const supplierPk = Number(form.get("supplierPk"));
    const values = readForm(form);

    const reason = rejectionReason(values);
    if (reason) return fail(400, reason);
    const tin = values.tin!;

    const clash = await tinClash(tin, supplierPk);
    if (clash) return fail(409, clash);

    try {
      await db
        .update(supplier)
        .set({ ...values, tin, updatedAt: new Date() })
        .where(eq(supplier.supplierPk, supplierPk));
    } catch (err) {
      if (mysqlErrno(err) === 1062) {
        return fail(409, {
          field: "tin",
          error: "That TIN was taken a moment ago.",
        });
      }
      throw err;
    }

    const updatedRow = await readBack(supplierPk);
    if (!updatedRow) {
      return fail(404, { error: "That supplier no longer exists." });
    }

    return { success: true, updatedRow: updatedRow satisfies Supplier };
  },

  /**
   * Archives a supplier or restores it, straight from its card menu.
   */
  setSupplierStatus: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_purchase_orders")) {
      return fail(403, { error: "You do not have permission to do this." });
    }

    const form = await request.formData();
    const supplierPk = Number(form.get("supplierPk"));
    const status = form.get("status") === "archived" ? "archived" : "active";

    await db
      .update(supplier)
      .set({ status, updatedAt: new Date() })
      .where(eq(supplier.supplierPk, supplierPk));

    const updatedRow = await readBack(supplierPk);
    if (!updatedRow) {
      return fail(404, { error: "That supplier no longer exists." });
    }

    return { success: true, updatedRow: updatedRow satisfies Supplier };
  },

  // Refused once a PO names the supplier: the PO is kept for audit, and it
  // must go on showing who it was bought from. Archiving is the way to stop
  // using such a supplier.
  removeSupplier: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_purchase_orders")) {
      return fail(403, { error: "You do not have permission to do this." });
    }

    const form = await request.formData();
    const supplierPk = Number(form.get("supplierPk"));

    const row = await readBack(supplierPk);
    if (!row) return fail(404, { error: "That supplier no longer exists." });

    const [{ total }] = await db
      .select({ total: count() })
      .from(purchaseOrder)
      .where(eq(purchaseOrder.supplierFk, supplierPk));
    if (total > 0) return fail(409, { error: namedOnPos(row.supplierName, total) });

    try {
      await db.delete(supplier).where(eq(supplier.supplierPk, supplierPk));
    } catch (err) {
      // 1451: a PO was added for this supplier in the moment since the count.
      if (mysqlErrno(err) === 1451) {
        return fail(409, { error: namedOnPos(row.supplierName, 1) });
      }
      throw err;
    }

    return { success: true, deletedPk: supplierPk };
  },
} satisfies Actions;
