import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import {
  orgUnit,
  paperDistribution,
  paperHandover,
  paperMonthlyReport,
  paperPurchaseOrder,
  paperPurchaseOrderItem,
  supplier,
} from "$lib/server/db/schema";
import {
  isPaperSize,
  PAPER_SIZES,
  paperSizeLabel,
  type PaperSize,
} from "$lib/paper-sizes";
import { getLocalTimeZone, today } from "@internationalized/date";
import { fail, type Actions } from "@sveltejs/kit";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { reamCount } from "../paper-month";
import { MAX_REAMS, type PaperPoRow } from "./paper-po-types";

const sizeOrder = (size: PaperSize) =>
  PAPER_SIZES.findIndex((s) => s.value === size);

/** Every paper PO with its sizes and distributions, newest PO date first. */
export async function selectPaperPurchaseOrders(): Promise<PaperPoRow[]> {
  const orders = await db
    .select({
      paperPurchaseOrderPk: paperPurchaseOrder.paperPurchaseOrderPk,
      poNumber: paperPurchaseOrder.poNumber,
      poDate: paperPurchaseOrder.poDate,
      supplierFk: paperPurchaseOrder.supplierFk,
      supplierName: supplier.supplierName,
      remarks: paperPurchaseOrder.remarks,
    })
    .from(paperPurchaseOrder)
    .leftJoin(supplier, eq(paperPurchaseOrder.supplierFk, supplier.supplierPk))
    .orderBy(
      desc(paperPurchaseOrder.poDate),
      desc(paperPurchaseOrder.paperPurchaseOrderPk),
    );
  if (orders.length === 0) return [];

  const items = await db
    .select()
    .from(paperPurchaseOrderItem)
    .where(
      inArray(
        paperPurchaseOrderItem.paperPurchaseOrderFk,
        orders.map((o) => o.paperPurchaseOrderPk),
      ),
    );

  const distributions =
    items.length === 0
      ? []
      : await db
          .select({
            itemFk: paperDistribution.paperPurchaseOrderItemFk,
            reams: paperDistribution.reams,
            orgUnitPk: orgUnit.orgUnitPk,
            orgUnitName: orgUnit.orgUnitName,
            abbr: orgUnit.abbr,
          })
          .from(paperDistribution)
          .innerJoin(
            orgUnit,
            eq(paperDistribution.orgUnitFk, orgUnit.orgUnitPk),
          )
          .where(
            inArray(
              paperDistribution.paperPurchaseOrderItemFk,
              items.map((i) => i.paperPurchaseOrderItemPk),
            ),
          )
          .orderBy(asc(paperDistribution.paperDistributionPk));

  const handovers = await db
    .select()
    .from(paperHandover)
    .where(
      inArray(
        paperHandover.paperPurchaseOrderFk,
        orders.map((o) => o.paperPurchaseOrderPk),
      ),
    )
    .orderBy(asc(paperHandover.handedOn), asc(paperHandover.paperHandoverPk));

  return orders.map((order) => {
    const own = items
      .filter((i) => i.paperPurchaseOrderFk === order.paperPurchaseOrderPk)
      .sort((a, b) => sizeOrder(a.paperSize) - sizeOrder(b.paperSize));

    // One row per office, gathering its reams of each size.
    const offices = new Map<number, PaperPoRow["distributions"][number]>();
    for (const d of distributions) {
      const item = own.find((i) => i.paperPurchaseOrderItemPk === d.itemFk);
      if (!item) continue;
      const row = offices.get(d.orgUnitPk) ?? {
        orgUnitPk: d.orgUnitPk,
        orgUnitName: d.orgUnitName,
        abbr: d.abbr,
        reams: {},
        handed: {},
        handovers: [],
      };
      row.reams[item.paperSize] = d.reams;
      offices.set(d.orgUnitPk, row);
    }

    // What each office was handed, in total and one entry per day.
    for (const h of handovers) {
      if (h.paperPurchaseOrderFk !== order.paperPurchaseOrderPk) continue;
      const row = offices.get(h.orgUnitFk);
      if (!row) continue;
      row.handed[h.paperSize] = (row.handed[h.paperSize] ?? 0) + h.reams;
      let day = row.handovers.find((x) => x.handedOn === h.handedOn);
      if (!day) {
        day = { handedOn: h.handedOn, reams: {} };
        row.handovers.push(day);
      }
      day.reams[h.paperSize] = (day.reams[h.paperSize] ?? 0) + h.reams;
    }

    return {
      ...order,
      items: own.map((i) => ({
        paperSize: i.paperSize,
        reams: i.reams,
        stockNumber: i.stockNumber,
      })),
      distributions: [...offices.values()],
    };
  });
}

/** What the dialog sends, as JSON in one form field. */
type Payload = {
  paperPurchaseOrderPk?: unknown;
  poNumber?: unknown;
  poDate?: unknown;
  supplierFk?: unknown;
  remarks?: unknown;
  handOverOn?: unknown;
  items?: { paperSize?: unknown; reams?: unknown; stockNumber?: unknown }[];
  distributions?: { orgUnitFk?: unknown; reams?: Record<string, unknown> }[];
  stock?: { orgUnitFk?: unknown; reams?: Record<string, unknown> }[];
};

type Checked = {
  poNumber: string;
  poDate: string;
  supplierFk: number;
  remarks: string | null;
  /** On a new PO, the day all of it was handed over; null when GSU holds it. */
  handOverOn: string | null;
  items: { paperSize: PaperSize; reams: number; stockNumber: string | null }[];
  distributions: { orgUnitFk: number; reams: Map<PaperSize, number> }[];
  /** Only on a new PO: what GSU keeps of each office's share. */
  stock: Map<number, Map<PaperSize, number>>;
};

/**
 * A refusal, with the field it belongs to when there is one: `poNumber`,
 * `poDate`, `supplierFk`, `items` (the sizes on the PO), `handOverOn`, or `distribution`.
 */
type Refusal = { field?: string; error: string };

const isRefusal = (value: Checked | Refusal): value is Refusal =>
  "error" in value;

const isIsoDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

const wholeReams = (value: unknown) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n <= MAX_REAMS ? n : null;
};

/**
 * The dialog's checks, made again, plus what only the server knows: whether
 * the supplier and offices are still active. An edited PO may keep its own
 * supplier and offices even if they were archived or deactivated since.
 */
async function check(
  payload: Payload,
  keptOfficePks = new Set<number>(),
  keptSupplierFk: number | null = null,
): Promise<Checked | Refusal> {
  const poNumber = String(payload.poNumber ?? "").trim();
  if (!poNumber) return { field: "poNumber", error: "Enter the PO number." };
  if (poNumber.length > 50) {
    return {
      field: "poNumber",
      error: "Shorten the PO number to 50 characters.",
    };
  }

  const todayIso = today(getLocalTimeZone()).toString();
  const poDate = String(payload.poDate ?? "");
  if (!isIsoDate(poDate)) {
    return { field: "poDate", error: "Enter the date on the PO." };
  }
  if (poDate > todayIso) {
    return { field: "poDate", error: "Enter a date on or before today." };
  }

  const supplierFk = Number(payload.supplierFk);
  const [chosen] = supplierFk
    ? await db
        .select({
          status: supplier.status,
          supplierName: supplier.supplierName,
        })
        .from(supplier)
        .where(eq(supplier.supplierPk, supplierFk))
    : [];
  if (!chosen) return { field: "supplierFk", error: "Choose the supplier." };
  if (chosen.status !== "active" && supplierFk !== keptSupplierFk) {
    return {
      field: "supplierFk",
      error: `${chosen.supplierName} is archived. Restore it, or choose another supplier.`,
    };
  }

  const remarks = String(payload.remarks ?? "").trim();
  if (remarks.length > 255) {
    return {
      field: "remarks",
      error: "Shorten the remarks to 255 characters.",
    };
  }

  // Only on a new PO: the day every office got all of its share. Empty
  // when GSU holds the paper for now and hands it over later.
  const handOverOn = String(payload.handOverOn ?? "") || null;
  if (handOverOn !== null) {
    if (!isIsoDate(handOverOn)) {
      return {
        field: "handOverOn",
        error: "Enter the date GSU handed over the paper.",
      };
    }
    if (handOverOn < poDate || handOverOn > todayIso) {
      return {
        field: "handOverOn",
        error: "Enter a date from the PO date to today.",
      };
    }
  }

  const items: Checked["items"] = [];
  for (const raw of Array.isArray(payload.items) ? payload.items : []) {
    const reams = wholeReams(raw.reams);
    if (
      !isPaperSize(raw.paperSize) ||
      items.some((i) => i.paperSize === raw.paperSize)
    ) {
      return { field: "items", error: "Each size can be on the PO only once." };
    }
    if (!reams) {
      return {
        field: "items",
        error: `Enter the reams of each size, up to ${MAX_REAMS.toLocaleString("en-PH")}.`,
      };
    }
    const stockNumber = String(raw.stockNumber ?? "").trim();
    if (stockNumber.length > 50) {
      return {
        field: "stockNumbers",
        error: "Shorten the stock no. to 50 characters.",
      };
    }
    items.push({
      paperSize: raw.paperSize,
      reams,
      stockNumber: stockNumber || null,
    });
  }
  if (items.length === 0) {
    return { field: "items", error: "Enter the reams of at least one size." };
  }

  const distributions: Checked["distributions"] = [];
  const newOffices = new Set<number>();
  for (const raw of Array.isArray(payload.distributions)
    ? payload.distributions
    : []) {
    const orgUnitFk = Number(raw.orgUnitFk);
    if (!orgUnitFk) {
      return { field: "distribution", error: "Choose an office for each row." };
    }
    if (distributions.some((d) => d.orgUnitFk === orgUnitFk)) {
      return {
        field: "distribution",
        error: "Each office can have only one row.",
      };
    }
    const reams = new Map<PaperSize, number>();
    for (const [size, value] of Object.entries(raw.reams ?? {})) {
      if (value === null || value === "" || value === 0) continue;
      const n = wholeReams(value);
      if (
        !isPaperSize(size) ||
        !items.some((i) => i.paperSize === size) ||
        !n
      ) {
        return {
          field: "distribution",
          error: "Enter whole reams, only of the sizes on the PO.",
        };
      }
      reams.set(size, n);
    }
    if (reams.size === 0) {
      return {
        field: "distribution",
        error: "Enter the reams for each office, or remove its row.",
      };
    }
    distributions.push({ orgUnitFk, reams });
    if (!keptOfficePks.has(orgUnitFk)) newOffices.add(orgUnitFk);
  }

  for (const item of items) {
    const given = distributions.reduce(
      (sum, d) => sum + (d.reams.get(item.paperSize) ?? 0),
      0,
    );
    // Every ream on the PO is allocated to an office, strictly
    // (paper-consumption.md); GSU may still hold some of it for the office.
    if (given !== item.reams) {
      const label = paperSizeLabel(item.paperSize);
      return {
        field: "distribution",
        error: `Allocate exactly ${reamCount(item.reams)} of ${label}, the reams on the PO. The offices are allocated ${reamCount(given)}.`,
      };
    }
  }

  if (newOffices.size > 0) {
    const active = await db
      .select({ orgUnitPk: orgUnit.orgUnitPk })
      .from(orgUnit)
      .where(
        and(
          inArray(orgUnit.orgUnitPk, [...newOffices]),
          eq(orgUnit.status, "active"),
        ),
      );
    if (active.length !== newOffices.size) {
      return {
        field: "distribution",
        error:
          "An office was deactivated a moment ago. Choose the offices again.",
      };
    }
  }

  // The reams of its own share each office leaves with GSU for the stock
  // room, never more than the share: it stays that office's paper, which
  // GSU never gives to another office. Only a new PO sends it.
  const stock: Checked["stock"] = new Map();
  for (const raw of Array.isArray(payload.stock) ? payload.stock : []) {
    const orgUnitFk = Number(raw.orgUnitFk);
    const share = distributions.find((d) => d.orgUnitFk === orgUnitFk);
    if (!share || stock.has(orgUnitFk)) {
      return {
        field: "stock",
        error: "Only an office with a share can leave paper with GSU.",
      };
    }
    const kept = new Map<PaperSize, number>();
    for (const [size, value] of Object.entries(raw.reams ?? {})) {
      if (value === null || value === "" || value === 0) continue;
      const n = wholeReams(value);
      if (!isPaperSize(size) || !n) {
        return { field: "stock", error: "Enter whole reams kept." };
      }
      if (n > (share.reams.get(size) ?? 0)) {
        return {
          field: "stock",
          error: `An office can leave at most its own share of ${paperSizeLabel(size)} with GSU.`,
        };
      }
      kept.set(size, n);
    }
    if (kept.size > 0) stock.set(orgUnitFk, kept);
  }
  for (const item of items) {
    const keptTotal = [...stock.values()].reduce(
      (sum, k) => sum + (k.get(item.paperSize) ?? 0),
      0,
    );
    if (keptTotal > 0 && !item.stockNumber) {
      return {
        field: "stockNumbers",
        error: `Enter the stock no. of ${paperSizeLabel(item.paperSize)}.`,
      };
    }
  }
  if (handOverOn === null && !payload.paperPurchaseOrderPk) {
    return {
      field: "handOverOn",
      error: "Enter the date GSU handed over the paper.",
    };
  }

  return {
    stock,
    poNumber,
    poDate,
    supplierFk,
    remarks: remarks || null,
    handOverOn,
    items,
    distributions,
  };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function insertItems(tx: Tx, poPk: number, checked: Checked) {
  for (const item of checked.items) {
    const [row] = await tx.insert(paperPurchaseOrderItem).values({
      paperPurchaseOrderFk: poPk,
      paperSize: item.paperSize,
      reams: item.reams,
      stockNumber: item.stockNumber,
    });
    const given = checked.distributions
      .filter((d) => d.reams.has(item.paperSize))
      .map((d) => ({
        paperPurchaseOrderItemFk: row.insertId,
        orgUnitFk: d.orgUnitFk,
        reams: d.reams.get(item.paperSize)!,
      }));
    if (given.length > 0) await tx.insert(paperDistribution).values(given);
  }
}

/**
 * The first of these offices that already submitted the month of `day`, as
 * a refusal: a hand-over dated there would change a submitted form, which
 * never changes (paper-consumption.md).
 */
async function submittedMonth(officePks: number[], day: string) {
  if (officePks.length === 0) return null;
  const [row] = await db
    .select({ abbr: orgUnit.abbr })
    .from(paperMonthlyReport)
    .innerJoin(orgUnit, eq(paperMonthlyReport.orgUnitFk, orgUnit.orgUnitPk))
    .where(
      and(
        inArray(paperMonthlyReport.orgUnitFk, officePks),
        eq(paperMonthlyReport.reportMonth, `${day.slice(0, 7)}-01`),
        eq(paperMonthlyReport.status, "submitted"),
      ),
    )
    .limit(1);
  if (!row) return null;
  const month = new Date(`${day.slice(0, 7)}-01T00:00:00`).toLocaleDateString(
    "en-PH",
    { month: "long", year: "numeric" },
  );
  return `${row.abbr} already submitted ${month}, so its paper form can no longer change. Choose a date after ${month}.`;
}

const mysqlErrno = (err: unknown) => (err as { errno?: number })?.errno;

const poNumberTaken = (poNumber: string): Refusal => ({
  field: "poNumber",
  error: `Paper PO ${poNumber} is already recorded.`,
});

const denied = () =>
  fail(403, { error: "You do not have permission to do this." });

async function readPayload(request: Request): Promise<Payload | null> {
  try {
    return JSON.parse(String((await request.formData()).get("payload")));
  } catch {
    return null;
  }
}

export const paperPurchaseOrderActions = {
  /**
   * Adds a PO, or saves an edited one. An edit replaces its sizes and
   * distributions as a whole (the foreign keys cascade), as on fuel POs.
   */
  savePaperPurchaseOrder: async ({ request, locals }) => {
    if (!can(locals.permissions, "purchase_orders:manage")) return denied();

    const payload = await readPayload(request);
    if (!payload) {
      return fail(400, { error: "The form could not be read. Try again." });
    }

    const editPk = Number(payload.paperPurchaseOrderPk) || null;
    const existing = editPk
      ? (await selectPaperPurchaseOrders()).find(
          (po) => po.paperPurchaseOrderPk === editPk,
        )
      : undefined;
    if (editPk && !existing) {
      return fail(404, { error: "That PO no longer exists." });
    }

    const checked = await check(
      payload,
      existing && new Set(existing.distributions.map((d) => d.orgUnitPk)),
      existing?.supplierFk ?? null,
    );
    if (isRefusal(checked)) return fail(400, checked);

    if (!editPk && checked.handOverOn) {
      const closed = await submittedMonth(
        checked.distributions.map((d) => d.orgUnitFk),
        checked.handOverOn,
      );
      if (closed) return fail(409, { field: "handOverOn", error: closed });
    }

    // An edit cannot take back paper already handed over: each office keeps
    // at least what it was handed of each size.
    for (const office of existing?.distributions ?? []) {
      const share = checked.distributions.find(
        (d) => d.orgUnitFk === office.orgUnitPk,
      );
      for (const [size, handed] of Object.entries(office.handed)) {
        if (!handed) continue;
        if ((share?.reams.get(size as PaperSize) ?? 0) < handed) {
          return fail(409, {
            field: "distribution",
            error: `${office.abbr} was already handed ${reamCount(handed)} of ${paperSizeLabel(size as PaperSize)}, so its share cannot be less.`,
          });
        }
      }
    }

    // On an edited PO, a size GSU still holds some of needs its stock no.
    for (const item of existing ? checked.items : []) {
      const handed = existing!.distributions.reduce(
        (sum, d) => sum + (d.handed[item.paperSize] ?? 0),
        0,
      );
      if (item.reams - handed > 0 && !item.stockNumber) {
        return fail(400, {
          field: "stockNumbers",
          error: `Enter the stock no. of ${paperSizeLabel(item.paperSize)}.`,
        });
      }
    }

    const [taken] = await db
      .select({ pk: paperPurchaseOrder.paperPurchaseOrderPk })
      .from(paperPurchaseOrder)
      .where(eq(paperPurchaseOrder.poNumber, checked.poNumber));
    if (taken && taken.pk !== editPk) {
      return fail(409, poNumberTaken(checked.poNumber));
    }

    let poPk: number;
    try {
      poPk = await db.transaction(async (tx) => {
        const details = {
          poNumber: checked.poNumber,
          poDate: checked.poDate,
          supplierFk: checked.supplierFk,
          remarks: checked.remarks,
        };
        if (editPk) {
          await tx
            .update(paperPurchaseOrder)
            .set({ ...details, updatedAt: new Date() })
            .where(eq(paperPurchaseOrder.paperPurchaseOrderPk, editPk));
          await tx
            .delete(paperPurchaseOrderItem)
            .where(eq(paperPurchaseOrderItem.paperPurchaseOrderFk, editPk));
          await insertItems(tx, editPk, checked);
          return editPk;
        }
        const [po] = await tx.insert(paperPurchaseOrder).values({
          ...details,
          createdByFk: locals.user?.userPk ?? null,
        });
        await insertItems(tx, po.insertId, checked);
        // Each office gets the part of its share GSU does not keep in the
        // stock room on the hand-over date; the rest is held for it.
        if (checked.handOverOn) {
          const rows = checked.distributions.flatMap((d) =>
            [...d.reams]
              .map(([paperSize, reams]) => ({
                paperPurchaseOrderFk: po.insertId,
                orgUnitFk: d.orgUnitFk,
                handedOn: checked.handOverOn!,
                paperSize,
                reams:
                  reams - (checked.stock.get(d.orgUnitFk)?.get(paperSize) ?? 0),
                createdByFk: locals.user?.userPk ?? null,
              }))
              .filter((r) => r.reams > 0),
          );
          if (rows.length > 0) await tx.insert(paperHandover).values(rows);
        }
        return po.insertId;
      });
    } catch (err) {
      if (mysqlErrno(err) === 1062) {
        return fail(409, poNumberTaken(checked.poNumber));
      }
      throw err;
    }

    return { success: true, poPk };
  },

  /**
   * GSU hands an office some of the paper it holds for it: never more of a
   * size than the office's share less what it was already handed.
   */
  handOverPaper: async ({ request, locals }) => {
    if (!can(locals.permissions, "purchase_orders:manage")) return denied();
    const form = await request.formData();
    const poPk = Number(form.get("paperPurchaseOrderPk"));
    const officePk = Number(form.get("orgUnitFk"));
    const handedOn = String(form.get("handedOn") ?? "");

    const po = (await selectPaperPurchaseOrders()).find(
      (p) => p.paperPurchaseOrderPk === poPk,
    );
    const office = po?.distributions.find((d) => d.orgUnitPk === officePk);
    if (!po || !office) {
      return fail(404, { error: "That PO or office share no longer exists." });
    }
    if (!isIsoDate(handedOn)) {
      return fail(400, { error: "Enter the date the paper was handed over." });
    }
    if (
      handedOn < po.poDate ||
      handedOn > today(getLocalTimeZone()).toString()
    ) {
      return fail(400, { error: "Enter a date from the PO date to today." });
    }
    const closed = await submittedMonth([officePk], handedOn);
    if (closed) return fail(409, { error: closed });

    const rows: { paperSize: PaperSize; reams: number }[] = [];
    for (const item of po.items) {
      const raw = String(form.get(`reams-${item.paperSize}`) ?? "").trim();
      if (raw === "" || raw === "0") continue;
      const n = wholeReams(raw);
      const held =
        (office.reams[item.paperSize] ?? 0) -
        (office.handed[item.paperSize] ?? 0);
      const label = paperSizeLabel(item.paperSize);
      if (!n) {
        return fail(400, { error: `Enter whole reams of ${label}.` });
      }
      if (n > held) {
        return fail(409, {
          error:
            held > 0
              ? `GSU holds only ${reamCount(held)} of ${label} for ${office.abbr}.`
              : `GSU holds no ${label} for ${office.abbr}.`,
        });
      }
      rows.push({ paperSize: item.paperSize, reams: n });
    }
    if (rows.length === 0) {
      return fail(400, { error: "Enter the reams of at least one size." });
    }

    await db.insert(paperHandover).values(
      rows.map((r) => ({
        paperPurchaseOrderFk: poPk,
        orgUnitFk: officePk,
        handedOn,
        ...r,
        createdByFk: locals.user?.userPk ?? null,
      })),
    );
    return { success: true };
  },

  /** For a PO typed by mistake. Its sizes and distributions go with it. */
  deletePaperPurchaseOrder: async ({ request, locals }) => {
    if (!can(locals.permissions, "purchase_orders:manage")) return denied();
    const poPk = Number((await request.formData()).get("paperPurchaseOrderPk"));
    if (!poPk) {
      return fail(400, { error: "The form could not be read. Try again." });
    }
    const [deleted] = await db
      .delete(paperPurchaseOrder)
      .where(eq(paperPurchaseOrder.paperPurchaseOrderPk, poPk));
    if (deleted.affectedRows === 0) {
      return fail(404, { error: "That PO no longer exists." });
    }
    return { success: true };
  },
} satisfies Actions;
