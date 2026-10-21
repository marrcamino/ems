import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import {
  orgUnit,
  purchaseOrder,
  purchaseOrderAllocation,
  purchaseOrderItem,
  supplier,
} from "$lib/server/db/schema";
import { fail, type Actions } from "@sveltejs/kit";
import { formatLiters } from "$lib/utils/format-number";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getLocalTimeZone, today } from "@internationalized/date";
import {
  FUEL_LABELS,
  FUELS,
  fromHundredths,
  MAX_HUNDREDTHS,
  toHundredths,
  type Fuel,
} from "./po-math";
import type { PurchaseOrderRow, UnitOption } from "./po-types";

/**
 * The divisions, sections, units and offices that an allocation can go to: the
 * active ones on the Organizational Structure page, offices first and then
 * down the levels, each level by name.
 */
export async function selectUnitOptions(): Promise<UnitOption[]> {
  const rows = await db
    .select({
      orgUnitPk: orgUnit.orgUnitPk,
      orgUnitName: orgUnit.orgUnitName,
      abbr: orgUnit.abbr,
      level: orgUnit.level,
    })
    .from(orgUnit)
    .where(eq(orgUnit.status, "active"))
    .orderBy(asc(orgUnit.orgUnitName));

  const order = ["office", "division", "section", "unit"];
  return rows.sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));
}

/**
 * Every PO with its supplier, fuel rows and allocations, newest PO date
 * first, for the list on the page.
 */
export async function selectPurchaseOrders(): Promise<PurchaseOrderRow[]> {
  const orders = await db
    .select({
      purchaseOrderPk: purchaseOrder.purchaseOrderPk,
      poNumber: purchaseOrder.poNumber,
      poDate: purchaseOrder.poDate,
      supplierFk: purchaseOrder.supplierFk,
      supplierName: supplier.supplierName,
      note: purchaseOrder.note,
    })
    .from(purchaseOrder)
    .innerJoin(supplier, eq(purchaseOrder.supplierFk, supplier.supplierPk))
    .orderBy(desc(purchaseOrder.poDate), desc(purchaseOrder.purchaseOrderPk));

  if (orders.length === 0) return [];

  const items = await db
    .select({
      purchaseOrderItemPk: purchaseOrderItem.purchaseOrderItemPk,
      purchaseOrderFk: purchaseOrderItem.purchaseOrderFk,
      fuelType: purchaseOrderItem.fuelType,
      liters: purchaseOrderItem.liters,
      unitCost: purchaseOrderItem.unitCost,
    })
    .from(purchaseOrderItem)
    .where(
      inArray(
        purchaseOrderItem.purchaseOrderFk,
        orders.map((o) => o.purchaseOrderPk),
      ),
    );

  // Each fuel row's allocations, with the unit's short name for the card.
  const allocations =
    items.length === 0
      ? []
      : await db
          .select({
            purchaseOrderItemFk: purchaseOrderAllocation.purchaseOrderItemFk,
            orgUnitPk: orgUnit.orgUnitPk,
            orgUnitName: orgUnit.orgUnitName,
            abbr: orgUnit.abbr,
            level: orgUnit.level,
            liters: purchaseOrderAllocation.liters,
          })
          .from(purchaseOrderAllocation)
          .innerJoin(
            orgUnit,
            eq(purchaseOrderAllocation.orgUnitFk, orgUnit.orgUnitPk),
          )
          .where(
            inArray(
              purchaseOrderAllocation.purchaseOrderItemFk,
              items.map((i) => i.purchaseOrderItemPk),
            ),
          )
          .orderBy(asc(purchaseOrderAllocation.purchaseOrderAllocationPk));

  return orders.map((order) => ({
    ...order,
    items: items
      .filter((item) => item.purchaseOrderFk === order.purchaseOrderPk)
      .map(({ purchaseOrderItemPk, fuelType, liters, unitCost }) => ({
        fuelType,
        litersH: toHundredths(liters) ?? 0,
        unitCostC: toHundredths(unitCost) ?? 0,
        allocations: allocations
          .filter((a) => a.purchaseOrderItemFk === purchaseOrderItemPk)
          .map(({ liters, ...unit }) => ({
            ...unit,
            litersH: toHundredths(liters) ?? 0,
          })),
      })),
  }));
}

/** What the dialog sends, as JSON in one form field. */
type Payload = {
  poNumber?: unknown;
  poDate?: unknown;
  supplierFk?: unknown;
  note?: unknown;
  items?: {
    fuelType?: unknown;
    liters?: unknown;
    unitCost?: unknown;
    allocations?: { orgUnitFk?: unknown; liters?: unknown }[];
  }[];
};

type Checked = {
  poNumber: string;
  poDate: string;
  supplierFk: number;
  note: string | null;
  items: {
    fuelType: Fuel;
    litersH: number;
    unitCostC: number;
    allocations: { orgUnitFk: number; litersH: number }[];
  }[];
};

/**
 * A refusal, with the field it belongs to when there is one, so the dialog
 * can show it there. Fields: `poNumber`, `poDate`, `supplierFk`, and
 * `<fuel>` for a problem with one fuel's row or its allocations.
 */
type Refusal = { field?: string; error: string };

function isRefusal(value: Checked | Refusal): value is Refusal {
  return "error" in value;
}

/**
 * What an edited PO may keep although it could not be chosen for a new one:
 * its own supplier if it was archived since, and its own units if they were
 * deactivated since.
 */
type Kept = { supplierFk: number; unitPks: Set<number> };

/**
 * Everything the dialog already checks, checked again, since a request can
 * be sent without the dialog. Plus what only the server can know: whether
 * the supplier and units are still active, and whether the PO number is
 * taken.
 */
async function check(
  payload: Payload,
  kept: Kept = { supplierFk: 0, unitPks: new Set() },
): Promise<Checked | Refusal> {
  const poNumber = String(payload.poNumber ?? "").trim();
  if (!poNumber) return { field: "poNumber", error: "Enter the PO number." };
  if (poNumber.length > 50) {
    return { field: "poNumber", error: "Shorten the PO number to 50 characters." };
  }

  const poDate = String(payload.poDate ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(poDate) || Number.isNaN(Date.parse(poDate))) {
    return { field: "poDate", error: "Enter the date on the PO." };
  }
  // The same rule as the date field: a PO is never dated later than today.
  // Plain text comparison works, since both are yyyy-mm-dd.
  if (poDate > today(getLocalTimeZone()).toString()) {
    return { field: "poDate", error: "Enter a date on or before today." };
  }

  const supplierFk = Number(payload.supplierFk);
  const [chosen] = supplierFk
    ? await db
        .select({ status: supplier.status, supplierName: supplier.supplierName })
        .from(supplier)
        .where(eq(supplier.supplierPk, supplierFk))
    : [];
  if (!chosen) return { field: "supplierFk", error: "Choose the supplier." };
  if (chosen.status !== "active" && supplierFk !== kept.supplierFk) {
    return {
      field: "supplierFk",
      error: `${chosen.supplierName} is archived. Restore it, or choose another supplier.`,
    };
  }

  const note = String(payload.note ?? "").trim();
  if (note.length > 255) {
    return { error: "Shorten the note to 255 characters." };
  }

  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  if (rawItems.length === 0) {
    return { error: "Enter the liters and unit cost of at least one fuel." };
  }

  const items: Checked["items"] = [];
  const unitPks = new Set<number>();
  for (const raw of rawItems) {
    const fuelType = raw.fuelType as Fuel;
    if (!FUELS.includes(fuelType) || items.some((i) => i.fuelType === fuelType)) {
      return { error: "Each fuel can appear on the PO only once." };
    }
    const label = FUEL_LABELS[fuelType];
    const litersH = toHundredths(raw.liters as string);
    const unitCostC = toHundredths(raw.unitCost as string);
    if (!litersH) {
      return { field: fuelType, error: `Enter the ${label.toLowerCase()} liters.` };
    }
    if (!unitCostC) {
      return { field: fuelType, error: `Enter the ${label.toLowerCase()} unit cost.` };
    }
    // The dialog stops the typing at 999.99; this catches a request that
    // did not come through it.
    if (litersH > MAX_HUNDREDTHS) {
      return { field: fuelType, error: `Enter at most 999.99 liters of ${label.toLowerCase()}.` };
    }
    if (unitCostC > MAX_HUNDREDTHS) {
      return { field: fuelType, error: `Enter a ${label.toLowerCase()} unit cost of at most ₱999.99.` };
    }

    const allocations: { orgUnitFk: number; litersH: number }[] = [];
    for (const allocation of raw.allocations ?? []) {
      const orgUnitFk = Number(allocation.orgUnitFk);
      const allocationH = toHundredths(allocation.liters as string);
      if (!orgUnitFk) {
        return { field: fuelType, error: `Choose a unit for each ${label.toLowerCase()} allocation.` };
      }
      if (!allocationH) {
        return { field: fuelType, error: `Enter the liters of each ${label.toLowerCase()} allocation.` };
      }
      if (allocations.some((a) => a.orgUnitFk === orgUnitFk)) {
        return { field: fuelType, error: `Each unit can have only one ${label.toLowerCase()} allocation.` };
      }
      allocations.push({ orgUnitFk, litersH: allocationH });
      if (!kept.unitPks.has(orgUnitFk)) unitPks.add(orgUnitFk);
    }

    if (allocations.length === 0) {
      return { field: fuelType, error: `Allocate the ${label.toLowerCase()} to at least one unit.` };
    }
    const allocatedH = allocations.reduce((sum, a) => sum + a.litersH, 0);
    if (allocatedH !== litersH) {
      return {
        field: fuelType,
        error: `The ${label.toLowerCase()} allocations add up to ${formatLiters(allocatedH)}, but the PO has ${formatLiters(litersH)}.`,
      };
    }

    items.push({ fuelType, litersH, unitCostC, allocations });
  }

  const activeUnits =
    unitPks.size === 0
      ? []
      : await db
          .select({ orgUnitPk: orgUnit.orgUnitPk })
          .from(orgUnit)
          .where(
            and(
              inArray(orgUnit.orgUnitPk, [...unitPks]),
              eq(orgUnit.status, "active"),
            ),
          );
  if (activeUnits.length !== unitPks.size) {
    return { error: "A unit was deactivated a moment ago. Choose the units again." };
  }

  return { poNumber, poDate, supplierFk, note: note || null, items };
}

/** MySQL reports a broken constraint by number; 1062 is a duplicate value. */
function mysqlErrno(err: unknown) {
  return (err as { errno?: number })?.errno;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The fuel rows and their allocations, inside the caller's transaction. */
async function insertItems(
  tx: Tx,
  purchaseOrderPk: number,
  items: Checked["items"],
) {
  for (const item of items) {
    const [row] = await tx.insert(purchaseOrderItem).values({
      purchaseOrderFk: purchaseOrderPk,
      fuelType: item.fuelType,
      liters: fromHundredths(item.litersH),
      unitCost: fromHundredths(item.unitCostC),
    });
    await tx.insert(purchaseOrderAllocation).values(
      item.allocations.map((a) => ({
        purchaseOrderItemFk: row.insertId,
        orgUnitFk: a.orgUnitFk,
        liters: fromHundredths(a.litersH),
      })),
    );
  }
}

function poNumberTaken(poNumber: string): Refusal {
  return { field: "poNumber", error: `PO ${poNumber} is already recorded.` };
}

export const purchaseOrderActions = {
  createPurchaseOrder: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_purchase_orders")) {
      return fail(403, { error: "You do not have permission to do this." });
    }

    let payload: Payload;
    try {
      payload = JSON.parse(String((await request.formData()).get("payload")));
    } catch {
      return fail(400, { error: "The form could not be read. Try again." });
    }

    const checked = await check(payload);
    if (isRefusal(checked)) return fail(400, checked);

    // Looked up first only to say which field is wrong. The unique index is
    // what actually stops a second copy, caught below.
    const [taken] = await db
      .select({ pk: purchaseOrder.purchaseOrderPk })
      .from(purchaseOrder)
      .where(eq(purchaseOrder.poNumber, checked.poNumber));
    if (taken) return fail(409, poNumberTaken(checked.poNumber));

    let purchaseOrderPk: number;
    try {
      // One transaction, so a PO is never saved without its allocations.
      purchaseOrderPk = await db.transaction(async (tx) => {
        const [po] = await tx.insert(purchaseOrder).values({
          poNumber: checked.poNumber,
          poDate: checked.poDate,
          supplierFk: checked.supplierFk,
          note: checked.note,
          createdByFk: locals.user?.userPk ?? null,
        });

        await insertItems(tx, po.insertId, checked.items);
        return po.insertId;
      });
    } catch (err) {
      if (mysqlErrno(err) === 1062) {
        return fail(409, poNumberTaken(checked.poNumber));
      }
      throw err;
    }

    const newRow = (await selectPurchaseOrders()).find(
      (row) => row.purchaseOrderPk === purchaseOrderPk,
    );
    if (!newRow) {
      return fail(500, {
        error: "It was saved, but could not be read back afterwards.",
      });
    }

    return { success: true, newRow };
  },

  /**
   * Saves an edited PO: its details, and its fuel rows and allocations,
   * which are replaced as a whole rather than matched up row by row.
   *
   * TODO(MPP-60): once withdrawals exist (MPP-80), refuse an edit that leaves
   * a unit's allocation below what that unit has already used: lowering its
   * liters, removing it, or lowering the fuel's unit cost. Refuse any edit to
   * a closed PO (MPP-106). Replacing the rows will then also need care, since
   * slips will point at allocations. Nothing is used yet, so nothing is
   * checked today.
   */
  updatePurchaseOrder: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_purchase_orders")) {
      return fail(403, { error: "You do not have permission to do this." });
    }

    let payload: Payload & { purchaseOrderPk?: unknown };
    try {
      payload = JSON.parse(String((await request.formData()).get("payload")));
    } catch {
      return fail(400, { error: "The form could not be read. Try again." });
    }

    const purchaseOrderPk = Number(payload.purchaseOrderPk);
    const existing = purchaseOrderPk
      ? (await selectPurchaseOrders()).find(
          (row) => row.purchaseOrderPk === purchaseOrderPk,
        )
      : undefined;
    if (!existing) return fail(404, { error: "That PO no longer exists." });

    const checked = await check(payload, {
      supplierFk: existing.supplierFk,
      unitPks: new Set(
        existing.items.flatMap((i) => i.allocations.map((a) => a.orgUnitPk)),
      ),
    });
    if (isRefusal(checked)) return fail(400, checked);

    const [taken] = await db
      .select({ pk: purchaseOrder.purchaseOrderPk })
      .from(purchaseOrder)
      .where(eq(purchaseOrder.poNumber, checked.poNumber));
    if (taken && taken.pk !== purchaseOrderPk) {
      return fail(409, poNumberTaken(checked.poNumber));
    }

    try {
      await db.transaction(async (tx) => {
        await tx
          .update(purchaseOrder)
          .set({
            poNumber: checked.poNumber,
            poDate: checked.poDate,
            supplierFk: checked.supplierFk,
            note: checked.note,
            updatedAt: new Date(),
          })
          .where(eq(purchaseOrder.purchaseOrderPk, purchaseOrderPk));
        // The allocations go with their fuel rows (the foreign key cascades).
        await tx
          .delete(purchaseOrderItem)
          .where(eq(purchaseOrderItem.purchaseOrderFk, purchaseOrderPk));
        await insertItems(tx, purchaseOrderPk, checked.items);
      });
    } catch (err) {
      if (mysqlErrno(err) === 1062) {
        return fail(409, poNumberTaken(checked.poNumber));
      }
      throw err;
    }

    const newRow = (await selectPurchaseOrders()).find(
      (row) => row.purchaseOrderPk === purchaseOrderPk,
    );
    if (!newRow) {
      return fail(500, {
        error: "It was saved, but could not be read back afterwards.",
      });
    }

    return { success: true, newRow };
  },

  /**
   * Deletes a PO, with its fuel rows and allocations (the foreign keys
   * cascade).
   *
   * TODO(MPP-60): check before deleting. A PO is part of the audit trail, so
   * Delete is only for a PO typed by mistake. Refuse it once any withdrawal
   * slip is charged to the PO, and once the PO is closed; say which in the
   * message. Withdrawal slips and closing do not exist yet, so nothing is
   * checked today.
   */
  deletePurchaseOrder: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_purchase_orders")) {
      return fail(403, { error: "You do not have permission to do this." });
    }

    const purchaseOrderPk = Number(
      (await request.formData()).get("purchaseOrderPk"),
    );
    if (!purchaseOrderPk) {
      return fail(400, { error: "The form could not be read. Try again." });
    }

    const [deleted] = await db
      .delete(purchaseOrder)
      .where(eq(purchaseOrder.purchaseOrderPk, purchaseOrderPk));
    if (deleted.affectedRows === 0) {
      return fail(404, { error: "That PO no longer exists." });
    }

    return { success: true, deletedPk: purchaseOrderPk };
  },
} satisfies Actions;
