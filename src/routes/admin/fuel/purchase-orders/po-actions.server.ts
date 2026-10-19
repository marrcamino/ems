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
 * Every PO with its supplier and fuel rows, newest PO date first, for the
 * list on the page.
 */
export async function selectPurchaseOrders(): Promise<PurchaseOrderRow[]> {
  const orders = await db
    .select({
      purchaseOrderPk: purchaseOrder.purchaseOrderPk,
      poNumber: purchaseOrder.poNumber,
      poDate: purchaseOrder.poDate,
      supplierName: supplier.supplierName,
      note: purchaseOrder.note,
    })
    .from(purchaseOrder)
    .innerJoin(supplier, eq(purchaseOrder.supplierFk, supplier.supplierPk))
    .orderBy(desc(purchaseOrder.poDate), desc(purchaseOrder.purchaseOrderPk));

  if (orders.length === 0) return [];

  const items = await db
    .select({
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

  return orders.map((order) => ({
    ...order,
    items: items
      .filter((item) => item.purchaseOrderFk === order.purchaseOrderPk)
      .map(({ fuelType, liters, unitCost }) => ({
        fuelType,
        litersH: toHundredths(liters) ?? 0,
        unitCostC: toHundredths(unitCost) ?? 0,
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
 * Everything the dialog already checks, checked again, since a request can
 * be sent without the dialog. Plus what only the server can know: whether
 * the supplier and units are still active, and whether the PO number is
 * taken.
 */
async function check(payload: Payload): Promise<Checked | Refusal> {
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
  if (chosen.status !== "active") {
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
      unitPks.add(orgUnitFk);
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

  const activeUnits = await db
    .select({ orgUnitPk: orgUnit.orgUnitPk })
    .from(orgUnit)
    .where(
      and(inArray(orgUnit.orgUnitPk, [...unitPks]), eq(orgUnit.status, "active")),
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

        for (const item of checked.items) {
          const [row] = await tx.insert(purchaseOrderItem).values({
            purchaseOrderFk: po.insertId,
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
} satisfies Actions;
