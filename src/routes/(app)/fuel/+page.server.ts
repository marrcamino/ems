import { can } from "$lib/rbac/access";
import { getConfigValues } from "$lib/server/config";
import { db } from "$lib/server/db";
import {
  asset,
  assetType,
  CONFIG_KEYS,
  employee,
  orgUnit,
} from "$lib/server/db/schema";
import { cutoverDone, startingNumbersActions } from "$lib/server/form-counter";
import { error } from "@sveltejs/kit";
import { and, asc, eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import {
  issuanceActions,
  scopeOf,
  selectPoBalances,
  selectWithdrawalRows,
} from "./issuance.server";

export const load: PageServerLoad = async ({ locals }) => {
  if (!can(locals.permissions, "fuel:view")) {
    throw error(403, "You do not have permission to view this page.");
  }

  const scope = scopeOf(locals);

  const settings = await getConfigValues([
    CONFIG_KEYS.gsuUnit,
    CONFIG_KEYS.fuelUsualApprover,
  ]);

  // Only assets whose type is active too: a withdrawal cannot be recorded
  // for something that is switched off.
  const assets = await db
    .select({
      assetPk: asset.assetPk,
      assetName: asset.assetName,
      plateNumber: asset.plateNumber,
      propertyNumber: asset.propertyNumber,
      fuelType: asset.fuelType,
      assetTypeName: assetType.assetTypeName,
      hasTripTicket: asset.hasTripTicket,
    })
    .from(asset)
    .innerJoin(assetType, eq(asset.assetTypeFk, assetType.assetTypePk))
    .where(and(eq(asset.status, "active"), eq(assetType.status, "active")))
    .orderBy(asc(asset.assetName), asc(asset.plateNumber));

  const employees = await db
    .select({
      employeePk: employee.employeePk,
      firstName: employee.firstName,
      middleName: employee.middleName,
      lastName: employee.lastName,
      suffix: employee.suffix,
      positionTitle: employee.positionTitle,
      orgUnitFk: employee.orgUnitFk,
    })
    .from(employee)
    .where(eq(employee.employmentStatus, "active"))
    .orderBy(asc(employee.lastName), asc(employee.firstName));

  const offices = await db
    .select({
      orgUnitPk: orgUnit.orgUnitPk,
      orgUnitName: orgUnit.orgUnitName,
      abbr: orgUnit.abbr,
    })
    .from(orgUnit)
    .where(eq(orgUnit.status, "active"))
    .orderBy(asc(orgUnit.orgUnitName));

  const [withdrawals, poBalances, numbersSet] = await Promise.all([
    selectWithdrawalRows(scope),
    selectPoBalances(scope),
    cutoverDone(),
  ]);

  // An approver who has left reads as empty, as on the Signatories page.
  const approver = settings[CONFIG_KEYS.fuelUsualApprover];

  return {
    withdrawals,
    poBalances,
    cutoverDone: numbersSet,
    allOffices: scope.allOffices,
    assets,
    employees,
    offices,
    gsuOfficePk: settings[CONFIG_KEYS.gsuUnit],
    usualApproverPk: employees.some((e) => e.employeePk === approver)
      ? approver
      : null,
  };
};

export const actions: Actions = {
  ...issuanceActions,
  ...startingNumbersActions,
};
