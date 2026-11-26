import { db } from "$lib/server/db";
import { eswmMonthlyReport, eswmWaste } from "$lib/server/db/schema";
import { between, eq } from "drizzle-orm";
import { monthOf } from "../paper/paper-month";
import type { SummaryMonth } from "./eswm-types";
import { emptyMonthWaste } from "./eswm-waste";

/**
 * Each month of `year` up to `lastMonth` (`2026-11`), with its status and its
 * kilos by source and type. A month that has not come yet is left out, so it
 * is not read as a month with no waste.
 */
export async function yearWaste(
  year: string,
  lastMonth: string,
): Promise<SummaryMonth[]> {
  const range = between(
    eswmMonthlyReport.reportMonth,
    `${year}-01-01`,
    `${year}-12-01`,
  );
  const [reports, waste] = await Promise.all([
    db
      .select({
        reportMonth: eswmMonthlyReport.reportMonth,
        status: eswmMonthlyReport.status,
      })
      .from(eswmMonthlyReport)
      .where(range),
    db
      .select({
        reportMonth: eswmMonthlyReport.reportMonth,
        source: eswmWaste.source,
        wasteType: eswmWaste.wasteType,
        kilos: eswmWaste.kilos,
      })
      .from(eswmWaste)
      .innerJoin(
        eswmMonthlyReport,
        eq(eswmWaste.eswmMonthlyReportFk, eswmMonthlyReport.eswmMonthlyReportPk),
      )
      .where(range),
  ]);

  const months: SummaryMonth[] = [];
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, "0")}`;
    if (key > lastMonth) break;
    const report = reports.find((r) => monthOf(r.reportMonth) === key);
    const month: SummaryMonth = {
      month: key,
      status: report?.status ?? null,
      waste: emptyMonthWaste(),
    };
    for (const w of waste) {
      if (monthOf(w.reportMonth) === key) {
        month.waste[w.source][w.wasteType] = Number(w.kilos);
      }
    }
    months.push(month);
  }
  return months;
}
