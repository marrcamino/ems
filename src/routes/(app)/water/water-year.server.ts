import { db } from "$lib/server/db";
import { waterConsumption, waterMonthlyReport } from "$lib/server/db/schema";
import { between, eq, sql } from "drizzle-orm";
import { monthOf } from "../paper/paper-month";
import type { WaterMonth } from "./water-types";

/**
 * Each month of `year` up to `lastMonth`, with its cubic meters and status.
 * The months after it are left out, so a month that is not over is not read
 * as a month with no water.
 */
export async function waterYear(year: string, lastMonth: string) {
  const rows = await db
    .select({
      reportMonth: waterMonthlyReport.reportMonth,
      status: waterMonthlyReport.status,
      // Null when the month has no entry, unlike 0 m³ entered for a month
      // when no water came.
      cubicMeters: sql<string | null>`sum(${waterConsumption.cubicMeters})`,
    })
    .from(waterMonthlyReport)
    .leftJoin(
      waterConsumption,
      eq(
        waterConsumption.waterMonthlyReportFk,
        waterMonthlyReport.waterMonthlyReportPk,
      ),
    )
    .where(
      between(waterMonthlyReport.reportMonth, `${year}-01-01`, `${year}-12-01`),
    )
    .groupBy(waterMonthlyReport.reportMonth, waterMonthlyReport.status);

  const months: WaterMonth[] = [];
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, "0")}`;
    if (key > lastMonth) break;
    const found = rows.find((r) => monthOf(r.reportMonth) === key);
    months.push({
      month: key,
      status: found?.status ?? null,
      cubicMeters:
        found?.cubicMeters == null ? null : Number(found.cubicMeters),
    });
  }
  return months;
}
