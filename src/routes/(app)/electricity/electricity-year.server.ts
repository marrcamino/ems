import { db } from "$lib/server/db";
import {
  electricityConsumption,
  electricityMonthlyReport,
} from "$lib/server/db/schema";
import { between, eq, sql } from "drizzle-orm";
import { monthOf } from "../paper/paper-month";
import type { ElectricityMonth } from "./electricity-types";

/**
 * Each month of `year` up to `lastMonth`, with its kWh and status.
 * The months after it are left out, so a month that is not over is not read
 * as a month with no electricity.
 */
export async function electricityYear(year: string, lastMonth: string) {
  const rows = await db
    .select({
      reportMonth: electricityMonthlyReport.reportMonth,
      status: electricityMonthlyReport.status,
      // Null when the month has no entry, unlike 0 kWh entered for a meter
      // that used nothing.
      kwh: sql<string | null>`sum(${electricityConsumption.kwh})`,
    })
    .from(electricityMonthlyReport)
    .leftJoin(
      electricityConsumption,
      eq(
        electricityConsumption.electricityMonthlyReportFk,
        electricityMonthlyReport.electricityMonthlyReportPk,
      ),
    )
    .where(
      between(
        electricityMonthlyReport.reportMonth,
        `${year}-01-01`,
        `${year}-12-01`,
      ),
    )
    .groupBy(
      electricityMonthlyReport.reportMonth,
      electricityMonthlyReport.status,
    );

  const months: ElectricityMonth[] = [];
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, "0")}`;
    if (key > lastMonth) break;
    const found = rows.find((r) => monthOf(r.reportMonth) === key);
    months.push({
      month: key,
      status: found?.status ?? null,
      kwh: found?.kwh == null ? null : Number(found.kwh),
    });
  }
  return months;
}
