import { PAPER_SIZES, paperSizeLabel, type PaperSize } from "$lib/paper-sizes";
import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import {
  employee,
  employeeHistory,
  orgUnit,
  paperConsumption,
  paperConsumptionItem,
  paperMonthlyReport,
  paperStartingBalance,
  user,
} from "$lib/server/db/schema";
import { fullName } from "$lib/utils";
import { getLocalTimeZone, today } from "@internationalized/date";
import { error, fail } from "@sveltejs/kit";
import {
  and,
  asc,
  between,
  desc,
  eq,
  inArray,
  isNotNull,
  ne,
  sql,
} from "drizzle-orm";
import { versionsOn } from "../fuel/issuance.server";
import type { Actions, PageServerLoad } from "./$types";
import {
  firstDay,
  isMonth,
  lastDay,
  monthLabel,
  monthOf,
  reamCount,
  submitTooEarly,
} from "./paper-month";
import {
  selectBalance,
  selectFirstReportMonth,
  selectLowestBalance,
  selectStart,
} from "./paper-balance.server";
import {
  selectGsuOfficePk,
  selectReceivedFrom,
  userName,
} from "./paper-report.server";
import type {
  PaperBalance,
  PaperEntry,
  PaperReport,
  PaperSigner,
  PaperStart,
  YearMonth,
} from "./paper-types";

/** Recording the paper an office uses (paper-consumption.md). */

/** The largest number of reams on one line, the field's 3 digits. */
const MAX_REAMS = 999;

/** The largest starting balance of one size, the field's 4 digits. */
const MAX_START_REAMS = 9999;

function todayIso() {
  return today(getLocalTimeZone()).toString();
}

async function selectReport(officePk: number, month: string) {
  const [row] = await db
    .select()
    .from(paperMonthlyReport)
    .where(
      and(
        eq(paperMonthlyReport.orgUnitFk, officePk),
        eq(paperMonthlyReport.reportMonth, firstDay(month)),
      ),
    );
  return row ?? null;
}

/**
 * Why nothing in this month can change, or null when it can. A submitted
 * month can still change until GSU receives it, and a received month locks
 * every month before it too, since its balance forwarded counts them. The
 * page shows the same reason.
 */
async function lockReason(
  officePk: number,
  month: string,
  start: { month: string } | null,
) {
  if (start && month < start.month) {
    return `${monthLabel(month)} is before your office's paper record starts, in ${monthLabel(start.month)}.`;
  }
  const received = await selectReceivedFrom([officePk], month);
  if (received?.month === month) {
    return `GSU already received the report for ${monthLabel(month)}, so its entries can no longer change.`;
  }
  if (received) {
    return `GSU already received the report for ${monthLabel(received.month)}, which counts the paper from ${monthLabel(month)}, so ${monthLabel(month)} can no longer change.`;
  }
  if (month > monthOf(todayIso())) {
    return `${monthLabel(month)} has not started yet.`;
  }
  return null;
}

/** The office whose paper the person records: always their own. */
function ownOffice(locals: App.Locals) {
  return locals.user?.employee.orgUnitFk ?? null;
}

function deny(locals: App.Locals) {
  if (!can(locals.permissions, "paper:manage")) {
    return fail(403, { error: "You do not have permission to do this." });
  }
  if (!ownOffice(locals)) {
    return fail(400, {
      error:
        "Your account is not linked to an office. Ask the system administrator to set your office on the Employees page.",
    });
  }
  return null;
}

type ReadEntry =
  | { error: string }
  | {
      values: {
        consumedOn: string;
        receivedByFk: number | null;
        receivedByName: string | null;
      };
      items: { paperSize: PaperSize; reams: number }[];
    };

/**
 * A line of the add and edit forms, checked: the date, the reams of each
 * size, and who received the paper. Someone picked must be on the office's
 * staff, unless the line already named them (they may have left since).
 */
async function readEntry(
  form: FormData,
  officePk: number,
  keptEmployeePk: number | null = null,
): Promise<ReadEntry> {
  const consumedOn = String(form.get("consumedOn") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(consumedOn)) {
    return { error: "Enter the date the paper was taken." };
  }
  if (consumedOn > todayIso()) {
    return { error: "The date cannot be later than today." };
  }

  const items: { paperSize: PaperSize; reams: number }[] = [];
  for (const size of PAPER_SIZES) {
    const raw = String(form.get(`reams-${size.value}`) ?? "").trim();
    if (raw === "") continue;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > MAX_REAMS) {
      return {
        error: `Enter whole reams of ${size.label}, up to ${MAX_REAMS}.`,
      };
    }
    if (n > 0) items.push({ paperSize: size.value, reams: n });
  }
  if (items.length === 0) {
    return { error: "Enter the reams of at least one size." };
  }

  const pickedPk = Number(form.get("receivedByPk")) || null;
  const typed = String(form.get("receivedByName") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (pickedPk) {
    const [person] = await db
      .select({
        orgUnitFk: employee.orgUnitFk,
        employmentStatus: employee.employmentStatus,
      })
      .from(employee)
      .where(eq(employee.employeePk, pickedPk));
    const onStaff =
      person?.orgUnitFk === officePk && person.employmentStatus === "active";
    if (!person || (!onStaff && pickedPk !== keptEmployeePk)) {
      return {
        error: "Choose someone from your office, or type the person's name.",
      };
    }
    const version = (await versionsOn([pickedPk], consumedOn)).get(pickedPk);
    if (!version) {
      return {
        error: "Choose someone from your office, or type the person's name.",
      };
    }
    return {
      values: { consumedOn, receivedByFk: version, receivedByName: null },
      items,
    };
  }
  if (!typed) return { error: "Choose who received the paper." };
  if (typed.length > 150) {
    return { error: "Shorten the name to 150 characters." };
  }
  return {
    values: { consumedOn, receivedByFk: null, receivedByName: typed },
    items,
  };
}

type Line = { paperSize: PaperSize; reams: number }[];

const ASK_GSU =
  "Check the reams, or ask GSU to record the PO your paper came from.";

/**
 * Why a line in `month` cannot take these reams, or null when the office
 * has them. A size's balance may never go below zero, in the line's month or
 * any month after it, since the line lowers them all (paper-consumption.md).
 * An edited line first gives back the reams it held.
 */
async function shortReason(
  officePk: number,
  month: string,
  items: Line,
  start: Awaited<ReturnType<typeof selectStart>>,
  givenBack: Line = [],
) {
  const lowest = await selectLowestBalance(
    officePk,
    month,
    monthOf(todayIso()),
    start,
  );
  for (const item of items) {
    const back =
      givenBack.find((i) => i.paperSize === item.paperSize)?.reams ?? 0;
    const has = (lowest.get(item.paperSize)?.balance ?? 0) + back;
    if (item.reams > has) {
      const label = paperSizeLabel(item.paperSize);
      return has > 0
        ? `Your office has only ${reamCount(has)} of ${label} left. ${ASK_GSU}`
        : `Your office has no ${label} left. ${ASK_GSU}`;
    }
  }
  return null;
}

/** The people who signed the office's most recent submitted month. */
async function selectLastSigners(officePk: number) {
  const [last] = await db
    .select({
      preparedByFk: paperMonthlyReport.preparedByFk,
      notedByFk: paperMonthlyReport.notedByFk,
    })
    .from(paperMonthlyReport)
    .where(
      and(
        eq(paperMonthlyReport.orgUnitFk, officePk),
        ne(paperMonthlyReport.status, "open"),
        isNotNull(paperMonthlyReport.preparedByFk),
      ),
    )
    .orderBy(desc(paperMonthlyReport.reportMonth))
    .limit(1);
  const pks = [last?.preparedByFk, last?.notedByFk].filter(
    (pk): pk is number => !!pk,
  );
  const people =
    pks.length === 0
      ? []
      : await db
          .select({
            historyPk: employeeHistory.employeeHistoryPk,
            employeeFk: employeeHistory.employeeFk,
          })
          .from(employeeHistory)
          .where(inArray(employeeHistory.employeeHistoryPk, pks));
  const person = (pk: number | null | undefined) =>
    String(people.find((p) => p.historyPk === pk)?.employeeFk ?? "");
  return {
    preparedByPk: person(last?.preparedByFk),
    notedByPk: person(last?.notedByFk),
  };
}

/**
 * The person picked for a signature block, as their name version on the
 * month's last day (today, for this month), or null.
 */
async function readSigner(form: FormData, field: string, month: string) {
  const employeePk = Number(form.get(field)) || null;
  if (!employeePk) return null;
  const [person] = await db
    .select({ employmentStatus: employee.employmentStatus })
    .from(employee)
    .where(eq(employee.employeePk, employeePk));
  if (person?.employmentStatus !== "active") return null;
  const day = lastDay(month) < todayIso() ? lastDay(month) : todayIso();
  return (await versionsOn([employeePk], day)).get(employeePk) ?? null;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function insertItems(
  tx: Tx,
  entryPk: number,
  items: { paperSize: PaperSize; reams: number }[],
) {
  await tx
    .insert(paperConsumptionItem)
    .values(items.map((i) => ({ paperConsumptionFk: entryPk, ...i })));
}

/** An entry with the office and month it belongs to, for the checks. */
async function selectEntry(entryPk: number) {
  const [row] = await db
    .select({
      entryPk: paperConsumption.paperConsumptionPk,
      consumedOn: paperConsumption.consumedOn,
      orgUnitFk: paperMonthlyReport.orgUnitFk,
      reportMonth: paperMonthlyReport.reportMonth,
      status: paperMonthlyReport.status,
      receivedByEmployeeFk: employeeHistory.employeeFk,
    })
    .from(paperConsumption)
    .innerJoin(
      paperMonthlyReport,
      eq(
        paperConsumption.paperMonthlyReportFk,
        paperMonthlyReport.paperMonthlyReportPk,
      ),
    )
    .leftJoin(
      employeeHistory,
      eq(paperConsumption.receivedByFk, employeeHistory.employeeHistoryPk),
    )
    .where(eq(paperConsumption.paperConsumptionPk, entryPk));
  return row ?? null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!can(locals.permissions, "paper:view")) {
    throw error(403, "You do not have permission to view this page.");
  }

  const allOffices = can(locals.permissions, "paper:view_all_offices");
  const ownOfficePk = ownOffice(locals);
  const currentMonth = monthOf(todayIso());

  const askedMonth = url.searchParams.get("month");
  const month =
    isMonth(askedMonth) && askedMonth <= currentMonth
      ? askedMonth
      : currentMonth;

  const offices = allOffices
    ? await db
        .select({
          orgUnitPk: orgUnit.orgUnitPk,
          orgUnitName: orgUnit.orgUnitName,
          abbr: orgUnit.abbr,
        })
        .from(orgUnit)
        .where(eq(orgUnit.status, "active"))
        .orderBy(asc(orgUnit.orgUnitName))
    : [];

  // Anyone may only look at their own office, unless they see every office.
  const askedOffice = Number(url.searchParams.get("office"));
  const officePk =
    allOffices && offices.some((o) => o.orgUnitPk === askedOffice)
      ? askedOffice
      : ownOfficePk;

  const [office] = officePk
    ? await db
        .select({
          orgUnitPk: orgUnit.orgUnitPk,
          orgUnitName: orgUnit.orgUnitName,
          abbr: orgUnit.abbr,
        })
        .from(orgUnit)
        .where(eq(orgUnit.orgUnitPk, officePk))
    : [];

  const base = {
    month,
    currentMonth,
    today: todayIso(),
    allOffices,
    ownOfficePk,
    offices,
    office: office ?? null,
  };

  if (!office) {
    return {
      ...base,
      report: null as PaperReport | null,
      locked: null as string | null,
      isGsuOffice: false,
      entries: [] as PaperEntry[],
      year: [] as YearMonth[],
      start: null as PaperStart | null,
      balance: null as PaperBalance[] | null,
      canEnterStart: false,
      staff: [] as {
        employeePk: number;
        name: string;
        positionTitle: string;
      }[],
      ownEmployeePk: null as number | null,
      signers: [] as PaperSigner[],
      signerDefaults: { preparedByPk: "", notedByPk: "" },
    };
  }

  const reportRow = await selectReport(office.orgUnitPk, month);

  // The four summary rows of the office's form. None for a month before the
  // office's paper record starts, which has nothing to count from.
  const startRow = await selectStart(office.orgUnitPk);
  const start: PaperStart | null = startRow && {
    month: startRow.month,
    reams: Object.fromEntries(
      PAPER_SIZES.map((s) => [s.value, startRow.reams.get(s.value) ?? 0]),
    ) as Record<PaperSize, number>,
  };
  const balance =
    startRow && month < startRow.month
      ? null
      : await selectBalance(office.orgUnitPk, month, startRow);

  const locked = await lockReason(office.orgUnitPk, month, startRow);
  const gsuOfficePk = await selectGsuOfficePk();

  // The starting balance goes on the office's first month: one with no
  // month recorded before it. Once entered, it changes only on its own
  // month, and only until GSU receives that month or a later one.
  const firstReportMonth = await selectFirstReportMonth(office.orgUnitPk);
  const canEnterStart =
    can(locals.permissions, "paper:manage") &&
    office.orgUnitPk === ownOfficePk &&
    !(await selectReceivedFrom([office.orgUnitPk], month)) &&
    (startRow
      ? startRow.month === month
      : firstReportMonth === null || firstReportMonth >= month);

  let report: PaperReport | null = null;
  if (reportRow) {
    const submitter = await userName(reportRow.submittedByFk);
    const receiver = await userName(reportRow.receivedByFk);
    const signedBy = async (historyPk: number | null) => {
      if (!historyPk) return null;
      const [h] = await db
        .select({
          firstName: employeeHistory.firstName,
          middleName: employeeHistory.middleName,
          lastName: employeeHistory.lastName,
          suffix: employeeHistory.suffix,
        })
        .from(employeeHistory)
        .where(eq(employeeHistory.employeeHistoryPk, historyPk));
      return h ? fullName(h) : null;
    };
    report = {
      preparedBy: await signedBy(reportRow.preparedByFk),
      notedBy: await signedBy(reportRow.notedByFk),
      status: reportRow.status,
      // The office's own calendar date, not UTC, which is 8 hours behind.
      submittedOn: reportRow.submittedAt
        ? reportRow.submittedAt.toLocaleDateString("en-CA")
        : null,
      submittedBy: submitter,
      receivedOn: reportRow.receivedOn,
      receivedBy: receiver,
    };
  }

  const entryRows = reportRow
    ? await db
        .select({
          entryPk: paperConsumption.paperConsumptionPk,
          consumedOn: paperConsumption.consumedOn,
          receivedByName: paperConsumption.receivedByName,
          employeeFk: employeeHistory.employeeFk,
          firstName: employeeHistory.firstName,
          middleName: employeeHistory.middleName,
          lastName: employeeHistory.lastName,
          suffix: employeeHistory.suffix,
        })
        .from(paperConsumption)
        .leftJoin(
          employeeHistory,
          eq(paperConsumption.receivedByFk, employeeHistory.employeeHistoryPk),
        )
        .where(
          eq(
            paperConsumption.paperMonthlyReportFk,
            reportRow.paperMonthlyReportPk,
          ),
        )
        .orderBy(
          asc(paperConsumption.consumedOn),
          asc(paperConsumption.paperConsumptionPk),
        )
    : [];

  const itemRows =
    entryRows.length === 0
      ? []
      : await db
          .select()
          .from(paperConsumptionItem)
          .where(
            inArray(
              paperConsumptionItem.paperConsumptionFk,
              entryRows.map((e) => e.entryPk),
            ),
          );

  const entries: PaperEntry[] = entryRows.map((row) => ({
    entryPk: row.entryPk,
    consumedOn: row.consumedOn,
    reams: Object.fromEntries(
      itemRows
        .filter((i) => i.paperConsumptionFk === row.entryPk)
        .map((i) => [i.paperSize, i.reams]),
    ),
    receivedByPk: row.employeeFk ? String(row.employeeFk) : "",
    receivedBy: row.firstName
      ? fullName({
          firstName: row.firstName,
          middleName: row.middleName,
          lastName: row.lastName ?? "",
          suffix: row.suffix,
        })
      : (row.receivedByName ?? ""),
  }));

  // Who can be picked as "Received by": the office's own staff.
  const staff = (
    await db
      .select({
        employeePk: employee.employeePk,
        firstName: employee.firstName,
        middleName: employee.middleName,
        lastName: employee.lastName,
        suffix: employee.suffix,
        positionTitle: employee.positionTitle,
      })
      .from(employee)
      .where(
        and(
          eq(employee.orgUnitFk, office.orgUnitPk),
          eq(employee.employmentStatus, "active"),
        ),
      )
      .orderBy(asc(employee.lastName), asc(employee.firstName))
  ).map((e) => ({
    employeePk: e.employeePk,
    name: fullName(e),
    positionTitle: e.positionTitle,
  }));

  // Every month of the year so far, so a month left open stands out.
  const yearOf = month.slice(0, 4);
  const yearRows = await db
    .select({
      reportMonth: paperMonthlyReport.reportMonth,
      status: paperMonthlyReport.status,
      reams: sql<string | null>`sum(${paperConsumptionItem.reams})`,
    })
    .from(paperMonthlyReport)
    .leftJoin(
      paperConsumption,
      eq(
        paperConsumption.paperMonthlyReportFk,
        paperMonthlyReport.paperMonthlyReportPk,
      ),
    )
    .leftJoin(
      paperConsumptionItem,
      eq(
        paperConsumptionItem.paperConsumptionFk,
        paperConsumption.paperConsumptionPk,
      ),
    )
    .where(
      and(
        eq(paperMonthlyReport.orgUnitFk, office.orgUnitPk),
        between(
          paperMonthlyReport.reportMonth,
          `${yearOf}-01-01`,
          `${yearOf}-12-01`,
        ),
      ),
    )
    .groupBy(paperMonthlyReport.reportMonth, paperMonthlyReport.status);

  const lastMonth =
    yearOf === currentMonth.slice(0, 4) ? currentMonth : `${yearOf}-12`;
  const year: YearMonth[] = [];
  for (let m = 1; `${yearOf}-${String(m).padStart(2, "0")}` <= lastMonth; m++) {
    const key = `${yearOf}-${String(m).padStart(2, "0")}`;
    const found = yearRows.find((r) => monthOf(r.reportMonth) === key);
    year.push({
      month: key,
      status: found?.status ?? null,
      reams: Number(found?.reams ?? 0),
    });
  }

  // Who can sign the form: anyone still working here. The submit box starts
  // on the office's last choices, as the same people usually sign.
  const signers: PaperSigner[] = (
    await db
      .select({
        employeePk: employee.employeePk,
        firstName: employee.firstName,
        middleName: employee.middleName,
        lastName: employee.lastName,
        suffix: employee.suffix,
        positionTitle: employee.positionTitle,
      })
      .from(employee)
      .where(eq(employee.employmentStatus, "active"))
      .orderBy(asc(employee.lastName), asc(employee.firstName))
  ).map((e) => ({
    employeePk: e.employeePk,
    name: fullName(e),
    positionTitle: e.positionTitle,
  }));
  const signerDefaults = await selectLastSigners(office.orgUnitPk);

  return {
    ...base,
    report,
    locked,
    isGsuOffice: office.orgUnitPk === gsuOfficePk,
    entries,
    year,
    start,
    balance,
    canEnterStart,
    staff,
    ownEmployeePk: locals.user?.employee.employeePk ?? null,
    signers,
    signerDefaults,
  };
};

export const actions: Actions = {
  add: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;
    const officePk = ownOffice(locals)!;

    const read = await readEntry(await request.formData(), officePk);
    if ("error" in read) return fail(400, { error: read.error });
    const { values, items } = read;

    const month = monthOf(values.consumedOn);
    const start = await selectStart(officePk);
    const reason = await lockReason(officePk, month, start);
    if (reason) return fail(409, { error: reason });
    const short = await shortReason(officePk, month, items, start);
    if (short) return fail(409, { error: short });

    // The month's report is made with its first entry. Two people adding the
    // first entry at once both reach the unique index, which keeps one.
    await db
      .insert(paperMonthlyReport)
      .values({ orgUnitFk: officePk, reportMonth: firstDay(month) })
      .onDuplicateKeyUpdate({
        set: { orgUnitFk: sql`${paperMonthlyReport.orgUnitFk}` },
      });
    const report = (await selectReport(officePk, month))!;
    const lateReason = await lockReason(officePk, month, start);
    if (lateReason) return fail(409, { error: lateReason });

    await db.transaction(async (tx) => {
      const [line] = await tx.insert(paperConsumption).values({
        paperMonthlyReportFk: report.paperMonthlyReportPk,
        ...values,
        createdByFk: locals.user!.userPk,
      });
      await insertItems(tx, line.insertId, items);
    });
    return { success: true, month };
  },

  edit: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const form = await request.formData();
    const entry = await selectEntry(Number(form.get("entryPk")));
    if (!entry || entry.orgUnitFk !== ownOffice(locals)) {
      return fail(404, { error: "That entry no longer exists." });
    }

    const read = await readEntry(
      form,
      entry.orgUnitFk,
      entry.receivedByEmployeeFk,
    );
    if ("error" in read) return fail(400, { error: read.error });
    const { values, items } = read;

    const month = monthOf(entry.reportMonth);
    const start = await selectStart(entry.orgUnitFk);
    const reason = await lockReason(entry.orgUnitFk, month, start);
    if (reason) return fail(409, { error: reason });
    // An entry stays in its month: one opened in another month is a
    // different entry, added under that month.
    if (monthOf(values.consumedOn) !== month) {
      return fail(400, {
        error: `Choose a date in ${monthLabel(month)}. For another month, remove this entry and add it there.`,
      });
    }

    const held = await db
      .select({
        paperSize: paperConsumptionItem.paperSize,
        reams: paperConsumptionItem.reams,
      })
      .from(paperConsumptionItem)
      .where(eq(paperConsumptionItem.paperConsumptionFk, entry.entryPk));
    const short = await shortReason(entry.orgUnitFk, month, items, start, held);
    if (short) return fail(409, { error: short });

    // The line's sizes are replaced as a whole.
    await db.transaction(async (tx) => {
      await tx
        .update(paperConsumption)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(paperConsumption.paperConsumptionPk, entry.entryPk));
      await tx
        .delete(paperConsumptionItem)
        .where(eq(paperConsumptionItem.paperConsumptionFk, entry.entryPk));
      await insertItems(tx, entry.entryPk, items);
    });
    return { success: true };
  },

  remove: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const form = await request.formData();
    const entry = await selectEntry(Number(form.get("entryPk")));
    if (!entry || entry.orgUnitFk !== ownOffice(locals)) {
      return fail(404, { error: "That entry no longer exists." });
    }
    const reason = await lockReason(
      entry.orgUnitFk,
      monthOf(entry.reportMonth),
      await selectStart(entry.orgUnitFk),
    );
    if (reason) return fail(409, { error: reason });

    await db
      .delete(paperConsumption)
      .where(eq(paperConsumption.paperConsumptionPk, entry.entryPk));
    return { success: true };
  },

  submit: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;
    const officePk = ownOffice(locals)!;

    const form = await request.formData();
    const month = String(form.get("month") ?? "");
    if (!isMonth(month)) return fail(400, { error: "Choose a month." });
    const tooEarly = submitTooEarly(month, monthOf(todayIso()));
    if (tooEarly) return fail(409, { error: tooEarly });

    const preparedByFk = await readSigner(form, "preparedByPk", month);
    if (!preparedByFk) {
      return fail(400, { error: "Choose who prepared the form." });
    }
    const notedByFk = await readSigner(form, "notedByPk", month);
    if (!notedByFk) {
      return fail(400, { error: "Choose who noted the form." });
    }

    const start = await selectStart(officePk);
    const reason = await lockReason(officePk, month, start);
    if (reason) return fail(409, { error: reason });
    if ((await selectReport(officePk, month))?.status === "submitted") {
      return fail(409, { error: `${monthLabel(month)} is already submitted.` });
    }

    // A balance below zero is always a mistake (paper-consumption.md), for
    // example after GSU edits a PO, so the month waits until it is fixed.
    const below = (await selectBalance(officePk, month, start)).find(
      (b) => b.balance < 0,
    );
    if (below) {
      return fail(409, {
        error: `The ${paperSizeLabel(below.paperSize)} balance is below zero. Fix the entries, or ask GSU to record the PO your paper came from.`,
      });
    }

    // GSU does not receive its own report: it is received as it is
    // submitted (paper-consumption.md).
    const ownReport = officePk === (await selectGsuOfficePk());

    // A month with no entries is submitted too: it reports that the office
    // used no paper. Its report is made here, already submitted.
    const submitted = {
      status: ownReport ? ("received" as const) : ("submitted" as const),
      submittedAt: new Date(),
      submittedByFk: locals.user!.userPk,
      receivedOn: ownReport ? todayIso() : null,
      receivedByFk: ownReport ? locals.user!.userPk : null,
      preparedByFk,
      notedByFk,
      updatedAt: new Date(),
    };
    await db
      .insert(paperMonthlyReport)
      .values({
        orgUnitFk: officePk,
        reportMonth: firstDay(month),
        ...submitted,
      })
      .onDuplicateKeyUpdate({ set: submitted });
    return { success: true, received: ownReport };
  },

  /**
   * The reams the office had before its paper record starts, entered on its
   * first month as that month's balance forwarded. Saved whole, one line per
   * size, zero included.
   */
  setStartingBalance: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;
    const officePk = ownOffice(locals)!;

    const form = await request.formData();
    const month = String(form.get("month") ?? "");
    if (!isMonth(month) || month > monthOf(todayIso())) {
      return fail(400, { error: "Choose a month up to this month." });
    }

    const reams = new Map<PaperSize, number>();
    for (const size of PAPER_SIZES) {
      const raw = String(form.get(`reams-${size.value}`) ?? "").trim();
      const n = raw === "" ? 0 : Number(raw);
      if (!Number.isInteger(n) || n < 0 || n > MAX_START_REAMS) {
        return fail(400, {
          error: `Enter whole reams of ${size.label}, up to ${MAX_START_REAMS.toLocaleString("en-PH")}.`,
        });
      }
      reams.set(size.value, n);
    }

    const received = await selectReceivedFrom([officePk], month);
    if (received) {
      return fail(409, {
        error: `GSU already received the report for ${monthLabel(received.month)}, so the balance forwarded can no longer change.`,
      });
    }
    const start = await selectStart(officePk);
    if (start && start.month !== month) {
      return fail(409, {
        error: `Your office's balance forwarded is already entered, on ${monthLabel(start.month)}.`,
      });
    }
    const firstReportMonth = await selectFirstReportMonth(officePk);
    if (!start && firstReportMonth !== null && firstReportMonth < month) {
      return fail(409, {
        error: `Your office has paper recorded from ${monthLabel(firstReportMonth)}. Enter the balance forwarded on that month instead.`,
      });
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(paperStartingBalance)
        .where(eq(paperStartingBalance.orgUnitFk, officePk));
      await tx.insert(paperStartingBalance).values(
        PAPER_SIZES.map((size) => ({
          orgUnitFk: officePk,
          startMonth: firstDay(month),
          paperSize: size.value,
          reams: reams.get(size.value)!,
          createdByFk: locals.user!.userPk,
        })),
      );
    });
    return { success: true };
  },
};
