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
  oldestPoFirstMessage,
  overBalanceMessage,
  type PoBalance,
  type WithdrawalRow,
} from "./withdrawal-row";

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

  return rows.map(({ unitCost, liters, ...row }) => {
    const unitCostC = toHundredths(unitCost) ?? 0;
    return {
      ...row,
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
};

/**
 * What a slip takes off its PO. One that is not back takes off the amount
 * requested (point 1.4 of "How POs and withdrawal slips work").
 */
function chargeOf(slip: Charge, priceC: number) {
  if (slip.requestedC !== null) return slip.requestedC;
  return amountInCentavos(slip.requestedH ?? 0, priceC);
}

const keyOf = (purchaseOrderPk: number, orgUnitPk: number, fuel: Fuel) =>
  `${purchaseOrderPk}-${orgUnitPk}-${fuel}`;

/** The withdrawals that count down a PO: every one not cancelled. */
async function selectCharges(): Promise<Charge[]> {
  const rows = await db
    .select({
      purchaseOrderPk: fuelIssuance.purchaseOrderFk,
      orgUnitPk: fuelIssuance.orgUnitFk,
      fuel: fuelIssuance.fuelType,
      requestedLiters: fuelIssuance.requestedLiters,
      requestedAmount: fuelIssuance.requestedAmount,
    })
    .from(fuelIssuance)
    .where(
      and(
        eq(fuelIssuance.kind, "withdrawal"),
        ne(fuelIssuance.status, "cancelled"),
      ),
    );
  return rows.map(({ requestedLiters, requestedAmount, ...row }) => ({
    ...row,
    requestedH: toHundredths(requestedLiters),
    requestedC: toHundredths(requestedAmount),
  }));
}

/**
 * Every PO where an office still has some of a fuel, oldest PO first. For
 * each office and fuel, the first one is the PO a new slip must go to
 * (point 4 of "How POs and withdrawal slips work"); the form lists the
 * others too, and refuses them.
 */
export async function selectPoBalances(scope: Scope): Promise<PoBalance[]> {
  const [allocations, charges] = await Promise.all([
    selectAllocations(),
    selectCharges(),
  ]);

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

  const balances: PoBalance[] = [];
  for (const allocation of allocations) {
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
      remarks: fuelIssuance.remarks,
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
      priceC = allocation ? priceOf(allocation) : 0;
      const key = keyOf(row.purchaseOrderPk, row.orgUnitPk, row.fuel);
      const before = left.get(key) ?? allocation?.allocationC ?? 0;
      balanceC =
        row.status === "cancelled"
          ? before
          : before - chargeOf({ ...row, requestedH, requestedC }, priceC);
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
      withdrawnH: null,
      boughtH: null,
      priceC,
      amountC: null,
      balanceC,
      balanceH:
        balanceC === null || !priceC ? null : litersForPesos(balanceC, priceC),
      poNumber: allocation?.poNumber ?? null,
      poType: allocation?.poType ?? null,
      fuel: row.fuel,
      asset: `${row.assetName} (${row.plateNumber ?? row.propertyNumber})`,
      tripTicketNumber: row.dttNumber,
      driver:
        row.driverFirstName === null || row.driverLastName === null
          ? null
          : fullName({
              firstName: row.driverFirstName,
              middleName: row.driverMiddleName,
              lastName: row.driverLastName,
              suffix: row.driverSuffix,
            }),
      remarks: row.remarks ?? "",
    };
  });
}

// ── Saving a new withdrawal ─────────────────────────────────────────────

/** What the dialog sends, as JSON in one form field. */
type Payload = Partial<
  Record<
    | "fileDate"
    | "officePk"
    | "assetPk"
    | "purchaseOrderPk"
    | "requestBy"
    | "purpose"
    | "remarks"
    | "driverPk"
    | "destination"
    | "travelFrom"
    | "travelTo"
    | "wsRequestedBy"
    | "wsApprovedBy"
    | "risApprovedBy"
    | "risIssuedBy"
    | "risReceivedBy"
    | "dttApprovedBy",
    unknown
  > & {
    liters: unknown;
    pesos: unknown;
    odometerStart: unknown;
  }
>;

/**
 * A refusal, with the field it belongs to when there is one, so the dialog
 * can show it under that field.
 */
type Refusal = { field?: string; error: string };

type Checked = {
  fileDate: string;
  orgUnitPk: number;
  assetPk: number;
  fuel: Fuel;
  purchaseOrderPk: number;
  requestedH: number | null;
  requestedC: number | null;
  purpose: string;
  remarks: string | null;
  trip: {
    driverPk: number;
    destination: string;
    travelFrom: string;
    travelTo: string;
    odometerStart: number | null;
    approvedByPk: number;
  } | null;
  people: {
    wsRequestedBy: number;
    wsApprovedBy: number;
    risRequestedBy: number;
    risApprovedBy: number;
    risIssuedBy: number;
    risReceivedBy: number | null;
  };
};

const isDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

const text = (value: unknown) => String(value ?? "").trim();

/**
 * Everything the dialog already checks, checked again, since a request can
 * be sent without the dialog. Plus what only the server knows: which PO the
 * slip goes to, and whether the asset and the people are still active.
 */
async function check(
  payload: Payload,
  locals: App.Locals,
): Promise<Checked | Refusal> {
  const me = locals.user?.employee;
  if (!me) return { error: "Sign in again, then try again." };

  // Without the key the withdrawal is filed today, whatever was sent, so a
  // form left open past midnight still saves.
  const todayDate = today(getLocalTimeZone()).toString();
  const fileDate = can(locals.permissions, "fuel:change_file_date")
    ? text(payload.fileDate)
    : todayDate;
  if (!isDate(fileDate))
    return { field: "fileDate", error: "Enter the file date." };
  if (fileDate > todayDate) {
    return { field: "fileDate", error: "Enter a date on or before today." };
  }

  // Only someone who sees every office picks one; anyone else's withdrawal
  // counts down their own office (point 7 of "Recording a fuel issuance").
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

  const fuel = chosen.fuel;
  const fuelName = FUEL_LABELS[fuel].toLowerCase();
  const open = (
    await selectPoBalances({ allOffices: true, officePk: null })
  ).filter((b) => b.orgUnitPk === orgUnitPk && b.fuel === fuel);
  if (open.length === 0) {
    return {
      field: "requested",
      error: `${office.abbr} has no ${fuelName} left on any PO. A PO with a ${fuelName} allocation for ${office.abbr} is needed first.`,
    };
  }
  const balance = open.find(
    (b) => b.purchaseOrderPk === Number(payload.purchaseOrderPk),
  );
  if (!balance) {
    return {
      field: "purchaseOrderPk",
      error: `Choose a PO where ${office.abbr} still has ${fuelName}.`,
    };
  }
  if (balance !== open[0]) {
    return {
      field: "purchaseOrderPk",
      error: oldestPoFirstMessage(open[0], office.abbr),
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

  const purpose = text(payload.purpose);
  if (!purpose) return { field: "purpose", error: "Enter the purpose." };
  if (purpose.length > 500) {
    return {
      field: "purpose",
      error: "Shorten the purpose to 500 characters.",
    };
  }
  const remarks = text(payload.remarks);
  if (remarks.length > 200) {
    return {
      field: "remarks",
      error: "Shorten the remarks to 200 characters.",
    };
  }

  // The asset decides whether there is a trip ticket ("Which forms apply").
  let trip: Checked["trip"] = null;
  if (chosen.hasTripTicket) {
    const destination = text(payload.destination);
    const travelFrom = text(payload.travelFrom);
    const travelTo = text(payload.travelTo);
    if (!Number(payload.driverPk))
      return { field: "driverPk", error: "Choose the driver." };
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
    if (!Number(payload.dttApprovedBy)) {
      return {
        field: "dttApprovedBy",
        error: "Choose who approves the trip ticket.",
      };
    }
    trip = {
      driverPk: Number(payload.driverPk),
      destination,
      travelFrom,
      travelTo,
      odometerStart,
      approvedByPk: Number(payload.dttApprovedBy),
    };
  }

  const people = {
    wsRequestedBy: Number(payload.wsRequestedBy),
    wsApprovedBy: Number(payload.wsApprovedBy),
    risRequestedBy: me.employeePk,
    risApprovedBy: Number(payload.risApprovedBy),
    risIssuedBy: Number(payload.risIssuedBy),
    risReceivedBy: Number(payload.risReceivedBy) || null,
  };
  if (!people.wsRequestedBy) {
    return { field: "wsRequestedBy", error: "Choose who requests the slip." };
  }
  if (!people.wsApprovedBy) {
    return { field: "wsApprovedBy", error: "Choose the GSU representative." };
  }
  if (!people.risApprovedBy) {
    return { field: "risApprovedBy", error: "Choose who approves the RIS." };
  }
  if (!people.risIssuedBy) {
    return { field: "risIssuedBy", error: "Choose who issues the RIS." };
  }

  const pks = [
    ...Object.values(people),
    trip?.driverPk,
    trip?.approvedByPk,
  ].filter((pk): pk is number => !!pk);
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

  // The two GSU lines take GSU staff only (signatory.md).
  const gsuPk = await getConfigValue(CONFIG_KEYS.gsuUnit);
  const inGsu = (pk: number) =>
    gsuPk !== null &&
    found.some((e) => e.employeePk === pk && e.orgUnitFk === gsuPk);
  if (!inGsu(people.wsApprovedBy)) {
    return {
      field: "wsApprovedBy",
      error: "Choose someone from the General Services Unit.",
    };
  }
  if (!inGsu(people.risIssuedBy)) {
    return {
      field: "risIssuedBy",
      error: "Choose someone from the General Services Unit.",
    };
  }

  return {
    fileDate,
    orgUnitPk,
    assetPk,
    fuel,
    purchaseOrderPk: balance.purchaseOrderPk,
    requestedH,
    requestedC,
    purpose,
    remarks: remarks || null,
    trip,
    people,
  };
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

async function save(checked: Checked, userPk: number | null) {
  const { people, trip } = checked;
  const pks = [
    ...Object.values(people),
    trip?.driverPk,
    trip?.approvedByPk,
  ].filter((pk): pk is number => !!pk);
  const version = await versionsOn(pks, checked.fileDate);
  const versionOf = (pk: number | null | undefined) =>
    pk ? (version.get(pk) ?? null) : null;

  const year = Number(checked.fileDate.slice(0, 4));
  return db.transaction(async (tx) => {
    const number = async (form: Form) =>
      formNumber(checked.fileDate, await nextNumber(tx, form, year));

    const controlNumber = await number("control");
    await tx.insert(fuelIssuance).values({
      kind: "withdrawal",
      status: "waiting",
      controlNumber,
      wsNumber: await number("ws"),
      risNumber: (await nextRisNumber(tx, checked.fileDate, { reuse: true }))
        .risNumber,
      dttNumber: trip ? await number("dtt") : null,
      fileDate: checked.fileDate,
      orgUnitFk: checked.orgUnitPk,
      assetFk: checked.assetPk,
      fuelType: checked.fuel,
      purchaseOrderFk: checked.purchaseOrderPk,
      requestedLiters:
        checked.requestedH === null ? null : fromHundredths(checked.requestedH),
      requestedAmount:
        checked.requestedC === null ? null : fromHundredths(checked.requestedC),
      purpose: checked.purpose,
      remarks: checked.remarks,
      destination: trip?.destination ?? null,
      travelFrom: trip?.travelFrom ?? null,
      travelTo: trip?.travelTo ?? null,
      odometerStart: trip?.odometerStart ?? null,
      driverFk: versionOf(trip?.driverPk),
      wsRequestedByFk: versionOf(people.wsRequestedBy),
      wsApprovedByFk: versionOf(people.wsApprovedBy),
      risRequestedByFk: versionOf(people.risRequestedBy),
      risApprovedByFk: versionOf(people.risApprovedBy),
      risIssuedByFk: versionOf(people.risIssuedBy),
      risReceivedByFk: versionOf(people.risReceivedBy),
      dttApprovedByFk: versionOf(trip?.approvedByPk),
      createdByFk: userPk,
    });
    return controlNumber;
  });
}

export const issuanceActions = {
  createWithdrawal: async ({ request, locals }) => {
    if (!can(locals.permissions, "fuel:record")) {
      return fail(403, { error: "You do not have permission to do this." });
    }

    let payload: Payload;
    try {
      payload = JSON.parse(String((await request.formData()).get("payload")));
    } catch {
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
  },
} satisfies Actions;
