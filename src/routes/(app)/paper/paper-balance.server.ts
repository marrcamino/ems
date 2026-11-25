import { PAPER_SIZES, type PaperSize } from "$lib/paper-sizes";
import { db } from "$lib/server/db";
import {
  paperConsumption,
  paperConsumptionItem,
  paperHandover,
  paperMonthlyReport,
  paperStartingBalance,
} from "$lib/server/db/schema";
import { and, asc, eq, gte, lt, or, sql, type SQL } from "drizzle-orm";
import { addMonths, firstDay, monthOf } from "./paper-month";
import type { PaperBalance } from "./paper-types";

type Sums = Map<PaperSize, number>;

/** The office's starting balance, or null before the office enters one. */
export async function selectStart(officePk: number) {
  const rows = await db
    .select({
      startMonth: paperStartingBalance.startMonth,
      paperSize: paperStartingBalance.paperSize,
      reams: paperStartingBalance.reams,
    })
    .from(paperStartingBalance)
    .where(eq(paperStartingBalance.orgUnitFk, officePk));
  if (rows.length === 0) return null;
  return {
    month: monthOf(rows[0].startMonth),
    reams: new Map(rows.map((r) => [r.paperSize, r.reams])) as Sums,
  };
}

/**
 * Reams GSU handed to the office, dated from `from` to before `to`: its
 * form's "New". Paper GSU still holds for the office is not counted.
 */
async function sumReceived(officePk: number, from: string | null, to: string) {
  const rows = await db
    .select({
      paperSize: paperHandover.paperSize,
      reams: sql<string>`sum(${paperHandover.reams})`,
    })
    .from(paperHandover)
    .where(
      and(
        eq(paperHandover.orgUnitFk, officePk),
        from ? gte(paperHandover.handedOn, from) : undefined,
        lt(paperHandover.handedOn, to),
      ),
    )
    .groupBy(paperHandover.paperSize);
  return new Map(rows.map((r) => [r.paperSize, Number(r.reams)])) as Sums;
}

/** Reams the office opened, dated from `from` to before `to`. */
async function sumConsumed(officePk: number, from: string | null, to: string) {
  const conditions: (SQL | undefined)[] = [
    eq(paperMonthlyReport.orgUnitFk, officePk),
    from ? gte(paperConsumption.consumedOn, from) : undefined,
    lt(paperConsumption.consumedOn, to),
  ];
  const rows = await db
    .select({
      paperSize: paperConsumptionItem.paperSize,
      reams: sql<string>`sum(${paperConsumptionItem.reams})`,
    })
    .from(paperConsumptionItem)
    .innerJoin(
      paperConsumption,
      eq(
        paperConsumptionItem.paperConsumptionFk,
        paperConsumption.paperConsumptionPk,
      ),
    )
    .innerJoin(
      paperMonthlyReport,
      eq(
        paperConsumption.paperMonthlyReportFk,
        paperMonthlyReport.paperMonthlyReportPk,
      ),
    )
    .where(and(...conditions))
    .groupBy(paperConsumptionItem.paperSize);
  return new Map(rows.map((r) => [r.paperSize, Number(r.reams)])) as Sums;
}

/**
 * The four rows of the office's form for a month, per size: balance
 * forwarded, new, consumed, and balance. Before the office enters a starting
 * balance, the balance forwarded counts from nothing. After, it counts from
 * the starting balance, and only what is dated from its start month on, so
 * paper already in the typed balance is not counted twice.
 */
export async function selectBalance(
  officePk: number,
  month: string,
  start: Awaited<ReturnType<typeof selectStart>>,
): Promise<PaperBalance[]> {
  const from = start ? firstDay(start.month) : null;
  const first = firstDay(month);
  const next = firstDay(addMonths(month, 1));

  const [receivedBefore, consumedBefore, received, consumed] =
    await Promise.all([
      sumReceived(officePk, from, first),
      sumConsumed(officePk, from, first),
      sumReceived(officePk, first, next),
      sumConsumed(officePk, first, next),
    ]);

  return PAPER_SIZES.map(({ value: size }) => {
    const forwarded =
      (start?.reams.get(size) ?? 0) +
      (receivedBefore.get(size) ?? 0) -
      (consumedBefore.get(size) ?? 0);
    const got = received.get(size) ?? 0;
    const used = consumed.get(size) ?? 0;
    return {
      paperSize: size,
      forwarded,
      received: got,
      consumed: used,
      balance: forwarded + got - used,
    };
  });
}

/**
 * The office's earliest month with entries or a submission, or null. An open
 * month whose entries were all removed records nothing, so it does not count.
 */
export async function selectFirstReportMonth(officePk: number) {
  const [row] = await db
    .select({ reportMonth: paperMonthlyReport.reportMonth })
    .from(paperMonthlyReport)
    .where(
      and(
        eq(paperMonthlyReport.orgUnitFk, officePk),
        or(
          eq(paperMonthlyReport.status, "submitted"),
          sql`exists (select 1 from ${paperConsumption} where ${paperConsumption.paperMonthlyReportFk} = ${paperMonthlyReport.paperMonthlyReportPk})`,
        ),
      ),
    )
    .orderBy(asc(paperMonthlyReport.reportMonth))
    .limit(1);
  return row ? monthOf(row.reportMonth) : null;
}

/**
 * For each size, the lowest balance at the end of any month from `fromMonth`
 * to `toMonth`, and that month. A line taken in `fromMonth` lowers every one
 * of those balances, so this is how much of each size it can take.
 */
export async function selectLowestBalance(
  officePk: number,
  fromMonth: string,
  toMonth: string,
  start: Awaited<ReturnType<typeof selectStart>>,
) {
  const lowest = new Map<PaperSize, { balance: number; month: string }>();
  for (let m = fromMonth; m <= toMonth; m = addMonths(m, 1)) {
    for (const b of await selectBalance(officePk, m, start)) {
      const seen = lowest.get(b.paperSize);
      if (!seen || b.balance < seen.balance) {
        lowest.set(b.paperSize, { balance: b.balance, month: m });
      }
    }
  }
  return lowest;
}
