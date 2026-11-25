import { db } from "$lib/server/db";
import {
  CONFIG_KEYS,
  employee,
  orgUnit,
  paperMonthlyReport,
  user,
} from "$lib/server/db/schema";
import { getConfigValue } from "$lib/server/config";
import { fullName } from "$lib/utils";
import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { firstDay, monthLabel, monthOf } from "./paper-month";

/** The name of the person behind a user account, or null. */
export async function userName(userPk: number | null) {
  if (!userPk) return null;
  const [person] = await db
    .select({
      firstName: employee.firstName,
      middleName: employee.middleName,
      lastName: employee.lastName,
      suffix: employee.suffix,
    })
    .from(user)
    .innerJoin(employee, eq(user.employeeFk, employee.employeePk))
    .where(eq(user.userPk, userPk));
  return person ? fullName(person) : null;
}

/** The office set as GSU on the Signatories page, or null while unset. */
export function selectGsuOfficePk() {
  return getConfigValue(CONFIG_KEYS.gsuUnit);
}

/**
 * The first month, from `month` on, that GSU has received for one of these
 * offices, or null. A received report never changes, and its balance
 * forwarded counts every month before it, so a change dated in `month`
 * would reach it (paper-consumption.md).
 */
export async function selectReceivedFrom(officePks: number[], month: string) {
  if (officePks.length === 0) return null;
  const [row] = await db
    .select({
      abbr: orgUnit.abbr,
      reportMonth: paperMonthlyReport.reportMonth,
    })
    .from(paperMonthlyReport)
    .innerJoin(orgUnit, eq(paperMonthlyReport.orgUnitFk, orgUnit.orgUnitPk))
    .where(
      and(
        inArray(paperMonthlyReport.orgUnitFk, officePks),
        gte(paperMonthlyReport.reportMonth, firstDay(month)),
        eq(paperMonthlyReport.status, "received"),
      ),
    )
    .orderBy(asc(paperMonthlyReport.reportMonth))
    .limit(1);
  return row ? { abbr: row.abbr, month: monthOf(row.reportMonth) } : null;
}

/** Why a change dated in `month` is refused, for the PO hand-overs. */
export function receivedRefusal(
  found: { abbr: string; month: string },
  month: string,
) {
  const received = monthLabel(found.month);
  return found.month === month
    ? `GSU already received the ${found.abbr} report for ${received}, so it can no longer change. Choose a date after ${received}.`
    : `GSU already received the ${found.abbr} report for ${received}, which counts paper from ${monthLabel(month)}. Choose a date after ${received}.`;
}
