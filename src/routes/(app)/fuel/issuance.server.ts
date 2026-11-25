import { can } from "$lib/rbac/access";
import { getConfigValue } from "$lib/server/config";
import { db } from "$lib/server/db";
import {
  asset,
  assetType,
  CONFIG_KEYS,
  employee,
  employeeHistory,
  fuelIssuance,
  fuelIssuancePassenger,
  orgUnit,
  purchaseOrder,
  purchaseOrderAllocation,
  purchaseOrderItem,
  supplier,
} from "$lib/server/db/schema";
import {
  CUTOVER_PENDING,
  cutoverDone,
  nextNumber,
  nextRisNumber,
  type Tx,
} from "$lib/server/form-counter";
import { fullName } from "$lib/utils";
import { formNumber, type Form } from "$lib/utils/form-numbers";
import { fail, type Actions } from "@sveltejs/kit";
import { getLocalTimeZone, today } from "@internationalized/date";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import {
  amountInCentavos,
  FUEL_LABELS,
  fromHundredths,
  litersForPesos,
  MAX_HUNDREDTHS,
  toHundredths,
  type Fuel,
  type PoType,
} from "./purchase-orders/po-math";
import {
  isAllowed,
  transactionActions,
  type TransactionAction,
} from "./transaction-actions";
import {
  oldestPoFirstMessage,
  overBalanceMessage,
  type PoBalance,
  type TransactionKind,
  type WithdrawalRow,
} from "./withdrawal-row";
import type { WithdrawalStatus } from "./withdrawal-status";

/**
 * Recording fuel transactions in `fuel_issuance`, and reading them back for
 * the Fuel page ("Recording a fuel issuance" in fuel-purchase-orders.md).
 */

/** Which offices' records someone sees (rbac-design, "Rows by office"). */
export type Scope = { allOffices: boolean; officePk: number | null };

export function scopeOf(locals: App.Locals): Scope {
  return {
    allOffices: can(locals.permissions, "fuel:view_all_offices"),
    officePk: locals.user?.employee.orgUnitFk ?? null,
  };
}

/** The largest peso request: ₱999,999.99, the form's 6 whole digits. */
const MAX_CENTAVOS = 99_999_999;

type Allocation = {
  purchaseOrderPk: number;
  poNumber: string;
  poDate: string;
  poType: PoType;
  supplierName: string;
  /** A closed PO takes no new withdrawal, and locks its own (MPP-61). */
  closed: boolean;
  fuel: Fuel;
  orgUnitPk: number;
  unitCostC: number;
  allocationC: number;
};

/** Every allocation of every PO, oldest PO first. */
async function selectAllocations(): Promise<Allocation[]> {
  const rows = await db
    .select({
      purchaseOrderPk: purchaseOrder.purchaseOrderPk,
      poNumber: purchaseOrder.poNumber,
      poDate: purchaseOrder.poDate,
      poType: purchaseOrder.poType,
      supplierName: supplier.supplierName,
      closedAt: purchaseOrder.closedAt,
      fuel: purchaseOrderItem.fuelType,
      unitCost: purchaseOrderItem.unitCost,
      orgUnitPk: purchaseOrderAllocation.orgUnitFk,
      liters: purchaseOrderAllocation.liters,
    })
    .from(purchaseOrderAllocation)
    .innerJoin(
      purchaseOrderItem,
      eq(
        purchaseOrderAllocation.purchaseOrderItemFk,
        purchaseOrderItem.purchaseOrderItemPk,
      ),
    )
    .innerJoin(
      purchaseOrder,
      eq(purchaseOrderItem.purchaseOrderFk, purchaseOrder.purchaseOrderPk),
    )
    .innerJoin(supplier, eq(purchaseOrder.supplierFk, supplier.supplierPk))
    .orderBy(asc(purchaseOrder.poDate), asc(purchaseOrder.purchaseOrderPk));

  return rows.map(({ unitCost, liters, closedAt, ...row }) => {
    const unitCostC = toHundredths(unitCost) ?? 0;
    return {
      ...row,
      closed: closedAt !== null,
      unitCostC,
      allocationC: amountInCentavos(toHundredths(liters) ?? 0, unitCostC),
    };
  });
}

/**
 * The price that a slip which is not back yet is counted at. On a
 * liter-based PO it is always the PO's unit cost. On a price-based PO it is
 * the last known pump price, and until the Complete step records pump
 * prices, the only one known is the PO's own.
 */
function priceOf(allocation: Allocation) {
  return allocation.unitCostC;
}

type Charge = {
  purchaseOrderPk: number | null;
  orgUnitPk: number;
  fuel: Fuel;
  requestedH: number | null;
  requestedC: number | null;
  /** The supplier's amount, once the slip is back and completed. */
  amountC: number | null;
};

/**
 * What a slip takes off its PO: the supplier's amount once it is back, and
 * before that the amount requested (point 1.4 of "How POs and withdrawal
 * slips work").
 */
function chargeOf(slip: Charge, priceC: number) {
  if (slip.amountC !== null) return slip.amountC;
  if (slip.requestedC !== null) return slip.requestedC;
  return amountInCentavos(slip.requestedH ?? 0, priceC);
}

/** One allocation: an office's share of one fuel on one PO. */
export const keyOf = (purchaseOrderPk: number, orgUnitPk: number, fuel: Fuel) =>
  `${purchaseOrderPk}-${orgUnitPk}-${fuel}`;

/**
 * The withdrawals that count down a PO: every one not cancelled. A slip
 * being edited is left out, so its own request does not count against it.
 */
async function selectCharges(excludePk?: number): Promise<Charge[]> {
  const rows = await db
    .select({
      purchaseOrderPk: fuelIssuance.purchaseOrderFk,
      orgUnitPk: fuelIssuance.orgUnitFk,
      fuel: fuelIssuance.fuelType,
      requestedLiters: fuelIssuance.requestedLiters,
      requestedAmount: fuelIssuance.requestedAmount,
      amount: fuelIssuance.amount,
    })
    .from(fuelIssuance)
    .where(
      and(
        eq(fuelIssuance.kind, "withdrawal"),
        ne(fuelIssuance.status, "cancelled"),
        excludePk ? ne(fuelIssuance.fuelIssuancePk, excludePk) : undefined,
      ),
    );
  return rows.map(({ requestedLiters, requestedAmount, amount, ...row }) => ({
    ...row,
    requestedH: toHundredths(requestedLiters),
    requestedC: toHundredths(requestedAmount),
    amountC: toHundredths(amount),
  }));
}

/** What each allocation has used, in centavos, by `keyOf`. */
function usedOf(allocations: Allocation[], charges: Charge[]) {
  const used = new Map<string, number>();
  for (const slip of charges) {
    if (slip.purchaseOrderPk === null) continue;
    const key = keyOf(slip.purchaseOrderPk, slip.orgUnitPk, slip.fuel);
    const allocation = allocations.find(
      (a) => keyOf(a.purchaseOrderPk, a.orgUnitPk, a.fuel) === key,
    );
    const priceC = allocation ? priceOf(allocation) : 0;
    used.set(key, (used.get(key) ?? 0) + chargeOf(slip, priceC));
  }
  return used;
}

/**
 * What the Purchase Orders page shows of the withdrawals: what each
 * allocation has used, counted the same way as the New withdrawal form's
 * balance, the slips that are not back from the gas station yet (Waiting for
 * approval or Out), and the Incomplete ones, oldest first.
 */
export async function selectPoUsage() {
  const [allocations, charges, slips] = await Promise.all([
    selectAllocations(),
    selectCharges(),
    db
      .select({
        purchaseOrderPk: fuelIssuance.purchaseOrderFk,
        office: orgUnit.abbr,
        fuel: fuelIssuance.fuelType,
        requestedLiters: fuelIssuance.requestedLiters,
        requestedAmount: fuelIssuance.requestedAmount,
        fileDate: fuelIssuance.fileDate,
        status: fuelIssuance.status,
      })
      .from(fuelIssuance)
      .innerJoin(orgUnit, eq(fuelIssuance.orgUnitFk, orgUnit.orgUnitPk))
      .where(
        and(
          eq(fuelIssuance.kind, "withdrawal"),
          inArray(fuelIssuance.status, ["waiting", "out", "incomplete"]),
        ),
      )
      .orderBy(asc(fuelIssuance.fileDate), asc(fuelIssuance.fuelIssuancePk)),
  ]);
  const shaped = slips.map(
    ({ requestedLiters, requestedAmount, status, ...slip }) => ({
      ...slip,
      incomplete: status === "incomplete",
      requestedH: toHundredths(requestedLiters),
      requestedC: toHundredths(requestedAmount),
    }),
  );
  return {
    used: usedOf(allocations, charges),
    slipsOut: shaped.filter((s) => !s.incomplete),
    slipsIncomplete: shaped.filter((s) => s.incomplete),
  };
}

/**
 * Every PO where an office still has some of a fuel, oldest PO first. For
 * each office and fuel, the first one is the PO a new slip must go to
 * (point 4 of "How POs and withdrawal slips work"); the form lists the
 * others too, and refuses them.
 */
export async function selectPoBalances(
  scope: Scope,
  excludePk?: number,
): Promise<PoBalance[]> {
  const [allocations, charges] = await Promise.all([
    selectAllocations(),
    selectCharges(excludePk),
  ]);
  const used = usedOf(allocations, charges);

  const balances: PoBalance[] = [];
  for (const allocation of allocations) {
    if (allocation.closed) continue;
    if (!scope.allOffices && allocation.orgUnitPk !== scope.officePk) continue;

    const key = keyOf(
      allocation.purchaseOrderPk,
      allocation.orgUnitPk,
      allocation.fuel,
    );
    const balanceC = allocation.allocationC - (used.get(key) ?? 0);
    if (balanceC <= 0) continue;

    const priceC = priceOf(allocation);
    balances.push({
      purchaseOrderPk: allocation.purchaseOrderPk,
      orgUnitPk: allocation.orgUnitPk,
      fuel: allocation.fuel,
      poNumber: allocation.poNumber,
      poDate: allocation.poDate,
      poType: allocation.poType,
      supplierName: allocation.supplierName,
      priceC,
      balanceC,
      balanceH: litersForPesos(balanceC, priceC),
    });
  }
  return balances;
}

/**
 * The Fuel page's list: by file date, then by the order of entry, with each
 * withdrawal's running balance and each office's own count for the year.
 */
export async function selectWithdrawalRows(
  scope: Scope,
): Promise<WithdrawalRow[]> {
  if (!scope.allOffices && scope.officePk === null) return [];

  const driver = alias(employeeHistory, "driver");
  const rows = await db
    .select({
      id: fuelIssuance.fuelIssuancePk,
      fileDate: fuelIssuance.fileDate,
      kind: fuelIssuance.kind,
      status: fuelIssuance.status,
      controlNumber: fuelIssuance.controlNumber,
      wsNumber: fuelIssuance.wsNumber,
      risNumber: fuelIssuance.risNumber,
      dttNumber: fuelIssuance.dttNumber,
      orgUnitPk: fuelIssuance.orgUnitFk,
      office: orgUnit.abbr,
      fuel: fuelIssuance.fuelType,
      purchaseOrderPk: fuelIssuance.purchaseOrderFk,
      requestedLiters: fuelIssuance.requestedLiters,
      requestedAmount: fuelIssuance.requestedAmount,
      purchasedLiters: fuelIssuance.purchasedLiters,
      withdrawnLiters: fuelIssuance.withdrawnLiters,
      unitPrice: fuelIssuance.unitPrice,
      amount: fuelIssuance.amount,
      risRemarks: fuelIssuance.risRemarks,
      dttRemarks: fuelIssuance.dttRemarks,
      driverName: fuelIssuance.driverName,
      assetName: asset.assetName,
      plateNumber: asset.plateNumber,
      propertyNumber: asset.propertyNumber,
      driverFirstName: driver.firstName,
      driverMiddleName: driver.middleName,
      driverLastName: driver.lastName,
      driverSuffix: driver.suffix,
    })
    .from(fuelIssuance)
    .innerJoin(orgUnit, eq(fuelIssuance.orgUnitFk, orgUnit.orgUnitPk))
    .innerJoin(asset, eq(fuelIssuance.assetFk, asset.assetPk))
    .leftJoin(driver, eq(fuelIssuance.driverFk, driver.employeeHistoryPk))
    .where(
      scope.allOffices
        ? undefined
        : eq(fuelIssuance.orgUnitFk, scope.officePk ?? 0),
    )
    .orderBy(asc(fuelIssuance.fileDate), asc(fuelIssuance.fuelIssuancePk));

  if (rows.length === 0) return [];
  const allocations = await selectAllocations();

  // In the order of entry, whatever the file dates.
  const officeCounts = new Map<number, number>();
  const counted = new Map<string, number>();
  for (const row of [...rows].sort((a, b) => a.id - b.id)) {
    const key = `${row.orgUnitPk}-${row.fileDate.slice(0, 4)}`;
    const count = (counted.get(key) ?? 0) + 1;
    counted.set(key, count);
    officeCounts.set(row.id, count);
  }

  const left = new Map<string, number>();
  return rows.map((row): WithdrawalRow => {
    const requestedH = toHundredths(row.requestedLiters);
    const requestedC = toHundredths(row.requestedAmount);
    const amountC = toHundredths(row.amount);
    const allocation =
      row.purchaseOrderPk === null
        ? undefined
        : allocations.find(
            (a) =>
              a.purchaseOrderPk === row.purchaseOrderPk &&
              a.orgUnitPk === row.orgUnitPk &&
              a.fuel === row.fuel,
          );

    let priceC: number | null = null;
    let balanceC: number | null = null;
    if (row.kind === "withdrawal" && row.purchaseOrderPk !== null) {
      // A slip that is back shows the pump price it was charged at.
      priceC =
        toHundredths(row.unitPrice) ?? (allocation ? priceOf(allocation) : 0);
      const key = keyOf(row.purchaseOrderPk, row.orgUnitPk, row.fuel);
      const before = left.get(key) ?? allocation?.allocationC ?? 0;
      balanceC =
        row.status === "cancelled"
          ? before
          : before -
            chargeOf({ ...row, requestedH, requestedC, amountC }, priceC);
      left.set(key, balanceC);
    }

    return {
      id: row.id,
      fileDate: row.fileDate,
      office: row.office,
      kind: row.kind,
      controlNumber: row.controlNumber,
      officeCount: officeCounts.get(row.id) ?? 0,
      wsNumber: row.wsNumber,
      risNumber: row.risNumber,
      status: row.status,
      requestedH,
      requestedC,
      withdrawnH: toHundredths(row.withdrawnLiters),
      // A withdrawal's cell shows the supplier's litres instead.
      boughtH:
        row.kind === "reimbursed" ? toHundredths(row.purchasedLiters) : null,
      priceC,
      amountC,
      balanceC,
      balanceH:
        balanceC === null || !priceC ? null : litersForPesos(balanceC, priceC),
      poNumber: allocation?.poNumber ?? null,
      poType: allocation?.poType ?? null,
      poClosed: allocation?.closed ?? false,
      fuel: row.fuel,
      asset: `${row.assetName} (${row.plateNumber ?? row.propertyNumber})`,
      tripTicketNumber: row.dttNumber,
      driver:
        row.driverFirstName === null || row.driverLastName === null
          ? row.driverName
          : fullName({
              firstName: row.driverFirstName,
              middleName: row.driverMiddleName,
              lastName: row.driverLastName,
              suffix: row.driverSuffix,
            }),
      remarks: [row.risRemarks, row.dttRemarks].filter(Boolean).join(" · "),
    };
  });
}

// ── Saving a new withdrawal ─────────────────────────────────────────────

/** What the dialog sends, as JSON in one form field. */
type Payload = Partial<
  Record<
    | "id"
    | "fileDate"
    | "officePk"
    | "assetPk"
    | "purchaseOrderPk"
    | "requestBy"
    | "risPurpose"
    | "risStockNumber"
    | "risFundCluster"
    | "risResponsibilityCenterCode"
    | "risRemarks"
    | "dttPurpose"
    | "dttRemarks"
    | "driverPk"
    | "driverName"
    | "destination"
    | "travelFrom"
    | "travelTo"
    | "wsWithdrawnBy"
    | "wsWithdrawnByName"
    | "wsRequestedBy"
    | "wsApprovedBy"
    | "risRequestedBy"
    | "risApprovedBy"
    | "risIssuedBy"
    | "risReceivedBy"
    | "dttApprovedBy",
    unknown
  > & {
    liters: unknown;
    pesos: unknown;
    odometerStart: unknown;
    passengers: unknown;
    travelHours: unknown;
    departureTime: unknown;
    tankBalanceBefore: unknown;
    purchasedLiters: unknown;
    oilLubricant: unknown;
  }
>;

/**
 * A refusal, with the field it belongs to when there is one, so the dialog
 * can show it under that field.
 */
type Refusal = { field?: string; error: string };

/** The trip ticket, the same paper on every kind of transaction. */
type Trip = {
  purpose: string;
  remarks: string | null;
  driverPk: number | null;
  driverName: string | null;
  destination: string;
  travelFrom: string;
  travelTo: string;
  odometerStart: number | null;
  passengers: string[];
  travelHours: number | null;
  /** `HH:MM`, as the browser's time field gives it. */
  departureTime: string | null;
  tankBalanceBeforeH: number | null;
  /** "Purchased during trip", asked only on a reimbursed trip. */
  purchasedH: number | null;
  oilLubricant: string | null;
  approvedByPk: number;
};

/** The withdrawal slip, which only a withdrawal has. */
type Slip = {
  purchaseOrderPk: number;
  requestedH: number | null;
  requestedC: number | null;
  /** Picked from the employees, or typed for someone outside the office. */
  withdrawnBy: { pk: number | null; name: string | null };
  requestedByPk: number;
  approvedByPk: number;
};

/** The RIS, the same paper on a withdrawal and on a reimbursed trip. */
type Ris = {
  fundCluster: string | null;
  responsibilityCenterCode: string | null;
  purpose: string | null;
  stockNumber: string | null;
  remarks: string | null;
  requestedByPk: number;
  approvedByPk: number;
  issuedByPk: number;
  receivedByPk: number | null;
};

/** What every form starts with: the office, the file date, and the asset. */
type Transaction = {
  fileDate: string;
  orgUnitPk: number;
  officeAbbr: string;
  assetPk: number;
  fuel: Fuel;
  hasTripTicket: boolean;
};

/**
 * Which forms each kind has ("Which forms apply" in fuel-purchase-orders.md):
 * a withdrawal has a slip, an RIS, and a trip ticket when its asset has one;
 * a trip only has a trip ticket; a reimbursed trip has an RIS and a trip
 * ticket.
 */
type Checked = Omit<Transaction, "officeAbbr" | "hasTripTicket"> &
  (
    | { kind: "withdrawal"; slip: Slip; ris: Ris; trip: Trip | null }
    | { kind: "trip"; slip: null; ris: null; trip: Trip }
    | { kind: "reimbursed"; slip: null; ris: Ris; trip: Trip }
  );

const isDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

const text = (value: unknown) => String(value ?? "").trim();

/**
 * An optional number from 0 to `max` with at most 2 decimals: null when left
 * empty, undefined when it is not such a number.
 */
function optionalNumber(value: unknown, max: number) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  const ok =
    Number.isFinite(n) &&
    n >= 0 &&
    n <= max &&
    // 1.1 * 100 is 110.00000000000001, so "2 decimals" allows for that.
    Math.abs(Math.round(n * 100) - n * 100) < 1e-6;
  return ok ? n : undefined;
}

/**
 * A person who is picked from the employees or typed, for someone outside
 * the office. A pick wins over a name; null when neither is given.
 */
function pickedOrTyped(pk: unknown, name: unknown) {
  if (Number(pk)) return { pk: Number(pk), name: null };
  const typed = text(name);
  return typed ? { pk: null, name: typed } : null;
}

/** The first text over its length, as a refusal under its field. */
function tooLongRefusal(
  fields: Record<string, [value: string, max: number, what: string]>,
): Refusal | null {
  for (const [field, [value, max, what]] of Object.entries(fields)) {
    if (value.length > max) {
      return { field, error: `Shorten the ${what} to ${max} characters.` };
    }
  }
  return null;
}

/**
 * A transaction being edited: its row, and its file date, which an edit
 * never changes, because its numbers carry the file date's year and month.
 */
type Editing = { pk: number; fileDate: string };

/**
 * The file date, the office, and the asset, which every transaction has.
 * Everything the dialogs already check is checked again on the server,
 * since a request can be sent without them.
 */
async function checkTransaction(
  payload: Payload,
  locals: App.Locals,
  editing?: Editing,
): Promise<Transaction | Refusal> {
  const me = locals.user?.employee;
  if (!me) return { error: "Sign in again, then try again." };

  // Without the key the transaction is filed today, whatever was sent, so a
  // form left open past midnight still saves.
  const todayDate = today(getLocalTimeZone()).toString();
  const fileDate = editing
    ? editing.fileDate
    : can(locals.permissions, "fuel:change_file_date")
      ? text(payload.fileDate)
      : todayDate;
  if (!isDate(fileDate))
    return { field: "fileDate", error: "Enter the file date." };
  if (fileDate > todayDate) {
    return { field: "fileDate", error: "Enter a date on or before today." };
  }

  // Only someone who sees every office picks one; anyone else's withdrawal
  // counts down their own office (point 7 of "Recording a fuel issuance"),
  // and their trip is their own office's too.
  const scope = scopeOf(locals);
  const orgUnitPk = scope.allOffices ? Number(payload.officePk) : me.orgUnitFk;
  if (!orgUnitPk) {
    return scope.allOffices
      ? { field: "officePk", error: "Choose the office." }
      : {
          error:
            "Your employee record has no office. Ask an admin to set it on the Employees page.",
        };
  }
  const [office] = await db
    .select({ abbr: orgUnit.abbr, status: orgUnit.status })
    .from(orgUnit)
    .where(eq(orgUnit.orgUnitPk, orgUnitPk));
  if (!office || office.status !== "active") {
    return {
      field: "officePk",
      error: "That office was deactivated. Choose another.",
    };
  }

  const assetPk = Number(payload.assetPk);
  const [chosen] = assetPk
    ? await db
        .select({
          fuel: asset.fuelType,
          status: asset.status,
          typeStatus: assetType.status,
          hasTripTicket: asset.hasTripTicket,
        })
        .from(asset)
        .innerJoin(assetType, eq(asset.assetTypeFk, assetType.assetTypePk))
        .where(eq(asset.assetPk, assetPk))
    : [];
  if (!chosen) return { field: "assetPk", error: "Choose the asset." };
  if (chosen.status !== "active" || chosen.typeStatus !== "active") {
    return {
      field: "assetPk",
      error: "That asset was deactivated. Choose another.",
    };
  }

  return {
    fileDate,
    orgUnitPk,
    officeAbbr: office.abbr,
    assetPk,
    fuel: chosen.fuel,
    hasTripTicket: chosen.hasTripTicket,
  };
}

/**
 * The withdrawal slip: which PO it goes to, the request, and the slip's
 * people.
 */
async function checkSlip(
  payload: Payload,
  { orgUnitPk, officeAbbr, fuel }: Transaction,
  editing?: Editing,
): Promise<Slip | Refusal> {
  const fuelName = FUEL_LABELS[fuel].toLowerCase();
  const open = (
    await selectPoBalances({ allOffices: true, officePk: null }, editing?.pk)
  ).filter((b) => b.orgUnitPk === orgUnitPk && b.fuel === fuel);
  if (open.length === 0) {
    return {
      field: "requested",
      error: `${officeAbbr} has no ${fuelName} left on any PO. A PO with a ${fuelName} allocation for ${officeAbbr} is needed first.`,
    };
  }
  const balance = open.find(
    (b) => b.purchaseOrderPk === Number(payload.purchaseOrderPk),
  );
  if (!balance) {
    return {
      field: "purchaseOrderPk",
      error: `Choose a PO where ${officeAbbr} still has ${fuelName}.`,
    };
  }
  if (balance !== open[0]) {
    return {
      field: "purchaseOrderPk",
      error: oldestPoFirstMessage(open[0], officeAbbr),
    };
  }

  let requestedH: number | null = null;
  let requestedC: number | null = null;
  if (payload.requestBy === "pesos" && balance.poType === "price") {
    requestedC = toHundredths(payload.pesos as string);
    if (!requestedC || requestedC > MAX_CENTAVOS) {
      return {
        field: "requested",
        error: "Enter the pesos requested, up to ₱999,999.99.",
      };
    }
  } else {
    requestedH = toHundredths(payload.liters as string);
    if (!requestedH || requestedH > MAX_HUNDREDTHS) {
      return {
        field: "requested",
        error: "Enter the liters requested, up to 999.99 L.",
      };
    }
  }
  const overBalance = overBalanceMessage(balance, { requestedH, requestedC });
  if (overBalance) return { field: "requested", error: overBalance };

  const withdrawnBy = pickedOrTyped(
    payload.wsWithdrawnBy,
    payload.wsWithdrawnByName,
  );
  if (!withdrawnBy) {
    return {
      field: "wsWithdrawnBy",
      error: "Choose or type who withdraws the fuel.",
    };
  }
  if (withdrawnBy.name && withdrawnBy.name.length > 150) {
    return {
      field: "wsWithdrawnBy",
      error: "Shorten the name to 150 characters.",
    };
  }

  const requestedByPk = Number(payload.wsRequestedBy);
  const approvedByPk = Number(payload.wsApprovedBy);
  if (!requestedByPk) {
    return { field: "wsRequestedBy", error: "Choose who requests the slip." };
  }
  if (!approvedByPk) {
    return { field: "wsApprovedBy", error: "Choose the GSU representative." };
  }

  return {
    purchaseOrderPk: balance.purchaseOrderPk,
    requestedH,
    requestedC,
    withdrawnBy,
    requestedByPk,
    approvedByPk,
  };
}

/** The RIS, the same paper on a withdrawal and on a reimbursed trip. */
function checkRis(payload: Payload): Ris | Refusal {
  const purpose = text(payload.risPurpose);
  const tooLong = tooLongRefusal({
    risFundCluster: [text(payload.risFundCluster), 50, "fund cluster"],
    risResponsibilityCenterCode: [
      text(payload.risResponsibilityCenterCode),
      50,
      "responsibility center code",
    ],
    risStockNumber: [text(payload.risStockNumber), 50, "stock number"],
    risRemarks: [text(payload.risRemarks), 200, "remarks"],
    risPurpose: [purpose, 500, "purpose"],
  });
  if (tooLong) return tooLong;

  const requestedByPk = Number(payload.risRequestedBy);
  const approvedByPk = Number(payload.risApprovedBy);
  const issuedByPk = Number(payload.risIssuedBy);
  if (!requestedByPk) {
    return { field: "risRequestedBy", error: "Choose who requests the RIS." };
  }
  if (!approvedByPk) {
    return { field: "risApprovedBy", error: "Choose who approves the RIS." };
  }
  if (!issuedByPk) {
    return { field: "risIssuedBy", error: "Choose who issues the RIS." };
  }

  return {
    fundCluster: text(payload.risFundCluster) || null,
    responsibilityCenterCode: text(payload.risResponsibilityCenterCode) || null,
    purpose: purpose || null,
    stockNumber: text(payload.risStockNumber) || null,
    remarks: text(payload.risRemarks) || null,
    requestedByPk,
    approvedByPk,
    issuedByPk,
    receivedByPk: Number(payload.risReceivedBy) || null,
  };
}

/**
 * The trip ticket, the same paper on every kind of transaction. Only a
 * reimbursed trip asks for the litres purchased during the trip, and
 * requires them, whether it is entered before the trip or after it ("A
 * reimbursed trip has a trip ticket and an RIS").
 */
function checkTrip(
  payload: Payload,
  { reimbursed }: { reimbursed: boolean },
): Trip | Refusal {
  const destination = text(payload.destination);
  const travelFrom = text(payload.travelFrom);
  const travelTo = text(payload.travelTo);
  const driver = pickedOrTyped(payload.driverPk, payload.driverName);
  if (!driver)
    return { field: "driverPk", error: "Choose or type the driver." };
  if (driver.name && driver.name.length > 150) {
    return {
      field: "driverPk",
      error: "Shorten the name to 150 characters.",
    };
  }
  const dttPurpose = text(payload.dttPurpose);
  if (!dttPurpose) {
    return {
      field: "dttPurpose",
      error: "Enter the purpose of the trip ticket.",
    };
  }
  const tooLongTrip = tooLongRefusal({
    dttPurpose: [dttPurpose, 500, "purpose"],
    dttRemarks: [text(payload.dttRemarks), 200, "remarks"],
  });
  if (tooLongTrip) return tooLongTrip;
  if (!destination)
    return { field: "destination", error: "Enter the destination." };
  if (destination.length > 200) {
    return {
      field: "destination",
      error: "Shorten the destination to 200 characters.",
    };
  }
  if (!isDate(travelFrom))
    return { field: "travelFrom", error: "Enter the first day of travel." };
  if (!isDate(travelTo))
    return { field: "travelTo", error: "Enter the last day of travel." };
  if (travelTo < travelFrom) {
    return {
      field: "travelTo",
      error: "Enter a day on or after the first day of travel.",
    };
  }
  const odometer = payload.odometerStart;
  const odometerStart =
    odometer === null || odometer === undefined || odometer === ""
      ? null
      : Number(odometer);
  if (
    odometerStart !== null &&
    (!Number.isInteger(odometerStart) ||
      odometerStart < 0 ||
      odometerStart > 9_999_999)
  ) {
    return {
      field: "odometerStart",
      error: "Enter the odometer reading in whole kilometers.",
    };
  }
  const travelHours = optionalNumber(payload.travelHours, 9_999.99);
  if (travelHours === undefined) {
    return {
      field: "travelHours",
      error: "Enter the hours as a number up to 9,999.99.",
    };
  }
  const departureTime = text(payload.departureTime);
  if (departureTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(departureTime)) {
    return { field: "departureTime", error: "Enter the departure time." };
  }
  const tankBalanceBefore = optionalNumber(payload.tankBalanceBefore, 999.99);
  if (tankBalanceBefore === undefined) {
    return {
      field: "tankBalanceBefore",
      error: "Enter the balance in liters, up to 999.99.",
    };
  }
  let purchasedH: number | null = null;
  if (reimbursed) {
    const purchased = optionalNumber(payload.purchasedLiters, 999.99);
    if (!purchased) {
      return {
        field: "purchasedLiters",
        error: "Enter the liters purchased during the trip, up to 999.99.",
      };
    }
    purchasedH = Math.round(purchased * 100);
  }
  const oilLubricant = text(payload.oilLubricant);
  if (oilLubricant.length > 100) {
    return {
      field: "oilLubricant",
      error: "Shorten the oil or fuel lubricant to 100 characters.",
    };
  }
  const passengers = Array.isArray(payload.passengers)
    ? payload.passengers.map(text).filter(Boolean)
    : [];
  if (passengers.length > 50 || passengers.some((n) => n.length > 150)) {
    return {
      error: "Enter up to 50 passengers, each name up to 150 characters.",
    };
  }
  if (!Number(payload.dttApprovedBy)) {
    return {
      field: "dttApprovedBy",
      error: "Choose who approves the trip ticket.",
    };
  }
  return {
    purpose: dttPurpose,
    remarks: text(payload.dttRemarks) || null,
    driverPk: driver.pk,
    driverName: driver.name,
    destination,
    travelFrom,
    travelTo,
    odometerStart,
    passengers,
    travelHours,
    departureTime: departureTime || null,
    tankBalanceBeforeH:
      tankBalanceBefore === null ? null : Math.round(tankBalanceBefore * 100),
    purchasedH,
    oilLubricant: oilLubricant || null,
    approvedByPk: Number(payload.dttApprovedBy),
  };
}

type Forms = Pick<Checked, "slip" | "ris" | "trip">;

/** Everyone picked on the forms, each once. */
function picked({ slip, ris, trip }: Forms) {
  const pks = [
    slip?.withdrawnBy.pk,
    slip?.requestedByPk,
    slip?.approvedByPk,
    ris?.requestedByPk,
    ris?.approvedByPk,
    ris?.issuedByPk,
    ris?.receivedByPk,
    trip?.driverPk,
    trip?.approvedByPk,
  ].filter((pk): pk is number => !!pk);
  return [...new Set(pks)];
}

/**
 * Whether everyone picked still works here, and whether the slip's
 * "Approved by" and the RIS's "Issued by" hold GSU staff (signatory.md).
 */
async function checkPeople(forms: Forms): Promise<Refusal | null> {
  const pks = picked(forms);
  if (pks.length === 0) return null;
  const found = await db
    .select({
      employeePk: employee.employeePk,
      orgUnitFk: employee.orgUnitFk,
      status: employee.employmentStatus,
    })
    .from(employee)
    .where(inArray(employee.employeePk, pks));
  const active = new Set(
    found.filter((e) => e.status === "active").map((e) => e.employeePk),
  );
  if (pks.some((pk) => !active.has(pk))) {
    return {
      error:
        "Someone on the form no longer works here. Choose the people again.",
    };
  }

  const { slip, ris } = forms;
  if (!slip && !ris) return null;
  const gsuPk = await getConfigValue(CONFIG_KEYS.gsuUnit);
  const inGsu = (pk: number) =>
    gsuPk !== null &&
    found.some((e) => e.employeePk === pk && e.orgUnitFk === gsuPk);
  if (slip && !inGsu(slip.approvedByPk)) {
    return {
      field: "wsApprovedBy",
      error: "Choose someone from the General Services Unit.",
    };
  }
  if (ris && !inGsu(ris.issuedByPk)) {
    return {
      field: "risIssuedBy",
      error: "Choose someone from the General Services Unit.",
    };
  }
  return null;
}

/** What is saved of the office, the file date, and the asset. */
const saved = ({ fileDate, orgUnitPk, assetPk, fuel }: Transaction) => ({
  fileDate,
  orgUnitPk,
  assetPk,
  fuel,
});

/** Refused when the asset's Trip ticket switch is off. */
const NO_TRIP_TICKET: Refusal = {
  field: "assetPk",
  error:
    "That asset has no trip ticket. Choose another, or turn on its Trip ticket switch on the Assets page.",
};

/** A withdrawal: the slip, the RIS, and the trip ticket when the asset has one. */
async function checkWithdrawal(
  payload: Payload,
  locals: App.Locals,
  editing?: Editing,
): Promise<Checked | Refusal> {
  const transaction = await checkTransaction(payload, locals, editing);
  if ("error" in transaction) return transaction;
  const slip = await checkSlip(payload, transaction, editing);
  if ("error" in slip) return slip;
  const ris = checkRis(payload);
  if ("error" in ris) return ris;
  // The asset decides whether there is a trip ticket ("Which forms apply").
  const trip = transaction.hasTripTicket
    ? checkTrip(payload, { reimbursed: false })
    : null;
  if (trip && "error" in trip) return trip;
  const refusal = await checkPeople({ slip, ris, trip });
  if (refusal) return refusal;

  return { ...saved(transaction), kind: "withdrawal", slip, ris, trip };
}

/** A trip only: a trip ticket, and no withdrawal slip, RIS, or PO. */
async function checkTripOnly(
  payload: Payload,
  locals: App.Locals,
  editing?: Editing,
): Promise<Checked | Refusal> {
  const transaction = await checkTransaction(payload, locals, editing);
  if ("error" in transaction) return transaction;
  if (!transaction.hasTripTicket) return NO_TRIP_TICKET;
  const trip = checkTrip(payload, { reimbursed: false });
  if ("error" in trip) return trip;
  const refusal = await checkPeople({ slip: null, ris: null, trip });
  if (refusal) return refusal;

  return { ...saved(transaction), kind: "trip", slip: null, ris: null, trip };
}

/**
 * A reimbursed trip: an RIS and a trip ticket, and no withdrawal slip or PO,
 * since the driver pays for the fuel and the office pays it back.
 */
async function checkReimbursed(
  payload: Payload,
  locals: App.Locals,
  editing?: Editing,
): Promise<Checked | Refusal> {
  const transaction = await checkTransaction(payload, locals, editing);
  if ("error" in transaction) return transaction;
  if (!transaction.hasTripTicket) return NO_TRIP_TICKET;
  const ris = checkRis(payload);
  if ("error" in ris) return ris;
  const trip = checkTrip(payload, { reimbursed: true });
  if ("error" in trip) return trip;
  const refusal = await checkPeople({ slip: null, ris, trip });
  if (refusal) return refusal;

  return { ...saved(transaction), kind: "reimbursed", slip: null, ris, trip };
}

/**
 * Each person's name version on the file date, which is what the printed
 * forms show. A date before the person's first version takes that first
 * version, because the names were first entered after the paper was signed.
 */
async function versionsOn(employeePks: number[], day: string) {
  const versions = await db
    .select({
      employeeHistoryPk: employeeHistory.employeeHistoryPk,
      employeeFk: employeeHistory.employeeFk,
      validFrom: employeeHistory.validFrom,
      validUntil: employeeHistory.validUntil,
    })
    .from(employeeHistory)
    .where(inArray(employeeHistory.employeeFk, employeePks))
    .orderBy(asc(employeeHistory.validFrom));

  const result = new Map<number, number>();
  for (const pk of employeePks) {
    const own = versions.filter((v) => v.employeeFk === pk);
    const valid =
      own.find(
        (v) =>
          v.validFrom <= day && (v.validUntil === null || v.validUntil >= day),
      ) ??
      own.find((v) => v.validFrom > day) ??
      own.at(-1);
    if (valid) result.set(pk, valid.employeeHistoryPk);
  }
  return result;
}

/** MySQL reports a broken rule by number: 1062 is a duplicate, 1213 a deadlock. */
function mysqlErrno(err: unknown) {
  return (err as { errno?: number })?.errno;
}

/** The columns the forms fill, the same on a new save and on an edit. */
async function formColumns(checked: Checked) {
  const { slip, ris, trip } = checked;
  const version = await versionsOn(picked(checked), checked.fileDate);
  const versionOf = (pk: number | null | undefined) =>
    pk ? (version.get(pk) ?? null) : null;

  return {
    orgUnitFk: checked.orgUnitPk,
    assetFk: checked.assetPk,
    fuelType: checked.fuel,
    purchaseOrderFk: slip?.purchaseOrderPk ?? null,
    requestedLiters:
      slip?.requestedH == null ? null : fromHundredths(slip.requestedH),
    requestedAmount:
      slip?.requestedC == null ? null : fromHundredths(slip.requestedC),
    risPurpose: ris?.purpose ?? null,
    risStockNumber: ris?.stockNumber ?? null,
    risFundCluster: ris?.fundCluster ?? null,
    risResponsibilityCenterCode: ris?.responsibilityCenterCode ?? null,
    risRemarks: ris?.remarks ?? null,
    dttPurpose: trip?.purpose ?? null,
    dttRemarks: trip?.remarks ?? null,
    destination: trip?.destination ?? null,
    travelFrom: trip?.travelFrom ?? null,
    travelTo: trip?.travelTo ?? null,
    odometerStart: trip?.odometerStart ?? null,
    travelHours: trip?.travelHours == null ? null : trip.travelHours.toFixed(2),
    departureTime: trip?.departureTime ?? null,
    tankBalanceBefore:
      trip?.tankBalanceBeforeH == null
        ? null
        : fromHundredths(trip.tankBalanceBeforeH),
    purchasedLiters:
      trip?.purchasedH == null ? null : fromHundredths(trip.purchasedH),
    oilLubricant: trip?.oilLubricant ?? null,
    driverFk: versionOf(trip?.driverPk),
    driverName: trip?.driverName ?? null,
    wsWithdrawnByFk: versionOf(slip?.withdrawnBy.pk),
    wsWithdrawnByName: slip?.withdrawnBy.name ?? null,
    wsRequestedByFk: versionOf(slip?.requestedByPk),
    wsApprovedByFk: versionOf(slip?.approvedByPk),
    risRequestedByFk: versionOf(ris?.requestedByPk),
    risApprovedByFk: versionOf(ris?.approvedByPk),
    risIssuedByFk: versionOf(ris?.issuedByPk),
    risReceivedByFk: versionOf(ris?.receivedByPk),
    dttApprovedByFk: versionOf(trip?.approvedByPk),
  };
}

/** The trip ticket's passengers, replacing any saved before. */
async function savePassengers(tx: Tx, pk: number, trip: Trip | null) {
  await tx
    .delete(fuelIssuancePassenger)
    .where(eq(fuelIssuancePassenger.fuelIssuanceFk, pk));
  if (!trip || trip.passengers.length === 0) return;
  await tx.insert(fuelIssuancePassenger).values(
    trip.passengers.map((name, i) => ({
      fuelIssuanceFk: pk,
      name,
      sortOrder: i + 1,
    })),
  );
}

/**
 * Saves a withdrawal, a trip only, or a reimbursed trip, with the numbers
 * its forms need. A withdrawal waits for GSU to sign its slip; a trip has no
 * slip to sign, so it starts as Out (point 9.5 of "Recording a fuel
 * issuance").
 */
async function save(checked: Checked, userPk: number | null) {
  const { slip, ris, trip } = checked;
  const columns = await formColumns(checked);

  const year = Number(checked.fileDate.slice(0, 4));
  return db.transaction(async (tx) => {
    const number = async (form: Form) =>
      formNumber(checked.fileDate, await nextNumber(tx, form, year));

    const controlNumber = await number("control");
    const wsNumber = slip ? await number("ws") : null;
    const risNumber = ris
      ? (await nextRisNumber(tx, checked.fileDate, { reuse: true })).risNumber
      : null;
    const dttNumber = trip ? await number("dtt") : null;
    const [inserted] = await tx
      .insert(fuelIssuance)
      .values({
        ...columns,
        kind: checked.kind,
        // Only a withdrawal has a slip for GSU to sign; a trip starts as Out.
        status: checked.kind === "withdrawal" ? "waiting" : "out",
        controlNumber,
        wsNumber,
        risNumber,
        dttNumber,
        fileDate: checked.fileDate,
        createdByFk: userPk,
      })
      .$returningId();
    await savePassengers(tx, inserted.fuelIssuancePk, trip);
    return controlNumber;
  });
}

/** What the list needs to know of a saved transaction before acting on it. */
type Saved = {
  pk: number;
  kind: TransactionKind;
  status: WithdrawalStatus;
  controlNumber: string;
  fileDate: string;
  dttNumber: string | null;
  poClosed: boolean;
};

/**
 * A saved transaction that the person may see. One from another office
 * reads as missing, as it does on the list.
 */
async function findSaved(
  pk: number,
  locals: App.Locals,
): Promise<Saved | Refusal> {
  const [row] = pk
    ? await db
        .select({
          pk: fuelIssuance.fuelIssuancePk,
          kind: fuelIssuance.kind,
          status: fuelIssuance.status,
          controlNumber: fuelIssuance.controlNumber,
          fileDate: fuelIssuance.fileDate,
          dttNumber: fuelIssuance.dttNumber,
          orgUnitPk: fuelIssuance.orgUnitFk,
          closedAt: purchaseOrder.closedAt,
        })
        .from(fuelIssuance)
        .leftJoin(
          purchaseOrder,
          eq(fuelIssuance.purchaseOrderFk, purchaseOrder.purchaseOrderPk),
        )
        .where(eq(fuelIssuance.fuelIssuancePk, pk))
    : [];
  const scope = scopeOf(locals);
  if (!row || (!scope.allOffices && row.orgUnitPk !== scope.officePk)) {
    return { error: "This record is no longer on the list. Reload the page." };
  }
  const { closedAt, ...saved } = row;
  return { ...saved, poClosed: closedAt !== null };
}

/** Refused unless the action is allowed on this transaction now. */
function refusedAction(
  saved: Saved,
  locals: App.Locals,
  action: TransactionAction,
) {
  const availability = transactionActions(saved, (key) =>
    can(locals.permissions, key),
  )[action];
  if (isAllowed(availability)) return null;
  return fail(availability.show ? 409 : 403, {
    error:
      (availability.show && availability.reason) ||
      "You do not have permission to do this.",
  });
}

async function readPayload(request: Request): Promise<Payload | null> {
  try {
    return JSON.parse(String((await request.formData()).get("payload")));
  } catch {
    return null;
  }
}

/**
 * The New withdrawal, Trip only, and Reimbursed trip forms all send their
 * fields as JSON in one form field, and all are saved the same way once
 * checked.
 */
async function record(
  request: Request,
  locals: App.Locals,
  check: (payload: Payload, locals: App.Locals) => Promise<Checked | Refusal>,
) {
  if (!can(locals.permissions, "fuel:record")) {
    return fail(403, { error: "You do not have permission to do this." });
  }

  const payload = await readPayload(request);
  if (!payload) {
    return fail(400, { error: "The form could not be read. Try again." });
  }

  const checked = await check(payload, locals);
  if ("error" in checked) return fail(400, checked);
  if (!(await cutoverDone())) return fail(409, { error: CUTOVER_PENDING });

  // Two saves at the same moment can trip over each other while the
  // counters are first made for a year; the second simply tries again.
  for (let attempt = 1; ; attempt++) {
    try {
      const controlNumber = await save(checked, locals.user?.userPk ?? null);
      return { success: true, controlNumber };
    } catch (err) {
      const errno = mysqlErrno(err);
      if ((errno === 1213 || errno === 1062) && attempt < 3) continue;
      throw err;
    }
  }
}

const CHECKS = {
  withdrawal: checkWithdrawal,
  trip: checkTripOnly,
  reimbursed: checkReimbursed,
};

/**
 * Edit: the same form and the same checks as a new one, with the file date
 * and the numbers kept. A withdrawal whose new asset has a trip ticket gets
 * its DTT number now; one that already has a DTT number keeps an asset with
 * a trip ticket, since the number is never given to another.
 */
async function updateTransaction(request: Request, locals: App.Locals) {
  const payload = await readPayload(request);
  if (!payload) {
    return fail(400, { error: "The form could not be read. Try again." });
  }
  const saved = await findSaved(Number(payload.id), locals);
  if ("error" in saved) return fail(404, saved);
  const refused = refusedAction(saved, locals, "edit");
  if (refused) return refused;

  const checked = await CHECKS[saved.kind](payload, locals, {
    pk: saved.pk,
    fileDate: saved.fileDate,
  });
  if ("error" in checked) return fail(400, checked);
  if (saved.dttNumber && !checked.trip) {
    return fail(400, {
      field: "assetPk",
      error: `This withdrawal already has DTT ${saved.dttNumber}. Choose an asset with a trip ticket.`,
    });
  }

  const columns = await formColumns(checked);
  const year = Number(saved.fileDate.slice(0, 4));
  await db.transaction(async (tx) => {
    const dttNumber =
      checked.trip && !saved.dttNumber
        ? formNumber(saved.fileDate, await nextNumber(tx, "dtt", year))
        : saved.dttNumber;
    await tx
      .update(fuelIssuance)
      .set({ ...columns, dttNumber, updatedAt: new Date() })
      .where(eq(fuelIssuance.fuelIssuancePk, saved.pk));
    await savePassengers(tx, saved.pk, checked.trip);
  });
  return { success: true, controlNumber: saved.controlNumber };
}

/** Approve and Cancel send only the transaction's id. */
async function setStatus(
  request: Request,
  locals: App.Locals,
  action: "approve" | "cancel",
) {
  const pk = Number((await request.formData()).get("id"));
  const saved = await findSaved(pk, locals);
  if ("error" in saved) return fail(404, saved);
  const refused = refusedAction(saved, locals, action);
  if (refused) return refused;

  await db
    .update(fuelIssuance)
    .set({
      status: action === "approve" ? "out" : "cancelled",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(fuelIssuance.fuelIssuancePk, pk),
        // Only from the status the check above saw, in case someone else
        // acted on it at the same moment.
        eq(fuelIssuance.status, saved.status),
      ),
    );
  return { success: true, controlNumber: saved.controlNumber };
}

/** A time from the browser's time field, `HH:MM`; null when empty. */
function optionalTime(value: unknown) {
  const t = text(value);
  if (!t) return null;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : undefined;
}

/**
 * Complete: the supplier's numbers on a withdrawal, and the trip ticket's
 * lines after the trip (point 9 of "Recording a fuel issuance").
 *
 * - On a liter-based PO the supplier writes no numbers: the liters pumped
 *   are the liters requested, at the PO's unit cost. On a price-based PO,
 *   GSU types the unit price and the total amount from the slip, and EMS
 *   works out the liters (point 3 of "How POs and withdrawal slips work").
 * - A withdrawal with a trip ticket whose tank lines are missing becomes
 *   Incomplete; pressing Complete on an Incomplete one with a tank line
 *   still empty saves nothing (point 9.4).
 * - A trip with no withdrawal slip is never Incomplete: every line must be
 *   filled in (point 9.6).
 */
async function completeTransaction(request: Request, locals: App.Locals) {
  const payload = (await readPayload(request)) as Record<
    string,
    unknown
  > | null;
  if (!payload) {
    return fail(400, { error: "The form could not be read. Try again." });
  }
  const saved = await findSaved(Number(payload.id), locals);
  if ("error" in saved) return fail(404, saved);
  const refused = refusedAction(saved, locals, "complete");
  if (refused) return refused;

  const [row] = await db
    .select({
      requestedLiters: fuelIssuance.requestedLiters,
      requestedAmount: fuelIssuance.requestedAmount,
      odometerStart: fuelIssuance.odometerStart,
      poType: purchaseOrder.poType,
      unitCost: purchaseOrderItem.unitCost,
    })
    .from(fuelIssuance)
    .leftJoin(
      purchaseOrder,
      eq(fuelIssuance.purchaseOrderFk, purchaseOrder.purchaseOrderPk),
    )
    .leftJoin(
      purchaseOrderItem,
      and(
        eq(purchaseOrderItem.purchaseOrderFk, purchaseOrder.purchaseOrderPk),
        eq(purchaseOrderItem.fuelType, fuelIssuance.fuelType),
      ),
    )
    .where(eq(fuelIssuance.fuelIssuancePk, saved.pk));

  // ── The supplier's numbers ──
  let supplier: {
    withdrawnLiters: string | null;
    unitPrice: string | null;
    amount: string | null;
  } = { withdrawnLiters: null, unitPrice: null, amount: null };
  if (saved.kind === "withdrawal") {
    if (row.poType === "price") {
      const priceC = toHundredths(payload.unitPrice as string);
      if (!priceC || priceC > 999_999) {
        return fail(400, {
          field: "unitPrice",
          error: "Enter the unit price from the slip, up to ₱9,999.99.",
        });
      }
      const amountC = toHundredths(payload.amount as string);
      if (!amountC || amountC > MAX_CENTAVOS) {
        return fail(400, {
          field: "amount",
          error: "Enter the total amount from the slip, up to ₱999,999.99.",
        });
      }
      supplier = {
        withdrawnLiters: fromHundredths(litersForPesos(amountC, priceC)),
        unitPrice: fromHundredths(priceC),
        amount: fromHundredths(amountC),
      };
    } else {
      const litersH = toHundredths(row.requestedLiters) ?? 0;
      const priceC = toHundredths(row.unitCost) ?? 0;
      supplier = {
        withdrawnLiters: fromHundredths(litersH),
        unitPrice: fromHundredths(priceC),
        amount: fromHundredths(amountInCentavos(litersH, priceC)),
      };
    }
  }

  // ── The trip ticket's lines ──
  let trip = {};
  let missing: Refusal | null = null;
  if (saved.dttNumber) {
    const departureTime = optionalTime(payload.departureTime);
    if (departureTime === undefined) {
      return fail(400, {
        field: "departureTime",
        error: "Enter the departure time.",
      });
    }
    const arrivalTime = optionalTime(payload.arrivalTime);
    if (arrivalTime === undefined) {
      return fail(400, {
        field: "arrivalTime",
        error: "Enter the arrival time.",
      });
    }
    const liters = {
      tankBalanceBefore: optionalNumber(payload.tankBalanceBefore, 999.99),
      litersUsed: optionalNumber(payload.litersUsed, 999.99),
      tankBalanceAfter: optionalNumber(payload.tankBalanceAfter, 999.99),
      purchasedLiters: optionalNumber(payload.purchasedLiters, 999.99),
    };
    for (const [field, value] of Object.entries(liters)) {
      if (value === undefined) {
        return fail(400, {
          field,
          error: "Enter the liters as a number up to 999.99.",
        });
      }
    }
    const odometer = payload.odometerEnd;
    const odometerEnd =
      odometer === null || odometer === undefined || odometer === ""
        ? null
        : Number(odometer);
    if (
      odometerEnd !== null &&
      (!Number.isInteger(odometerEnd) ||
        odometerEnd < 0 ||
        odometerEnd > 9_999_999)
    ) {
      return fail(400, {
        field: "odometerEnd",
        error: "Enter the odometer reading in whole kilometers.",
      });
    }
    if (
      odometerEnd !== null &&
      row.odometerStart !== null &&
      odometerEnd < row.odometerStart
    ) {
      return fail(400, {
        field: "odometerEnd",
        error: `Enter a reading of at least ${row.odometerStart.toLocaleString("en-PH")} km, the reading at the start.`,
      });
    }

    // What a trip with no slip must have, and the tank lines a withdrawal
    // may still lack, in the order they are on the form.
    const required: [string, unknown, string][] =
      saved.kind === "withdrawal"
        ? [
            [
              "tankBalanceBefore",
              liters.tankBalanceBefore,
              "the balance in tank before the trip",
            ],
            [
              "litersUsed",
              liters.litersUsed,
              "the liters used during the trip",
            ],
            [
              "tankBalanceAfter",
              liters.tankBalanceAfter,
              "the balance in tank after the trip",
            ],
          ]
        : [
            ["departureTime", departureTime, "the departure time"],
            ["arrivalTime", arrivalTime, "the arrival time"],
            [
              "tankBalanceBefore",
              liters.tankBalanceBefore,
              "the balance in tank before the trip",
            ],
            ...(saved.kind === "reimbursed"
              ? ([
                  [
                    "purchasedLiters",
                    liters.purchasedLiters || null,
                    "the liters purchased during the trip",
                  ],
                ] as [string, unknown, string][])
              : []),
            [
              "litersUsed",
              liters.litersUsed,
              "the liters used during the trip",
            ],
            [
              "tankBalanceAfter",
              liters.tankBalanceAfter,
              "the balance in tank after the trip",
            ],
          ];
    const empty = required.find(([, value]) => value === null);
    if (empty) missing = { field: empty[0], error: `Enter ${empty[2]}.` };

    // Never undefined here: the loop above refused that.
    const decimal = (n: number | null | undefined) =>
      n == null ? null : fromHundredths(Math.round(n * 100));
    trip = {
      departureTime,
      arrivalTime,
      tankBalanceBefore: decimal(liters.tankBalanceBefore),
      litersUsed: decimal(liters.litersUsed),
      tankBalanceAfter: decimal(liters.tankBalanceAfter),
      odometerEnd,
      ...(saved.kind === "reimbursed"
        ? { purchasedLiters: decimal(liters.purchasedLiters) }
        : {}),
    };
  }

  // A trip, or a second press on an Incomplete withdrawal, saves nothing
  // while a line is empty.
  if (
    missing &&
    (saved.kind !== "withdrawal" || saved.status === "incomplete")
  ) {
    return fail(400, missing);
  }
  const status = missing ? "incomplete" : "complete";

  await db
    .update(fuelIssuance)
    .set({ ...supplier, ...trip, status, updatedAt: new Date() })
    .where(
      and(
        eq(fuelIssuance.fuelIssuancePk, saved.pk),
        eq(fuelIssuance.status, saved.status),
      ),
    );
  return { success: true, controlNumber: saved.controlNumber, status };
}

/** A decimal column as a number for a form field; null when empty. */
const asNumber = (value: string | null) =>
  value === null ? null : Number(value);

/**
 * Everything the Edit and Complete forms show of a saved transaction, in the
 * shape of the New withdrawal form's fields, with each person as their
 * employee record rather than the name version saved. The PO balances leave
 * out this transaction's own request, as the edit's check does.
 */
export async function selectTransactionDetails(pk: number, locals: App.Locals) {
  const saved = await findSaved(pk, locals);
  if ("error" in saved) return null;

  const [row] = await db
    .select()
    .from(fuelIssuance)
    .where(eq(fuelIssuance.fuelIssuancePk, pk));
  const [passengers, po] = await Promise.all([
    db
      .select({ name: fuelIssuancePassenger.name })
      .from(fuelIssuancePassenger)
      .where(eq(fuelIssuancePassenger.fuelIssuanceFk, pk))
      .orderBy(asc(fuelIssuancePassenger.sortOrder)),
    row.purchaseOrderFk === null
      ? Promise.resolve([])
      : db
          .select({
            poNumber: purchaseOrder.poNumber,
            poType: purchaseOrder.poType,
            unitCost: purchaseOrderItem.unitCost,
          })
          .from(purchaseOrder)
          .innerJoin(
            purchaseOrderItem,
            eq(
              purchaseOrderItem.purchaseOrderFk,
              purchaseOrder.purchaseOrderPk,
            ),
          )
          .where(
            and(
              eq(purchaseOrder.purchaseOrderPk, row.purchaseOrderFk),
              eq(purchaseOrderItem.fuelType, row.fuelType),
            ),
          ),
  ]);

  const historyPks = [
    row.driverFk,
    row.wsWithdrawnByFk,
    row.wsRequestedByFk,
    row.wsApprovedByFk,
    row.risRequestedByFk,
    row.risApprovedByFk,
    row.risIssuedByFk,
    row.risReceivedByFk,
    row.dttApprovedByFk,
  ].filter((v): v is number => v !== null);
  const people =
    historyPks.length === 0
      ? []
      : await db
          .select({
            employeeHistoryPk: employeeHistory.employeeHistoryPk,
            employeeFk: employeeHistory.employeeFk,
          })
          .from(employeeHistory)
          .where(inArray(employeeHistory.employeeHistoryPk, historyPks));
  const person = (historyPk: number | null) =>
    String(
      people.find((p) => p.employeeHistoryPk === historyPk)?.employeeFk ?? "",
    );
  const time = (value: string | null) => value?.slice(0, 5) ?? "";

  return {
    id: row.fuelIssuancePk,
    kind: row.kind,
    status: row.status,
    controlNumber: row.controlNumber,
    dttNumber: row.dttNumber,
    po: po[0]
      ? {
          poNumber: po[0].poNumber,
          poType: po[0].poType,
          unitCostC: toHundredths(po[0].unitCost) ?? 0,
        }
      : null,
    values: {
      fileDate: row.fileDate,
      officePk: String(row.orgUnitFk),
      assetPk: String(row.assetFk),
      requestBy: row.requestedAmount === null ? "liters" : "pesos",
      liters: asNumber(row.requestedLiters),
      pesos: asNumber(row.requestedAmount),
      wsWithdrawnBy: person(row.wsWithdrawnByFk),
      wsWithdrawnByName: row.wsWithdrawnByName ?? "",
      wsRequestedBy: person(row.wsRequestedByFk),
      wsApprovedBy: person(row.wsApprovedByFk),
      risFundCluster: row.risFundCluster ?? "",
      risResponsibilityCenterCode: row.risResponsibilityCenterCode ?? "",
      risStockNumber: row.risStockNumber ?? "",
      risRemarks: row.risRemarks ?? "",
      risPurpose: row.risPurpose ?? "",
      risRequestedBy: person(row.risRequestedByFk),
      risApprovedBy: person(row.risApprovedByFk),
      risIssuedBy: person(row.risIssuedByFk),
      risReceivedBy: person(row.risReceivedByFk),
      driverPk: person(row.driverFk),
      driverName: row.driverName ?? "",
      passengers: passengers.map((p) => p.name),
      destination: row.destination ?? "",
      dttPurpose: row.dttPurpose ?? "",
      travelFrom: row.travelFrom ?? "",
      travelTo: row.travelTo ?? "",
      travelHours: asNumber(row.travelHours),
      dttRemarks: row.dttRemarks ?? "",
      departureTime: time(row.departureTime),
      tankBalanceBefore: asNumber(row.tankBalanceBefore),
      purchasedLiters: asNumber(row.purchasedLiters),
      oilLubricant: row.oilLubricant ?? "",
      odometerStart: row.odometerStart,
      dttApprovedBy: person(row.dttApprovedByFk),
    },
    completion: {
      arrivalTime: time(row.arrivalTime),
      litersUsed: asNumber(row.litersUsed),
      tankBalanceAfter: asNumber(row.tankBalanceAfter),
      odometerEnd: row.odometerEnd,
      unitPrice: asNumber(row.unitPrice),
      amount: asNumber(row.amount),
    },
    poBalances: await selectPoBalances(scopeOf(locals), pk),
  };
}

export type TransactionDetails = NonNullable<
  Awaited<ReturnType<typeof selectTransactionDetails>>
>;

export const issuanceActions = {
  createWithdrawal: ({ request, locals }) =>
    record(request, locals, checkWithdrawal),
  createTrip: ({ request, locals }) => record(request, locals, checkTripOnly),
  createReimbursedTrip: ({ request, locals }) =>
    record(request, locals, checkReimbursed),
  updateTransaction: ({ request, locals }) =>
    updateTransaction(request, locals),
  approveTransaction: ({ request, locals }) =>
    setStatus(request, locals, "approve"),
  cancelTransaction: ({ request, locals }) =>
    setStatus(request, locals, "cancel"),
  completeTransaction: ({ request, locals }) =>
    completeTransaction(request, locals),
} satisfies Actions;
