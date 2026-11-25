import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import { eswmCleanupDrive, eswmMonthlyReport } from "$lib/server/db/schema";
import { getLocalTimeZone, today } from "@internationalized/date";
import { error, fail } from "@sveltejs/kit";
import { asc, between, eq, sql } from "drizzle-orm";
import {
  firstDay,
  isMonth,
  monthLabel,
  monthOf,
  submitTooEarly,
} from "../paper/paper-month";
import { userName } from "../paper/paper-report.server";
import type { Actions, PageServerLoad } from "./$types";
import type {
  CleanupDrive,
  EswmReport,
  EswmYearMonth,
} from "./eswm-types";

/**
 * The ESWM Focal Person records each cleanup drive and submits each month,
 * for the whole PENRO (cards/eswm.md).
 */

/** The dialog's limits: 5 digits for counts, 999,999.99 kg. */
const MAX_COUNT = 99_999;
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
 * first cleanup drive at once both reach the unique index, which keeps one.
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

/** A whole number from the form, or null when the field is empty. */
function readCount(form: FormData, field: string) {
  const raw = String(form.get(field) ?? "").trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : NaN;
}

function readText(form: FormData, field: string) {
  return String(form.get(field) ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

type ReadDrive =
  | { error: string }
  | {
      values: {
        heldOn: string;
        activity: string;
        place: string;
        participants: number | null;
        sacks: number;
        kilos: string;
      };
    };

/** The add and edit form, checked. */
function readDrive(form: FormData): ReadDrive {
  const heldOn = String(form.get("heldOn") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(heldOn)) {
    return { error: "Enter the date when the waste was collected." };
  }
  if (heldOn > todayIso()) {
    return { error: "The date cannot be later than today." };
  }

  const activity = readText(form, "activity");
  if (!activity) return { error: "Enter the activity." };
  if (activity.length > 150) {
    return { error: "Shorten the activity to 150 characters." };
  }
  const place = readText(form, "place");
  if (!place) return { error: "Enter the place." };
  if (place.length > 200) {
    return { error: "Shorten the place to 200 characters." };
  }

  const sacks = readCount(form, "sacks");
  if (sacks === null || !(sacks >= 1 && sacks <= MAX_COUNT)) {
    return { error: "Enter the sacks as a whole number from 1." };
  }

  const kilosRaw = String(form.get("kilos") ?? "").trim();
  const kilos = Number(kilosRaw);
  if (kilosRaw === "" || !(kilos > 0 && kilos <= MAX_KILOS)) {
    return { error: "Enter the kilos, more than 0." };
  }

  const participants = readCount(form, "participants");
  if (
    participants !== null &&
    !(participants >= 1 && participants <= MAX_COUNT)
  ) {
    return {
      error: "Enter the participants as a whole number from 1, or leave it empty.",
    };
  }

  return {
    values: {
      heldOn,
      activity,
      place,
      participants,
      sacks,
      kilos: kilos.toFixed(2),
    },
  };
}

async function selectDrive(drivePk: number) {
  const [row] = await db
    .select({ drivePk: eswmCleanupDrive.eswmCleanupDrivePk })
    .from(eswmCleanupDrive)
    .where(eq(eswmCleanupDrive.eswmCleanupDrivePk, drivePk));
  return row ?? null;
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

  const drives: CleanupDrive[] = reportRow
    ? (
        await db
          .select()
          .from(eswmCleanupDrive)
          .where(
            eq(
              eswmCleanupDrive.eswmMonthlyReportFk,
              reportRow.eswmMonthlyReportPk,
            ),
          )
          .orderBy(
            asc(eswmCleanupDrive.heldOn),
            asc(eswmCleanupDrive.eswmCleanupDrivePk),
          )
      ).map((d) => ({
        drivePk: d.eswmCleanupDrivePk,
        heldOn: d.heldOn,
        activity: d.activity,
        place: d.place,
        participants: d.participants,
        sacks: d.sacks,
        kilos: Number(d.kilos),
      }))
    : [];

  // Every month of the year so far, so a month left open stands out.
  const yearOf = month.slice(0, 4);
  const yearRows = await db
    .select({
      reportMonth: eswmMonthlyReport.reportMonth,
      status: eswmMonthlyReport.status,
      kilos: sql<string | null>`sum(${eswmCleanupDrive.kilos})`,
    })
    .from(eswmMonthlyReport)
    .leftJoin(
      eswmCleanupDrive,
      eq(
        eswmCleanupDrive.eswmMonthlyReportFk,
        eswmMonthlyReport.eswmMonthlyReportPk,
      ),
    )
    .where(
      between(
        eswmMonthlyReport.reportMonth,
        `${yearOf}-01-01`,
        `${yearOf}-12-01`,
      ),
    )
    .groupBy(eswmMonthlyReport.reportMonth, eswmMonthlyReport.status);

  const lastMonth =
    yearOf === currentMonth.slice(0, 4) ? currentMonth : `${yearOf}-12`;
  const year: EswmYearMonth[] = [];
  for (let m = 1; `${yearOf}-${String(m).padStart(2, "0")}` <= lastMonth; m++) {
    const key = `${yearOf}-${String(m).padStart(2, "0")}`;
    const found = yearRows.find((r) => monthOf(r.reportMonth) === key);
    year.push({
      month: key,
      status: found?.status ?? null,
      kilos: Number(found?.kilos ?? 0),
    });
  }

  return {
    month,
    currentMonth,
    today: todayIso(),
    report,
    drives,
    year,
  };
};

export const actions: Actions = {
  add: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const read = readDrive(await request.formData());
    if ("error" in read) return fail(400, { error: read.error });

    const month = monthOf(read.values.heldOn);
    const report = await reportFor(month);
    await db.insert(eswmCleanupDrive).values({
      eswmMonthlyReportFk: report.eswmMonthlyReportPk,
      ...read.values,
      createdByFk: locals.user!.userPk,
    });
    return { success: true, month };
  },

  edit: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const form = await request.formData();
    const drive = await selectDrive(Number(form.get("drivePk")));
    if (!drive) {
      return fail(404, { error: "That entry no longer exists." });
    }
    const read = readDrive(form);
    if ("error" in read) return fail(400, { error: read.error });

    // A new date in another month moves the entry to that month.
    const month = monthOf(read.values.heldOn);
    const report = await reportFor(month);
    await db
      .update(eswmCleanupDrive)
      .set({
        eswmMonthlyReportFk: report.eswmMonthlyReportPk,
        ...read.values,
        updatedAt: new Date(),
      })
      .where(eq(eswmCleanupDrive.eswmCleanupDrivePk, drive.drivePk));
    return { success: true, month };
  },

  remove: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const form = await request.formData();
    const drive = await selectDrive(Number(form.get("drivePk")));
    if (!drive) {
      return fail(404, { error: "That entry no longer exists." });
    }
    await db
      .delete(eswmCleanupDrive)
      .where(eq(eswmCleanupDrive.eswmCleanupDrivePk, drive.drivePk));
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

    // A month with no entry is submitted too, as none collected. Its
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
