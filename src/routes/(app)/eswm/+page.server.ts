import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import { eswmMonthlyReport, eswmWaste } from "$lib/server/db/schema";
import { getLocalTimeZone, today } from "@internationalized/date";
import { error, fail } from "@sveltejs/kit";
import { and, eq, sql } from "drizzle-orm";
import {
  firstDay,
  isMonth,
  monthLabel,
  monthOf,
  submitTooEarly,
} from "../paper/paper-month";
import { userName } from "../paper/paper-report.server";
import type { Actions, PageServerLoad } from "./$types";
import type { EswmReport, EswmYearMonth } from "./eswm-types";
import {
  emptyMonthWaste,
  isWasteSource,
  monthTotal,
  WASTE_LABEL,
  WASTE_TYPES,
  type WasteType,
} from "./eswm-waste";
import { yearWaste } from "./eswm-year.server";

/**
 * The ESWM Focal Person records each month's kilos by type, for the coastal
 * cleanups and for the office's own waste, and submits the month, for the
 * whole PENRO (cards/eswm.md).
 */

/** The dialog's limit: 999,999.99 kg. */
const MAX_KILOS = 999_999.99;

function todayIso() {
  return today(getLocalTimeZone()).toString();
}

async function selectReport(month: string) {
  const [row] = await db
    .select()
    .from(eswmMonthlyReport)
    .where(eq(eswmMonthlyReport.reportMonth, firstDay(month)));
  return row ?? null;
}

/**
 * The month's report, made if it is missing. Two people saving the month's
 * first figures at once both reach the unique index, which keeps one.
 */
async function reportFor(month: string) {
  await db
    .insert(eswmMonthlyReport)
    .values({ reportMonth: firstDay(month) })
    .onDuplicateKeyUpdate({
      set: { reportMonth: sql`${eswmMonthlyReport.reportMonth}` },
    });
  return (await selectReport(month))!;
}

function deny(locals: App.Locals) {
  if (!can(locals.permissions, "eswm:manage")) {
    return fail(403, { error: "You do not have permission to do this." });
  }
  return null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!can(locals.permissions, "eswm:view")) {
    throw error(403, "You do not have permission to view this page.");
  }

  const currentMonth = monthOf(todayIso());
  const askedMonth = url.searchParams.get("month");
  const month =
    isMonth(askedMonth) && askedMonth <= currentMonth
      ? askedMonth
      : currentMonth;

  const reportRow = await selectReport(month);
  const report: EswmReport | null = reportRow && {
    status: reportRow.status,
    // The office's own calendar date, not UTC, which is 8 hours behind.
    submittedOn: reportRow.submittedAt
      ? reportRow.submittedAt.toLocaleDateString("en-CA")
      : null,
    submittedBy: await userName(reportRow.submittedByFk),
  };

  // Every month of the year so far, so a month left open stands out.
  const yearOf = month.slice(0, 4);
  const lastMonth =
    yearOf === currentMonth.slice(0, 4) ? currentMonth : `${yearOf}-12`;
  const months = await yearWaste(yearOf, lastMonth);
  const year: EswmYearMonth[] = months.map((m) => ({
    month: m.month,
    status: m.status,
    kilos: monthTotal(m.waste),
  }));

  return {
    month,
    currentMonth,
    report,
    waste: months.find((m) => m.month === month)?.waste ?? emptyMonthWaste(),
    year,
  };
};

export const actions: Actions = {
  /** One block's kilos for the month: an empty field means not weighed. */
  save: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const form = await request.formData();
    const month = String(form.get("month") ?? "");
    if (!isMonth(month) || month > monthOf(todayIso())) {
      return fail(400, { error: "Choose a month that has started." });
    }
    const source = form.get("source");
    if (!isWasteSource(source)) {
      return fail(400, { error: "Choose the coastal cleanup or the office waste." });
    }

    const values: { type: WasteType; kilos: string | null }[] = [];
    for (const { type } of WASTE_TYPES[source]) {
      const raw = String(form.get(type) ?? "").trim();
      if (raw === "") {
        values.push({ type, kilos: null });
        continue;
      }
      const kilos = Number(raw);
      if (!(kilos >= 0 && kilos <= MAX_KILOS)) {
        return fail(400, {
          error: `Enter the ${WASTE_LABEL[type].toLowerCase()} kilos as 0 or more, or leave it empty.`,
        });
      }
      values.push({ type, kilos: kilos.toFixed(2) });
    }

    // Nothing to keep and nothing kept yet: the month stays without a report.
    const existing = await selectReport(month);
    if (!existing && values.every((v) => v.kilos === null)) {
      return { success: true };
    }

    const report = existing ?? (await reportFor(month));
    const reportFk = report.eswmMonthlyReportPk;
    await db.transaction(async (tx) => {
      for (const { type, kilos } of values) {
        const where = and(
          eq(eswmWaste.eswmMonthlyReportFk, reportFk),
          eq(eswmWaste.source, source),
          eq(eswmWaste.wasteType, type),
        );
        if (kilos === null) {
          await tx.delete(eswmWaste).where(where);
        } else {
          await tx
            .insert(eswmWaste)
            .values({
              eswmMonthlyReportFk: reportFk,
              source,
              wasteType: type,
              kilos,
              createdByFk: locals.user!.userPk,
            })
            .onDuplicateKeyUpdate({ set: { kilos, updatedAt: new Date() } });
        }
      }
    });
    return { success: true };
  },

  submit: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const form = await request.formData();
    const month = String(form.get("month") ?? "");
    if (!isMonth(month)) return fail(400, { error: "Choose a month." });
    const tooEarly = submitTooEarly(month, monthOf(todayIso()));
    if (tooEarly) return fail(409, { error: tooEarly });
    if ((await selectReport(month))?.status === "submitted") {
      return fail(409, { error: `${monthLabel(month)} is already submitted.` });
    }

    // A month with nothing weighed is submitted too, as none recorded. Its
    // report is made here, already submitted.
    const submitted = {
      status: "submitted" as const,
      submittedAt: new Date(),
      submittedByFk: locals.user!.userPk,
      updatedAt: new Date(),
    };
    await db
      .insert(eswmMonthlyReport)
      .values({ reportMonth: firstDay(month), ...submitted })
      .onDuplicateKeyUpdate({ set: submitted });
    return { success: true };
  },
};
